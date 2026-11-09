import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseTestWorkdir = process.env.SUPABASE_TEST_WORKDIR?.trim();
const configuredDbContainer = process.env.SUPABASE_TEST_DB_CONTAINER?.trim();
if (supabaseTestWorkdir && !configuredDbContainer) {
  throw new Error("SUPABASE_TEST_DB_CONTAINER is required with an isolated Supabase workdir.");
}
const testDbContainer = configuredDbContainer || "supabase_db_metalduro";
const statusCommand = process.execPath;
const statusArguments = [path.join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js"), "status", "-o", "env", ...(supabaseTestWorkdir ? ["--workdir", supabaseTestWorkdir] : [])];
const statusOutput = execFileSync(statusCommand, statusArguments, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const localEnvironment = Object.fromEntries(statusOutput.split(/\r?\n/).map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((match) => {
  const value = match[2].trim();
  return [match[1], value.startsWith('"') ? JSON.parse(value) : value];
}));

const apiUrl = localEnvironment.API_URL;
const publishableKey = localEnvironment.PUBLISHABLE_KEY;
const serviceRoleKey = localEnvironment.SERVICE_ROLE_KEY;
if (!apiUrl || !publishableKey || !serviceRoleKey) throw new Error("Local Supabase configuration is incomplete.");

const port = 3011;
const siteUrl = `http://127.0.0.1:${port}`;
const workerSecret = "local-email-worker-secret-42-characters";
const password = "Local-Email-Test-123!";
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emails = {
  client: `email-client-${runId}@example.test`,
  adminA: `email-admin-a-${runId}@example.test`,
  adminB: `email-admin-b-${runId}@example.test`,
  temporary: `mock-temporary-${runId}@example.test`,
  permanent: `mock-permanent-${runId}@example.test`,
};
const service = createClient(apiUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const createdUserIds = [];
const createdApplicationIds = [];
const createdStoragePaths = [];
let passed = 0;
let server;
let serverOutput = "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(message) {
  passed += 1;
  process.stdout.write(`PASS: ${message}\n`);
}

function createPasswordClient() {
  return createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function createUser(email, displayName, role = "client", locale = "es") {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName, locale } });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  if (role === "admin") {
    const { error: roleError } = await service.from("profiles").update({ role: "admin" }).eq("user_id", data.user.id);
    if (roleError) throw roleError;
  }
  const client = createPasswordClient();
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  return { id: data.user.id, client };
}

async function workerRequest(secret = workerSecret, batchSize = 20) {
  const response = await fetch(`${siteUrl}/api/internal/notifications/process`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ batchSize }),
  });
  return { response, body: await response.json().catch(() => null) };
}

async function workerRetryRequest(outboxId) {
  const response = await fetch(`${siteUrl}/api/internal/notifications/process`, {
    method: "POST",
    headers: { authorization: `Bearer ${workerSecret}`, "content-type": "application/json" },
    body: JSON.stringify({ retryId: outboxId }),
  });
  return { response, body: await response.json().catch(() => null) };
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${siteUrl}/`, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Next.js test server did not start. ${serverOutput.slice(-1000)}`);
}

function startServer() {
  const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextCli, "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      SUPABASE_SECRET_KEY: serviceRoleKey,
      EMAIL_WORKER_SECRET: workerSecret,
      EMAIL_WORKER_BATCH_SIZE: "20",
      EMAIL_PROVIDER: "mock",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-6000); };
  server.stdout.on("data", capture);
  server.stderr.on("data", capture);
}

async function createApplication(client, overrides = {}) {
  const input = {
    p_material_id: "solid",
    p_declared_weight_kg: 10,
    p_city: "Madrid",
    p_delivery_method: "send",
    p_idempotency_key: randomUUID(),
    ...overrides,
  };
  const { data, error } = await client.rpc("create_application", input);
  if (error) throw error;
  createdApplicationIds.push(data.id);
  return { application: data, input };
}

