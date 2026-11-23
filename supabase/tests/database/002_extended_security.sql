begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(32);

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
    '30000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'extended-client-a@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Extended Client A","locale":"es","role":"admin"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'extended-client-b@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Extended Client B","locale":"es"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'extended-admin-a@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Extended Admin A","locale":"es"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'extended-admin-b@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Extended Admin B","locale":"es"}',
    now(), now(), '', '', '', ''
  );

update public.profiles
set role = 'admin'
where user_id in (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002'
);

select is(
  (select role::text from public.profiles where user_id = '30000000-0000-0000-0000-000000000001'),
  'client',
  'Registration metadata cannot assign the admin role'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select set_config(
  'test.application_id',
  (
    select id::text
    from public.create_application(
      'inserts',
      10,
      'Madrid',
      'send',
      'b0000000-0000-0000-0000-000000000001'::uuid
    )
  ),
  true
);

select is(
  (select status::text from public.applications where id = current_setting('test.application_id')::uuid),
  'new',
  'Client A creates an isolated new application'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.applications where id = current_setting('test.application_id')::uuid),
  0,
  'Client B cannot read Client A application'
);

select throws_ok(
  format(
    'update public.applications set status = ''sent'' where id = %L',
    current_setting('test.application_id')
  ),
  '42501',
  'permission denied for table applications',
  'Client B cannot change application status directly'
);

select throws_ok(
  format('select public.advance_application(%L, ''new'')', current_setting('test.application_id')),
  '42501',
  'admin_required',
  'Client B cannot advance another client application through RPC'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  format('select public.claim_application(%L)', current_setting('test.application_id')),
  'Admin A claims the application'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  format('select public.claim_application(%L)', current_setting('test.application_id')),
  'P0001',
  'application_not_available',
  'Admin B cannot claim an assigned application'
);

select throws_ok(
  format('select public.advance_application(%L, ''in_progress'')', current_setting('test.application_id')),
  '42501',
  'assigned_manager_required',
  'Admin B cannot advance Admin A application'
);

set local role authenticated;
select throws_ok(
  format(
    'update public.applications set declared_weight_kg = 999 where id = %L',
    current_setting('test.application_id')
  ),
  '42501',
  'permission denied for table applications',
  'Authenticated admins cannot change critical application fields directly'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'select public.attach_receipt_and_mark_sent(%L, %L)',
    current_setting('test.application_id'),
    '30000000-0000-0000-0000-000000000001/' || current_setting('test.application_id') || '/receipt'
  ),
  'P0001',
  'receipt_object_not_found_or_invalid',
  'Application cannot become sent without an existing receipt object'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'insert into storage.objects (id, bucket_id, name, owner_id, metadata) values (gen_random_uuid(), ''receipts'', %L, %L, ''{"mimetype":"image/webp","size":1024}''::jsonb)',
    '30000000-0000-0000-0000-000000000002/' || current_setting('test.application_id') || '/foreign.webp',
    '30000000-0000-0000-0000-000000000002'
  ),
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Client B cannot upload a receipt for Client A application'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  format(
    'insert into storage.objects (id, bucket_id, name, owner_id, metadata) values (gen_random_uuid(), ''receipts'', %L, %L, ''{"mimetype":"image/webp","size":1024}''::jsonb)',
    '30000000-0000-0000-0000-000000000001/' || current_setting('test.application_id') || '/receipt',
    '30000000-0000-0000-0000-000000000001'
  ),
  'Client A can upload a receipt at the in_progress stage'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'receipts'),
  1,
  'Client A can read the uploaded receipt object'
);

update storage.objects
set metadata = '{"mimetype":"image/png","size":512}'::jsonb
where bucket_id = 'receipts'
  and name = '30000000-0000-0000-0000-000000000001/' || current_setting('test.application_id') || '/receipt';

