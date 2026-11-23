import "server-only";

import type { EmailDeliveryResult, EmailProvider, RenderedEmail } from "./types";

export type EmailDeliveryPolicy =
  | { mode: "mock" }
  | {
      mode: "brevo";
      allowedRecipientEmails: string[];
      deliveryNotBefore: string;
    };

export class EmailDeliveryConfigurationError extends Error {
  readonly safeCode: string;

  constructor(safeCode: string) {
    super(safeCode);
    this.name = "EmailDeliveryConfigurationError";
    this.safeCode = safeCode;
  }
}

export class EmailDeliveryError extends Error {
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
  readonly deliveryUncertain: boolean;
  readonly safeCode: string;

  constructor(options: { safeCode: string; retryable: boolean; retryAfterSeconds?: number | null; deliveryUncertain?: boolean }) {
    super(options.safeCode);
    this.name = "EmailDeliveryError";
    this.safeCode = options.safeCode;
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.deliveryUncertain = options.deliveryUncertain ?? false;
  }
}

export class MockEmailProvider implements EmailProvider {
  async send(message: RenderedEmail): Promise<EmailDeliveryResult> {
    if (/<script[\s>]/i.test(message.html) || /ES\d{22}/.test(`${message.html}\n${message.text}`)) {
      throw new EmailDeliveryError({ safeCode: "mock_content_security_violation", retryable: false });
    }
    const localPart = message.to.email.split("@", 1)[0]?.toLowerCase() || "";
    if (localPart.startsWith("mock-temporary-")) {
      throw new EmailDeliveryError({ safeCode: "mock_temporary_failure", retryable: true, retryAfterSeconds: 1 });
    }
    if (localPart.startsWith("mock-timeout-")) {
      throw new EmailDeliveryError({ safeCode: "mock_delivery_uncertain", retryable: true, deliveryUncertain: true });
    }
    if (localPart.startsWith("mock-permanent-")) {
      throw new EmailDeliveryError({ safeCode: "mock_permanent_failure", retryable: false });
    }
    return { provider: "mock", messageId: `mock:${message.eventId}` };
  }
}

function retryAfterSeconds(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds), 86400);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.min(Math.max(Math.ceil((date - Date.now()) / 1000), 0), 86400);
}

export class BrevoEmailProvider implements EmailProvider {
  private readonly config: {
    apiKey: string;
    senderEmail: string;
    senderName: string;
    timeoutMs: number;
    allowedRecipientEmails: ReadonlySet<string>;
  };

  constructor(config: {
    apiKey: string;
    senderEmail: string;
    senderName: string;
    timeoutMs: number;
    allowedRecipientEmails: Iterable<string>;
  }) {
    this.config = {
      ...config,
      allowedRecipientEmails: new Set(
        [...config.allowedRecipientEmails].map((email) => email.trim().toLowerCase()),
      ),
    };
  }

  async send(message: RenderedEmail): Promise<EmailDeliveryResult> {
    if (!this.config.allowedRecipientEmails.has(message.to.email.trim().toLowerCase())) {
      throw new EmailDeliveryError({
        safeCode: "external_recipient_not_allowed",
        retryable: true,
        retryAfterSeconds: 86400,
      });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response: Response;
    try {
      response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { accept: "application/json", "api-key": this.config.apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          sender: { email: this.config.senderEmail, name: this.config.senderName },
          to: [message.to],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
          headers: { IdempotencyKey: message.eventId },
          tags: ["metalduro-transactional"],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new EmailDeliveryError({
        safeCode: error instanceof Error && error.name === "AbortError" ? "brevo_timeout" : "brevo_network_error",
        retryable: true,
        deliveryUncertain: true,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 201) {
      const body = await response.json().catch(() => null) as { messageId?: unknown } | null;
      if (typeof body?.messageId !== "string" || !body.messageId.trim()) {
        throw new EmailDeliveryError({ safeCode: "brevo_invalid_success_response", retryable: true, deliveryUncertain: true });
      }
      return { provider: "brevo", messageId: body.messageId };
    }

    const errorBody = await response.json().catch(() => null) as { code?: unknown } | null;
    if (response.status === 400 && errorBody?.code === "duplicate_parameter") {
      return { provider: "brevo", messageId: `deduplicated:${message.eventId}` };
    }

    const temporary = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    throw new EmailDeliveryError({
      safeCode: `brevo_http_${response.status}`,
      retryable: temporary,
      retryAfterSeconds: response.status === 429 ? retryAfterSeconds(response) : null,
      deliveryUncertain: response.status >= 500,
    });
  }
}

export function createEmailProvider(): EmailProvider {
  const policy = getEmailDeliveryPolicy();
  if (policy.mode === "mock") return new MockEmailProvider();

  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim();
  if (!apiKey || !senderEmail || !senderName) {
    throw new EmailDeliveryConfigurationError("brevo_configuration_missing");
  }
  const timeoutMs = Math.min(Math.max(Number(process.env.BREVO_TIMEOUT_MS) || 10000, 1000), 30000);
  return new BrevoEmailProvider({
    apiKey,
    senderEmail,
    senderName,
    timeoutMs,
    allowedRecipientEmails: policy.allowedRecipientEmails,
  });
}

export function getEmailDeliveryPolicy(): EmailDeliveryPolicy {
  const mode = (process.env.EMAIL_PROVIDER || "mock").trim().toLowerCase();
  if (mode === "mock") return { mode: "mock" };
  if (mode !== "brevo") {
    throw new EmailDeliveryConfigurationError("unsupported_email_provider");
  }
  if (process.env.EMAIL_EXTERNAL_DELIVERY_ENABLED?.trim().toLowerCase() !== "true") {
    throw new EmailDeliveryConfigurationError("external_email_delivery_disabled");
  }

  const rawAllowlist = process.env.EMAIL_RECIPIENT_ALLOWLIST || "";
  const allowedRecipientEmails = [...new Set(
    rawAllowlist
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )];
  if (
    allowedRecipientEmails.length === 0
    || allowedRecipientEmails.length > 100
    || allowedRecipientEmails.some((email) => email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    throw new EmailDeliveryConfigurationError("external_email_allowlist_invalid");
  }

  const rawNotBefore = process.env.EMAIL_DELIVERY_NOT_BEFORE?.trim() || "";
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(rawNotBefore)) {
    throw new EmailDeliveryConfigurationError("external_email_cutoff_invalid");
  }
  const parsedNotBefore = Date.parse(rawNotBefore);
  if (!Number.isFinite(parsedNotBefore)) {
    throw new EmailDeliveryConfigurationError("external_email_cutoff_invalid");
  }

  return {
    mode: "brevo",
    allowedRecipientEmails,
    deliveryNotBefore: new Date(parsedNotBefore).toISOString(),
  };
}

export function assertEmailDeliveryTarget(policy: EmailDeliveryPolicy, supabaseUrl: string) {
  if (policy.mode !== "mock") return;
  let hostname: string;
  try {
    hostname = new URL(supabaseUrl).hostname.toLowerCase();
  } catch {
    throw new EmailDeliveryConfigurationError("notification_worker_supabase_url_invalid");
  }
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1") {
    throw new EmailDeliveryConfigurationError("mock_provider_remote_database_forbidden");
  }
}
