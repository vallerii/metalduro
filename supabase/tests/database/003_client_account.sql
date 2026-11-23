begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

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
    '60000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'stage2-client@example.test',
    crypt('Password-123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Stage 2 Client","locale":"es"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'stage2-admin@example.test',
    crypt('Password-123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Stage 2 Admin","locale":"es"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

update public.profiles
set role = 'admin'
where user_id = '60000000-0000-0000-0000-000000000002';

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_application(text,numeric,text,public.delivery_method,uuid)',
    'EXECUTE'
  ),
  'Authenticated clients can execute the idempotent create RPC'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_application(text,numeric,text,public.delivery_method)',
    'EXECUTE'
  ),
  'The legacy non-idempotent create RPC is no longer exposed'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_server_time()',
    'EXECUTE'
  ),
  'Authenticated users can read database time for the countdown'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

create temporary table stage2_application as
select *
from public.create_application(
  'solid',
  5,
  null,
  null,
  'c0000000-0000-0000-0000-000000000001'::uuid
);

grant select on stage2_application to authenticated;

select is(
  (select status::text from stage2_application),
  'new',
  'Idempotent creation produces a new application'
);

select is(
  (
    select id
    from public.create_application(
      'solid',
      5,
      null,
      null,
      'c0000000-0000-0000-0000-000000000001'::uuid
    )
  ),
  (select id from stage2_application),
  'Repeating the same request returns the original application'
);

select is(
  (
    select count(*)::integer
    from public.applications
    where client_id = '60000000-0000-0000-0000-000000000001'
  ),
  1,
  'Repeated creation does not add a duplicate application'
);

select is(
  (
    select count(*)::integer
    from public.application_status_history
    where application_id = (select id from stage2_application)
  ),
  1,
  'Repeated creation does not duplicate initial history'
);

select throws_ok(
  $$select public.create_application(
    'scrap',
    6,
    null,
    null,
    'c0000000-0000-0000-0000-000000000001'::uuid
  )$$,
  '22023',
  'idempotency_key_conflict',
  'An idempotency key cannot be reused with different input'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  format(
    'select public.claim_application(%L)',
    (select id from stage2_application)
  ),
  'Admin claims the Stage 2 application'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    'insert into storage.objects (id,bucket_id,name,owner_id,metadata) values (gen_random_uuid(),''receipts'',%L,%L,''{"mimetype":"image/png","size":512}''::jsonb)',
    '60000000-0000-0000-0000-000000000001/' || (select id::text from stage2_application) || '/receipt.png',
    '60000000-0000-0000-0000-000000000001'
  ),
  '42501',
  'new row violates row-level security policy for table "objects"',
  'Storage rejects a non-deterministic receipt filename'
);

select lives_ok(
  format(
    'insert into storage.objects (id,bucket_id,name,owner_id,metadata) values (gen_random_uuid(),''receipts'',%L,%L,''{"mimetype":"image/png","size":512}''::jsonb)',
    '60000000-0000-0000-0000-000000000001/' || (select id::text from stage2_application) || '/receipt',
    '60000000-0000-0000-0000-000000000001'
  ),
  'Storage accepts the single deterministic receipt path'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  format(
    'select public.attach_receipt_and_mark_sent(%L,%L)',
    (select id from stage2_application),
    '60000000-0000-0000-0000-000000000001/' || (select id::text from stage2_application) || '/receipt'
  ),
  'Client finalizes the deterministic receipt'
);

select lives_ok(
  format(
    'select public.attach_receipt_and_mark_sent(%L,%L)',
    (select id from stage2_application),
    '60000000-0000-0000-0000-000000000001/' || (select id::text from stage2_application) || '/receipt'
  ),
  'Receipt finalization is idempotent after an uncertain response'
);

select is(
  (
    select count(*)::integer
    from public.application_receipts
    where application_id = (select id from stage2_application)
  ),
  1,
  'Idempotent finalization keeps exactly one receipt record'
);

select is(
  (
    select status::text
    from public.applications
    where id = (select id from stage2_application)
  ),
  'sent',
  'Idempotent finalization keeps the application sent'
);

select is(
  (
    select count(*)::integer
    from public.application_status_history
    where application_id = (select id from stage2_application)
  ),
  3,
  'Idempotent finalization does not duplicate status history'
);

select ok(
  abs(extract(epoch from (public.get_server_time() - statement_timestamp()))) < 1,
  'Database time RPC returns the current PostgreSQL time'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select public.create_application(
    'solid',
    1,
    null,
    null,
    'c0000000-0000-0000-0000-000000000002'::uuid
  )$$,
  '42501',
  'permission denied for function create_application',
  'Anonymous users cannot execute the idempotent create RPC'
);

reset role;
select * from finish();
rollback;
