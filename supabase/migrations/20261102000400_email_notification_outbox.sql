begin;

alter table public.notification_outbox
  add column event_key text,
  add column recipient_email text,
  add column recipient_name text,
  add column recipient_locale text not null default 'es',
  add column status text not null default 'pending',
  add column max_attempts integer not null default 5,
  add column next_attempt_at timestamptz not null default now(),
  add column locked_at timestamptz,
  add column lease_expires_at timestamptz,
  add column lease_token uuid,
  add column last_attempt_at timestamptz,
  add column provider_name text,
  add column provider_message_id text;

update public.notification_outbox as outbox
set
  recipient_email = profile.email,
  recipient_name = coalesce(nullif(profile.display_name, ''), profile.email),
  recipient_locale = profile.locale,
  status = case when outbox.processed_at is null then 'pending' else 'sent' end,
  next_attempt_at = coalesce(outbox.processed_at, outbox.created_at)
from public.profiles as profile
where profile.user_id = outbox.recipient_user_id;

alter table public.notification_outbox
  add constraint notification_outbox_known_event_type_check
    check (event_type in (
      'application_created',
      'application_claimed',
      'receipt_uploaded',
      'payment_started',
      'application_paid',
      'payment_overdue'
    )),
  add constraint notification_outbox_event_key_check
    check (event_key is null or length(event_key) between 16 and 240),
  add constraint notification_outbox_recipient_email_check
    check (
      recipient_email is null
      or (
        length(recipient_email) between 3 and 320
        and position('@' in recipient_email) > 1
      )
    ),
  add constraint notification_outbox_recipient_name_check
    check (recipient_name is null or length(recipient_name) between 1 and 320),
  add constraint notification_outbox_recipient_locale_check
    check (recipient_locale in ('es', 'ru')),
  add constraint notification_outbox_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  add constraint notification_outbox_max_attempts_check
    check (max_attempts between 1 and 20),
  add constraint notification_outbox_attempt_limit_check
    check (attempts <= max_attempts),
  add constraint notification_outbox_lease_check
    check (
      (status = 'processing' and lease_token is not null and lease_expires_at is not null)
      or (status <> 'processing' and lease_token is null and lease_expires_at is null)
    ),
  add constraint notification_outbox_provider_message_id_check
    check (provider_message_id is null or length(provider_message_id) between 1 and 512),
  add constraint notification_outbox_last_error_check
    check (last_error is null or length(last_error) <= 500);

create unique index notification_outbox_event_key_uidx
  on public.notification_outbox (event_key)
  where event_key is not null;

drop index public.notification_outbox_pending_idx;

create index notification_outbox_dispatch_idx
  on public.notification_outbox (next_attempt_at, created_at, id)
  where status = 'pending';

create index notification_outbox_expired_lease_idx
  on public.notification_outbox (lease_expires_at, id)
  where status = 'processing';

create index notification_outbox_application_event_idx
  on public.notification_outbox (application_id, event_type, created_at);

comment on table public.notification_outbox is
  'Transactional email outbox. Browser roles have no table privileges or RLS policies.';

comment on column public.notification_outbox.event_key is
  'Unique business-event/recipient key preventing duplicate notifications.';

comment on column public.notification_outbox.lease_token is
  'Per-claim token required to complete or fail a leased job.';

