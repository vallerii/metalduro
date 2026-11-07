begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

select has_column('public', 'applications', 'contact_phone', 'Calculator contact phone is stored with the application');
select has_column('public', 'applications', 'payment_iban', 'Calculator payout IBAN is stored with the application');
select has_column('public', 'applications', 'preferred_visit_dates', 'Calculator visit dates are stored with the application');

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_application(text,numeric,text,public.delivery_method,uuid,text,boolean,text,text,date[],numeric)',
    'EXECUTE'
  ),
  'Authenticated clients can execute the calculator create RPC overload'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_application(text,numeric,text,public.delivery_method,uuid,text,boolean,text,text,date[],numeric)',
    'EXECUTE'
  ),
  'Anonymous visitors cannot execute the calculator create RPC overload'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '80000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'calculator-client@example.test',
  crypt('Password-123!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Calculator Client","locale":"es"}',
  now(), now(), '', '', '', ''
);

select set_config(
  'request.jwt.claims',
  '{"sub":"80000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

create temporary table calculator_application as
select * from public.create_application(
  'solid', 20, 'Madrid', 'send',
  'e0000000-0000-0000-0000-000000000001'::uuid,
  '+34 600 000 001', true, 'Cliente Prueba',
  'ES00 0000 0000 0000 0000 0000', '{}'::date[], 40
);

select is((select status::text from calculator_application), 'new', 'Calculator creates a new application');
select is((select rate_snapshot_eur from calculator_application), 40.00::numeric, 'Calculator uses the trusted material rate');
select is((select estimated_amount_eur from calculator_application), 800.00::numeric, 'Calculator amount is calculated in PostgreSQL');
select is((select payment_iban from calculator_application), 'ES0000000000000000000000', 'Calculator normalizes the IBAN');
select is(
  (select count(*)::integer from public.application_status_history where application_id = (select id from calculator_application)),
  1,
  'Calculator creation writes one initial history event'
);

select is(
  (select id from public.create_application(
    'solid', 20, 'Madrid', 'send',
    'e0000000-0000-0000-0000-000000000001'::uuid,
    '+34 600 000 001', true, 'Cliente Prueba',
    'ES0000000000000000000000', '{}'::date[], 40
  )),
  (select id from calculator_application),
  'Repeating the calculator intent returns the existing application'
);

select is(
  (select count(*)::integer from public.applications where client_id = '80000000-0000-0000-0000-000000000001'),
  1,
  'A repeated calculator request creates no duplicate'
);

select throws_ok(
  $$select public.create_application(
    'solid', 20, 'Madrid', 'send',
    'e0000000-0000-0000-0000-000000000001'::uuid,
    '+34 600 000 002', true, 'Cliente Prueba',
    'ES0000000000000000000000', '{}'::date[], 40
  )$$,
  '22023', 'idempotency_key_conflict',
  'The calculator key cannot be reused with changed personal input'
);

select throws_ok(
  $$select public.create_application(
    'unknown', 20, 'Madrid', 'send', gen_random_uuid(),
    '+34 600 000 001', false, 'Cliente Prueba',
    'ES0000000000000000000000', '{}'::date[], 40
  )$$,
  '22023', 'material_not_available',
  'An unknown material is rejected'
);

select throws_ok(
  $$select public.create_application(
    'solid', 0, 'Madrid', 'send', gen_random_uuid(),
    '+34 600 000 001', false, 'Cliente Prueba',
    'ES0000000000000000000000', '{}'::date[], 40
  )$$,
  '22023', 'invalid_weight',
  'An invalid calculator weight is rejected'
);

select throws_ok(
  $$select public.create_application(
    'solid', 20, 'Madrid', 'send', gen_random_uuid(),
    '+34 600 000 001', false, 'Cliente Prueba',
    'ES123', '{}'::date[], 40
  )$$,
  '22023', 'invalid_iban',
  'An invalid payout IBAN is rejected'
);

select throws_ok(
  $$select public.create_application(
    'solid', 20, 'Madrid', 'send', gen_random_uuid(),
    '+34 600 000 001', false, 'Cliente Prueba',
    'ES0000000000000000000000', '{}'::date[], 39
  )$$,
  '40001', 'material_rate_changed',
  'A stale browser rate is rejected atomically'
);

select throws_ok(
  format(
    'update public.applications set contact_phone = ''forged'' where id = %L',
    (select id from calculator_application)
  ),
  'P0001', 'immutable_application_intake_fields',
  'Calculator intake fields are immutable after creation'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select public.create_application(
    'solid', 20, 'Madrid', 'send', gen_random_uuid(),
    '+34 600 000 001', false, 'Cliente Prueba',
    'ES0000000000000000000000', '{}'::date[], 40
  )$$,
  '42501', 'permission denied for function create_application',
  'Anonymous callers cannot create a calculator application'
);

reset role;
select * from finish();
rollback;
