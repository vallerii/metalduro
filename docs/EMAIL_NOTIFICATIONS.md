# Metalduro email notifications

This document describes the transactional application-email pipeline. Supabase Auth email is configured separately in `BREVO_SETUP.md`.

## Architecture

1. A protected PostgreSQL RPC creates or advances an application.
2. An `AFTER INSERT` or `AFTER UPDATE OF status` trigger inserts a recipient-specific row into `public.notification_outbox` in the same transaction.
3. The business transaction commits without contacting an email provider.
4. A separate worker run reserves a bounded batch with `FOR UPDATE SKIP LOCKED`. Brevo mode additionally filters claims by an exact recipient allowlist and a creation-time cutoff.
5. The worker renders escaped HTML and plain text, validates conditional events, and calls either the mock provider or Brevo.
6. The worker completes, retries, fails, or cancels the leased row using the lease token.

Provider downtime therefore never rolls back an application that has already committed. A database failure while enqueueing does roll back the business transaction so that a committed transition cannot silently lose its notification event.

## Events

| Event | Recipient | Created when |
| --- | --- | --- |
| `application_created` | every active admin | application is inserted as `new` |
| `application_claimed` | client | `new → in_progress` |
| `receipt_uploaded` | assigned manager | `in_progress → sent` after receipt finalization |
| `payment_started` | client | `verification → payment` |
| `application_paid` | client | `payment → paid` |
| `payment_overdue` | assigned manager | periodic scan finds `payment_due_at < database time` while status remains `payment` |

Each row has a unique `event_key` containing the event, application and recipient. Retrying an idempotent application operation or an overdue scan cannot insert the same recipient event twice.

Payloads contain only the data required to render the notification: application reference, material/weight where needed, manager name, creation time, and payment deadline. They never contain an IBAN, receipt image, Storage URL, Auth token, password or provider secret.

## Outbox states and leases

- `pending`: eligible after `next_attempt_at`.
- `processing`: reserved with a unique `lease_token` and `lease_expires_at`.
- `sent`: provider accepted the request and returned a message identifier.
- `failed`: permanent error or maximum attempts reached.
- `cancelled`: a conditional event is no longer current, for example an overdue application that became paid.

Claims increment `attempts`. Expired leases are reclaimable while attempts remain. An expired lease at the maximum attempt count becomes terminal. A worker can only complete or fail the row with the token returned by its own claim.

Temporary failures use database-controlled exponential backoff with jitter. HTTP 429 also respects a bounded `Retry-After`. Permanent 4xx errors are not retried. The default maximum is five attempts.

Before sending `payment_overdue`, the worker checks the current application status, manager and deadline again. Paid or reassigned applications are cancelled instead of emailed.

## Server-only configuration

Copy placeholders from `.env.example` into the deployment secret store or a non-committed `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=https://example.com

SUPABASE_SECRET_KEY=
EMAIL_WORKER_SECRET=
EMAIL_WORKER_BATCH_SIZE=10
EMAIL_PROVIDER=mock
EMAIL_EXTERNAL_DELIVERY_ENABLED=false
EMAIL_RECIPIENT_ALLOWLIST=
EMAIL_DELIVERY_NOT_BEFORE=

BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Metalduro
BREVO_TIMEOUT_MS=10000
```

`SUPABASE_SECRET_KEY`, `EMAIL_WORKER_SECRET` and every Brevo variable are server-only. Never add `NEXT_PUBLIC_` to them. `EMAIL_WORKER_SECRET` must be a random value of at least 32 characters and independent from the Supabase and Brevo keys.

Brevo mode requires all three independent safety controls:

- `EMAIL_EXTERNAL_DELIVERY_ENABLED=true` — an explicit operator decision;
- `EMAIL_RECIPIENT_ALLOWLIST` — comma/semicolon/whitespace-separated exact addresses, maximum 100;
- `EMAIL_DELIVERY_NOT_BEFORE` — an RFC3339 timestamp with an explicit timezone.

For PowerShell operator runs, create this value with `DateTimeOffset.UtcNow` and invariant formatting, and keep it as a string. Do not pass it through locale-sensitive `DateTime` conversion. The canonical command is documented in `BREVO_SETUP.md`. The worker accepts `Z` or an explicit `+/-HH:MM` offset, normalizes the instant to UTC, and fails closed for timezone-free, localized or malformed values.

