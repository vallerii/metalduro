begin;

alter table public.applications
  add column contact_phone text,
  add column repeat_customer boolean not null default false,
  add column payment_recipient_name text,
  add column payment_iban text,
  add column preferred_visit_dates date[] not null default '{}';

alter table public.applications
  add constraint applications_contact_phone_check
    check (contact_phone is null or length(contact_phone) between 6 and 32),
  add constraint applications_payment_recipient_name_check
    check (payment_recipient_name is null or length(payment_recipient_name) between 2 and 120),
  add constraint applications_payment_iban_check
    check (payment_iban is null or payment_iban ~ '^ES[0-9]{22}$'),
  add constraint applications_preferred_visit_dates_count_check
    check (cardinality(preferred_visit_dates) <= 6),
  add constraint applications_delivery_intake_check
    check (
      (delivery_method = 'send'
        and contact_phone is not null
        and payment_recipient_name is not null
        and payment_iban is not null
        and cardinality(preferred_visit_dates) = 0)
      or (delivery_method in ('pickup', 'warehouse')
        and contact_phone is not null
        and payment_recipient_name is null
        and payment_iban is null)
      or (contact_phone is null
        and payment_recipient_name is null
        and payment_iban is null
        and cardinality(preferred_visit_dates) = 0)
      or delivery_method is null
    );

comment on column public.applications.contact_phone is
  'Contact phone supplied for this application. Never persisted in public browser draft storage.';
comment on column public.applications.payment_iban is
  'Normalized Spanish IBAN supplied after authentication for the payout workflow.';
comment on column public.applications.preferred_visit_dates is
  'Optional future dates proposed by the client for pickup or warehouse delivery.';

create function private.enforce_application_intake_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.city is distinct from new.city
    or old.delivery_method is distinct from new.delivery_method
    or old.contact_phone is distinct from new.contact_phone
    or old.repeat_customer is distinct from new.repeat_customer
    or old.payment_recipient_name is distinct from new.payment_recipient_name
    or old.payment_iban is distinct from new.payment_iban
    or old.preferred_visit_dates is distinct from new.preferred_visit_dates
    or old.idempotency_key is distinct from new.idempotency_key then
    raise exception using errcode = 'P0001', message = 'immutable_application_intake_fields';
  end if;
  return new;
end;
$$;

create trigger applications_enforce_intake_immutability
before update on public.applications
for each row execute function private.enforce_application_intake_immutability();

revoke execute on function private.enforce_application_intake_immutability()
from public, anon, authenticated;

