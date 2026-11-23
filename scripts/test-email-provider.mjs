import assert from "node:assert/strict";
import {
  assertEmailDeliveryTarget,
  BrevoEmailProvider,
  createEmailProvider,
  EmailDeliveryConfigurationError,
  EmailDeliveryError,
  getEmailDeliveryPolicy,
  MockEmailProvider,
} from "../src/lib/email/providers.ts";

const originalFetch = globalThis.fetch;
let passed = 0;
const pass = (message) => { passed += 1; process.stdout.write(`PASS: ${message}\n`); };
const message = {
  eventId: "10000000-0000-4000-8000-000000000001",
  to: { email: "provider-test@example.test", name: "Provider Test" },
  subject: "Nueva solicitud recibida · #A1B2C3D4",
  html: "<html><body>Safe content</body></html>",
  text: "Safe content",
};
const provider = new BrevoEmailProvider({
  apiKey: "test-api-key-not-real",
  senderEmail: "sender@example.test",
  senderName: "Metalduro",
  timeoutMs: 1000,
  allowedRecipientEmails: [message.to.email],
});
const originalEnvironment = {
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_EXTERNAL_DELIVERY_ENABLED: process.env.EMAIL_EXTERNAL_DELIVERY_ENABLED,
  EMAIL_RECIPIENT_ALLOWLIST: process.env.EMAIL_RECIPIENT_ALLOWLIST,
  EMAIL_DELIVERY_NOT_BEFORE: process.env.EMAIL_DELIVERY_NOT_BEFORE,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
};

function setEnvironment(values) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

