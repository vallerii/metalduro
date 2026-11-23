# Metalduro staging test-data cleanup

This is a reviewed cleanup plan, not an automatic cleanup script. Nothing in this document should be run against production. The only permitted target is staging project `lavmldzccvctmegasobz` (`metalduro-dev`).

## Recorded Stage 4.5 scope

The scope is defined by exact immutable identifiers, not only by email patterns.

### Auth users and profiles

- client A: `95846cfe-892d-4525-b8ae-649c761171d5`
- client B: `76763ae0-1c16-42bb-b315-97497b86ca6c`
- admin A: `673efe8b-c785-42be-bbfb-38fce2f8bbcf`
- admin B: `1f37a32c-bc37-4497-b31c-cab60c45a09f`

### Applications

- `2b308451-6728-473b-b4d7-677eed3174d7`
- `c8a935e1-7265-4bc3-b6de-0a696330d273`
- `d4936daf-c1ad-45fb-8268-fa9b4f93e9a5`
- `3daafa48-3751-4ba3-877e-765d4df6b279`
- `61d6b8ad-f2eb-4fc6-bd20-13561c810755`
- `ac4eaef0-0e19-44da-83f9-856a47c395fa`
- `dc1c795d-ae9d-4864-ba92-51888cd5febf`

### Receipt and Storage object

- receipt row: `bb3fcacc-eba5-4a8e-bdb9-9ebc3bb0f703`
- bucket: `receipts`
- object path: `95846cfe-892d-4525-b8ae-649c761171d5/dc1c795d-ae9d-4864-ba92-51888cd5febf/receipt`

Expected related rows before cleanup:

- 4 Auth users and 4 profiles;
- 7 applications;
- 13 status-history rows;
- 1 receipt row and 1 Storage object;
- 18 notification-outbox rows with 18 unique `event_key` values, all `pending`.

## Mandatory dry-run

Run read-only inventory first with a trusted database operator. Abort if any assertion differs. Do not weaken the assertions to make cleanup continue.

```sql
with target_users(id) as (
  values
    ('95846cfe-892d-4525-b8ae-649c761171d5'::uuid),
    ('76763ae0-1c16-42bb-b315-97497b86ca6c'::uuid),
    ('673efe8b-c785-42be-bbfb-38fce2f8bbcf'::uuid),
    ('1f37a32c-bc37-4497-b31c-cab60c45a09f'::uuid)
), target_applications(id) as (
  values
    ('2b308451-6728-473b-b4d7-677eed3174d7'::uuid),
    ('c8a935e1-7265-4bc3-b6de-0a696330d273'::uuid),
    ('d4936daf-c1ad-45fb-8268-fa9b4f93e9a5'::uuid),
    ('3daafa48-3751-4ba3-877e-765d4df6b279'::uuid),
    ('61d6b8ad-f2eb-4fc6-bd20-13561c810755'::uuid),
    ('ac4eaef0-0e19-44da-83f9-856a47c395fa'::uuid),
    ('dc1c795d-ae9d-4864-ba92-51888cd5febf'::uuid)
)
select
  (select count(*) from auth.users where id in (select id from target_users)) as auth_users,
  (select count(*) from public.profiles where user_id in (select id from target_users)) as profiles,
  (select count(*) from public.applications where id in (select id from target_applications)) as applications,
  (select count(*) from public.application_status_history where application_id in (select id from target_applications)) as history,
  (select count(*) from public.application_receipts where application_id in (select id from target_applications)) as receipts,
  (select count(*) from public.notification_outbox where application_id in (select id from target_applications)) as outbox,
  (select count(distinct event_key) from public.notification_outbox where application_id in (select id from target_applications)) as unique_event_keys,
  (select count(*) from public.notification_outbox where application_id in (select id from target_applications) and status <> 'pending') as non_pending_outbox,
  (select count(*) from public.applications where (client_id in (select id from target_users) or manager_id in (select id from target_users)) and id not in (select id from target_applications)) as unexpected_user_applications,
  (select count(*) from public.application_status_history where changed_by in (select id from target_users) and application_id not in (select id from target_applications)) as unexpected_user_history;
```

Expected result: `4, 4, 7, 13, 1, 18, 18, 0, 0, 0`.

Also list the exact rows before approving deletion:

```sql
select id, client_id, manager_id, status, created_at
from public.applications
where id = any(array[
  '2b308451-6728-473b-b4d7-677eed3174d7',
  'c8a935e1-7265-4bc3-b6de-0a696330d273',
  'd4936daf-c1ad-45fb-8268-fa9b4f93e9a5',
  '3daafa48-3751-4ba3-877e-765d4df6b279',
  '61d6b8ad-f2eb-4fc6-bd20-13561c810755',
  'ac4eaef0-0e19-44da-83f9-856a47c395fa',
  'dc1c795d-ae9d-4864-ba92-51888cd5febf'
]::uuid[])
order by created_at, id;
```

Use the Storage Admin API to list the exact recorded path and verify that there is exactly one object. Do not delete objects by user-prefix or wildcard.

