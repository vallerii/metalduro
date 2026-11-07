begin;

alter table public.applications
  add column reference_code text generated always as (
    upper(left(replace(id::text, '-', ''), 8))
  ) stored;

create index applications_reference_code_idx
  on public.applications (reference_code);

create index applications_admin_created_idx
  on public.applications (created_at desc, id desc);

alter table public.application_status_history
  add column author_role_snapshot public.app_role;

update public.application_status_history
set author_role_snapshot = case
  when to_status in ('new', 'sent') then 'client'::public.app_role
  else 'admin'::public.app_role
end;

alter table public.application_status_history
  alter column author_role_snapshot set not null;

create or replace function private.record_application_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_author_name text;
  v_author_role public.app_role;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  select
    coalesce(nullif(display_name, ''), email),
    role
  into
    v_author_name,
    v_author_role
  from public.profiles
  where user_id = v_actor
    and active;

  if v_author_name is null or v_author_role is null then
    raise exception using errcode = '42501', message = 'active_profile_required';
  end if;

  insert into public.application_status_history (
    application_id,
    from_status,
    to_status,
    changed_by,
    author_name_snapshot,
    author_role_snapshot
  )
  values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    v_actor,
    v_author_name,
    v_author_role
  );

  return new;
end;
$$;

revoke execute on function private.record_application_status_history()
from public, anon, authenticated;

create function public.advance_application(
  p_application_id uuid,
  p_expected_status public.application_status
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_application public.applications;
  v_next_status public.application_status;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;

  select *
  into v_application
  from public.applications
  where id = p_application_id
  for update;

  if v_application.id is null then
    raise exception using errcode = 'P0001', message = 'application_not_found';
  end if;
  if v_application.manager_id is distinct from v_actor then
    raise exception using errcode = '42501', message = 'assigned_manager_required';
  end if;
  if v_application.status is distinct from p_expected_status then
    raise exception using errcode = '40001', message = 'application_status_changed';
  end if;

  v_next_status := case v_application.status
    when 'sent' then 'accepted'::public.application_status
    when 'accepted' then 'verification'::public.application_status
    when 'verification' then 'payment'::public.application_status
    when 'payment' then 'paid'::public.application_status
    else null
  end;

  if v_next_status is null then
    raise exception using errcode = 'P0001', message = 'application_cannot_advance';
  end if;

  update public.applications
  set status = v_next_status
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

revoke execute on function public.advance_application(uuid)
from public, anon, authenticated;

revoke execute on function public.advance_application(uuid, public.application_status)
from public, anon, authenticated;

grant execute on function public.advance_application(uuid, public.application_status)
to authenticated;

comment on column public.applications.reference_code is
  'Indexed eight-character display reference derived from the application UUID.';

comment on column public.application_status_history.author_role_snapshot is
  'Immutable role of the actor at the moment the status transition was recorded.';

commit;