async function claimAndMoveToPayment(applicationId, client, admin) {
  const { error: claimError } = await admin.client.rpc("claim_application", { p_application_id: applicationId });
  if (claimError) throw claimError;
  const receiptPath = `${client.id}/${applicationId}/receipt`;
  createdStoragePaths.push(receiptPath);
  const bytes = new Uint8Array([82, 73, 70, 70, 8, 0, 0, 0, 87, 69, 66, 80]);
  const { error: uploadError } = await client.client.storage.from("receipts").upload(receiptPath, bytes, { contentType: "image/webp", upsert: false });
  if (uploadError) throw uploadError;
  const { error: attachError } = await client.client.rpc("attach_receipt_and_mark_sent", { p_application_id: applicationId, p_storage_path: receiptPath });
  if (attachError) throw attachError;
  for (const expected of ["sent", "accepted", "verification"]) {
    const { error } = await admin.client.rpc("advance_application", { p_application_id: applicationId, p_expected_status: expected });
    if (error) throw error;
  }
}

function makePaymentOverdue(applicationId) {
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) throw new Error("Invalid test application id.");
  const sql = `begin; alter table public.applications disable trigger applications_enforce_transition; update public.applications set payment_started_at = statement_timestamp() - interval '3 hours', payment_due_at = statement_timestamp() - interval '1 hour' where id = '${applicationId}'::uuid; alter table public.applications enable trigger applications_enforce_transition; commit;`;
  execFileSync("docker", ["exec", testDbContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: ["ignore", "pipe", "pipe"] });
}

async function cleanup() {
  if (createdStoragePaths.length) await service.storage.from("receipts").remove(createdStoragePaths);
  if (createdApplicationIds.length) await service.from("applications").delete().in("id", createdApplicationIds);
  for (const userId of createdUserIds.reverse()) await service.auth.admin.deleteUser(userId);
}