try {
  setEnvironment({
    EMAIL_PROVIDER: "mock",
    EMAIL_EXTERNAL_DELIVERY_ENABLED: undefined,
    EMAIL_RECIPIENT_ALLOWLIST: undefined,
    EMAIL_DELIVERY_NOT_BEFORE: undefined,
  });
  assert.ok(createEmailProvider() instanceof MockEmailProvider);
  assert.throws(
    () => assertEmailDeliveryTarget({ mode: "mock" }, "https://lavmldzccvctmegasobz.supabase.co"),
    (error) => error instanceof EmailDeliveryConfigurationError && error.safeCode === "mock_provider_remote_database_forbidden",
  );
  assert.doesNotThrow(() => assertEmailDeliveryTarget({ mode: "mock" }, "http://127.0.0.1:54621"));
  pass("mock remains the fail-safe default without external-delivery settings");

  setEnvironment({
    EMAIL_PROVIDER: "brevo",
    EMAIL_EXTERNAL_DELIVERY_ENABLED: "false",
    EMAIL_RECIPIENT_ALLOWLIST: message.to.email,
    EMAIL_DELIVERY_NOT_BEFORE: "2026-11-03T00:00:00.000Z",
    BREVO_API_KEY: "test-api-key-not-real",
    BREVO_SENDER_EMAIL: "sender@example.test",
    BREVO_SENDER_NAME: "Metalduro",
  });
  assert.throws(
    () => createEmailProvider(),
    (error) => error instanceof EmailDeliveryConfigurationError && error.safeCode === "external_email_delivery_disabled",
  );
  pass("Brevo cannot be created without the explicit external-delivery flag");

  setEnvironment({ EMAIL_EXTERNAL_DELIVERY_ENABLED: "true", EMAIL_RECIPIENT_ALLOWLIST: "" });
  assert.throws(
    () => createEmailProvider(),
    (error) => error instanceof EmailDeliveryConfigurationError && error.safeCode === "external_email_allowlist_invalid",
  );
  pass("Brevo cannot be created without a recipient allowlist");

  setEnvironment({ EMAIL_RECIPIENT_ALLOWLIST: message.to.email, EMAIL_DELIVERY_NOT_BEFORE: "" });
  assert.throws(
    () => createEmailProvider(),
    (error) => error instanceof EmailDeliveryConfigurationError && error.safeCode === "external_email_cutoff_invalid",
  );
  pass("Brevo cannot be created without an explicit historical-event cutoff");

  setEnvironment({ EMAIL_DELIVERY_NOT_BEFORE: "2026-11-07T02:01:29Z" });
  assert.deepEqual(getEmailDeliveryPolicy(), {
    mode: "brevo",
    allowedRecipientEmails: [message.to.email],
    deliveryNotBefore: "2026-11-07T02:01:29.000Z",
  });
  pass("an RFC3339 UTC cutoff is normalized without changing its instant");

  setEnvironment({ EMAIL_DELIVERY_NOT_BEFORE: "2026-11-07T04:01:29+02:00" });
  assert.equal(getEmailDeliveryPolicy().deliveryNotBefore, "2026-11-07T02:01:29.000Z");
  pass("an RFC3339 cutoff with an offset is normalized to the same UTC instant");

  for (const invalidCutoff of ["2026-11-07T02:01:29", "07.11.2026 04:01:29", "not-a-date"]) {
    setEnvironment({ EMAIL_DELIVERY_NOT_BEFORE: invalidCutoff });
    assert.throws(
      () => getEmailDeliveryPolicy(),
      (error) => error instanceof EmailDeliveryConfigurationError && error.safeCode === "external_email_cutoff_invalid",
    );
  }
  pass("timezone-free, localized and malformed cutoff strings fail closed");

  setEnvironment({ EMAIL_DELIVERY_NOT_BEFORE: "2026-11-03T00:00:00.000Z" });

  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ messageId: "brevo-message-1" }), { status: 201, headers: { "content-type": "application/json" } });
  };
  const success = await provider.send(message);
  assert.deepEqual(success, { provider: "brevo", messageId: "brevo-message-1" });
  assert.equal(captured.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.body.headers.IdempotencyKey, message.eventId);
  assert.deepEqual(captured.body.to, [message.to]);
  assert.equal(captured.body.htmlContent, message.html);
  assert.equal(captured.body.textContent, message.text);
  assert.ok(!JSON.stringify(captured.body).includes("IBAN"));
  pass("Brevo adapter sends the expected payload and idempotency key");

  globalThis.fetch = async () => new Response(JSON.stringify({ code: "too_many_requests" }), { status: 429, headers: { "retry-after": "120", "content-type": "application/json" } });
  await assert.rejects(provider.send(message), (error) => error instanceof EmailDeliveryError && error.retryable && error.retryAfterSeconds === 120 && error.safeCode === "brevo_http_429");
  pass("HTTP 429 is retryable and respects Retry-After");

  globalThis.fetch = async () => new Response(JSON.stringify({ code: "invalid_parameter" }), { status: 400, headers: { "content-type": "application/json" } });
  await assert.rejects(provider.send(message), (error) => error instanceof EmailDeliveryError && !error.retryable && error.safeCode === "brevo_http_400");
  pass("ordinary HTTP 4xx is a permanent safe error");

  globalThis.fetch = async () => new Response(JSON.stringify({ code: "server_error" }), { status: 503, headers: { "content-type": "application/json" } });
  await assert.rejects(provider.send(message), (error) => error instanceof EmailDeliveryError && error.retryable && error.deliveryUncertain && error.safeCode === "brevo_http_503");
  pass("HTTP 5xx is retryable and marked delivery-uncertain");

  globalThis.fetch = async () => { const error = new Error("simulated timeout"); error.name = "AbortError"; throw error; };
  await assert.rejects(provider.send(message), (error) => error instanceof EmailDeliveryError && error.retryable && error.deliveryUncertain && error.safeCode === "brevo_timeout");
  pass("timeout is retryable without exposing a technical exception");

  globalThis.fetch = async () => new Response(JSON.stringify({ code: "duplicate_parameter" }), { status: 400, headers: { "content-type": "application/json" } });
  const duplicate = await provider.send(message);
  assert.deepEqual(duplicate, { provider: "brevo", messageId: `deduplicated:${message.eventId}` });
  pass("duplicate idempotency response is recorded as provider deduplication");

  let blockedFetchCalled = false;
  globalThis.fetch = async () => {
    blockedFetchCalled = true;
    throw new Error("fetch must not be called");
  };
  await assert.rejects(
    provider.send({ ...message, to: { email: "blocked@example.test" } }),
    (error) => error instanceof EmailDeliveryError && error.safeCode === "external_recipient_not_allowed" && error.retryable,
  );
  assert.equal(blockedFetchCalled, false);
  pass("the provider refuses a non-allowlisted recipient before any network request");

  process.stdout.write(`Brevo provider contract checks passed: ${passed}/${passed}.\n`);
} finally {
  globalThis.fetch = originalFetch;
  setEnvironment(originalEnvironment);
}
