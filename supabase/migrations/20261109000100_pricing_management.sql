begin;

create table public.site_public_pricing (
  id text primary key default 'default' check (id = 'default'),
  price_eur_per_kg numeric(10, 2) not null
    check (price_eur_per_kg >= 0.01 and price_eur_per_kg <= 10000),
  price_date date not null check (price_date between date '2000-01-01' and date '2100-12-31'),
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.site_public_pricing is
  'Public informational price shown on the website. Material-specific calculations continue to use materials.rate_eur.';

insert into public.site_public_pricing (id, price_eur_per_kg, price_date, updated_by)
values ('default', 25.00, date '2026-11-09', '00000000-0000-0000-0000-000000000000')
on conflict (id) do nothing;

create table public.pricing_change_history (
  id bigint generated always as identity primary key,
  target_kind text not null check (target_kind in ('material_rate', 'public_price')),
  material_id text references public.materials(id) on update restrict on delete restrict,
  changed_by uuid not null,
  old_rate_eur numeric(10, 2) not null,
  new_rate_eur numeric(10, 2) not null,
  old_price_date date,
  new_price_date date,
  created_at timestamptz not null default now(),
  check (
    (target_kind = 'material_rate' and material_id is not null and old_price_date is null and new_price_date is null)
    or
    (target_kind = 'public_price' and material_id is null and old_price_date is not null and new_price_date is not null)
  )
);

comment on table public.pricing_change_history is
  'Immutable audit log for material rates and the informational public price. Contains no client personal data.';

create index pricing_change_history_created_idx
  on public.pricing_change_history (created_at desc, id desc);
create index pricing_change_history_material_idx
  on public.pricing_change_history (material_id, created_at desc)
  where material_id is not null;

create trigger site_public_pricing_set_updated_at
before update on public.site_public_pricing
for each row execute function private.set_updated_at();

alter table public.site_public_pricing enable row level security;
alter table public.pricing_change_history enable row level security;

create policy site_public_pricing_select
on public.site_public_pricing for select to anon, authenticated
using (true);

create policy materials_select_admin
on public.materials for select to authenticated
using ((select private.is_admin()));

create policy pricing_change_history_select_admin
on public.pricing_change_history for select to authenticated
using ((select private.is_admin()));

revoke all on table public.site_public_pricing from anon, authenticated;
revoke all on table public.pricing_change_history from anon, authenticated;
grant select on table public.site_public_pricing to anon, authenticated;
grant select on table public.pricing_change_history to authenticated;

create function public.update_material_rate(
  p_material_id text,
  p_new_rate_eur numeric
)
returns public.materials
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_material public.materials;
  v_old_rate numeric(10, 2);
  v_new_rate numeric(10, 2);
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_material_id is null or p_material_id !~ '^[a-z][a-z0-9_-]{1,49}$' then
    raise exception using errcode = '22023', message = 'invalid_material_id';
  end if;
  if p_new_rate_eur is null
    or p_new_rate_eur < 0.01
    or p_new_rate_eur > 10000
    or p_new_rate_eur <> round(p_new_rate_eur, 2) then
    raise exception using errcode = '22023', message = 'invalid_material_rate';
  end if;

  select * into v_material
  from public.materials
  where id = p_material_id
  for update;

  if v_material.id is null then
    raise exception using errcode = 'P0002', message = 'material_not_found';
  end if;

  v_old_rate := v_material.rate_eur;
  v_new_rate := round(p_new_rate_eur, 2);
  if v_material.rate_eur = v_new_rate then
    return v_material;
  end if;

  update public.materials
  set rate_eur = v_new_rate
  where id = v_material.id
  returning * into v_material;

  insert into public.pricing_change_history (
    target_kind, material_id, changed_by, old_rate_eur, new_rate_eur
  ) values (
    'material_rate', v_material.id, v_actor, v_old_rate, v_new_rate
  );

  return v_material;
end;
$$;

create function public.update_public_pricing(
  p_price_eur_per_kg numeric,
  p_price_date date
)
returns public.site_public_pricing
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_current public.site_public_pricing;
  v_updated public.site_public_pricing;
  v_new_price numeric(10, 2);
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_price_eur_per_kg is null
    or p_price_eur_per_kg < 0.01
    or p_price_eur_per_kg > 10000
    or p_price_eur_per_kg <> round(p_price_eur_per_kg, 2) then
    raise exception using errcode = '22023', message = 'invalid_public_price';
  end if;
  if p_price_date is null
    or p_price_date < date '2000-01-01'
    or p_price_date > date '2100-12-31' then
    raise exception using errcode = '22023', message = 'invalid_public_price_date';
  end if;

  select * into v_current
  from public.site_public_pricing
  where id = 'default'
  for update;

  if v_current.id is null then
    raise exception using errcode = 'P0002', message = 'public_pricing_not_found';
  end if;

  v_new_price := round(p_price_eur_per_kg, 2);
  if v_current.price_eur_per_kg = v_new_price and v_current.price_date = p_price_date then
    return v_current;
  end if;

  update public.site_public_pricing
  set price_eur_per_kg = v_new_price,
      price_date = p_price_date,
      updated_by = v_actor
  where id = 'default'
  returning * into v_updated;

  insert into public.pricing_change_history (
    target_kind, changed_by, old_rate_eur, new_rate_eur,
    old_price_date, new_price_date
  ) values (
    'public_price', v_actor, v_current.price_eur_per_kg, v_new_price,
    v_current.price_date, p_price_date
  );

  return v_updated;
end;
$$;

revoke execute on function public.update_material_rate(text, numeric)
from public, anon, authenticated;
revoke execute on function public.update_public_pricing(numeric, date)
from public, anon, authenticated;
grant execute on function public.update_material_rate(text, numeric) to authenticated;
grant execute on function public.update_public_pricing(numeric, date) to authenticated;

commit;
