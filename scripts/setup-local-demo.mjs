import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const EXPECTED_API_URL = "http://127.0.0.1:54621";
const STATUS_ORDER = ["new", "in_progress", "sent", "accepted", "verification", "payment", "paid"];

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const credentialsIndex = argv.indexOf("--credentials");
  if (credentialsIndex < 0 || !argv[credentialsIndex + 1]) fail("demo_credentials_path_required");
  return { credentialsPath: path.resolve(argv[credentialsIndex + 1]) };
}

function localSupabaseEnvironment() {
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "npx supabase status -o env"]
    : ["supabase", "status", "-o", "env"];
  const output = execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => {
        const value = match[2].trim();
        return [match[1], value.startsWith('"') ? JSON.parse(value) : value];
      }),
  );
}

function passwordClient(apiUrl, publishableKey) {
  return createClient(apiUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function listUsers(service) {
  const users = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
  fail("demo_auth_user_limit_exceeded");
}

async function createOrUpdateUser({ service, publishableKey, apiUrl, existingUsers, account }) {
  let user = existingUsers.find((candidate) => candidate.email?.toLowerCase() === account.email.toLowerCase());
  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: account.displayName, locale: "es" },
    });
    if (error) throw error;
    user = data.user;
    existingUsers.push(user);
  } else {
    const { data, error } = await service.auth.admin.updateUserById(user.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: account.displayName, locale: "es" },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: roleError } = await service
    .from("profiles")
    .update({ role: account.role, active: true })
    .eq("user_id", user.id);
  if (roleError) throw roleError;

  const client = passwordClient(apiUrl, publishableKey);
  const { error: loginError } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (loginError) throw loginError;

  const { error: profileError } = await client.rpc("update_profile", {
    p_display_name: account.displayName,
    p_phone: account.phone,
    p_locale: "es",
  });
  if (profileError) throw profileError;
  return { ...account, id: user.id, client };
}

