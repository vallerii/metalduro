begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('client', 'admin');
create type public.application_status as enum (
  'new',
  'in_progress',
  'sent',
  'accepted',
  'verification',
  'payment',
  'paid'
);
create type public.delivery_method as enum ('send', 'pickup', 'warehouse');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  phone text,
  locale text not null default 'es' check (locale in ('es', 'ru')),
  role public.app_role not null default 'client',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(email) between 3 and 320),
  check (display_name is null or length(display_name) between 1 and 120),
  check (phone is null or length(phone) between 6 and 40)
);

create unique index profiles_email_unique_idx on public.profiles (lower(email));
create index profiles_role_active_idx on public.profiles (role, active);

create table public.materials (
  id text primary key check (id ~ '^[a-z][a-z0-9_-]{1,49}$'),
  name text not null check (length(name) between 1 and 160),
  rate_eur numeric(10, 2) not null check (rate_eur > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.materials is
  'Authoritative material rates. Initial values mirror src/content/site.ts at migration creation time.';

insert into public.materials (id, name, rate_eur)
values
  ('inserts', 'Plaquitas de metal duro', 36.00),
  ('solid', 'Herramienta enteriza', 40.00),
  ('scrap', 'Chatarra de metal duro', 34.00),
  ('mixed', 'Material mezclado', 30.00);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(user_id) on delete restrict,
  manager_id uuid references public.profiles(user_id) on delete restrict,
  material_id text not null references public.materials(id) on update restrict on delete restrict,
  declared_weight_kg numeric(12, 3) not null check (declared_weight_kg > 0 and declared_weight_kg <= 100000),
  rate_snapshot_eur numeric(10, 2) not null check (rate_snapshot_eur > 0),
  estimated_amount_eur numeric(14, 2) not null check (estimated_amount_eur >= 0),
  city text check (city is null or length(city) between 1 and 160),
  delivery_method public.delivery_method,
  status public.application_status not null default 'new',
  payment_started_at timestamptz,
  payment_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (estimated_amount_eur = round(declared_weight_kg * rate_snapshot_eur, 2)),
  check (
    (status = 'new' and manager_id is null)
    or (status <> 'new' and manager_id is not null)
  ),
  check (
    (
      status in ('payment', 'paid')
      and payment_started_at is not null
      and payment_due_at is not null
      and payment_due_at = payment_started_at + interval '2 hours'
    )
    or (
      status not in ('payment', 'paid')
      and payment_started_at is null
      and payment_due_at is null
    )
  )
);

create index applications_client_created_idx on public.applications (client_id, created_at desc);
create index applications_manager_status_idx on public.applications (manager_id, status, updated_at desc);
create index applications_queue_idx on public.applications (created_at) where status = 'new' and manager_id is null;
create index applications_payment_due_idx on public.applications (payment_due_at) where status = 'payment';

create table public.application_status_history (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid not null references public.profiles(user_id) on delete restrict,
  author_name_snapshot text not null check (length(author_name_snapshot) between 1 and 320),
  created_at timestamptz not null default now(),
  check ((from_status is null and to_status = 'new') or from_status is distinct from to_status)
);

create index application_status_history_application_idx
  on public.application_status_history (application_id, created_at, id);

create table public.application_receipts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  storage_path text not null unique check (length(storage_path) between 3 and 1024),
  uploaded_by uuid not null references public.profiles(user_id) on delete restrict,
  created_at timestamptz not null default now()
);

create index application_receipts_uploaded_by_idx
  on public.application_receipts (uploaded_by, created_at desc);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (length(event_type) between 1 and 100),
  application_id uuid references public.applications(id) on delete cascade,
  recipient_user_id uuid references public.profiles(user_id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where processed_at is null;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
      and active
  );
$$;

