import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { EmailDeliveryConfigurationError } from "@/lib/email/providers";
import { retryNotificationJob, runNotificationWorker } from "@/lib/email/worker";

function isAuthorized(request: Request) {
  const expected = process.env.EMAIL_WORKER_SECRET?.trim();
  const authorization = request.headers.get("authorization") || "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!expected || expected.length < 32 || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export async function POST(request: Request) {
  if (!process.env.EMAIL_WORKER_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "worker_not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const body = await request.json().catch(() => ({})) as { batchSize?: unknown; retryId?: unknown };
  const batchSize = typeof body.batchSize === "number" ? body.batchSize : undefined;
  try {
    if (typeof body.retryId === "string") {
      const retried = await retryNotificationJob(body.retryId);
      return NextResponse.json({ ok: true, retried }, { headers: { "Cache-Control": "no-store" } });
    }
    const result = await runNotificationWorker({ batchSize });
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EmailDeliveryConfigurationError) {
      return NextResponse.json(
        { ok: false, error: error.safeCode },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("notification_worker_failed");
    return NextResponse.json({ ok: false, error: "worker_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