create function private.enqueue_application_notification(
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
    'payment_overdue'
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

create function private.enqueue_application_status_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin record;
  v_material_name text;
  v_manager_name text;
  v_payload jsonb;
begin
  select name
  into v_material_name
  from public.materials
  where id = new.material_id;

  if tg_op = 'INSERT' then
    v_payload := jsonb_build_object(
      'reference_code', new.reference_code,
      'material_name', v_material_name,
      'declared_weight_kg', new.declared_weight_kg,
      'created_at', new.created_at
    );

    for v_admin in
      select user_id
      from public.profiles
      where role = 'admin'
        and active
    loop
      perform private.enqueue_application_notification(
        'application_created',
        new.id,
        v_admin.user_id,
        'application_created:' || new.id::text || ':' || v_admin.user_id::text,
        v_payload
      );
    end loop;

    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status = 'new' and new.status = 'in_progress' then
    select coalesce(nullif(display_name, ''), email)
    into v_manager_name
    from public.profiles
    where user_id = new.manager_id;

    perform private.enqueue_application_notification(
      'application_claimed',
      new.id,
      new.client_id,
      'application_claimed:' || new.id::text || ':' || new.client_id::text,
      jsonb_build_object(
        'reference_code', new.reference_code,
        'manager_name', v_manager_name
      )
    );
  elsif old.status = 'in_progress' and new.status = 'sent' then
    perform private.enqueue_application_notification(
      'receipt_uploaded',
      new.id,
      new.manager_id,
      'receipt_uploaded:' || new.id::text || ':' || new.manager_id::text,
      jsonb_build_object('reference_code', new.reference_code)
    );
  elsif old.status = 'verification' and new.status = 'payment' then
    perform private.enqueue_application_notification(
      'payment_started',
      new.id,
      new.client_id,
      'payment_started:' || new.id::text || ':' || new.client_id::text,
      jsonb_build_object(
        'reference_code', new.reference_code,
        'payment_due_at', new.payment_due_at
      )
    );
  elsif old.status = 'payment' and new.status = 'paid' then
    perform private.enqueue_application_notification(
      'application_paid',
      new.id,
      new.client_id,
      'application_paid:' || new.id::text || ':' || new.client_id::text,
      jsonb_build_object('reference_code', new.reference_code)
    );
  end if;

  return new;
end;
$$;

create trigger applications_enqueue_created_notification
after insert on public.applications
for each row execute function private.enqueue_application_status_notifications();

create trigger applications_enqueue_status_notification
after update of status on public.applications
for each row
when (old.status is distinct from new.status)
execute function private.enqueue_application_status_notifications();

create function public.enqueue_overdue_payment_notifications(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'notification_worker_required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception using errcode = '22023', message = 'invalid_notification_scan_limit';
  end if;

  with candidates as (
    select
      application.id,
      application.manager_id,
      application.reference_code,
      application.payment_due_at,
      profile.email,
      profile.display_name,
      profile.locale
    from public.applications as application
    join public.profiles as profile
      on profile.user_id = application.manager_id
      and profile.role = 'admin'
      and profile.active
    where application.status = 'payment'
      and application.payment_due_at < statement_timestamp()
      and application.manager_id is not null
    order by application.payment_due_at, application.id
    limit p_limit
  ), inserted as (
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
    select
      'payment_overdue',
      'payment_overdue:' || candidate.id::text || ':' || candidate.manager_id::text,
      candidate.id,
      candidate.manager_id,
      lower(candidate.email),
      coalesce(nullif(candidate.display_name, ''), candidate.email),
      candidate.locale,
      jsonb_build_object(
        'reference_code', candidate.reference_code,
        'payment_due_at', candidate.payment_due_at
      )
    from candidates as candidate
    on conflict (event_key) where event_key is not null do nothing
    returning id
  )
  select count(*)::integer into v_inserted from inserted;

  return v_inserted;
end;
$$;

create function public.claim_notification_jobs(
  p_limit integer default 10,
  p_lease_seconds integer default 90
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'notification_worker_required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception using errcode = '22023', message = 'invalid_notification_batch_limit';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 15 or p_lease_seconds > 900 then
    raise exception using errcode = '22023', message = 'invalid_notification_lease';
  end if;

  update public.notification_outbox
  set
    status = 'failed',
    processed_at = statement_timestamp(),
    last_error = 'lease_expired_after_max_attempts',
    lease_token = null,
    lease_expires_at = null,
    locked_at = null
  where status = 'processing'
    and lease_expires_at <= statement_timestamp()
    and attempts >= max_attempts;

  update public.notification_outbox as outbox
  set
    status = 'cancelled',
    processed_at = statement_timestamp(),
    last_error = 'event_no_longer_current',
    lease_token = null,
    lease_expires_at = null,
    locked_at = null
  where outbox.event_type = 'payment_overdue'
    and (
      outbox.status = 'pending'
      or (
        outbox.status = 'processing'
        and outbox.lease_expires_at <= statement_timestamp()
      )
    )
    and not exists (
      select 1
      from public.applications as application
      where application.id = outbox.application_id
        and application.status = 'payment'
        and application.payment_due_at < statement_timestamp()
        and application.manager_id = outbox.recipient_user_id
    );

  return query
  with candidates as (
    select outbox.id
    from public.notification_outbox as outbox
    where outbox.recipient_email is not null
      and outbox.attempts < outbox.max_attempts
      and (
        (
          outbox.status = 'pending'
          and outbox.next_attempt_at <= statement_timestamp()
        )
        or (
          outbox.status = 'processing'
          and outbox.lease_expires_at <= statement_timestamp()
        )
      )
    order by outbox.next_attempt_at, outbox.created_at, outbox.id
    for update skip locked
    limit p_limit
  )
  update public.notification_outbox as outbox
  set
    status = 'processing',
    attempts = outbox.attempts + 1,
    locked_at = statement_timestamp(),
    lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
    lease_token = gen_random_uuid(),
    last_attempt_at = statement_timestamp(),
    last_error = null
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

create function public.validate_notification_job(
  p_outbox_id uuid,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox public.notification_outbox;
  v_is_current boolean := true;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'notification_worker_required';
  end if;

  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
    and status = 'processing'
    and lease_token = p_lease_token
  for update;

  if v_outbox.id is null then
    return false;
  end if;

  if v_outbox.event_type = 'payment_overdue' then
    select exists (
      select 1
      from public.applications
      where id = v_outbox.application_id
        and status = 'payment'
        and payment_due_at < statement_timestamp()
        and manager_id = v_outbox.recipient_user_id
    ) into v_is_current;
  end if;

  if not v_is_current then
    update public.notification_outbox
    set
      status = 'cancelled',
      processed_at = statement_timestamp(),
      last_error = 'event_no_longer_current',
      lease_token = null,
      lease_expires_at = null,
      locked_at = null
    where id = v_outbox.id;
  end if;

  return v_is_current;
end;
$$;

create function public.complete_notification_job(
  p_outbox_id uuid,
  p_lease_token uuid,
  p_provider_name text,
  p_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'notification_worker_required';
  end if;

  if nullif(trim(p_provider_name), '') is null
    or length(p_provider_name) > 80
    or nullif(trim(p_provider_message_id), '') is null
    or length(p_provider_message_id) > 512 then
    raise exception using errcode = '22023', message = 'invalid_provider_result';
  end if;

  update public.notification_outbox
  set
    status = 'sent',
    processed_at = statement_timestamp(),
    provider_name = trim(p_provider_name),
    provider_message_id = trim(p_provider_message_id),
    last_error = null,
    lease_token = null,
    lease_expires_at = null,
    locked_at = null
  where id = p_outbox_id
    and status = 'processing'
    and lease_token = p_lease_token;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create function public.fail_notification_job(
  p_outbox_id uuid,
  p_lease_token uuid,
  p_permanent boolean,
  p_error_code text,
  p_retry_after_seconds integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox public.notification_outbox;
  v_terminal boolean;
  v_backoff_seconds integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'notification_worker_required';
  end if;

  select *
  into v_outbox
  from public.notification_outbox
  where id = p_outbox_id
    and status = 'processing'
    and lease_token = p_lease_token
  for update;

  if v_outbox.id is null then
    return false;
  end if;

  v_terminal := coalesce(p_permanent, false) or v_outbox.attempts >= v_outbox.max_attempts;
  v_backoff_seconds := least(
    86400,
    greatest(
      coalesce(p_retry_after_seconds, 0),
      least(3600, (30 * power(2, greatest(v_outbox.attempts - 1, 0)))::integer)
        + floor(random() * 16)::integer
    )
  );

  update public.notification_outbox
  set
    status = case when v_terminal then 'failed' else 'pending' end,
    processed_at = case when v_terminal then statement_timestamp() else null end,
    next_attempt_at = case
      when v_terminal then next_attempt_at
      else statement_timestamp() + make_interval(secs => v_backoff_seconds)
    end,
    last_error = left(coalesce(nullif(trim(p_error_code), ''), 'email_delivery_failed'), 500),
    lease_token = null,
    lease_expires_at = null,
    locked_at = null
  where id = v_outbox.id;

  return true;
end;
$$;

create function public.retry_notification_job(p_outbox_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'notification_worker_required';
  end if;

  update public.notification_outbox
  set
    status = 'pending',
    attempts = 0,
    processed_at = null,
    next_attempt_at = statement_timestamp(),
    last_error = null,
    provider_name = null,
    provider_message_id = null,
    lease_token = null,
    lease_expires_at = null,
    locked_at = null
  where id = p_outbox_id
    and status = 'failed';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke execute on function private.enqueue_application_notification(
  text, uuid, uuid, text, jsonb
) from public, anon, authenticated;
revoke execute on function private.enqueue_application_status_notifications()
from public, anon, authenticated;

revoke execute on function public.enqueue_overdue_payment_notifications(integer)
from public, anon, authenticated;
revoke execute on function public.claim_notification_jobs(integer, integer)
from public, anon, authenticated;
revoke execute on function public.validate_notification_job(uuid, uuid)
from public, anon, authenticated;
revoke execute on function public.complete_notification_job(uuid, uuid, text, text)
from public, anon, authenticated;
revoke execute on function public.fail_notification_job(uuid, uuid, boolean, text, integer)
from public, anon, authenticated;
revoke execute on function public.retry_notification_job(uuid)
from public, anon, authenticated;

grant execute on function public.enqueue_overdue_payment_notifications(integer)
to service_role;
grant execute on function public.claim_notification_jobs(integer, integer)
to service_role;
grant execute on function public.validate_notification_job(uuid, uuid)
to service_role;
grant execute on function public.complete_notification_job(uuid, uuid, text, text)
to service_role;
grant execute on function public.fail_notification_job(uuid, uuid, boolean, text, integer)
to service_role;
grant execute on function public.retry_notification_job(uuid)
to service_role;

revoke all on table public.notification_outbox from anon, authenticated;

commit;
