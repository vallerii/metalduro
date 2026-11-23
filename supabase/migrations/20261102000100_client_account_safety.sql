begin;

alter table public.applications
  add column idempotency_key uuid;

create unique index applications_client_idempotency_idx
  on public.applications (client_id, idempotency_key);

comment on column public.applications.idempotency_key is
  'Client-generated request key used to make application creation idempotent.';

create function public.create_application(
  p_material_id text,
  p_declared_weight_kg numeric,
  p_city text,
  p_delivery_method public.delivery_method,
  p_idempotency_key uuid
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_rate numeric(10, 2);
  v_city text := nullif(trim(p_city), '');
  v_application public.applications;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where user_id = v_actor
      and role = 'client'
      and active
  ) then
    raise exception using errcode = '42501', message = 'active_client_required';
  end if;

  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'idempotency_key_required';
  end if;

  if p_declared_weight_kg is null
    or p_declared_weight_kg <= 0
    or p_declared_weight_kg > 100000 then
    raise exception using errcode = '22023', message = 'invalid_weight';
  end if;

  select *
  into v_application
  from public.applications
  where client_id = v_actor
    and idempotency_key = p_idempotency_key;

  if v_application.id is not null then
    if v_application.material_id is distinct from p_material_id
      or v_application.declared_weight_kg is distinct from p_declared_weight_kg
      or v_application.city is distinct from v_city
      or v_application.delivery_method is distinct from p_delivery_method then
      raise exception using errcode = '22023', message = 'idempotency_key_conflict';
    end if;

    return v_application;
  end if;

  select rate_eur
  into v_rate
  from public.materials
  where id = p_material_id
    and active;

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
    delivery_method,
    idempotency_key
  )
  values (
    v_actor,
    p_material_id,
    p_declared_weight_kg,
    v_rate,
    round(p_declared_weight_kg * v_rate, 2),
    v_city,
    p_delivery_method,
    p_idempotency_key
  )
  on conflict (client_id, idempotency_key) do nothing
  returning * into v_application;

  if v_application.id is null then
    select *
    into v_application
    from public.applications
    where client_id = v_actor
      and idempotency_key = p_idempotency_key;

    if v_application.id is null then
      raise exception using errcode = '40001', message = 'idempotent_create_retry_required';
    end if;

    if v_application.material_id is distinct from p_material_id
      or v_application.declared_weight_kg is distinct from p_declared_weight_kg
      or v_application.city is distinct from v_city
      or v_application.delivery_method is distinct from p_delivery_method then
      raise exception using errcode = '22023', message = 'idempotency_key_conflict';
    end if;
  end if;

  return v_application;
end;
$$;

revoke execute on function public.create_application(
  text,
  numeric,
  text,
  public.delivery_method
) from public, anon, authenticated;

revoke execute on function public.create_application(
  text,
  numeric,
  text,
  public.delivery_method,
  uuid
) from public, anon, authenticated;

grant execute on function public.create_application(
  text,
  numeric,
  text,
  public.delivery_method,
  uuid
) to authenticated;

create function public.get_server_time()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select statement_timestamp();
$$;

revoke execute on function public.get_server_time() from public, anon, authenticated;
grant execute on function public.get_server_time() to authenticated;

drop policy receipts_insert_for_application_owner on storage.objects;

create policy receipts_insert_for_application_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and owner_id = (select auth.uid())::text
  and coalesce(array_length(storage.foldername(name), 1), 0) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name = (
    (select auth.uid())::text
    || '/'
    || (storage.foldername(name))[2]
    || '/receipt'
  )
  and exists (
    select 1
    from public.applications
    where id::text = (storage.foldername(name))[2]
      and client_id = (select auth.uid())
      and status = 'in_progress'
  )
);

create or replace function public.attach_receipt_and_mark_sent(
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
  v_expected_path text;
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

  v_expected_path := v_actor::text || '/' || p_application_id::text || '/receipt';
  if p_storage_path is distinct from v_expected_path then
    raise exception using errcode = '22023', message = 'invalid_receipt_path';
  end if;

  if v_application.status <> 'in_progress' then
    if exists (
      select 1
      from public.application_receipts
      where application_id = p_application_id
        and storage_path = p_storage_path
        and uploaded_by = v_actor
    ) then
      return v_application;
    end if;

    raise exception using errcode = 'P0001', message = 'receipt_not_allowed_for_status';
  end if;

  select exists (
    select 1
    from storage.objects
    where bucket_id = 'receipts'
      and name = p_storage_path
      and owner_id = v_actor::text
      and lower(coalesce(metadata ->> 'mimetype', '')) in (
        'image/jpeg',
        'image/png',
        'image/webp'
      )
      and coalesce((metadata ->> 'size')::bigint, 0) between 1 and 10485760
  )
  into v_object_exists;

  if not v_object_exists then
    raise exception using
      errcode = 'P0001',
      message = 'receipt_object_not_found_or_invalid';
  end if;

  insert into public.application_receipts (
    application_id,
    storage_path,
    uploaded_by
  )
  values (
    p_application_id,
    p_storage_path,
    v_actor
  );

  update public.applications
  set status = 'sent'
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

revoke execute on function public.attach_receipt_and_mark_sent(
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.attach_receipt_and_mark_sent(
  uuid,
  text
) to authenticated;

commit;