create function public.create_application(
  p_material_id text,
  p_declared_weight_kg numeric,
  p_city text,
  p_delivery_method public.delivery_method,
  p_idempotency_key uuid,
  p_contact_phone text,
  p_repeat_customer boolean,
  p_payment_recipient_name text,
  p_payment_iban text,
  p_preferred_visit_dates date[],
  p_expected_rate_eur numeric
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
  v_phone text := nullif(trim(p_contact_phone), '');
  v_recipient text := nullif(trim(p_payment_recipient_name), '');
  v_iban text := nullif(upper(regexp_replace(coalesce(p_payment_iban, ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_visit_dates date[] := coalesce(p_preferred_visit_dates, '{}');
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

  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'idempotency_key_required';
  end if;

  if p_declared_weight_kg is null
    or p_declared_weight_kg < 5
    or p_declared_weight_kg > 100000 then
    raise exception using errcode = '22023', message = 'invalid_weight';
  end if;

  if v_city is not null and length(v_city) > 160 then
    raise exception using errcode = '22023', message = 'invalid_city';
  end if;

  if v_phone is null or length(v_phone) not between 6 and 32 then
    raise exception using errcode = '22023', message = 'invalid_phone';
  end if;

  if cardinality(v_visit_dates) > 6
    or exists (
      select 1 from unnest(v_visit_dates) as proposed(day)
      where proposed.day < current_date or proposed.day > current_date + 90
    ) then
    raise exception using errcode = '22023', message = 'invalid_visit_dates';
  end if;

  if p_delivery_method = 'send' then
    if v_recipient is null or length(v_recipient) not between 2 and 120 then
      raise exception using errcode = '22023', message = 'invalid_payment_recipient';
    end if;
    if v_iban is null or v_iban !~ '^ES[0-9]{22}$' then
      raise exception using errcode = '22023', message = 'invalid_iban';
    end if;
    v_visit_dates := '{}';
  elsif p_delivery_method in ('pickup', 'warehouse') then
    v_recipient := null;
    v_iban := null;
  else
    raise exception using errcode = '22023', message = 'invalid_delivery_method';
  end if;

  select * into v_application
  from public.applications
  where client_id = v_actor and idempotency_key = p_idempotency_key;

  if v_application.id is not null then
    if v_application.material_id is distinct from p_material_id
      or v_application.declared_weight_kg is distinct from p_declared_weight_kg
      or v_application.city is distinct from v_city
      or v_application.delivery_method is distinct from p_delivery_method
      or v_application.contact_phone is distinct from v_phone
      or v_application.repeat_customer is distinct from coalesce(p_repeat_customer, false)
      or v_application.payment_recipient_name is distinct from v_recipient
      or v_application.payment_iban is distinct from v_iban
      or v_application.preferred_visit_dates is distinct from v_visit_dates then
      raise exception using errcode = '22023', message = 'idempotency_key_conflict';
    end if;
    return v_application;
  end if;

  select rate_eur into v_rate
  from public.materials
  where id = p_material_id and active;
  if v_rate is null then
    raise exception using errcode = '22023', message = 'material_not_available';
  end if;
  if p_expected_rate_eur is null
    or v_rate is distinct from round(p_expected_rate_eur, 2) then
    raise exception using errcode = '40001', message = 'material_rate_changed';
  end if;

  insert into public.applications (
    client_id, material_id, declared_weight_kg, rate_snapshot_eur,
    estimated_amount_eur, city, delivery_method, idempotency_key,
    contact_phone, repeat_customer, payment_recipient_name, payment_iban,
    preferred_visit_dates
  ) values (
    v_actor, p_material_id, p_declared_weight_kg, v_rate,
    round(p_declared_weight_kg * v_rate, 2), v_city, p_delivery_method,
    p_idempotency_key, v_phone, coalesce(p_repeat_customer, false),
    v_recipient, v_iban, v_visit_dates
  )
  on conflict (client_id, idempotency_key) do nothing
  returning * into v_application;

  if v_application.id is null then
    select * into v_application
    from public.applications
    where client_id = v_actor and idempotency_key = p_idempotency_key;
    if v_application.id is null then
      raise exception using errcode = '40001', message = 'idempotent_create_retry_required';
    end if;
    if v_application.material_id is distinct from p_material_id
      or v_application.declared_weight_kg is distinct from p_declared_weight_kg
      or v_application.city is distinct from v_city
      or v_application.delivery_method is distinct from p_delivery_method
      or v_application.contact_phone is distinct from v_phone
      or v_application.repeat_customer is distinct from coalesce(p_repeat_customer, false)
      or v_application.payment_recipient_name is distinct from v_recipient
      or v_application.payment_iban is distinct from v_iban
      or v_application.preferred_visit_dates is distinct from v_visit_dates then
      raise exception using errcode = '22023', message = 'idempotency_key_conflict';
    end if;
  end if;
  return v_application;
end;
$$;

revoke execute on function public.create_application(
  text, numeric, text, public.delivery_method, uuid,
  text, boolean, text, text, date[], numeric
) from public, anon, authenticated;

grant execute on function public.create_application(
  text, numeric, text, public.delivery_method, uuid,
  text, boolean, text, text, date[], numeric
) to authenticated;

commit;
