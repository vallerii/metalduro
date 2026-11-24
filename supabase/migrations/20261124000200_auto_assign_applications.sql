begin;

-- Auto-assignment of applications that nobody claimed.
-- Rule: after 4 working hours in status "new" (Mon–Fri 09:00–20:00, Europe/Madrid;
-- nights and weekends are not counted) the application goes to the active admin
-- with the fewest applications currently in work. The admin gets an e-mail, the
-- client gets the usual "application claimed" e-mail.

-- 1. Working time between two moments, in seconds (Barcelona business hours).
create function private.business_seconds_between(p_from timestamptz, p_to timestamptz)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(
    greatest(0, extract(epoch from (
      least(p_to, ((day.d + time '20:00') at time zone 'Europe/Madrid'))
      - greatest(p_from, ((day.d + time '09:00') at time zone 'Europe/Madrid'))
    )))
  ), 0)
  from (
    select g::date as d
    from generate_series(
      (p_from at time zone 'Europe/Madrid')::date,
      (p_to at time zone 'Europe/Madrid')::date,
      interval '1 day'
    ) as g
  ) as day
  where p_to > p_from
    and extract(isodow from day.d) between 1 and 5;
$$;

revoke execute on function private.business_seconds_between(timestamptz, timestamptz)
from public, anon, authenticated;

-- 2. New e-mail event for the admin who received an application automatically.
alter table public.notification_outbox
  drop constraint notification_outbox_known_event_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_known_event_type_check
    check (event_type in (
      'application_created',
      'application_claimed',
      'receipt_uploaded',
      'payment_started',
      'application_paid',
      'payment_overdue',
      'application_auto_assigned'
    ));

create or replace function private.enqueue_application_notification(
  p_event_type text,
  p_application_id uuid,
  p_recipient_user_id uuid,
  p_event_key text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient public.profiles;
begin
  if p_event_type not in (
    'application_created',
    'application_claimed',
    'receipt_uploaded',
    'payment_started',
    'application_paid',
    'payment_overdue',
    'application_auto_assigned'
  ) then
    raise exception using errcode = '22023', message = 'unsupported_notification_event';
  end if;

  select *
  into v_recipient
  from public.profiles
  where user_id = p_recipient_user_id
    and active;

  if v_recipient.user_id is null then
    return;
  end if;

  insert into public.notification_outbox (
    event_type,
    event_key,
    application_id,
    recipient_user_id,
    recipient_email,
    recipient_name,
    recipient_locale,
    payload
  )
  values (
    p_event_type,
    p_event_key,
    p_application_id,
    v_recipient.user_id,
    lower(v_recipient.email),
    coalesce(nullif(v_recipient.display_name, ''), v_recipient.email),
    v_recipient.locale,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_key) where event_key is not null do nothing;
end;
$$;

-- 3. The job itself.
create function private.auto_assign_stale_applications(
  p_working_hours numeric default 4,
  p_limit integer default 50
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application record;
  v_admin uuid;
  v_assigned integer := 0;
begin
  for v_application in
    select id, reference_code, material_id, declared_weight_kg, created_at
    from public.applications
    where status = 'new'
      and manager_id is null
      and private.business_seconds_between(created_at, statement_timestamp()) >= p_working_hours * 3600
    order by created_at, id
    limit p_limit
    for update skip locked
  loop
    -- Active admin with the fewest applications in work (new and paid are not "in work").
    select profile.user_id
    into v_admin
    from public.profiles as profile
    where profile.role = 'admin'
      and profile.active
    order by (
      select count(*)
      from public.applications as a
      where a.manager_id = profile.user_id
        and a.status not in ('new', 'paid')
    ), random()
    limit 1;

    exit when v_admin is null;

    -- Act as that admin so the existing transition / history / notification
    -- triggers apply exactly as for a manual "claim".
    perform set_config('request.jwt.claim.sub', v_admin::text, true);
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_admin, 'role', 'authenticated')::text,
      true
    );

    update public.applications
    set manager_id = v_admin,
        status = 'in_progress'
    where id = v_application.id
      and status = 'new'
      and manager_id is null;

    if found then
      v_assigned := v_assigned + 1;
      perform private.enqueue_application_notification(
        'application_auto_assigned',
        v_application.id,
        v_admin,
        'application_auto_assigned:' || v_application.id::text || ':' || v_admin::text,
        jsonb_build_object(
          'reference_code', v_application.reference_code,
          'declared_weight_kg', v_application.declared_weight_kg,
          'created_at', v_application.created_at
        )
      );
    end if;
  end loop;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);

  return v_assigned;
end;
$$;

revoke execute on function private.auto_assign_stale_applications(numeric, integer)
from public, anon, authenticated;

commit;

-- 4. Run every 15 minutes (pg_cron is available on every Supabase project).
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname = 'auto-assign-stale-applications';

select cron.schedule(
  'auto-assign-stale-applications',
  '*/15 * * * *',
  $$select private.auto_assign_stale_applications();$$
);