select is(
  (
    select metadata ->> 'mimetype'
    from storage.objects
    where bucket_id = 'receipts'
      and name = '30000000-0000-0000-0000-000000000001/' || current_setting('test.application_id') || '/receipt'
  ),
  'image/webp',
  'Client cannot overwrite an uploaded receipt object'
);

reset role;
insert into storage.objects (id, bucket_id, name, owner_id, metadata)
values (
  gen_random_uuid(),
  'receipts',
  '30000000-0000-0000-0000-000000000002/' || current_setting('test.application_id') || '/foreign.webp',
  '30000000-0000-0000-0000-000000000002',
  '{"mimetype":"image/webp","size":1024}'::jsonb
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'select public.attach_receipt_and_mark_sent(%L, %L)',
    current_setting('test.application_id'),
    '30000000-0000-0000-0000-000000000002/' || current_setting('test.application_id') || '/foreign.webp'
  ),
  '22023',
  'invalid_receipt_path',
  'Client A cannot attach Client B storage object'
);

select lives_ok(
  format(
    'select public.attach_receipt_and_mark_sent(%L, %L)',
    current_setting('test.application_id'),
    '30000000-0000-0000-0000-000000000001/' || current_setting('test.application_id') || '/receipt'
  ),
  'Client A attaches the valid receipt and marks the application sent'
);

select is(
  (select count(*)::integer from public.application_receipts where application_id = current_setting('test.application_id')::uuid),
  1,
  'Exactly one receipt record is linked to the application'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'update public.applications set status = ''verification'' where id = %L',
    current_setting('test.application_id')
  ),
  'P0001',
  'invalid_status_transition',
  'Even a privileged direct query cannot skip sent to verification'
);

select lives_ok(
  format('select public.advance_application(%L, ''sent'')', current_setting('test.application_id')),
  'Admin A advances sent to accepted'
);

select throws_ok(
  format(
    'update public.applications set status = ''payment'' where id = %L',
    current_setting('test.application_id')
  ),
  'P0001',
  'invalid_status_transition',
  'Even a privileged direct query cannot skip accepted to payment'
);

select lives_ok(
  format('select public.advance_application(%L, ''accepted'')', current_setting('test.application_id')),
  'Admin A advances accepted to verification'
);

select lives_ok(
  format('select public.advance_application(%L, ''verification'')', current_setting('test.application_id')),
  'Admin A advances verification to payment'
);

select is(
  (
    select payment_due_at - payment_started_at
    from public.applications
    where id = current_setting('test.application_id')::uuid
  ),
  interval '2 hours',
  'Database creates an exact two-hour payment deadline'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'update public.applications set payment_due_at = now() + interval ''10 hours'' where id = %L',
    current_setting('test.application_id')
  ),
  '42501',
  'permission denied for table applications',
  'Client cannot change the payment deadline directly'
);

select throws_ok(
  format(
    'delete from public.application_status_history where application_id = %L',
    current_setting('test.application_id')
  ),
  '42501',
  'permission denied for table application_status_history',
  'Client cannot mutate status history'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.application_receipts where application_id = current_setting('test.application_id')::uuid),
  0,
  'Client B cannot read Client A receipt metadata'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'receipts'),
  0,
  'Client B cannot read Client A private receipt object'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  format('select public.advance_application(%L, ''payment'')', current_setting('test.application_id')),
  '42501',
  'assigned_manager_required',
  'Admin B still cannot complete Admin A payment'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  format('select public.advance_application(%L, ''payment'')', current_setting('test.application_id')),
  'Admin A marks the payment paid'
);

select is(
  (select count(*)::integer from public.application_status_history where application_id = current_setting('test.application_id')::uuid),
  7,
  'History contains every status exactly once'
);

select is(
  (
    select status::text
    from public.applications
    where id = current_setting('test.application_id')::uuid
  ),
  'paid',
  'Application and receipt workflow finishes in a consistent paid state'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select public.create_application('solid', 1, null, null)$$,
  '42501',
  'permission denied for function create_application',
  'Anonymous users cannot execute application RPC functions'
);

reset role;
select * from finish();
rollback;
