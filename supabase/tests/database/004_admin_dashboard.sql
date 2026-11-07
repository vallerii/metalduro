begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

select has_column(
  'public',
  'applications',
  'reference_code',
  'Applications expose an indexed display reference'
);

select has_index(
  'public',
  'applications',
  'applications_reference_code_idx',
  'Application display references are indexed'
);

select has_column(
  'public',
  'application_status_history',
  'author_role_snapshot',
  'Status history stores the author role snapshot'
);

select col_not_null(
  'public',
  'application_status_history',
  'author_role_snapshot',
  'History author role snapshots are required'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.advance_application(uuid,public.application_status)',
    'EXECUTE'
  ),
  'Authenticated users can call the expected-status advance RPC'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.advance_application(uuid)',
    'EXECUTE'
  ),
  'The legacy advance RPC without expected status is revoked'
);

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
    '70000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin-dashboard-client@example.test',
    crypt('Password-123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Dashboard Client","locale":"es"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '70000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'admin-dashboard-a@example.test',
    crypt('Password-123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Dashboard Admin A","locale":"es"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '70000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'admin-dashboard-b@example.test',
    crypt('Password-123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Dashboard Admin B","locale":"es"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

update public.profiles
set role = 'admin'
where user_id in (
  '70000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000003'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

create temporary table dashboard_application as
select *
from public.create_application(
  'solid',
  3,
  null,
  null,
  'd0000000-0000-0000-0000-000000000001'::uuid
);

grant select on dashboard_application to authenticated;

select matches(
  (select reference_code from dashboard_application),
  '^[0-9A-F]{8}$',
  'Application reference is an eight-character uppercase hexadecimal value'
);

select is(
  (
    select author_role_snapshot::text
    from public.application_status_history
    where application_id = (select id from dashboard_application)
      and to_status = 'new'
  ),
  'client',
  'Initial history records the client role snapshot'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  format(
    'select public.claim_application(%L)',
    (select id from dashboard_application)
  ),
  'Admin A claims a dashboard application'
);

select is(
  (
    select author_role_snapshot::text
    from public.application_status_history
    where application_id = (select id from dashboard_application)
      and to_status = 'in_progress'
  ),
  'admin',
  'Claim history records the admin role snapshot'
);

select throws_ok(
  format(
    'select public.advance_application(%L, ''new'')',
    (select id from dashboard_application)
  ),
  '40001',
  'application_status_changed',
  'A stale administrative action cannot advance a changed status'
);

set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.applications
    where id = (select id from dashboard_application)
  ),
  1,
  'Assigned admin can read the claimed application'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.applications
    where id = (select id from dashboard_application)
  ),
  1,
  'Other admins can read assigned applications'
);

reset role;

select throws_ok(
  format(
    'select public.advance_application(%L, ''in_progress'')',
    (select id from dashboard_application)
  ),
  '42501',
  'assigned_manager_required',
  'Other admins cannot advance an assigned application'
);

select throws_ok(
  format(
    'select public.claim_application(%L)',
    (select id from dashboard_application)
  ),
  'P0001',
  'application_not_available',
  'Other admins cannot reclaim an assigned application'
);

set local role authenticated;

select throws_ok(
  format(
    'update public.applications set manager_id = %L where id = %L',
    '70000000-0000-0000-0000-000000000003',
    (select id from dashboard_application)
  ),
  '42501',
  'permission denied for table applications',
  'Admins cannot reassign applications with direct table updates'
);

select throws_ok(
  format(
    'update public.application_status_history set author_name_snapshot = ''Forged'' where application_id = %L',
    (select id from dashboard_application)
  ),
  '42501',
  'permission denied for table application_status_history',
  'Admins cannot rewrite status history'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.application_status_history
    where application_id = (select id from dashboard_application)
  ),
  2,
  'Claiming creates exactly one additional history event'
);

select * from finish();
rollback;
