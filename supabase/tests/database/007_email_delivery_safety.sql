begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

select has_index(
  'public',
  'notification_outbox',
  'notification_outbox_delivery_safety_idx',
  'Filtered external delivery has a supporting partial index'
);

select has_function(
  'public',
  'claim_notification_jobs_for_delivery',
  array['integer', 'integer', 'text[]', 'timestamp with time zone'],
  'External delivery has a filtered claim RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_notification_jobs_for_delivery(integer,integer,text[],timestamp with time zone)',
    'EXECUTE'
  ),
  'Service role can execute the filtered claim RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_notification_jobs_for_delivery(integer,integer,text[],timestamp with time zone)',
    'EXECUTE'
  ),
  'Authenticated users cannot execute the filtered claim RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.claim_notification_jobs_for_delivery(integer,integer,text[],timestamp with time zone)',
    'EXECUTE'
  ),
  'Anonymous users cannot execute the filtered claim RPC'
);

insert into public.notification_outbox (
  id, event_type, event_key, recipient_email, recipient_locale,
  status, attempts, max_attempts, next_attempt_at, created_at
)
values
  (
    '91000000-0000-4000-8000-000000000001',
    'application_created', 'safety-historical-allowed', 'allowed@example.test', 'es',
    'pending', 0, 5, statement_timestamp() - interval '2 hours',
    statement_timestamp() - interval '2 hours'
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    'application_created', 'safety-current-allowed', 'Allowed@Example.Test', 'es',
    'pending', 0, 5, statement_timestamp(), statement_timestamp()
  ),
  (
    '91000000-0000-4000-8000-000000000003',
    'application_created', 'safety-current-blocked', 'blocked@example.test', 'es',
    'pending', 0, 5, statement_timestamp(), statement_timestamp()
  );

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

create temporary table safety_claim as
select *
from public.claim_notification_jobs_for_delivery(
  10,
  90,
  array['allowed@example.test'],
  statement_timestamp() - interval '1 hour'
);

select is((select count(*)::integer from safety_claim), 1, 'Only one safe row is claimed');
select is(
  (select id from safety_claim),
  '91000000-0000-4000-8000-000000000002'::uuid,
  'The allowlisted row newer than the cutoff is claimed'
);
select is(
  (select status || ':' || attempts::text from public.notification_outbox where id = '91000000-0000-4000-8000-000000000001'),
  'pending:0',
  'Historical allowlisted row remains untouched'
);
select is(
  (select status || ':' || attempts::text from public.notification_outbox where id = '91000000-0000-4000-8000-000000000003'),
  'pending:0',
  'Current non-allowlisted row remains untouched'
);
select throws_ok(
  $$select * from public.claim_notification_jobs_for_delivery(10, 90, array[]::text[], statement_timestamp())$$,
  '22023',
  'invalid_email_recipient_allowlist',
  'An empty allowlist is rejected'
);
select throws_ok(
  $$select * from public.claim_notification_jobs_for_delivery(10, 90, array['allowed@example.test'], null)$$,
  '22023',
  'email_delivery_cutoff_required',
  'A missing delivery cutoff is rejected'
);

reset role;
select * from finish();
rollback;
