import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  assertEmailDeliveryTarget,
  createEmailProvider,
  EmailDeliveryError,
  getEmailDeliveryPolicy,
} from "./providers";
import { renderNotificationEmail } from "./templates";
import { NOTIFICATION_EVENT_TYPES, type EmailProvider, type NotificationJob } from "./types";

export type NotificationWorkerResult = {
  overdueEnqueued: number;
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  cancelled: number;
  leaseLost: number;
};

function getWorkerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !secretKey) throw new Error("notification_worker_supabase_configuration_missing");
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "metalduro-notification-worker" } },
  });
}

function parseJob(value: unknown): NotificationJob {
  if (!value || typeof value !== "object") throw new Error("invalid_notification_job");
  const job = value as Partial<NotificationJob>;
  if (typeof job.id !== "string" || typeof job.event_type !== "string" || !NOTIFICATION_EVENT_TYPES.includes(job.event_type as NotificationJob["event_type"]) || typeof job.event_key !== "string" || typeof job.application_id !== "string" || typeof job.recipient_user_id !== "string" || typeof job.recipient_email !== "string" || typeof job.lease_token !== "string" || typeof job.attempts !== "number" || typeof job.max_attempts !== "number") {
    throw new Error("invalid_notification_job");
  }
  return {
    ...job,
    event_type: job.event_type as NotificationJob["event_type"],
    recipient_name: typeof job.recipient_name === "string" ? job.recipient_name : null,
    recipient_locale: job.recipient_locale === "ru" ? "ru" : "es",
    payload: job.payload && typeof job.payload === "object" ? job.payload : {},
  } as NotificationJob;
}

async function markFailure(supabase: ReturnType<typeof getWorkerSupabaseClient>, job: NotificationJob, error: unknown) {
  const deliveryError = error instanceof EmailDeliveryError ? error : null;
  const permanent = deliveryError ? !deliveryError.retryable : true;
  const safeCode = deliveryError?.safeCode || "notification_render_or_provider_error";
  const terminal = permanent || job.attempts >= job.max_attempts;
  const { data, error: rpcError } = await supabase.rpc("fail_notification_job", {
    p_outbox_id: job.id,
    p_lease_token: job.lease_token,
    p_permanent: permanent,
    p_error_code: safeCode,
    p_retry_after_seconds: deliveryError?.retryAfterSeconds ?? null,
  });
  if (rpcError || data !== true) return "lease_lost" as const;
  return terminal ? "failed" as const : "retried" as const;
}

export async function runNotificationWorker(options?: { batchSize?: number; provider?: EmailProvider }): Promise<NotificationWorkerResult> {
  const deliveryPolicy = getEmailDeliveryPolicy();
  assertEmailDeliveryTarget(deliveryPolicy, process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "");
  const provider = options?.provider || createEmailProvider();
  const supabase = getWorkerSupabaseClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const configuredBatch = options?.batchSize ?? Number(process.env.EMAIL_WORKER_BATCH_SIZE) ?? 10;
  const batchSize = Math.min(Math.max(Number(configuredBatch) || 10, 1), 50);
  const result: NotificationWorkerResult = { overdueEnqueued: 0, claimed: 0, sent: 0, retried: 0, failed: 0, cancelled: 0, leaseLost: 0 };

  const { data: overdueCount, error: overdueError } = await supabase.rpc("enqueue_overdue_payment_notifications", { p_limit: 100 });
  if (overdueError) throw new Error("notification_overdue_scan_failed");
  result.overdueEnqueued = Number(overdueCount) || 0;

  const claimRpc = deliveryPolicy.mode === "brevo"
    ? "claim_notification_jobs_for_delivery"
    : "claim_notification_jobs";
  const claimArguments = deliveryPolicy.mode === "brevo"
    ? {
        p_limit: batchSize,
        p_lease_seconds: 90,
        p_allowed_recipient_emails: deliveryPolicy.allowedRecipientEmails,
        p_created_at_not_before: deliveryPolicy.deliveryNotBefore,
      }
    : { p_limit: batchSize, p_lease_seconds: 90 };
  const { data: claimedRows, error: claimError } = await supabase.rpc(claimRpc, claimArguments);
  if (claimError) throw new Error("notification_claim_failed");
  const jobs = Array.isArray(claimedRows) ? claimedRows.map(parseJob) : [];
  result.claimed = jobs.length;

  for (const job of jobs) {
    const { data: isCurrent, error: validationError } = await supabase.rpc("validate_notification_job", { p_outbox_id: job.id, p_lease_token: job.lease_token });
    if (validationError) { result.leaseLost += 1; continue; }
    if (isCurrent !== true) { result.cancelled += 1; continue; }
    try {
      const message = renderNotificationEmail(job, siteUrl);
      const delivery = await provider.send(message);
      const { data: completed, error: completeError } = await supabase.rpc("complete_notification_job", {
        p_outbox_id: job.id,
        p_lease_token: job.lease_token,
        p_provider_name: delivery.provider,
        p_provider_message_id: delivery.messageId,
      });
      if (completeError || completed !== true) result.leaseLost += 1;
      else result.sent += 1;
    } catch (error) {
      const outcome = await markFailure(supabase, job, error);
      result[outcome === "lease_lost" ? "leaseLost" : outcome] += 1;
    }
  }
  return result;
}

export async function retryNotificationJob(outboxId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(outboxId)) {
    throw new Error("invalid_notification_id");
  }
  const supabase = getWorkerSupabaseClient();
  const { data, error } = await supabase.rpc("retry_notification_job", { p_outbox_id: outboxId });
  if (error) throw new Error("notification_retry_failed");
  return data === true;
}