try {
  startServer();
  await waitForServer();
  pass("notification worker starts with the mock provider and local-only credentials");

  const client = await createUser(emails.client, "Email Client");
  const adminA = await createUser(emails.adminA, "Email Admin A", "admin");
  await createUser(emails.adminB, "Admin <script>alert(1)</script>", "admin", "ru");
  const temporaryAdmin = await createUser(emails.temporary, "Temporary Mock", "admin");
  const permanentAdmin = await createUser(emails.permanent, "Permanent Mock", "admin");

  const first = await createApplication(client.client);
  const { count: initialCreatedCount, error: initialCountError } = await service.from("notification_outbox").select("id", { count: "exact", head: true }).eq("application_id", first.application.id).eq("event_type", "application_created");
  if (initialCountError) throw initialCountError;
  assert(initialCreatedCount === 4, "Application creation did not notify every active admin.");
  pass("application_created is queued once for every active admin");

  const { data: repeated, error: repeatedError } = await client.client.rpc("create_application", first.input);
  if (repeatedError) throw repeatedError;
  assert(repeated.id === first.application.id, "Idempotent application retry returned another row.");
  const { count: repeatedCount } = await service.from("notification_outbox").select("id", { count: "exact", head: true }).eq("application_id", first.application.id).eq("event_type", "application_created");
  assert(repeatedCount === 4, "Idempotent retry duplicated application_created notifications.");
  pass("idempotent application retry does not duplicate notification events");

  const [{ error: clientOutboxError }, { error: adminOutboxError }] = await Promise.all([
    client.client.from("notification_outbox").select("id"),
    adminA.client.from("notification_outbox").select("id"),
  ]);
  assert(clientOutboxError && adminOutboxError, "Browser roles could read the outbox.");
  pass("client and admin browser roles cannot read notification_outbox");

  const noSecret = await fetch(`${siteUrl}/api/internal/notifications/process`, { method: "POST" });
  const invalidSecret = await workerRequest("not-the-worker-secret", 1);
  assert(noSecret.status === 401 && invalidSecret.response.status === 401, "Worker route accepted an untrusted caller.");
  pass("worker route rejects clients and admins without the independent worker secret");

  const firstDelivery = await workerRequest(workerSecret, 20);
  assert(firstDelivery.response.ok && firstDelivery.body?.result?.sent === 2 && firstDelivery.body?.result?.retried === 1 && firstDelivery.body?.result?.failed === 1, "Mock success/retry/permanent outcomes were not recorded correctly.");
  const { data: firstRows, error: firstRowsError } = await service.from("notification_outbox").select("recipient_user_id,status,attempts,provider_name,provider_message_id,last_error,payload").eq("application_id", first.application.id).eq("event_type", "application_created");
  if (firstRowsError) throw firstRowsError;
  assert(firstRows.every((row) => !JSON.stringify(row.payload).toLowerCase().includes("iban")), "Outbox payload contains IBAN data.");
  assert(firstRows.filter((row) => row.status === "sent").every((row) => row.provider_name === "mock" && row.provider_message_id?.startsWith("mock:")), "Mock delivery result was not persisted.");
  assert(firstRows.some((row) => row.status === "pending" && row.last_error === "mock_temporary_failure"), "Temporary failure was not scheduled for retry.");
  assert(firstRows.some((row) => row.status === "failed" && row.last_error === "mock_permanent_failure"), "Permanent failure was not terminal.");
  pass("mock provider records success, safe retry and permanent failure without sensitive content");

  const temporaryRow = firstRows.find((row) => row.recipient_user_id === temporaryAdmin.id);
  assert(temporaryRow, "Temporary mock row was not found.");
  const { error: prepareExhaustionError } = await service.from("notification_outbox").update({ attempts: 4, next_attempt_at: new Date(0).toISOString() }).eq("application_id", first.application.id).eq("recipient_user_id", temporaryAdmin.id);
  if (prepareExhaustionError) throw prepareExhaustionError;
  await service.from("notification_outbox").update({ next_attempt_at: "2100-01-01T00:00:00.000Z" }).eq("status", "pending").neq("recipient_user_id", temporaryAdmin.id);
  const exhausted = await workerRequest(workerSecret, 1);
  assert(exhausted.body?.result?.failed === 1, "Exhausted temporary error did not become terminal.");
  const { data: exhaustedRow } = await service.from("notification_outbox").select("id,status,attempts").eq("application_id", first.application.id).eq("recipient_user_id", temporaryAdmin.id).single();
  assert(exhaustedRow.status === "failed" && exhaustedRow.attempts === 5, "Max attempts were not enforced.");
  const manualRetry = await workerRetryRequest(exhaustedRow.id);
  assert(manualRetry.response.ok && manualRetry.body?.retried === true, "Trusted manual retry failed.");
  await service.from("notification_outbox").update({ next_attempt_at: "2100-01-01T00:00:00.000Z" }).eq("id", exhaustedRow.id);
  pass("retry backoff, max-attempt terminal state and trusted manual requeue work");

  await service.from("profiles").update({ active: false }).in("user_id", [temporaryAdmin.id, permanentAdmin.id]);
  const second = await createApplication(client.client, { p_idempotency_key: randomUUID(), p_material_id: "scrap" });
  const { error: claimFirstError } = await adminA.client.rpc("claim_application", { p_application_id: first.application.id });
  if (claimFirstError) throw claimFirstError;
  await service.from("notification_outbox").update({ next_attempt_at: new Date(0).toISOString() }).eq("status", "pending").neq("id", exhaustedRow.id);
  const concurrentResults = await Promise.all([workerRequest(workerSecret, 1), workerRequest(workerSecret, 1)]);
  assert(concurrentResults.every((entry) => entry.response.ok && entry.body?.result?.claimed === 1 && entry.body?.result?.sent === 1), "Concurrent workers did not claim separate events.");
  const { data: concurrentlySent, error: concurrentRowsError } = await service.from("notification_outbox").select("id,attempts,provider_message_id").eq("status", "sent").in("application_id", [first.application.id, second.application.id]);
  if (concurrentRowsError) throw concurrentRowsError;
  const messageIds = concurrentlySent.map((row) => row.provider_message_id).filter(Boolean);
  assert(new Set(messageIds).size === messageIds.length && concurrentlySent.every((row) => row.attempts === 1), "Concurrent workers processed a notification more than once.");
  pass("two concurrent workers never process the same event simultaneously");

  await workerRequest(workerSecret, 50);
  await claimAndMoveToPayment(second.application.id, client, adminA);
  const { error: paidSecondError } = await adminA.client.rpc("advance_application", { p_application_id: second.application.id, p_expected_status: "payment" });
  if (paidSecondError) throw paidSecondError;
  const { data: secondEventRows, error: secondEventsError } = await service.from("notification_outbox").select("event_type,recipient_user_id,payload").eq("application_id", second.application.id);
  if (secondEventsError) throw secondEventsError;
  for (const eventType of ["application_created", "application_claimed", "receipt_uploaded", "payment_started", "application_paid"]) assert(secondEventRows.some((row) => row.event_type === eventType), `Missing ${eventType}.`);
  assert(secondEventRows.every((row) => !JSON.stringify(row.payload).toLowerCase().includes("iban")), "A business notification payload contains IBAN.");
  pass("claim, receipt, payment start and paid transitions enqueue the expected recipients and safe payloads");

  const overdue = await createApplication(client.client, { p_idempotency_key: randomUUID(), p_material_id: "inserts" });
  await claimAndMoveToPayment(overdue.application.id, client, adminA);
  makePaymentOverdue(overdue.application.id);
  await service.from("notification_outbox").update({ next_attempt_at: "2100-01-01T00:00:00.000Z" }).eq("status", "pending");
  const overdueDelivery = await workerRequest(workerSecret, 20);
  assert(overdueDelivery.body?.result?.overdueEnqueued === 1, "Worker did not enqueue the overdue event.");
  const { data: overdueRow, error: overdueRowError } = await service.from("notification_outbox").select("status,recipient_user_id,provider_name").eq("application_id", overdue.application.id).eq("event_type", "payment_overdue").single();
  if (overdueRowError) throw overdueRowError;
  assert(overdueRow.status === "sent" && overdueRow.recipient_user_id === adminA.id && overdueRow.provider_name === "mock", "Current overdue event was not delivered to the manager.");
  const repeatedOverdue = await workerRequest(workerSecret, 20);
  assert(repeatedOverdue.body?.result?.overdueEnqueued === 0, "Repeated overdue scan duplicated an event.");
  pass("payment_overdue is generated once and delivered only to the assigned manager");

  const stale = await createApplication(client.client, { p_idempotency_key: randomUUID(), p_material_id: "mixed" });
  await claimAndMoveToPayment(stale.application.id, client, adminA);
  makePaymentOverdue(stale.application.id);
  const { data: scanCount, error: scanError } = await service.rpc("enqueue_overdue_payment_notifications", { p_limit: 100 });
  if (scanError) throw scanError;
  assert(scanCount === 1, "Stale overdue test event was not created.");
  const { error: stalePaidError } = await adminA.client.rpc("advance_application", { p_application_id: stale.application.id, p_expected_status: "payment" });
  if (stalePaidError) throw stalePaidError;
  await service.from("notification_outbox").update({ next_attempt_at: "2100-01-01T00:00:00.000Z" }).eq("status", "pending").neq("event_type", "payment_overdue");
  await workerRequest(workerSecret, 20);
  const { data: staleRow } = await service.from("notification_outbox").select("status,last_error").eq("application_id", stale.application.id).eq("event_type", "payment_overdue").single();
  assert(staleRow.status === "cancelled" && staleRow.last_error === "event_no_longer_current", "Paid overdue event was not cancelled before send.");
  pass("worker revalidates overdue events and cancels them after payment");

  const leaseApplication = await createApplication(client.client, { p_idempotency_key: randomUUID() });
  const { data: leaseRows } = await service.from("notification_outbox").select("id").eq("application_id", leaseApplication.application.id).eq("event_type", "application_created").limit(1);
  const leaseRowId = leaseRows?.[0]?.id;
  assert(leaseRowId, "Lease test event was not created.");
  await service.from("notification_outbox").update({ next_attempt_at: "2100-01-01T00:00:00.000Z" }).eq("status", "pending").neq("id", leaseRowId);
  const oldLease = randomUUID();
  const { error: leaseSetupError } = await service.from("notification_outbox").update({ status: "processing", attempts: 1, lease_token: oldLease, locked_at: "2000-01-01T00:00:00.000Z", lease_expires_at: "2000-01-01T00:01:00.000Z" }).eq("id", leaseRowId);
  if (leaseSetupError) throw leaseSetupError;
  const recovered = await workerRequest(workerSecret, 1);
  const { data: recoveredRow } = await service.from("notification_outbox").select("status,attempts,lease_token,provider_name").eq("id", leaseRowId).single();
  assert(recovered.body?.result?.sent === 1 && recoveredRow.status === "sent" && recoveredRow.attempts === 2 && recoveredRow.lease_token === null, "Expired processing lease was not recovered.");
  pass("expired processing lease is recovered and safely reprocessed");

  const { data: firstApplicationState } = await service.from("applications").select("status").eq("id", first.application.id).single();
  assert(firstApplicationState.status === "in_progress", "Email failures rolled back or corrupted the business operation.");
  pass("email provider failures never roll back completed business operations");

  process.stdout.write(`Email notification integration checks passed: ${passed}/${passed}.\n`);
} finally {
  await cleanup().catch(() => undefined);
  if (server && !server.killed) server.kill();
}