## Approved-order cleanup procedure

This procedure requires a separate owner approval.

1. Re-run the dry-run and store only counts and IDs in the operator log.
2. Stop the notification worker and keep `EMAIL_EXTERNAL_DELIVERY_ENABLED=false`.
3. In one database transaction, delete the seven exact application IDs. Foreign keys intentionally cascade their history, receipt metadata and outbox rows. Do not disable triggers or constraints.
4. Verify that exactly 7 applications, 13 history rows, 1 receipt row and 18 outbox rows disappeared, and that no row outside the target set changed.
5. Remove the one exact object path from bucket `receipts` through the supported Storage Admin API. Do not delete directly from `storage.objects`.
6. Delete the four exact Auth users through the Supabase Auth Admin API. Their now-unreferenced profile rows cascade from `auth.users`.
7. Verify the four Auth UUIDs and profiles are absent and that global non-target counts are unchanged.
8. Run the outbox inventory again before enabling any external delivery.

### Database transaction template — do not run without approval

The template deliberately ends with `rollback`. It verifies the exact graph, executes the cascade only inside the uncommitted transaction, verifies the result, and restores everything. A separately approved operator run may replace the final `rollback` with `commit` only after comparing the dry-run output again.

```sql
begin;

do $$
declare
  v_users constant uuid[] := array[
    '95846cfe-892d-4525-b8ae-649c761171d5',
    '76763ae0-1c16-42bb-b315-97497b86ca6c',
    '673efe8b-c785-42be-bbfb-38fce2f8bbcf',
    '1f37a32c-bc37-4497-b31c-cab60c45a09f'
  ]::uuid[];
  v_apps constant uuid[] := array[
    '2b308451-6728-473b-b4d7-677eed3174d7',
    'c8a935e1-7265-4bc3-b6de-0a696330d273',
    'd4936daf-c1ad-45fb-8268-fa9b4f93e9a5',
    '3daafa48-3751-4ba3-877e-765d4df6b279',
    '61d6b8ad-f2eb-4fc6-bd20-13561c810755',
    'ac4eaef0-0e19-44da-83f9-856a47c395fa',
    'dc1c795d-ae9d-4864-ba92-51888cd5febf'
  ]::uuid[];
begin
  if (select count(*) from auth.users where id = any(v_users)) <> 4
    or (select count(*) from public.profiles where user_id = any(v_users)) <> 4
    or (select count(*) from public.applications where id = any(v_apps)) <> 7
    or (select count(*) from public.application_status_history where application_id = any(v_apps)) <> 13
    or (select count(*) from public.application_receipts where application_id = any(v_apps)) <> 1
    or (select count(*) from public.notification_outbox where application_id = any(v_apps)) <> 18
    or (select count(distinct event_key) from public.notification_outbox where application_id = any(v_apps)) <> 18
    or exists (select 1 from public.notification_outbox where application_id = any(v_apps) and status <> 'pending')
    or exists (
      select 1 from public.applications
      where (client_id = any(v_users) or manager_id = any(v_users)) and id <> all(v_apps)
    )
    or exists (
      select 1 from public.application_status_history
      where changed_by = any(v_users) and application_id <> all(v_apps)
    )
    or exists (
      select 1 from public.application_receipts
      where uploaded_by = any(v_users) and application_id <> all(v_apps)
    ) then
    raise exception 'staging cleanup aborted: target graph differs from the reviewed inventory';
  end if;
end;
$$;

do $$
declare
  v_deleted integer;
begin
  delete from public.applications
  where id = any(array[
    '2b308451-6728-473b-b4d7-677eed3174d7',
    'c8a935e1-7265-4bc3-b6de-0a696330d273',
    'd4936daf-c1ad-45fb-8268-fa9b4f93e9a5',
    '3daafa48-3751-4ba3-877e-765d4df6b279',
    '61d6b8ad-f2eb-4fc6-bd20-13561c810755',
    'ac4eaef0-0e19-44da-83f9-856a47c395fa',
    'dc1c795d-ae9d-4864-ba92-51888cd5febf'
  ]::uuid[]);
  get diagnostics v_deleted = row_count;
  if v_deleted <> 7 then
    raise exception 'staging cleanup aborted: deleted % applications instead of 7', v_deleted;
  end if;
end;
$$;

do $$
declare
  v_apps constant uuid[] := array[
    '2b308451-6728-473b-b4d7-677eed3174d7',
    'c8a935e1-7265-4bc3-b6de-0a696330d273',
    'd4936daf-c1ad-45fb-8268-fa9b4f93e9a5',
    '3daafa48-3751-4ba3-877e-765d4df6b279',
    '61d6b8ad-f2eb-4fc6-bd20-13561c810755',
    'ac4eaef0-0e19-44da-83f9-856a47c395fa',
    'dc1c795d-ae9d-4864-ba92-51888cd5febf'
  ]::uuid[];
begin
  if exists (select 1 from public.applications where id = any(v_apps))
    or exists (select 1 from public.application_status_history where application_id = any(v_apps))
    or exists (select 1 from public.application_receipts where application_id = any(v_apps))
    or exists (select 1 from public.notification_outbox where application_id = any(v_apps)) then
    raise exception 'staging cleanup aborted: related database rows remain';
  end if;
end;
$$;

rollback;
```

