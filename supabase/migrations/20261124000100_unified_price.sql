begin;

-- One price for every kind of carbide, like the original metalduro.es.
-- site_public_pricing is the single source; materials.rate_eur is kept equal to it
-- so the calculator and create_application keep working unchanged.

update public.materials m
set rate_eur = p.price_eur_per_kg
from public.site_public_pricing p
where p.id = 'default'
  and m.rate_eur is distinct from p.price_eur_per_kg;

comment on table public.site_public_pricing is
  'Single price per kg for all carbide. Every materials.rate_eur is kept equal to it by update_unified_price().';

create function public.update_unified_price(p_price_eur_per_kg numeric)
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

  select * into v_current
  from public.site_public_pricing
  where id = 'default'
  for update;

  if v_current.id is null then
    raise exception using errcode = 'P0002', message = 'public_pricing_not_found';
  end if;

  v_new_price := round(p_price_eur_per_kg, 2);

  perform 1 from public.materials for update;
  update public.materials
  set rate_eur = v_new_price
  where rate_eur is distinct from v_new_price;

  if v_current.price_eur_per_kg = v_new_price then
    return v_current;
  end if;

  update public.site_public_pricing
  set price_eur_per_kg = v_new_price,
      price_date = (now() at time zone 'Europe/Madrid')::date,
      updated_by = v_actor
  where id = 'default'
  returning * into v_updated;

  insert into public.pricing_change_history (
    target_kind, changed_by, old_rate_eur, new_rate_eur,
    old_price_date, new_price_date
  ) values (
    'public_price', v_actor, v_current.price_eur_per_kg, v_new_price,
    v_current.price_date, v_updated.price_date
  );

  return v_updated;
end;
$$;

revoke execute on function public.update_unified_price(numeric) from public, anon, authenticated;
grant execute on function public.update_unified_price(numeric) to authenticated;

-- Per-material rates and a separate "informational" price would let the values diverge again.
revoke execute on function public.update_material_rate(text, numeric) from authenticated;
revoke execute on function public.update_public_pricing(numeric, date) from authenticated;

commit;
