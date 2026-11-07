const siteUrl = process.env.NOTIFICATION_WORKER_URL || "http://127.0.0.1:3000";
const secret = process.env.EMAIL_WORKER_SECRET;
const retryId = process.argv[2] === "--retry" ? process.argv[3] : null;
const batchSize = Math.min(Math.max(Number(process.argv[2]) || 10, 1), 50);

if (!secret || secret.length < 32) throw new Error("EMAIL_WORKER_SECRET of at least 32 characters is required.");

const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/internal/notifications/process`, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
  body: JSON.stringify(retryId ? { retryId } : { batchSize }),
});
const body = await response.json().catch(() => null);
if (!response.ok || !body?.ok) throw new Error(`Notification worker failed with HTTP ${response.status}.`);
process.stdout.write(`${JSON.stringify(retryId ? { retried: body.retried } : body.result)}\n`);