create function private.current_author_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(display_name, ''), email)
  from public.profiles
  where user_id = (select auth.uid())
    and active;
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger materials_set_updated_at
before update on public.materials
for each row execute function private.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row execute function private.set_updated_at();

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_locale text;
begin
  v_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_locale := case when new.raw_user_meta_data ->> 'locale' = 'ru' then 'ru' else 'es' end;

  insert into public.profiles (user_id, email, display_name, locale, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    v_display_name,
    v_locale,
    'client'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create function private.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = lower(coalesce(new.email, ''))
    where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function private.sync_auth_user_email();

create function private.enforce_application_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payment_started_at timestamptz;
begin
  if old.client_id is distinct from new.client_id
    or old.material_id is distinct from new.material_id
    or old.declared_weight_kg is distinct from new.declared_weight_kg
    or old.rate_snapshot_eur is distinct from new.rate_snapshot_eur
    or old.estimated_amount_eur is distinct from new.estimated_amount_eur then
    raise exception using errcode = 'P0001', message = 'immutable_application_fields';
  end if;

  if old.status is not distinct from new.status then
    if old.manager_id is distinct from new.manager_id
      or old.payment_started_at is distinct from new.payment_started_at
      or old.payment_due_at is distinct from new.payment_due_at then
      raise exception using errcode = 'P0001', message = 'critical_fields_require_status_transition';
    end if;
    return new;
  end if;

  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if old.status = 'new' and new.status = 'in_progress' then
    if not private.is_admin()
      or old.manager_id is not null
      or new.manager_id is distinct from v_actor then
      raise exception using errcode = '42501', message = 'claim_not_allowed';
    end if;
  elsif old.status = 'in_progress' and new.status = 'sent' then
    if v_actor is distinct from old.client_id
      or new.manager_id is distinct from old.manager_id
      or not exists (
        select 1
        from public.application_receipts
        where application_id = old.id
      ) then
      raise exception using errcode = '42501', message = 'receipt_required_or_not_owner';
    end if;
  elsif (
    (old.status = 'sent' and new.status = 'accepted')
    or (old.status = 'accepted' and new.status = 'verification')
    or (old.status = 'verification' and new.status = 'payment')
    or (old.status = 'payment' and new.status = 'paid')
  ) then
    if not private.is_admin()
      or old.manager_id is distinct from v_actor
      or new.manager_id is distinct from old.manager_id then
      raise exception using errcode = '42501', message = 'manager_transition_not_allowed';
    end if;
  else
    raise exception using errcode = 'P0001', message = 'invalid_status_transition';
  end if;

  if old.status = 'verification' and new.status = 'payment' then
    v_payment_started_at := statement_timestamp();
    new.payment_started_at := v_payment_started_at;
    new.payment_due_at := v_payment_started_at + interval '2 hours';
  elsif new.status <> 'paid' then
    new.payment_started_at := old.payment_started_at;
    new.payment_due_at := old.payment_due_at;
  end if;

  return new;
end;
$$;

create trigger applications_enforce_transition
before update on public.applications
for each row execute function private.enforce_application_transition();

create function private.record_application_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_author_name text;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  v_author_name := private.current_author_name();
  if v_author_name is null then
    raise exception using errcode = '42501', message = 'active_profile_required';
  end if;

  insert into public.application_status_history (
    application_id,
    from_status,
    to_status,
    changed_by,
    author_name_snapshot
  )
  values (
    new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    v_actor,
    v_author_name
  );

  return new;
end;
$$;

create trigger applications_record_initial_status
after insert on public.applications
for each row execute function private.record_application_status_history();

create trigger applications_record_status_change
after update of status on public.applications
for each row execute function private.record_application_status_history();

create function public.create_application(
  p_material_id text,
  p_declared_weight_kg numeric,
  p_city text default null,
  p_delivery_method public.delivery_method default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_rate numeric(10, 2);
  v_application public.applications;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = v_actor and role = 'client' and active
  ) then
    raise exception using errcode = '42501', message = 'active_client_required';
  end if;

  if p_declared_weight_kg is null or p_declared_weight_kg <= 0 or p_declared_weight_kg > 100000 then
    raise exception using errcode = '22023', message = 'invalid_weight';
  end if;

  select rate_eur
  into v_rate
  from public.materials
  where id = p_material_id and active;

  if v_rate is null then
    raise exception using errcode = '22023', message = 'material_not_available';
  end if;

  insert into public.applications (
    client_id,
    material_id,
    declared_weight_kg,
    rate_snapshot_eur,
    estimated_amount_eur,
    city,
    delivery_method
  )
  values (
    v_actor,
    p_material_id,
    p_declared_weight_kg,
    v_rate,
    round(p_declared_weight_kg * v_rate, 2),
    nullif(trim(p_city), ''),
    p_delivery_method
  )
  returning * into v_application;

  return v_application;
end;
$$;

create function public.claim_application(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_application public.applications;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;

  update public.applications
  set manager_id = v_actor,
      status = 'in_progress'
  where id = p_application_id
    and status = 'new'
    and manager_id is null
  returning * into v_application;

  if v_application.id is null then
    raise exception using errcode = 'P0001', message = 'application_not_available';
  end if;

  return v_application;
end;
$$;

create function public.attach_receipt_and_mark_sent(
  p_application_id uuid,
  p_storage_path text
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_application public.applications;
  v_folders text[];
  v_object_exists boolean;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  select *
  into v_application
  from public.applications
  where id = p_application_id
  for update;

  if v_application.id is null then
    raise exception using errcode = 'P0001', message = 'application_not_found';
  end if;
  if v_application.client_id is distinct from v_actor then
    raise exception using errcode = '42501', message = 'application_owner_required';
  end if;
  if v_application.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'receipt_not_allowed_for_status';
  end if;

  v_folders := storage.foldername(p_storage_path);
  if coalesce(array_length(v_folders, 1), 0) <> 2
    or v_folders[1] is distinct from v_actor::text
    or v_folders[2] is distinct from p_application_id::text
    or p_storage_path like '%..%' then
    raise exception using errcode = '22023', message = 'invalid_receipt_path';
  end if;

  select exists (
    select 1
    from storage.objects
    where bucket_id = 'receipts'
      and name = p_storage_path
      and owner_id = v_actor::text
      and lower(coalesce(metadata ->> 'mimetype', '')) in ('image/jpeg', 'image/png', 'image/webp')
      and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 10485760
  ) into v_object_exists;

  if not v_object_exists then
    raise exception using errcode = 'P0001', message = 'receipt_object_not_found_or_invalid';
  end if;

  insert into public.application_receipts (application_id, storage_path, uploaded_by)
  values (p_application_id, p_storage_path, v_actor);

  update public.applications
  set status = 'sent'
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

create function public.advance_application(p_application_id uuid)
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

create function public.update_profile(
  p_display_name text,
  p_phone text,
  p_locale text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_locale not in ('es', 'ru') then
    raise exception using errcode = '22023', message = 'invalid_locale';
  end if;
  if nullif(trim(p_display_name), '') is null or length(trim(p_display_name)) > 120 then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;
  if nullif(trim(p_phone), '') is not null and length(trim(p_phone)) not between 6 and 40 then
    raise exception using errcode = '22023', message = 'invalid_phone';
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      phone = nullif(trim(p_phone), ''),
      locale = p_locale
  where user_id = v_actor and active
  returning * into v_profile;

  if v_profile.user_id is null then
    raise exception using errcode = '42501', message = 'active_profile_required';
  end if;

  return v_profile;
end;
$$;

alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.applications enable row level security;
alter table public.application_status_history enable row level security;
alter table public.application_receipts enable row level security;
alter table public.notification_outbox enable row level security;

create policy profiles_select_self
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_select_admin
on public.profiles for select to authenticated
using ((select private.is_admin()));

create policy profiles_select_assigned_manager
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.applications
    where client_id = (select auth.uid())
      and manager_id = profiles.user_id
  )
);

create policy materials_select_active
on public.materials for select to anon, authenticated
using (active);

create policy applications_select_owner
on public.applications for select to authenticated
using ((select auth.uid()) = client_id);

create policy applications_select_admin
on public.applications for select to authenticated
using ((select private.is_admin()));

create policy application_history_select_owner_or_admin
on public.application_status_history for select to authenticated
using (
  exists (
    select 1
    from public.applications
    where id = application_status_history.application_id
      and (client_id = (select auth.uid()) or (select private.is_admin()))
  )
);

create policy application_receipts_select_owner_or_admin
on public.application_receipts for select to authenticated
using (
  exists (
    select 1
    from public.applications
    where id = application_receipts.application_id
      and (client_id = (select auth.uid()) or (select private.is_admin()))
  )
);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.materials from anon, authenticated;
revoke all on table public.applications from anon, authenticated;
revoke all on table public.application_status_history from anon, authenticated;
revoke all on table public.application_receipts from anon, authenticated;
revoke all on table public.notification_outbox from anon, authenticated;

grant select on table public.materials to anon, authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.applications to authenticated;
grant select on table public.application_status_history to authenticated;
grant select on table public.application_receipts to authenticated;

grant usage on schema private to authenticated;
revoke execute on function private.current_author_name() from public, anon, authenticated;
revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function private.sync_auth_user_email() from public, anon, authenticated;
revoke execute on function private.enforce_application_transition() from public, anon, authenticated;
revoke execute on function private.record_application_status_history() from public, anon, authenticated;
revoke execute on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

revoke execute on function public.create_application(text, numeric, text, public.delivery_method) from public, anon, authenticated;
revoke execute on function public.claim_application(uuid) from public, anon, authenticated;
revoke execute on function public.attach_receipt_and_mark_sent(uuid, text) from public, anon, authenticated;
revoke execute on function public.advance_application(uuid) from public, anon, authenticated;
revoke execute on function public.update_profile(text, text, text) from public, anon, authenticated;

grant execute on function public.create_application(text, numeric, text, public.delivery_method) to authenticated;
grant execute on function public.claim_application(uuid) to authenticated;
grant execute on function public.attach_receipt_and_mark_sent(uuid, text) to authenticated;
grant execute on function public.advance_application(uuid) to authenticated;
grant execute on function public.update_profile(text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy receipts_insert_for_application_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and owner_id = (select auth.uid())::text
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.applications
    where id::text = (storage.foldername(name))[2]
      and client_id = (select auth.uid())
      and status = 'in_progress'
  )
);

create policy receipts_select_owner_or_admin
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and exists (
    select 1
    from public.applications
    where id::text = (storage.foldername(name))[2]
      and (
        client_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

commit;
