# Supabase database tests

Run these tests only against the isolated local Supabase stack:

```bash
npx supabase start
npx supabase db reset
npm run test:supabase:db
npm run test:supabase:concurrency
npm run test:supabase:integration
```

`database/001_access_control.sql` verifies role defaults, trusted price calculation,
RLS isolation, immutable critical tables, receipt finalization, the seven ordered
statuses, the two-hour database deadline, and repeated claim rejection.

`database/002_extended_security.sql` verifies direct-query denial, storage isolation,
receipt immutability, skipped-transition rejection, deadline protection, and cross-user
access through the actual authenticated role.

`database/003_client_account.sql` verifies idempotent application creation, deterministic
receipt paths, retry-safe receipt finalization, and database time used by the client
payment countdown.

`database/004_admin_dashboard.sql` verifies indexed display references, immutable role
snapshots in status history, cross-admin read access, and the prohibition on reclaiming,
reassigning, advancing, or rewriting another manager's work.

`database/008_pricing_management.sql` verifies admin-only rate changes, immutable audit
history, public price visibility, two-decimal validation, idempotent repeated saves, and
preservation of historical application snapshots.

The migration implements claiming as one conditional `UPDATE`:

```sql
update public.applications
set manager_id = auth.uid(), status = 'in_progress'
where id = p_application_id
  and status = 'new'
  and manager_id is null;
```

This is the concurrency control itself: concurrent transactions contend for the same
row and only one can match the predicate. `concurrency_claim.ps1` reproduces that race with
two PostgreSQL sessions and verifies that exactly one call succeeds.

`scripts/test-supabase-integration.mjs` uses only the local Supabase stack, Mailpit, and a
locally running production build of Next.js. It does not send external email and never
prints local keys.
