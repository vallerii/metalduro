begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(36);

select has_column('public', 'notification_outbox', 'event_key', 'Outbox has a unique business event key');
select has_column('public', 'notification_outbox', 'status', 'Outbox tracks delivery status');
select has_column('public', 'notification_outbox', 'lease_token', 'Outbox supports worker leases');
select has_column('public', 'notification_outbox', 'provider_message_id', 'Outbox stores the provider message id');

select ok(
  has_function_privilege('service_role', 'public.claim_notification_jobs(integer,integer)', 'EXECUTE'),
  'Service role can execute the worker claim RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_notification_jobs(integer,integer)', 'EXECUTE'),
  'Authenticated browser users cannot execute the worker claim RPC'
);
select ok(
  not has_function_privilege('anon', 'public.enqueue_overdue_payment_notifications(integer)', 'EXECUTE'),
  'Anonymous users cannot execute the overdue scan'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'notification-client@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Notification Client","locale":"es"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'notification-admin-a@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Notification Admin A","locale":"es"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'notification-admin-b@example.test',
    crypt('Password-123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Notification Admin B","locale":"ru"}',
    now(), now(), '', '', '', ''
  );

update public.profiles
set role = 'admin'
where user_id in (
  '90000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000003'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

set local role authenticated;
select throws_ok(
  $$select count(*) from public.notification_outbox$$,
  '42501', 'permission denied for table notification_outbox',
  'Clients cannot read the notification outbox'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select count(*) from public.notification_outbox$$,
  '42501', 'permission denied for table notification_outbox',
  'Admins cannot read the system outbox from the browser role'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

create temporary table notification_application as
select * from public.create_application(
  'solid', 10, 'Madrid', 'send',
  'f0000000-0000-0000-0000-000000000001'::uuid
);
grant select on notification_application to authenticated;
grant select on notification_application to service_role;

select is(
  (select count(*)::integer from public.notification_outbox where event_type = 'application_created' and application_id = (select id from notification_application)),
  2,
  'Application creation enqueues one event for each active admin'
);
select ok(
  not exists (
    select 1 from public.notification_outbox
    where application_id = (select id from notification_application)
      and payload::text ilike '%iban%'
  ),
  'Notification payloads contain no IBAN field'
);

select public.create_application(
  'solid', 10, 'Madrid', 'send',
  'f0000000-0000-0000-0000-000000000001'::uuid
);
select is(
  (select count(*)::integer from public.notification_outbox where event_type = 'application_created' and application_id = (select id from notification_application)),
  2,
  'Idempotent application retry creates no duplicate notifications'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select public.claim_application((select id from notification_application));

select is(
  (select count(*)::integer from public.notification_outbox where event_type = 'application_claimed' and application_id = (select id from notification_application)),
  1,
  'Claiming enqueues exactly one client notification'
);
select is(
  (select recipient_user_id from public.notification_outbox where event_type = 'application_claimed' and application_id = (select id from notification_application)),
  '90000000-0000-0000-0000-000000000001'::uuid,
  'Claim notification is addressed to the client'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
insert into storage.objects (id, bucket_id, name, owner_id, metadata)
values (
  gen_random_uuid(),
  'receipts',
  '90000000-0000-0000-0000-000000000001/' || (select id::text from notification_application) || '/receipt',
  '90000000-0000-0000-0000-000000000001',
  '{"mimetype":"image/png","size":512}'::jsonb
);
reset role;
select public.attach_receipt_and_mark_sent(
  (select id from notification_application),
  '90000000-0000-0000-0000-000000000001/' || (select id::text from notification_application) || '/receipt'
);

select is(
  (select count(*)::integer from public.notification_outbox where event_type = 'receipt_uploaded' and application_id = (select id from notification_application)),
  1,
  'Receipt finalization enqueues one notification'
);
select is(
  (select recipient_user_id from public.notification_outbox where event_type = 'receipt_uploaded' and application_id = (select id from notification_application)),
  '90000000-0000-0000-0000-000000000002'::uuid,
  'Receipt notification is addressed to the assigned manager'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select public.advance_application((select id from notification_application), 'sent');
select public.advance_application((select id from notification_application), 'accepted');
select public.advance_application((select id from notification_application), 'verification');

select is(
  (select count(*)::integer from public.notification_outbox where event_type = 'payment_started' and application_id = (select id from notification_application)),
  1,
  'Starting payment enqueues one client notification'
);
select ok(
  (select payload ? 'payment_due_at' from public.notification_outbox where event_type = 'payment_started' and application_id = (select id from notification_application)),
  'Payment notification includes the database deadline'
);

select public.advance_application((select id from notification_application), 'payment');
select is(
  (select count(*)::integer from public.notification_outbox where event_type = 'application_paid' and application_id = (select id from notification_application)),
  1,
  'Paid transition enqueues one client notification'
);

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(
  public.enqueue_overdue_payment_notifications(100),
  0,
  'A paid application never generates an overdue event'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
create temporary table overdue_application as
select * from public.create_application(
  'scrap', 12, 'Valencia', 'pickup',
  'f0000000-0000-0000-0000-000000000002'::uuid
);
grant select on overdue_application to authenticated;
grant select on overdue_application to service_role;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select public.claim_application((select id from overdue_application));

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
insert into storage.objects (id, bucket_id, name, owner_id, metadata)
values (
  gen_random_uuid(),
  'receipts',
  '90000000-0000-0000-0000-000000000001/' || (select id::text from overdue_application) || '/receipt',
  '90000000-0000-0000-0000-000000000001',
  '{"mimetype":"image/webp","size":512}'::jsonb
);
reset role;
select public.attach_receipt_and_mark_sent(
  (select id from overdue_application),
  '90000000-0000-0000-0000-000000000001/' || (select id::text from overdue_application) || '/receipt'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select public.advance_application((select id from overdue_application), 'sent');
select public.advance_application((select id from overdue_application), 'accepted');
select public.advance_application((select id from overdue_application), 'verification');

alter table public.applications disable trigger applications_enforce_transition;
update public.applications
set payment_started_at = statement_timestamp() - interval '3 hours',
    payment_due_at = statement_timestamp() - interval '1 hour'
where id = (select id from overdue_application);
alter table public.applications enable trigger applications_enforce_transition;

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.enqueue_overdue_payment_notifications(100), 1, 'Overdue scan enqueues one event');
select is(public.enqueue_overdue_payment_notifications(100), 0, 'Repeated overdue scan is idempotent');
select is(
  (select count(*)::integer from public.notification_outbox where event_type = 'payment_overdue' and application_id = (select id from overdue_application)),
  1,
  'Only one overdue notification exists per application and manager'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select public.advance_application((select id from overdue_application), 'payment');

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.enqueue_overdue_payment_notifications(100), 0, 'Paid overdue application creates no new event');
update public.notification_outbox
set next_attempt_at = statement_timestamp() + interval '1 day'
where status = 'pending'
  and event_type <> 'payment_overdue';
select * from public.claim_notification_jobs(50, 90);
select is(
  (select status from public.notification_outbox where event_type = 'payment_overdue' and application_id = (select id from overdue_application)),
  'cancelled',
  'Pending overdue event is cancelled when the application is already paid'
);

update public.notification_outbox
set next_attempt_at = statement_timestamp()
where status = 'pending';
create temporary table first_worker_claim as
select * from public.claim_notification_jobs(1, 90);
create temporary table second_worker_claim as
select * from public.claim_notification_jobs(1, 90);

select is((select count(*)::integer from first_worker_claim), 1, 'Worker atomically claims one queued notification');
select isnt(
  (select id from first_worker_claim),
  (select id from second_worker_claim),
  'A second worker cannot claim the same leased event'
);
select ok(
  public.validate_notification_job((select id from first_worker_claim), (select lease_token from first_worker_claim)),
  'Worker validates a current leased event before sending'
);
select ok(
  public.complete_notification_job((select id from first_worker_claim), (select lease_token from first_worker_claim), 'mock', 'mock-message-1'),
  'Worker completes a notification with its lease token'
);
select is(
  (select status || ':' || provider_name from public.notification_outbox where id = (select id from first_worker_claim)),
  'sent:mock',
  'Successful delivery result is stored in the outbox'
);

select ok(
  public.fail_notification_job((select id from second_worker_claim), (select lease_token from second_worker_claim), false, 'mock_temporary_failure', 1),
  'Temporary provider failure releases the lease safely'
);
select is(
  (select status from public.notification_outbox where id = (select id from second_worker_claim)),
  'pending',
  'Temporary failure schedules a retry'
);

update public.notification_outbox
set attempts = max_attempts - 1,
    next_attempt_at = statement_timestamp()
where id = (select id from second_worker_claim);
update public.notification_outbox
set next_attempt_at = statement_timestamp() + interval '1 day'
where status = 'pending'
  and id <> (select id from second_worker_claim);
create temporary table terminal_worker_claim as
select * from public.claim_notification_jobs(1, 90);
select ok(
  public.fail_notification_job((select id from terminal_worker_claim), (select lease_token from terminal_worker_claim), false, 'mock_temporary_failure', 1),
  'Final temporary failure is recorded'
);
select is(
  (select status from public.notification_outbox where id = (select id from terminal_worker_claim)),
  'failed',
  'Exhausted notification moves to the terminal failed state'
);
select ok(
  public.retry_notification_job((select id from terminal_worker_claim)),
  'A trusted worker can manually requeue a terminal failure'
);
select is(
  (select status || ':' || attempts::text from public.notification_outbox where id = (select id from terminal_worker_claim)),
  'pending:0',
  'Manual retry resets the failed job safely'
);

reset role;
select * from finish();
rollback;
