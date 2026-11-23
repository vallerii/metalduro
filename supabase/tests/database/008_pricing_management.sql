begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(31);

select has_table('public', 'site_public_pricing', 'Public pricing table exists');
select has_table('public', 'pricing_change_history', 'Pricing audit table exists');
select has_function('public', 'update_material_rate', array['text', 'numeric'], 'Material rate RPC exists');
select has_function('public', 'update_public_pricing', array['numeric', 'date'], 'Public price RPC exists');
select ok(not has_function_privilege('anon', 'public.update_material_rate(text,numeric)', 'EXECUTE'), 'Anon cannot execute material rate RPC');
select ok(not has_function_privilege('anon', 'public.update_public_pricing(numeric,date)', 'EXECUTE'), 'Anon cannot execute public price RPC');
select ok(has_function_privilege('authenticated', 'public.update_material_rate(text,numeric)', 'EXECUTE'), 'Authenticated role can reach guarded material rate RPC');
select ok(has_function_privilege('authenticated', 'public.update_public_pricing(numeric,date)', 'EXECUTE'), 'Authenticated role can reach guarded public price RPC');
select is(
  (select price_eur_per_kg::text || ':' || price_date::text from public.site_public_pricing where id = 'default'),
  '25.00:2026-11-09',
  'Public pricing starts at the approved value and date'
);
select is(
  (select string_agg(id || ':' || rate_eur::text, ',' order by id) from public.materials),
  'inserts:36.00,mixed:30.00,scrap:34.00,solid:40.00',
  'Existing material rates remain unchanged by the migration'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000', '98000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'pricing-client@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Pricing Client"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', '98000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'pricing-admin@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Pricing Admin"}',
    now(), now(), '', '', '', ''
  );

update public.profiles set role = 'admin'
where user_id = '98000000-0000-4000-8000-000000000002';

create temporary table pricing_test_application (id uuid primary key);
grant select, insert on table pricing_test_application to authenticated;

select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$select * from public.update_material_rate('solid', 41.00)$$, '42501', 'admin_required', 'Client cannot change a material rate through RPC');
select throws_ok($$select * from public.update_public_pricing(26.00, date '2026-11-10')$$, '42501', 'admin_required', 'Client cannot change public pricing through RPC');
select throws_ok($$update public.materials set rate_eur = 41.00 where id = 'solid'$$, '42501', 'permission denied for table materials', 'Client cannot update materials directly');

insert into pricing_test_application (id)
select (public.create_application(
  'solid', 20, 'Barcelona', 'send',
  '98000000-0000-4000-8000-000000000010',
  '+34900000000', false, 'Pricing Client',
  'ES0000000000000000000000', array[]::date[], 40.00
)).id;

reset role;
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is((select rate_eur from public.update_material_rate('solid', 41.00)), 41.00::numeric, 'Admin changes one material rate through the guarded RPC');
select is((select rate_eur from public.materials where id = 'solid'), 41.00::numeric, 'Material rate is updated');
select is((select count(*)::integer from public.pricing_change_history where target_kind = 'material_rate'), 1, 'Material rate change creates one audit row');
select is(
  (select changed_by from public.pricing_change_history where target_kind = 'material_rate'),
  '98000000-0000-4000-8000-000000000002'::uuid,
  'Audit row records the authenticated admin'
);
select is(
  (select old_rate_eur::text || ':' || new_rate_eur::text from public.pricing_change_history where target_kind = 'material_rate'),
  '40.00:41.00',
  'Audit row records old and new material rates'
);

select * from public.update_material_rate('solid', 41.00);
select is((select count(*)::integer from public.pricing_change_history where target_kind = 'material_rate'), 1, 'Repeated identical save is idempotent and does not duplicate audit history');

select is((select price_eur_per_kg from public.update_public_pricing(26.50, date '2026-11-10')), 26.50::numeric, 'Admin changes public pricing through the guarded RPC');
select is(
  (select price_eur_per_kg::text || ':' || price_date::text from public.site_public_pricing where id = 'default'),
  '26.50:2026-11-10',
  'Public pricing row stores the new value and date'
);
select is(
  (select old_rate_eur::text || ':' || new_rate_eur::text || ':' || old_price_date::text || ':' || new_price_date::text from public.pricing_change_history where target_kind = 'public_price'),
  '25.00:26.50:2026-11-09:2026-11-10',
  'Public price audit records both values and dates'
);
select throws_ok($$select * from public.update_material_rate('solid', 41.001)$$, '22023', 'invalid_material_rate', 'Rates with more than two decimals are rejected');
select throws_ok($$select * from public.update_public_pricing(-1, date '2026-11-10')$$, '22023', 'invalid_public_price', 'Negative public pricing is rejected');
select throws_ok(
  $$insert into public.pricing_change_history (target_kind, material_id, changed_by, old_rate_eur, new_rate_eur) values ('material_rate', 'solid', auth.uid(), 1, 2)$$,
  '42501', 'permission denied for table pricing_change_history', 'Admin cannot forge audit rows directly'
);
select is(
  (select rate_snapshot_eur from public.applications where id = (select id from pricing_test_application)),
  40.00::numeric,
  'Existing application keeps its historical rate snapshot'
);
select is(
  (select estimated_amount_eur from public.applications where id = (select id from pricing_test_application)),
  800.00::numeric,
  'Existing application keeps its historical estimated amount'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  (public.create_application(
    'solid', 20, 'Madrid', 'send',
    '98000000-0000-4000-8000-000000000011',
    '+34900000000', false, 'Pricing Client',
    'ES0000000000000000000000', array[]::date[], 41.00
  )).rate_snapshot_eur,
  41.00::numeric,
  'New applications use the updated material rate after explicit reconfirmation'
);
select is(
  (public.create_application(
    'solid', 20, 'Madrid', 'send',
    '98000000-0000-4000-8000-000000000011',
    '+34900000000', false, 'Pricing Client',
    'ES0000000000000000000000', array[]::date[], 41.00
  )).estimated_amount_eur,
  820.00::numeric,
  'Server calculates the new application amount from the updated trusted rate'
);
select is((select count(*)::integer from public.pricing_change_history), 0, 'Client cannot read pricing audit history through RLS');
select is((select count(*)::integer from public.site_public_pricing), 1, 'Client can read the public informational price');

reset role;
select * from finish();
rollback;
