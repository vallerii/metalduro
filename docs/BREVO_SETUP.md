# Brevo setup for Metalduro

No Brevo or cloud Supabase setting is changed automatically. Perform these steps manually in the future staging/production accounts.

## Two independent Brevo credentials

Metalduro uses Brevo in two different ways:

1. **Transactional API** for application events processed by `notification_outbox`.
2. **Custom SMTP** for Supabase Auth confirmation, recovery and employee invitation emails.

Do not interchange the credentials:

- `BREVO_API_KEY` is an API key used only by the server-side transactional adapter.
- Supabase Custom SMTP requires the SMTP login shown by Brevo and an SMTP key. An API key is not an SMTP password.

Keep both values in the corresponding platform secret stores. Never commit them or expose them through a `NEXT_PUBLIC_` variable.

## Sender and domain preparation

1. Add the sender/domain in the Brevo Dashboard.
2. Verify the sender address that will be used by Metalduro.
3. Publish the exact Brevo code and DKIM records shown for the sender domain. Brevo does not normally require SPF for shared-IP domain authentication; add SPF only when Brevo explicitly supplies it, for example for a dedicated-IP setup.
4. Publish exactly one DMARC record appropriate for the domain and start with a monitored policy if the domain owner requires a gradual rollout.
5. Wait for Brevo to show the domain as authenticated.
6. Disable click tracking for Supabase Auth email. Rewriting single-use confirmation links can break authentication.
7. Prefer a dedicated transactional/auth subdomain and a non-marketing sender such as `no-reply@auth.example.com`.

## Transactional API

Configure the application deployment secrets:

```env
EMAIL_PROVIDER=brevo
EMAIL_EXTERNAL_DELIVERY_ENABLED=true
EMAIL_RECIPIENT_ALLOWLIST=approved-tester@example.com
EMAIL_DELIVERY_NOT_BEFORE=2026-11-03T12:00:00.000Z
BREVO_API_KEY=<transactional API key>
BREVO_SENDER_EMAIL=<verified sender>
BREVO_SENDER_NAME=Metalduro
BREVO_TIMEOUT_MS=10000
```

The adapter calls `POST https://api.brevo.com/v3/smtp/email` with inline HTML/plain text and one recipient. It handles timeouts, HTTP 429, retryable 5xx responses and permanent 4xx responses without storing provider response bodies. A successful response must contain a `messageId`, which is stored as `provider_message_id`.

External delivery is fail-closed. `EMAIL_PROVIDER=brevo` is insufficient by itself: the explicit enable flag, a non-empty exact-address allowlist and an RFC3339 cutoff are all mandatory. The worker uses the filtered database claim RPC so that recipients outside the allowlist and outbox rows older than the cutoff remain `pending` with unchanged attempt counters. The provider repeats the recipient check before calling Brevo.

Generate and pass the cutoff as an invariant RFC3339 UTC string. In PowerShell, keep it as a string from creation to process startup; do not round-trip it through `ConvertFrom-Json`, which can materialize a localized `DateTime` and drop the trailing `Z` when interpolated:

```powershell
$deliveryCutoffUtc = [DateTimeOffset]::UtcNow.ToString(
  "yyyy-MM-dd'T'HH:mm:ss.fff'Z'",
  [Globalization.CultureInfo]::InvariantCulture
)
$env:EMAIL_DELIVERY_NOT_BEFORE = $deliveryCutoffUtc
```

If a previously approved cutoff is read from JSON, read the raw string value without date coercion (PowerShell 7.5+: `ConvertFrom-Json -DateKind String`) and validate it before setting the environment variable:

```powershell
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json -DateKind String
$deliveryCutoffUtc = [string]$manifest.delivery_not_before
if ($deliveryCutoffUtc -notmatch 'Z$') { throw 'Cutoff must be RFC3339 UTC with a trailing Z.' }
$env:EMAIL_DELIVERY_NOT_BEFORE = $deliveryCutoffUtc
```

The server normalizes valid `Z` and explicit-offset timestamps to UTC and rejects missing, localized or malformed timezones before claiming an outbox row.

Migration `20261103000100_email_delivery_safety.sql` must be reviewed and applied to staging before any Brevo-mode worker is enabled. Until it exists remotely, Brevo mode fails at the missing filtered claim RPC instead of falling back to the unrestricted claim operation.

The request contains `headers.IdempotencyKey` set to the outbox UUID. Brevo documents idempotency for the transactional endpoint, but its retention is finite and documentation has used different TTL values for single/batch scenarios. Treat it as duplicate reduction, not an exactly-once guarantee.

Do not switch `EMAIL_PROVIDER` to `brevo` until sender verification, staging recipients, the delivery cutoff and operational monitoring have been approved. Local and CI environments must remain on `mock`. Never put the four Stage 4.5 `example.test` identities in the allowlist.

In Brevo, disable link rewriting for Auth mail. For application notifications, disable individual open/click tracking or enable Brevo's anonymous transactional tracking before real data is used. Do not add per-recipient tracking consent unless the corresponding consent process exists.

Official references:

- https://developers.brevo.com/reference/send-transac-email
- https://developers.brevo.com/docs/heterogenous-versions-batch-emails

## Brevo SMTP credentials

In Brevo, open the SMTP/API settings and create or select an SMTP key. Record:

