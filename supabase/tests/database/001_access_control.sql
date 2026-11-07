begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(30);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'client-a@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Client A","locale":"es"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'client-b@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Client B","locale":"es"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'admin-a@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Admin A","locale":"es"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'admin-b@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Admin B","locale":"es"}',
    now(), now(), '', '', '', ''
  );

update public.profiles
set role = 'admin'
where user_id in (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);

select is(
  (select role::text from public.profiles where user_id = '10000000-0000-0000-0000-000000000001'),
  'client',
  'New Auth users receive the client role'
);

update auth.users
set raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'::jsonb
where id = '10000000-0000-0000-0000-000000000001';

select is(
  (select role::text from public.profiles where user_id = '10000000-0000-0000-0000-000000000001'),
  'client',
  'User metadata cannot elevate a client role'
);

select is(
  (select count(*)::integer from public.materials where active),
  4,
  'Migration seeds the four rates from the existing calculator'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

create temporary table test_application as
select * from public.create_application(
  'solid',
  20,
  'Barcelona',
  'send',
  'a0000000-0000-0000-0000-000000000001'::uuid
);

select is((select status::text from test_application), 'new', 'Client creates a new application');
select is((select rate_snapshot_eur from test_application), 40.00::numeric, 'Trusted rate is snapshotted');
select is((select estimated_amount_eur from test_application), 800.00::numeric, 'Estimate is calculated in PostgreSQL');
select is(
  (select count(*)::integer from public.application_status_history where application_id = (select id from test_application)),
  1,
  'Initial status is written to history'
);

select throws_ok(
  format('select public.claim_application(%L)', (select id from test_application)),
  '42501',
  'admin_required',
  'Client cannot claim an application'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  format('select public.claim_application(%L)', (select id from test_application)),
  'Admin can atomically claim a new application'
);

select is(
  (select status::text from public.applications where id = (select id from test_application)),
  'in_progress',
  'Claim moves the application to in_progress'
);
select is(
  (select manager_id from public.applications where id = (select id from test_application)),
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Claim assigns the calling admin'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  format('select public.claim_application(%L)', (select id from test_application)),
  'P0001',
  'application_not_available',
  'A second admin cannot claim the same application'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

insert into storage.objects (id, bucket_id, name, owner_id, metadata)
values (
  gen_random_uuid(),
  'receipts',
  '10000000-0000-0000-0000-000000000001/' || (select id::text from test_application) || '/receipt',
  '10000000-0000-0000-0000-000000000001',
  '{"mimetype":"image/webp","size":1024}'::jsonb
);

select lives_ok(
  format(
    'select public.attach_receipt_and_mark_sent(%L, %L)',
    (select id from test_application),
    '10000000-0000-0000-0000-000000000001/' || (select id::text from test_application) || '/receipt'
  ),
  'Owner can attach an existing valid private receipt'
);

select is(
  (select status::text from public.applications where id = (select id from test_application)),
  'sent',
  'Receipt finalization moves the application to sent'
);
select is(
  (select count(*)::integer from public.application_receipts where application_id = (select id from test_application)),
  1,
  'Receipt metadata is linked once'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  format('select public.advance_application(%L, ''sent'')', (select id from test_application)),
  '42501',
  'assigned_manager_required',
  'Another admin cannot advance an assigned application'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(format('select public.advance_application(%L, ''sent'')', (select id from test_application)), 'Assigned admin accepts the application');
select lives_ok(format('select public.advance_application(%L, ''accepted'')', (select id from test_application)), 'Assigned admin starts verification');
select lives_ok(format('select public.advance_application(%L, ''verification'')', (select id from test_application)), 'Assigned admin starts payment');

select is(
  (select status::text from public.applications where id = (select id from test_application)),
  'payment',
  'Sequential transitions reach payment'
);
select is(
  (
    select payment_due_at - payment_started_at
    from public.applications
    where id = (select id from test_application)
  ),
  interval '2 hours',
  'Payment deadline is exactly two hours from database time'
);

select lives_ok(format('select public.advance_application(%L, ''payment'')', (select id from test_application)), 'Assigned admin marks payment as paid');

select is(
  (select count(*)::integer from public.application_status_history where application_id = (select id from test_application)),
  7,
  'All seven statuses are recorded exactly once'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'Authenticated users cannot update profile roles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.applications', 'UPDATE'),
  'Authenticated users cannot update application fields directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.application_status_history', 'INSERT,UPDATE,DELETE'),
  'Authenticated users cannot mutate history directly'
);
select ok(
  not has_function_privilege('authenticated', 'private.current_author_name()', 'EXECUTE'),
  'Authenticated users cannot execute private helper functions directly'
);
select ok(
  not has_table_privilege('anon', 'public.applications', 'SELECT,INSERT,UPDATE,DELETE'),
  'Anonymous users have no application privileges'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.applications),
  0,
  'RLS hides another client application'
);
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'receipts'),
  0,
  'Storage RLS hides another client receipt'
);

reset role;
select * from finish();
rollback;
