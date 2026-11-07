# Metalduro staging preflight

This document is the safety gate between the tested local stack and a future hosted
Supabase staging project. It does not authorize a cloud migration, SMTP activation,
real email delivery, user creation, cron activation or deployment.

## Current baseline

- Git branch: `feature/client-admin-cabinets`.
- Git baseline: `672fece77988e83b9be865588d3cc2fac9ff3c1f`.
- Supabase CLI used by the project: `2.122.0`.
- Local `project_id = "metalduro"` is only the Docker stack name. It is not a hosted
  project reference.
- `supabase/.temp/project-ref` is intentionally absent until a staging target is
  verified.
- Database seed execution is disabled in `supabase/config.toml`.
- Email delivery must remain on `EMAIL_PROVIDER=mock` during preflight.

## Migration order

The hosted staging project must be empty or its existing objects must be reviewed
before any write is authorized. The expected order is:

1. `20261027000100_initial_auth_and_applications.sql`
2. `20261102000100_client_account_safety.sql`
3. `20261102000200_admin_dashboard_support.sql`
4. `20261102000300_public_calculator_intake.sql`
5. `20261102000400_email_notification_outbox.sql`

Do not pass `--include-seed`; test accounts and pgTAP files are not migrations.

## Required target identity

Before linking, the owner must provide and independently verify:

- Dashboard project name: expected `metalduro-dev`;
- staging Project Ref;
- staging region;
- database password through a secure channel;
- a Supabase CLI access token through the local environment or `supabase login`.

The Project Ref printed by `supabase projects list --output-format json` must match
the Dashboard value. Never infer a ref from the project name or URL.

## Read-only commands after explicit authorization

Run these commands from the repository root. Inspect the target before proceeding
to the next command:

```powershell
npx supabase projects list --output-format json
npx supabase link --project-ref <STAGING_PROJECT_REF>
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

`link` writes the verified ref to local CLI state and performs a connection check;
it does not apply migrations. It must still be performed only after the staging ref
has been approved. Do not use `migration repair`, `db reset`, `--include-seed`,
`--include-all` or a production database URL during preflight.

The dry-run output must list exactly the five migrations above. If the remote
migration history is non-empty, if unexpected tables/policies/functions exist, or if
the target identity is ambiguous, stop and review instead of applying changes.

## Future apply command

Only after a separate approval and a clean dry-run:

```powershell
npx supabase db push --linked
```

Before executing it, print the linked Project Ref and compare it with the approved
staging ref. This command would create the application schema, roles, RLS policies,
RPC functions, private `receipts` bucket, material rows, application intake fields,
status history and notification outbox. It must never be run against production as
part of this preflight.

## Runtime environment

Public values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

Server-only values:

```text
SUPABASE_SECRET_KEY
EMAIL_PROVIDER=mock
EMAIL_WORKER_SECRET
EMAIL_WORKER_BATCH_SIZE
NOTIFICATION_WORKER_URL
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
BREVO_TIMEOUT_MS
```

`SUPABASE_SECRET_KEY` is required only by the trusted notification worker. The code
supports `SUPABASE_SERVICE_ROLE_KEY` as a legacy server-only fallback, but staging
should use one server credential, prefer the current secret key, and never expose
either under a `NEXT_PUBLIC_` name. Brevo variables may remain empty while the
provider is `mock`.

CLI-only secrets such as `SUPABASE_ACCESS_TOKEN` and the database password are not
application runtime variables and must not be stored in repository env files.

## Auth values for local testing against hosted staging

Choose one browser origin and use it consistently. The simplest local choice is:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3000
Site URL=http://localhost:3000
Redirect URL=http://localhost:3000/auth/confirm
```

An additional `http://127.0.0.1:3000/auth/confirm` redirect may be registered, but do
not mix `localhost` and `127.0.0.1` within one PKCE flow because cookies are scoped
to the host. No production URL should be added until deployment is approved.

Enable email confirmation and password recovery. Keep the confirmation, recovery
and invite templates compatible with `{{ .ConfirmationURL }}` and the existing
`/auth/confirm` handler. Do not create real clients or employees during preflight.

The first admin is created only after migrations are applied: create an Auth user
manually, verify its generated `profiles` row, then promote that exact `user_id` with
a reviewed SQL statement as documented in `SUPABASE_SETUP.md`. Public metadata and
the registration form must never assign `admin`.

## Storage checks

The first migration creates a private `receipts` bucket with a 10 MiB limit and only
JPEG, PNG and WebP MIME types. Object policies require an authenticated owner,
application ownership, `in_progress` status and the canonical path
`<user-id>/<application-id>/receipt`. Finalization revalidates the object, MIME type,
size and path in PostgreSQL.

After a future migration apply, verify the bucket remains private and test with
synthetic accounts only. Do not create public URLs.

## Email and worker checks

- Keep `EMAIL_PROVIDER=mock` until Brevo staging recipients and sender verification
  are separately approved.
- `BREVO_API_KEY`, `SUPABASE_SECRET_KEY` and `EMAIL_WORKER_SECRET` are server-only.
- The route `/api/internal/notifications/process` requires an independent bearer
  secret of at least 32 characters.
- No cron is configured by the repository.
- The outbox uses unique event keys, leases, bounded retries and revalidation, but
  Brevo API acceptance is not proof of inbox delivery and external exactly-once
  delivery is not guaranteed.
- Operators may inspect `id`, `event_type`, `application_id`, `status`, `attempts`,
  `next_attempt_at`, `processed_at`, `provider_name` and `last_error`. Avoid selecting
  `recipient_email`, payloads or provider identifiers into shared logs.

## Business decisions required before staging data entry

1. Confirm material rates seeded by migration: 36/40/34/30 EUR per kg.
2. Confirm whether payments remain Spain-only. The current validated format is
   exactly `ES` followed by 22 digits; other countries require a new migration and
   product decision.
3. Define retention, export, anonymization and deletion rules for profiles,
   applications, receipt objects, status history and notification recipient
   snapshots. Current foreign keys deliberately prevent casual deletion of users
   referenced by business records.
4. Confirm which employees may view full phone and payment details. Current admin
   RLS grants active admins access to all applications for operational processing.
5. Select a staging deployment URL, worker scheduler, alert owner and cadence before
   enabling a cron.
6. Approve synthetic staging email recipients and a Brevo sender before changing
   the provider from `mock`.