Do not delete directly from `auth.users` in this transaction: the application foreign keys intentionally use `restrict`, and Auth deletion belongs to the supported Admin API after application data has been removed. Do not delete directly from `storage.objects`; use the Storage API for the one exact path. Do not disable triggers or constraints, use `db reset`, `migration repair`, broad email matching, a domain wildcard, or a recursive Storage prefix deletion.

## Minimal trusted privileges

- Database cleanup: a trusted database operator capable of deleting the exact `public.applications` rows and reading the related tables.
- Storage cleanup: server-side Supabase secret/service-role credential, used only for the exact `receipts` object path.
- Auth cleanup: Supabase Auth Admin API credential, used only for the four exact UUIDs.

Browser `anon`, `authenticated`, client and admin sessions are intentionally insufficient. Credentials must be supplied through a protected operator environment and never included in this document or command history.

## Future E2E runs

Delete the current Stage 4.5 identities before the first real-email staging test. Keeping them would preserve 18 historical pending notifications and creates avoidable ambiguity around recipient allowlists.

Future runs should create fresh accounts with an explicit `STAGING_E2E_RUN_ID`. The E2E script writes a password-free manifest containing the exact users, applications, Storage paths and outbox IDs. A failed run can be resumed only with that same run ID. Cleanup must use the manifest IDs plus a fresh relational dry-run; the manifest alone is not authority to delete data.

Long-lived QA accounts are reasonable only if the owner explicitly chooses that model. In that case they should be clearly named, kept inactive outside test windows, excluded from external-delivery allowlists by default, and their generated outbox rows must be cleaned or cancelled under a separately approved policy.

## Executable cleanup tool

The operator tool is `scripts/staging-cleanup.mjs`. It is intentionally not exposed as an npm cleanup command and has two separate modes.

### Preview mode (read-only)

Preview validates the locally linked Project Ref, obtains a fresh read-only remote schema dump, compares the exact FK/trigger graph, recursively lists the private `receipts` bucket and reads only IDs/relationships needed for cleanup. It never selects or writes email, phone or banking fields.

Supply the staging service credential through the current process environment without printing it, then run:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://lavmldzccvctmegasobz.supabase.co'
node scripts/staging-cleanup.mjs preview `
  --project-ref lavmldzccvctmegasobz `
  --output 'C:\secure-operator-path\staging-cleanup-preview.json'
```

The output is a machine-readable manifest with exact target IDs, a canonical snapshot hash and schema dependency details. Preview refuses to continue if any user, profile, application, relation, outbox event or Storage object differs from the reviewed scope.

### Execute mode (prepared, not yet approved)

Do not run this command until the owner separately approves deletion and a fresh preview still matches. The service credential and URL must already be present in the trusted operator process environment.

```powershell
node scripts/staging-cleanup.mjs execute `
  --project-ref lavmldzccvctmegasobz `
  --manifest 'C:\secure-operator-path\staging-cleanup-preview.json' `
  --manifest-sha256 '<EXACT_PREVIEW_FILE_SHA256>' `
  --state 'C:\secure-operator-path\staging-cleanup-progress.json' `
  --execute-approved
```

The tool then requires an interactive TTY and the exact typed phrase shown by the prompt. It revalidates the manifest file hash, live schema and live data snapshot before creating the progress file.

The supported order is:

1. Delete the seven exact `applications` IDs in one PostgREST statement. Database FK cascades remove the 13 history rows, one receipt metadata row and 18 outbox rows atomically. No business trigger or FK is disabled.
2. Remove the one exact receipt path through the official Storage API.
3. Delete each of the four exact Auth UUIDs through the Auth Admin API. The associated profiles then cascade from `auth.users`.
4. Verify that all target objects are absent and no unknown objects appeared.

The progress file is written after every external step. A retry uses the same manifest hash and state file, validates the exact remaining subset and continues without repeating completed database, Storage or Auth steps. A missing progress file combined with partially deleted live data is treated as an error rather than guessed.

## Legacy notification claim RPC

`public.claim_notification_jobs(integer, integer)` remains `SECURITY DEFINER` with an empty `search_path`; `PUBLIC`, `anon` and `authenticated` have no execute privilege and only `service_role` can call it. The application worker uses it only for the local mock provider. Brevo mode has no fallback and calls only `claim_notification_jobs_for_delivery`, which enforces the recipient allowlist and cutoff in PostgreSQL.

The legacy RPC therefore does not create a browser-role bypass, but it is broader than the external-delivery RPC for a holder of the service credential. A future defense-in-depth migration may revoke `service_role` execution and remove the legacy RPC only after local mock tests and the mock worker are migrated to an explicitly filtered test-only claim path. That change should be versioned and tested separately; it is not part of this cleanup and must not be applied ad hoc to staging.
