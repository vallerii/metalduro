import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderNotificationEmail } from "../src/lib/email/templates.ts";
import { safeNextPath } from "../src/lib/safe-next-path.ts";

const events = [
  "application_created",
  "application_claimed",
  "receipt_uploaded",
  "payment_started",
  "application_paid",
  "payment_overdue",
];
let passed = 0;

function pass(message) {
  passed += 1;
  process.stdout.write(`PASS: ${message}\n`);
}

const testTokenHash = "a".repeat(64);

function extractHref(html) {
  const match = html.match(/href="([^"]+)"/);
  assert(match, "Auth template did not render an href.");
  return new URL(match[1].replaceAll("&amp;", "&"));
}

function assertAuthUrl(url, { origin, type, next, tokenHash = testTokenHash }) {
  assert.equal(url.origin, origin);
  assert.equal(url.pathname, "/auth/confirm");
  assert.equal(url.searchParams.get("token_hash"), tokenHash);
  assert.equal(url.searchParams.get("type"), type);
  assert.equal(url.searchParams.get("next"), next);
}

function renderConfirmationUrl(template, { origin, nextValue, includeMetadata = true, tokenHash = testTokenHash }) {
  const safeNext = safeNextPath(nextValue, "/account");
  const renderedNext = includeMetadata ? encodeURIComponent(safeNext) : "%2Faccount";
  const html = template
    .replace('{{ $next := index .Data "auth_next" }}', "")
    .replace("{{ .RedirectTo }}", new URL(origin).origin)
    .replace("{{ .TokenHash }}", tokenHash)
    .replace("{{ if $next }}{{ $next | urlquery }}{{ else }}%2Faccount{{ end }}", renderedNext);
  return extractHref(html);
}

function renderRecoveryUrl(template, { origin, tokenHash = testTokenHash }) {
  return extractHref(
    template
      .replace("{{ .RedirectTo }}", new URL(origin).origin)
      .replace("{{ .TokenHash }}", tokenHash),
  );
}

function renderInviteUrl(template, { origin, tokenHash = testTokenHash }) {
  return extractHref(
    template
      .replace("{{ .SiteURL }}", new URL(origin).origin)
      .replace("{{ .TokenHash }}", tokenHash),
  );
}

for (const locale of ["es", "ru"]) {
  for (const eventType of events) {
    const job = {
      id: crypto.randomUUID(),
      event_type: eventType,
      event_key: `${eventType}:${crypto.randomUUID()}`,
      application_id: crypto.randomUUID(),
      recipient_user_id: crypto.randomUUID(),
      recipient_email: "template-recipient@example.test",
      recipient_name: `${"Nombre muy largo ".repeat(12)}<script>alert(1)</script>`,
      recipient_locale: locale,
      payload: {
        reference_code: "A1B2C3D4",
        material_name: "Metal <duro> & prueba",
        declared_weight_kg: 25,
        manager_name: "Gestor <b>seguro</b>",
        created_at: "2026-11-02T10:00:00.000Z",
        payment_due_at: "2026-11-02T12:00:00.000Z",
        payment_iban: "ES0000000000000000000000",
      },
      attempts: 1,
      max_attempts: 5,
      lease_token: crypto.randomUUID(),
    };
    const rendered = renderNotificationEmail(job, "https://metalduro.example/path-that-must-be-ignored");
    assert.ok(rendered.subject.includes("#A1B2C3D4"));
    assert.ok(rendered.html.includes("https://metalduro.example/"));
    assert.ok(!rendered.html.includes("<script>"));
    assert.ok(rendered.html.includes("&lt;script&gt;"));
    assert.ok(!rendered.html.includes("ES0000000000000000000000"));
    assert.ok(!rendered.text.includes("ES0000000000000000000000"));
    assert.ok(rendered.html.includes("#ff5c39"));
    assert.ok(rendered.text.length > 80);
    if (eventType === "application_claimed" && locale === "ru") {
      assert.equal(rendered.subject, "Ваша заявка принята в работу · #A1B2C3D4");
      assert.match(rendered.text, /Мы уже работаем над вашей заявкой/);
    }
    if (eventType === "application_claimed" && locale === "es") {
      assert.equal(rendered.subject, "Tu solicitud está en proceso · #A1B2C3D4");
      assert.match(rendered.text, /Ya estamos trabajando en tu solicitud/);
    }
    pass(`${locale} template renders safely for ${eventType}`);
  }
}