- SMTP host: `smtp-relay.brevo.com`
- SMTP login: the exact SMTP login displayed by Brevo
- SMTP password: the SMTP key, not `BREVO_API_KEY`
- port: `587` with STARTTLS is the usual choice; use another Brevo-supported port only if required by the hosting/network policy
- sender email: the verified sender
- sender name: `Metalduro`

Do not paste these values into repository files.

## Supabase Auth Custom SMTP

After creating the cloud Supabase project:

1. Open Authentication → SMTP Settings.
2. Enable Custom SMTP.
3. Enter `smtp-relay.brevo.com`, the Brevo SMTP login and SMTP key.
4. Select port 587 and the TLS mode required by the Dashboard/Brevo combination.
5. Set the verified sender email and `Metalduro` sender name.
6. Keep email confirmation enabled.
7. Configure an appropriate minimum send interval and production rate limits.
8. Save only after a staging review; do not test with real customer addresses.

Supabase recommends a custom SMTP provider for production Auth email. Its built-in service is rate-limited and not intended for general production delivery.

Official reference: https://supabase.com/docs/guides/auth/auth-smtp

## Site URL and redirects

Configure Authentication → URL Configuration:

- Site URL: the canonical HTTPS production origin.
- Redirect URLs: exact approved application callbacks, including `/auth/confirm` for production and any explicit staging origin.
- Do not add wildcard domains unless the deployment workflow has been reviewed.
- Do not add external user-controlled redirect destinations.

The application validates the internal `next` path and rejects protocol-relative, backslash and external URLs. The existing SSR callback `/auth/confirm` supports both PKCE `code` exchange and `token_hash` verification.

## Auth email templates

Local versions are stored in:

- `supabase/templates/confirmation.html`
- `supabase/templates/recovery.html`
- `supabase/templates/invite.html`

They are connected to local Supabase through `supabase/config.toml`. For the hosted project, copy the reviewed subject and HTML manually into Authentication → Email Templates.

The local templates use `{{ .TokenHash }}` and send the browser to the server-side `/auth/confirm` endpoint:

- confirmation: the application-supplied `{{ .RedirectTo }}` plus `type=email`;
- recovery: the application-supplied `{{ .RedirectTo }}` plus `type=recovery`;
- invite: `{{ .SiteURL }}/auth/confirm?...&type=invite&next=/auth/update-password`.

The registration and recovery actions always supply a callback URL that already contains a `next` query parameter, so the confirmation/recovery templates append additional parameters with `&`. Copy the reviewed HTML exactly; changing only that separator breaks the flow. The callback validates `next` as an internal path, exchanges the token hash for a cookie session, and redirects expired/invalid links to a safe login error. The invite template does not grant the `admin` role; employee role assignment remains a separate trusted database operation.

Hosted Supabase does not automatically read `supabase/templates/*.html`. Copy each subject and HTML manually in Authentication → Email Templates after Custom SMTP is available. New Free-tier projects may restrict custom templates while using the built-in SMTP service.

Email security scanners can prefetch one-click links. Disabling Brevo tracking prevents link rewriting but cannot prevent every gateway scanner. Before production, choose between accepting this residual risk, an OTP entry flow, or an intermediate user-confirmation page that does not consume the token until a human action. Do not place the raw confirmation URL into an unvalidated redirect.

Official references:

- https://supabase.com/docs/guides/local-development/customizing-email-templates
- https://supabase.com/docs/guides/auth/auth-email-templates

## Validation checklist

Before production:

1. Verify SPF, DKIM and DMARC in Brevo and DNS.
2. Confirm the sender and SMTP login are approved.
3. Use staging-only client/admin accounts.
4. Test signup confirmation and recovery end to end.
5. Test a manual employee invitation without assigning admin through public metadata.
6. Confirm all callback destinations are HTTPS and allowlisted.
7. Confirm link tracking is disabled for Auth email.
8. Run the notification worker with `EMAIL_PROVIDER=mock` first.
9. Switch staging to `brevo` and send only to approved staging recipients.
10. Set `EMAIL_DELIVERY_NOT_BEFORE` to the approved activation instant after historical staging data has been cleaned; never backdate it to include old pending events.
11. Confirm the API message ID in the outbox and then verify actual delivery in Brevo logs; these are separate states.
12. Define bounce/complaint handling and retention before using real customer data.

## Future staging URL

Do not invent or preconfigure a domain. When an HTTPS staging deployment exists:

1. set `NEXT_PUBLIC_SITE_URL` and Supabase Site URL to its exact canonical origin;
2. add only its exact `/auth/confirm` callback to Redirect URLs, retaining localhost only for approved local testing;
3. set `robots: noindex, nofollow`, exclude protected routes from sitemap, and consider HTTP basic access or an identity-aware gateway;
4. use staging-only Supabase/Brevo secrets and synthetic data;
5. expose the worker only over HTTPS with its independent secret and, where supported, a network allowlist;
6. build the application with the staging public variables because `NEXT_PUBLIC_*` values are embedded at build time.

## Decisions still required

- final production/staging domains and hosting platform;
- final sender domain/address and reply-to policy;
- worker schedule and network restrictions;
- operational owner for terminal failures;
- whether a verified Brevo webhook should update delivery/bounce status;
- retention period for notification recipient snapshots and provider identifiers;
- escalation process for repeated payment-overdue notifications (currently exactly one event per application/manager).
