# Pricing management migration plan

Target migration: `20261109000100_pricing_management.sql`.

This is an additive change. It creates one singleton public-price table, one immutable
audit table, two narrow admin RPCs, policies, grants and indexes. It does not modify
existing applications or their `rate_snapshot_eur` / `estimated_amount_eur` values.

## Preflight

1. Confirm the linked Project Ref is the approved staging project.
2. Confirm migration history contains the six existing versions and no unknown version.
3. Record counts for `materials`, `applications` and the six expected migration rows.
4. Run `npx supabase db push --linked --dry-run` and require exactly
   `20261109000100_pricing_management.sql` in the plan; no seed or roles.
5. Review `npx supabase db diff --linked --schema public,private` output. Expected
   differences are limited to the two tables, two RPCs, one trigger, two indexes,
   policies and grants described above.
6. Re-run the full local migration, pgTAP and integration suite before requesting a
   separate cloud-write approval.

## Apply and verify (requires separate approval)

Apply once with `npx supabase db push --linked` without `--yes`, `--include-all` or
`--include-seed`. Afterwards verify the seventh migration row, RLS, RPC signatures,
EXECUTE grants, the four unchanged material rates, and the initial public value
`25.00 / 2026-11-09`. A second dry-run must be empty.

## Rollback considerations

There is intentionally no automatic down migration. If the migration has not been
used, a separately reviewed rollback may revoke/drop the two RPCs and policies before
dropping the new tables. Once audit rows or admin-managed values exist, keep the data
and deploy a forward migration instead. Never roll back by resetting the database or
by updating historical application snapshots. Export the public setting and audit
rows before any exceptional rollback.