Missing or invalid controls stop the worker before it contacts Brevo. `claim_notification_jobs_for_delivery` leaves historical and non-allowlisted jobs untouched instead of consuming an attempt. The adapter checks the allowlist again immediately before the external request.

Mock mode is allowed only when the Supabase URL resolves to `localhost`, `127.0.0.1` or `::1`. This prevents an accidental mock worker invocation from claiming cloud jobs and falsely marking them as delivered.

For old local CLI output only, the worker accepts `SUPABASE_SERVICE_ROLE_KEY` as a fallback. New deployments should use `SUPABASE_SECRET_KEY`.

## Running locally

Use the mock provider. It never opens a network connection to Brevo.

```powershell
npx supabase start
$env:EMAIL_PROVIDER = "mock"
$env:EMAIL_WORKER_SECRET = "a-local-random-value-at-least-32-characters"
npm run dev
```

In another terminal:

```powershell
$env:EMAIL_WORKER_SECRET = "the-same-local-value"
npm run notifications:process -- 10
```

The script sends a protected `POST /api/internal/notifications/process`. Its output contains only counters, never recipient addresses or rendered email bodies.

Run tests with:

```powershell
npm run test:email:templates
npm run test:email:integration
npm run test:supabase:db
```

The mock provider has deterministic test-only addresses: local parts beginning with `mock-temporary-`, `mock-timeout-` and `mock-permanent-` simulate the corresponding provider result. These rules are not used in Brevo mode.

## Production scheduling

Hosting has not been selected. Any scheduler capable of making an authenticated HTTPS POST can invoke the route every one to five minutes. Examples include a platform cron, a VPS system timer, an external scheduler with a secret header, or a Supabase scheduled function that calls the deployed application.

The request must use:

```http
POST /api/internal/notifications/process
Authorization: Bearer <EMAIL_WORKER_SECRET>
Content-Type: application/json

{"batchSize":10}
```

Do not expose the route without HTTPS. Prefer a network allowlist in addition to the bearer secret when the hosting platform supports it. Concurrent runs are safe because PostgreSQL leases use `SKIP LOCKED`, but the schedule should still avoid unnecessary overlap.

No production cron is enabled by this repository.

Before the first external staging run, the 18 Stage 4.5 pending rows must either be removed under the separately approved cleanup procedure or remain older than the approved delivery cutoff and outside the recipient allowlist. See `STAGING_TEST_DATA_CLEANUP.md`. Merely switching the provider does not make those rows eligible.

## Inspecting and retrying failures

Browser roles have no grants and no RLS policy on `notification_outbox`. Inspect it only with a trusted database/operator account. Avoid selecting recipient fields when they are not needed:

```sql
select id, event_type, application_id, status, attempts,
       next_attempt_at, processed_at, provider_name, last_error
from public.notification_outbox
order by created_at desc
limit 100;
```

After correcting the cause, a trusted operator can requeue one terminal failure through the protected worker route:

```powershell
$env:EMAIL_WORKER_SECRET = "the-worker-secret"
npm run notifications:process -- --retry 00000000-0000-4000-8000-000000000000
```

Only `failed` rows are requeued. Cancelled conditional events are intentionally not reactivated.

## Delivery guarantees

The database provides atomic event creation, recipient-level deduplication and at-most-one active lease. It cannot provide global exactly-once delivery across a PostgreSQL transaction and an external email API.

Brevo accepts an `IdempotencyKey` in the transactional request. Metalduro sends the outbox UUID as that key. Provider idempotency has a limited retention period, and the provider may have accepted a request even when the worker receives a timeout. A retry after an uncertain result can therefore still produce a duplicate, particularly after the provider retention window.

When Brevo explicitly returns `duplicate_parameter` for that idempotency key, the worker records the event as accepted with a `deduplicated:<outbox-id>` marker instead of pretending that Brevo supplied a new message ID. This marker is operational evidence of provider deduplication, not an inbox-delivery receipt.

`sent` means the provider API accepted the request and returned a message ID. It does not prove inbox delivery. Delivery, bounce and complaint status would require a separately secured and verified Brevo webhook in a future stage.