const confirmationTemplate = await readFile(
  new URL("../supabase/templates/confirmation.html", import.meta.url),
  "utf8",
);
const recoveryTemplate = await readFile(
  new URL("../supabase/templates/recovery.html", import.meta.url),
  "utf8",
);
const inviteTemplate = await readFile(
  new URL("../supabase/templates/invite.html", import.meta.url),
  "utf8",
);

for (const template of [confirmationTemplate, recoveryTemplate, inviteTemplate]) {
  assert.ok(!template.includes("{{ .ConfirmationURL }}"));
  assert.ok(template.includes("metalduro"));
  assert.ok(template.includes("#ff5c39"));
  assert.ok(!template.toLowerCase().includes("<script"));
}

const origins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://metalduro-git-feature-client-admin-cabinets-agenturro.vercel.app",
];

for (const origin of origins) {
  const url = renderConfirmationUrl(confirmationTemplate, {
    origin,
    nextValue: "/?checkout=1",
  });
  assertAuthUrl(url, { origin, type: "email", next: "/?checkout=1" });
  pass(`confirmation URL is valid for ${origin}`);
}

const withoutNext = renderConfirmationUrl(confirmationTemplate, {
  origin: origins[1],
  includeMetadata: false,
});
assertAuthUrl(withoutNext, { origin: origins[1], type: "email", next: "/account" });
pass("confirmation without auth_next falls back to /account");

for (const unsafeNext of ["https://evil.example/account", "//evil.example/account"]) {
  const url = renderConfirmationUrl(confirmationTemplate, {
    origin: origins[1],
    nextValue: unsafeNext,
  });
  assertAuthUrl(url, { origin: origins[1], type: "email", next: "/account" });
}
pass("absolute and protocol-relative next values fail closed");

const encodedNext = encodeURIComponent("/account?source=encoded");
const rawEncodedUrl = renderConfirmationUrl(confirmationTemplate, {
  origin: origins[1],
  nextValue: encodedNext,
});
assertAuthUrl(rawEncodedUrl, { origin: origins[1], type: "email", next: "/account" });
const decodedNextUrl = renderConfirmationUrl(confirmationTemplate, {
  origin: origins[1],
  nextValue: decodeURIComponent(encodedNext),
});
assertAuthUrl(decodedNextUrl, {
  origin: origins[1],
  type: "email",
  next: "/account?source=encoded",
});
pass("URL-encoded next is accepted only after one trusted decode");

const nextWithQuery = "/?checkout=1&source=calculator";
const nextWithQueryUrl = renderConfirmationUrl(confirmationTemplate, {
  origin: origins[1],
  nextValue: nextWithQuery,
});
assertAuthUrl(nextWithQueryUrl, { origin: origins[1], type: "email", next: nextWithQuery });
pass("confirmation preserves a safe next path with its own query parameters");

for (const origin of origins) {
  const url = renderRecoveryUrl(recoveryTemplate, { origin });
  assertAuthUrl(url, {
    origin,
    type: "recovery",
    next: "/auth/update-password",
  });
}
pass("recovery URL is stable across localhost and HTTPS preview origins");

const inviteUrl = renderInviteUrl(inviteTemplate, { origin: origins[0] });
assertAuthUrl(inviteUrl, {
  origin: origins[0],
  type: "invite",
  next: "/auth/update-password",
});
pass("invite URL remains unchanged and valid");

const missingTokenUrl = renderConfirmationUrl(confirmationTemplate, {
  origin: origins[1],
  nextValue: "/account",
  tokenHash: "",
});
assert.equal(missingTokenUrl.searchParams.get("token_hash"), "");
assert.equal(Boolean(missingTokenUrl.searchParams.get("token_hash")), false);
const damagedToken = "not a valid token hash";
const damagedTokenUrl = renderConfirmationUrl(confirmationTemplate, {
  origin: origins[1],
  nextValue: "/account",
  tokenHash: damagedToken,
});
assert.equal(damagedTokenUrl.searchParams.get("token_hash"), damagedToken);
assert.doesNotMatch(damagedToken, /^[A-Za-z0-9_-]{32,}$/);
pass("missing and damaged token hashes remain detectable by the callback/Auth server");

process.stdout.write(`Email template checks passed: ${passed}/${passed}.\n`);