async function demoReceiptPng(label) {
  const escaped = label.replace(/[<>&"']/g, "");
  const svg = Buffer.from(`
    <svg width="1000" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1000" height="600" fill="#18181a"/>
      <rect x="45" y="45" width="910" height="510" rx="28" fill="#242426" stroke="#ff5c39" stroke-width="5"/>
      <text x="90" y="150" font-family="Arial, sans-serif" font-size="42" fill="#ff5c39" font-weight="700">METALDURO · DEMO</text>
      <text x="90" y="240" font-family="Arial, sans-serif" font-size="56" fill="#ffffff" font-weight="700">RECIBO DE PRUEBA</text>
      <text x="90" y="330" font-family="Arial, sans-serif" font-size="32" fill="#d0d0d2">${escaped}</text>
      <text x="90" y="430" font-family="Arial, sans-serif" font-size="28" fill="#9a9a9e">Sin datos reales · No válido para pagos</text>
    </svg>`);
  return sharp({ create: { width: 1000, height: 600, channels: 4, background: "#18181a" } })
    .composite([{ input: svg }])
    .png()
    .toBuffer();
}

async function currentApplication(client, id) {
  const { data, error } = await client
    .from("applications")
    .select("id,status,manager_id,payment_due_at")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function createApplication(client, spec, rate) {
  const { data, error } = await client.rpc("create_application", {
    p_material_id: spec.materialId,
    p_declared_weight_kg: spec.weightKg,
    p_city: spec.city,
    p_delivery_method: spec.deliveryMethod,
    p_idempotency_key: spec.idempotencyKey,
    p_contact_phone: spec.phone,
    p_repeat_customer: spec.repeatCustomer,
    p_payment_recipient_name: spec.deliveryMethod === "send" ? spec.recipient : null,
    p_payment_iban: spec.deliveryMethod === "send" ? spec.iban : null,
    p_preferred_visit_dates: [],
    p_expected_rate_eur: rate,
  });
  if (error) throw error;
  return data;
}

async function advanceToTarget({ application, target, client, manager, receiptBytes }) {
  let current = await currentApplication(client.client, application.id);
  const targetIndex = STATUS_ORDER.indexOf(target);
  if (targetIndex < 0) fail("demo_target_status_invalid");

  if (STATUS_ORDER.indexOf(current.status) > targetIndex) {
    fail(`demo_application_already_past_target:${application.id}`);
  }

  if (targetIndex >= STATUS_ORDER.indexOf("in_progress") && current.status === "new") {
    const { error } = await manager.client.rpc("claim_application", { p_application_id: application.id });
    if (error) throw error;
    current = await currentApplication(client.client, application.id);
  }

  if (targetIndex >= STATUS_ORDER.indexOf("sent") && current.status === "in_progress") {
    const storagePath = `${client.id}/${application.id}/receipt`;
    const { error: uploadError } = await client.client.storage.from("receipts").upload(
      storagePath,
      receiptBytes,
      { contentType: "image/png", upsert: false },
    );
    if (uploadError && !/exist|duplicate/i.test(uploadError.message)) throw uploadError;
    const { error: attachError } = await client.client.rpc("attach_receipt_and_mark_sent", {
      p_application_id: application.id,
      p_storage_path: storagePath,
    });
    if (attachError) throw attachError;
    current = await currentApplication(client.client, application.id);
  }

  for (const expected of ["sent", "accepted", "verification", "payment"]) {
    if (STATUS_ORDER.indexOf(current.status) >= targetIndex) break;
    if (current.status !== expected) continue;
    const { error } = await manager.client.rpc("advance_application", {
      p_application_id: application.id,
      p_expected_status: expected,
    });
    if (error) throw error;
    current = await currentApplication(client.client, application.id);
  }

  if (current.status !== target) {
    fail(`demo_target_status_not_reached:${application.id}:${current.status}:${target}`);
  }
  return current;
}

const { credentialsPath } = parseArguments(process.argv.slice(2));
const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
if (credentials.project !== "metalduro-local-demo") fail("demo_credentials_project_invalid");

const local = localSupabaseEnvironment();
if (local.API_URL !== EXPECTED_API_URL) fail("demo_local_supabase_url_mismatch");
if (!local.PUBLISHABLE_KEY || !local.SERVICE_ROLE_KEY) fail("demo_local_supabase_keys_missing");

const service = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const [{ count: existingApplications, error: applicationCountError }, existingUsers] = await Promise.all([
  service.from("applications").select("id", { count: "exact", head: true }),
  listUsers(service),
]);
if (applicationCountError) throw applicationCountError;
const approvedEmails = new Set(credentials.accounts.map((account) => account.email.toLowerCase()));
const unknownUsers = existingUsers.filter((user) => !approvedEmails.has(user.email?.toLowerCase() || ""));
if (unknownUsers.length) fail("demo_unknown_local_auth_users_present");
if (existingApplications && !credentials.seededApplicationIds?.length) {
  fail("demo_unknown_local_applications_present");
}

const accounts = {};
for (const account of credentials.accounts) {
  accounts[account.key] = await createOrUpdateUser({
    service,
    publishableKey: local.PUBLISHABLE_KEY,
    apiUrl: local.API_URL,
    existingUsers,
    account,
  });
}

const { data: materials, error: materialsError } = await service
  .from("materials")
  .select("id,rate_eur,active")
  .eq("active", true);
if (materialsError) throw materialsError;
const rateByMaterial = new Map(materials.map((material) => [material.id, Number(material.rate_eur)]));

const seeded = [];
for (const spec of credentials.applications) {
  const client = accounts[spec.clientKey];
  const manager = spec.managerKey ? accounts[spec.managerKey] : null;
  const rate = rateByMaterial.get(spec.materialId);
  if (!client || !rate || (spec.targetStatus !== "new" && !manager)) fail(`demo_spec_invalid:${spec.key}`);
  const application = await createApplication(client.client, spec, rate);
  const receipt = await demoReceiptPng(`Solicitud ${application.id.slice(0, 8)} · ${spec.targetStatus}`);
  const finalState = spec.targetStatus === "new"
    ? await currentApplication(client.client, application.id)
    : await advanceToTarget({ application, target: spec.targetStatus, client, manager, receiptBytes: receipt });
  seeded.push({ key: spec.key, id: application.id, status: finalState.status, client: client.email, manager: manager?.email || null });
}

credentials.seededApplicationIds = seeded.map((application) => application.id);
credentials.seededAt = new Date().toISOString();
writeFileSync(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

const { count: outboxCount, error: outboxError } = await service
  .from("notification_outbox")
  .select("id", { count: "exact", head: true });
if (outboxError) throw outboxError;

process.stdout.write(`${JSON.stringify({
  localApiUrl: local.API_URL,
  users: Object.values(accounts).map((account) => ({ key: account.key, email: account.email, role: account.role })),
  applications: seeded,
  pendingOutboxRows: outboxCount,
}, null, 2)}\n`);
