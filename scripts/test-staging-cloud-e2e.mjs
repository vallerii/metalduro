import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const projectRef = "lavmldzccvctmegasobz";
const apiUrl = process.env.STAGING_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.STAGING_SUPABASE_SECRET_KEY;
const baseUrl = process.env.STAGING_SITE_URL || "http://localhost:3000";
const runtimePath = process.env.PLAYWRIGHT_RUNTIME_PATH;
const evidenceDir = process.env.STAGING_EVIDENCE_DIR;
const receiptFile = process.env.STAGING_RECEIPT_FILE;
const resumeExisting = process.env.STAGING_RESUME_EXISTING === "true";
const requestedRunId = process.env.STAGING_E2E_RUN_ID?.trim();

if (!apiUrl?.includes(projectRef) || !publishableKey || !secretKey) {
  throw new Error("The verified staging Supabase configuration is unavailable.");
}
if (baseUrl !== "http://localhost:3000") throw new Error("Staging browser tests must use the localhost PKCE origin.");
if (!runtimePath || !evidenceDir || !receiptFile) throw new Error("Browser test paths are unavailable.");
if (resumeExisting && !requestedRunId) throw new Error("STAGING_E2E_RUN_ID is required when resuming a staging run.");

await mkdir(evidenceDir, { recursive: true });
const { chromium } = await import(pathToFileURL(join(runtimePath, "node_modules/playwright/index.mjs")).href);

const runId = requestedRunId || `${Date.now()}-${randomBytes(4).toString("hex")}`;
if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{7,63}$/.test(runId)) {
  throw new Error("STAGING_E2E_RUN_ID must contain 8-64 letters, digits or hyphens.");
}
const manifestPath = process.env.STAGING_E2E_MANIFEST_PATH || join(evidenceDir, `staging-e2e-${runId}.json`);
const manifest = {
  version: 1,
  projectRef,
  runId,
  createdAt: new Date().toISOString(),
  users: {},
  applications: {},
  storagePaths: [],
  outboxIds: [],
  cleanupPerformed: false,
};

function deterministicUuid(label) {
  const chars = createHash("sha256").update(`${projectRef}:${runId}:${label}`).digest("hex").slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ["8", "9", "a", "b"][Number.parseInt(chars[16], 16) % 4];
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

async function saveManifest() {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}
const users = {
  clientA: { label: "client A", email: `metalduro-stage45-client-a-${runId}@example.test`, displayName: "Cliente Sintético A", role: "client" },
  clientB: { label: "client B", email: `metalduro-stage45-client-b-${runId}@example.test`, displayName: "Cliente Sintético B", role: "client" },
  adminA: { label: "admin A", email: `metalduro-stage45-admin-a-${runId}@example.test`, displayName: "Gestor Sintético A", role: "admin" },
  adminB: { label: "admin B", email: `metalduro-stage45-admin-b-${runId}@example.test`, displayName: "Gestor Sintético B", role: "admin" },
};
for (const [index, user] of Object.values(users).entries()) {
  user.password = `${randomBytes(24).toString("base64url")}Aa${index}!`;
}

const results = [];
function check(condition, message) {
  if (!condition) throw new Error(message);
  results.push(message);
  process.stdout.write(`PASS: ${message}\n`);
}

async function request(path, { method = "GET", token = secretKey, apiKey, body, headers = {}, allowFailure = false } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      apikey: apiKey || (token === secretKey ? secretKey : publishableKey),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok && !allowFailure) {
    const safeMessage = typeof payload === "object" ? payload?.message || payload?.error || payload?.code : String(payload || "request_failed");
    throw new Error(`${method} ${path} failed with ${response.status}: ${safeMessage}`);
  }
  return { ok: response.ok, status: response.status, payload, headers: response.headers };
}

async function rpc(token, name, body, allowFailure = false) {
  return request(`/rest/v1/rpc/${name}`, { method: "POST", token, body, allowFailure });
}

async function createSyntheticUser(user, attemptAdminMetadata = false) {
  const response = await request("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        display_name: user.displayName,
        locale: "es",
        ...(attemptAdminMetadata ? { role: "admin" } : {}),
      },
    },
  });
  user.id = response.payload.id;
  const profileResponse = await request(`/rest/v1/profiles?user_id=eq.${user.id}&select=user_id,email,display_name,role,active,locale`);
  const profile = profileResponse.payload[0];
  check(Boolean(profile), `${user.label} has an automatically created profile`);
  check(profile.role === "client" && profile.active === true, `${user.label} starts as an active client regardless of metadata`);

  if (user.role === "admin") {
    const promoted = await request(`/rest/v1/profiles?user_id=eq.${user.id}`, {
      method: "PATCH",
      body: { role: "admin" },
      headers: { Prefer: "return=representation" },
    });
    check(promoted.payload.length === 1 && promoted.payload[0].role === "admin", `${user.label} is promoted by exact UUID through the trusted key`);
  }
}

async function resumeSyntheticUsers() {
  const response = await request("/auth/v1/admin/users?page=1&per_page=1000");
  const authUsers = response.payload.users || [];
  for (const user of Object.values(users)) {
    const matches = authUsers.filter((item) => item.email === user.email);
    check(matches.length === 1, `resume finds exactly one existing ${user.label} account`);
    user.id = matches[0].id;
    user.email = matches[0].email;
    await request(`/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      body: { password: user.password, email_confirm: true },
    });
    const profileResponse = await request(`/rest/v1/profiles?user_id=eq.${user.id}&select=user_id,email,role,active`);
    const profile = profileResponse.payload[0];
    check(Boolean(profile) && profile.active === true && profile.role === user.role, `resume verifies ${user.label} profile and role`);
  }
}

async function signIn(user) {
  const response = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    token: publishableKey,
    apiKey: publishableKey,
    body: { email: user.email, password: user.password },
  });
  user.accessToken = response.payload.access_token;
  user.refreshToken = response.payload.refresh_token;
  check(Boolean(user.accessToken), `${user.label} signs in with email and password`);
}

async function browserLogin(page, user, destination) {
  await page.goto(`${baseUrl}/auth/login?next=${encodeURIComponent(destination)}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === destination),
    page.getByRole("button", { name: "Entrar", exact: true }).click(),
  ]);
}

async function expectNoOverflow(page, label) {
  const delta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(delta <= 1, `${label} has no horizontal overflow (delta ${delta}px)`);
}

async function advanceInAdminUi(page, expectedLabel) {
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirmar siguiente etapa" }).click();
  await page.getByText(expectedLabel, { exact: true }).first().waitFor();
  check(await page.getByText(expectedLabel, { exact: true }).first().isVisible(), `admin UI advances the application to ${expectedLabel}`);
}

if (resumeExisting) {
  await resumeSyntheticUsers();
} else {
  for (const [key, user] of Object.entries(users)) {
    await createSyntheticUser(user, key === "clientA");
  }
}
manifest.users = Object.fromEntries(
  Object.entries(users).map(([key, { id, email, role }]) => [key, { id, email, role }]),
);
await saveManifest();
for (const user of Object.values(users)) await signIn(user);

const clientMetadataUpdate = await request("/auth/v1/user", {
  method: "PUT",
  token: users.clientA.accessToken,
  body: { data: { role: "admin", display_name: users.clientA.displayName } },
});
check(clientMetadataUpdate.ok, "client A may update harmless Auth metadata through a normal session");
const clientAProfile = await request(`/rest/v1/profiles?user_id=eq.${users.clientA.id}&select=role,active`, { token: users.clientA.accessToken });
check(clientAProfile.payload[0]?.role === "client", "Auth user_metadata cannot elevate client A to admin");

const directRolePatch = await request(`/rest/v1/profiles?user_id=eq.${users.clientA.id}`, {
  method: "PATCH",
  token: users.clientA.accessToken,
  body: { role: "admin" },
  allowFailure: true,
});
check(!directRolePatch.ok, "client A cannot update the database role directly");

const idempotencyKey = deterministicUuid("idempotency-shared");
const idempotencyBody = {
  p_material_id: "inserts",
  p_declared_weight_kg: 6,
  p_city: null,
  p_delivery_method: null,
  p_idempotency_key: idempotencyKey,
};
const [idemOne, idemTwo] = await Promise.all([
  rpc(users.clientA.accessToken, "create_application", idempotencyBody),
  rpc(users.clientA.accessToken, "create_application", idempotencyBody),
]);
check(idemOne.payload.id === idemTwo.payload.id, "two concurrent requests with one idempotency key return one application");
const idemAgain = await rpc(users.clientA.accessToken, "create_application", idempotencyBody);
check(idemAgain.payload.id === idemOne.payload.id, "an idempotent retry returns the existing application");
const idemChanged = await rpc(users.clientA.accessToken, "create_application", { ...idempotencyBody, p_declared_weight_kg: 7 }, true);
check(!idemChanged.ok, "changed parameters with the same idempotency key are rejected");
const otherClientKey = await rpc(users.clientB.accessToken, "create_application", idempotencyBody);
check(otherClientKey.payload.id !== idemOne.payload.id, "another client cannot recover client A's application by idempotency key");
manifest.applications.idempotencyClientA = idemOne.payload.id;
manifest.applications.sameKeyClientB = otherClientKey.payload.id;
await saveManifest();
const clientBForeignIdemRead = await request(`/rest/v1/applications?id=eq.${idemOne.payload.id}&select=id`, { token: users.clientB.accessToken });
check(clientBForeignIdemRead.payload.length === 0, "client B cannot read client A's idempotency application");

const playwrightLogs = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
let primaryApplication;
let receiptPath;
let resumedPrimaryId = null;
const primaryIdempotencyKey = deterministicUuid("primary-calculator");
const candidates = await request(`/rest/v1/applications?client_id=eq.${users.clientA.id}&idempotency_key=eq.${primaryIdempotencyKey}&select=id&limit=2`);
if (candidates.payload.length > 1) throw new Error("The deterministic primary application key returned multiple rows.");
resumedPrimaryId = candidates.payload[0]?.id || null;
try {
  const anonymousContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
  await anonymousPage.waitForURL((url) => url.pathname === "/auth/login");
  check(new URL(anonymousPage.url()).pathname === "/auth/login", "unauthenticated account access redirects to login");
  await anonymousPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await anonymousPage.waitForURL((url) => url.pathname === "/auth/login");
  check(new URL(anonymousPage.url()).pathname === "/auth/login", "unauthenticated admin access redirects to login");
  await anonymousContext.close();

  const invalidContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await invalidContext.addCookies([{ name: `sb-${projectRef}-auth-token`, value: "invalid-session", domain: "localhost", path: "/" }]);
  const invalidPage = await invalidContext.newPage();
  await invalidPage.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
  await invalidPage.waitForURL((url) => url.pathname === "/auth/login");
  check(new URL(invalidPage.url()).pathname === "/auth/login", "an invalid SSR session cookie fails safely");
  await invalidContext.close();

  const clientAContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const clientAPage = await clientAContext.newPage();
  clientAPage.on("pageerror", (error) => playwrightLogs.push(`clientA:${error.message}`));
  await browserLogin(clientAPage, users.clientA, "/account");
  await clientAPage.getByRole("heading", { name: "Tus solicitudes" }).waitFor();
  await clientAPage.reload({ waitUntil: "domcontentloaded" });
  check(await clientAPage.getByRole("heading", { name: "Tus solicitudes" }).isVisible(), "client A session survives SSR proxy refresh");
  await clientAPage.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await clientAPage.waitForURL((url) => url.pathname === "/account");
  check(new URL(clientAPage.url()).pathname === "/account", "client A is rejected from the admin route");

  let primaryId = resumedPrimaryId;
  if (!primaryId) {
    await clientAPage.addInitScript((uuid) => {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        configurable: true,
        value: () => uuid,
      });
    }, primaryIdempotencyKey);
    await clientAPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const calculator = clientAPage.locator("#calculator");
    await calculator.getByRole("button", { name: "Brocas / fresas", exact: true }).click();
    await calculator.locator('#weight').fill("7");
    check((await calculator.locator('#weight-value').innerText()).trim() === "7", "client A selects a 7 kg calculator weight");
    await calculator.getByRole("button", { name: /^Continuar/ }).click();
    const city = calculator.getByRole("combobox");
    await city.fill("Madrid");
    await calculator.getByRole("option", { name: "Madrid", exact: true }).click();
    await calculator.getByRole("button", { name: /^Continuar/ }).click();
    await clientAPage.reload({ waitUntil: "domcontentloaded" });
    await calculator.getByPlaceholder("+34 600 000 000").waitFor();
    await calculator.getByPlaceholder("+34 600 000 000").fill("+34 000 000 000");
    await calculator.getByPlaceholder("Nombre y apellidos del titular").fill("Titular Sintético A");
    await calculator.getByPlaceholder(/IBAN/).fill("ES00 0000 0000 0000 0000 0000");
    await calculator.getByRole("button", { name: /^Enviar solicitud/ }).click();
    await clientAPage.waitForURL((url) => /^\/account\/applications\/[0-9a-f-]+$/.test(url.pathname));
    primaryId = new URL(clientAPage.url()).pathname.split("/").at(-1);
    await clientAPage.getByText("Solicitud guardada correctamente.").waitFor();
  } else {
    await clientAPage.goto(`${baseUrl}/account/applications/${primaryId}`, { waitUntil: "domcontentloaded" });
    await clientAPage.getByText(/Nueva|En proceso|Enviado|Recibido|Verificación|Pago|Pagado/, { exact: true }).first().waitFor();
    check(true, "resume continues the calculator application created by the interrupted browser run");
  }

  const primaryRead = await request(`/rest/v1/applications?id=eq.${primaryId}&select=id,reference_code,client_id,manager_id,material_id,declared_weight_kg,rate_snapshot_eur,estimated_amount_eur,status,payment_started_at,payment_due_at`, { token: users.clientA.accessToken });
  primaryApplication = primaryRead.payload[0];
  manifest.applications.primary = primaryApplication.id;
  await saveManifest();
  let currentStatus = primaryApplication.status;
  if (!resumedPrimaryId) {
    check(currentStatus === "new" && primaryApplication.manager_id === null, "calculator creates an unassigned new application");
  } else {
    check(true, `resume starts from the recorded ${currentStatus} lifecycle state`);
  }
  check(primaryApplication.material_id === "solid" && Number(primaryApplication.declared_weight_kg) === 7, "database stores the selected trusted material and weight");
  check(Number(primaryApplication.rate_snapshot_eur) === 40 && Number(primaryApplication.estimated_amount_eur) === 280, "database calculates the trusted 7 kg × 40 EUR estimate");
  const initialHistory = await request(`/rest/v1/application_status_history?application_id=eq.${primaryId}&select=to_status`, { token: users.clientA.accessToken });
  check(initialHistory.payload[0]?.to_status === "new", "application history starts with the new event");
  await clientAPage.screenshot({ path: join(evidenceDir, "client-application-new-desktop.png"), fullPage: true });

  const amountPatch = await request(`/rest/v1/applications?id=eq.${primaryId}`, { method: "PATCH", token: users.clientA.accessToken, body: { estimated_amount_eur: 1 }, allowFailure: true });
  check(!amountPatch.ok, "client A cannot alter the trusted amount directly");
  const deadlinePatch = await request(`/rest/v1/applications?id=eq.${primaryId}`, { method: "PATCH", token: users.clientA.accessToken, body: { payment_due_at: new Date().toISOString() }, allowFailure: true });
  check(!deadlinePatch.ok, "client A cannot alter payment_due_at directly");

  const clientBContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const clientBPage = await clientBContext.newPage();
  await browserLogin(clientBPage, users.clientB, "/account");
  await clientBPage.getByRole("heading", { name: "Tus solicitudes" }).waitFor();
  check(await clientBPage.getByRole("heading", { name: "Tus solicitudes" }).isVisible(), "client B opens the protected account route");
  await clientBPage.goto(`${baseUrl}/account/applications/${primaryId}`, { waitUntil: "domcontentloaded" });
  check(await clientBPage.getByText("Solicitud no encontrada").isVisible(), "client B cannot disclose client A's application through its direct URL");
  await clientBPage.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
  await clientBPage.getByRole("button", { name: "Cerrar sesión" }).click();
  await clientBPage.waitForURL((url) => url.pathname === "/auth/login");
  await clientBPage.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
  await clientBPage.waitForURL((url) => url.pathname === "/auth/login");
  check(new URL(clientBPage.url()).pathname === "/auth/login", "browser logout removes client B account access");
  await clientBContext.close();

  const adminAContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminAPage = await adminAContext.newPage();
  adminAPage.on("pageerror", (error) => playwrightLogs.push(`adminA:${error.message}`));
  await browserLogin(adminAPage, users.adminA, "/admin");
  await adminAPage.getByRole("heading", { name: "Gestión de solicitudes" }).waitFor();
  await adminAPage.reload({ waitUntil: "domcontentloaded" });
  check(await adminAPage.getByRole("heading", { name: "Gestión de solicitudes" }).isVisible(), "admin A session survives SSR proxy refresh");
  if (currentStatus === "new") {
    const queueRow = adminAPage.locator("tbody tr").filter({ hasText: `#${primaryApplication.reference_code}` });
    await queueRow.getByRole("button", { name: "Tomar" }).click();
    await adminAPage.waitForURL((url) => url.pathname === "/admin" && url.searchParams.get("view") === "mine");
    check(await adminAPage.getByText(`#${primaryApplication.reference_code}`, { exact: true }).first().isVisible(), "admin A atomically claims the new application in the UI");
    currentStatus = "in_progress";
  } else {
    check(primaryApplication.manager_id === users.adminA.id, "resume verifies that the lifecycle application remains assigned to admin A");
  }
  await adminAPage.screenshot({ path: join(evidenceDir, "admin-mine-desktop.png"), fullPage: true });

  const adminBContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminBPage = await adminBContext.newPage();
  await browserLogin(adminBPage, users.adminB, "/admin");
  await adminBPage.goto(`${baseUrl}/admin/applications/${primaryId}`, { waitUntil: "domcontentloaded" });
  check((await adminBPage.getByRole("button", { name: "Confirmar siguiente etapa" }).count()) === 0, "admin B sees admin A's application in read-only mode");
  const adminBRead = await request(`/rest/v1/applications?id=eq.${primaryId}&select=id,manager_id,status`, { token: users.adminB.accessToken });
  check(adminBRead.payload.length === 1 && adminBRead.payload[0].manager_id === users.adminA.id, "admin B can read but does not own admin A's application");
  await adminBPage.screenshot({ path: join(evidenceDir, "admin-other-readonly-desktop.png"), fullPage: true });

  receiptPath = `${users.clientA.id}/${primaryId}/receipt`;
  await clientAPage.goto(`${baseUrl}/account/applications/${primaryId}`, { waitUntil: "domcontentloaded" });
  if (currentStatus === "in_progress") {
    await clientAPage.getByText("En proceso", { exact: true }).first().waitFor();
    const fileInput = clientAPage.locator('input[type="file"]');
    await fileInput.setInputFiles(receiptFile);
    await clientAPage.getByAltText("Vista previa del comprobante de envío").waitFor();
    await clientAPage.getByRole("button", { name: "Subir y confirmar envío" }).click();
    await clientAPage.getByText("Enviado", { exact: true }).first().waitFor();
    currentStatus = "sent";
  }
  manifest.storagePaths = [receiptPath];
  await saveManifest();
  check(await clientAPage.getByText("Comprobante adjunto").isVisible(), "client A sees the private receipt through authenticated access");
  await clientAPage.screenshot({ path: join(evidenceDir, "client-receipt-sent-desktop.png"), fullPage: true });

  if (currentStatus === "sent") {
    const repeatedFinalize = await rpc(users.clientA.accessToken, "attach_receipt_and_mark_sent", { p_application_id: primaryId, p_storage_path: receiptPath });
    check(repeatedFinalize.payload.status === "sent", "repeated receipt finalization safely returns the existing sent application");
  }
  const sentHistory = await request(`/rest/v1/application_status_history?application_id=eq.${primaryId}&to_status=eq.sent&select=id`, { token: users.clientA.accessToken });
  check(sentHistory.payload.length === 1, "repeated receipt finalization does not duplicate history");

  const foreignFinalize = await rpc(users.clientB.accessToken, "attach_receipt_and_mark_sent", { p_application_id: primaryId, p_storage_path: `${users.clientB.id}/${primaryId}/receipt` }, true);
  check(!foreignFinalize.ok, "client B cannot finalize client A's receipt or application");
  const clientBReceipt = await request(`/storage/v1/object/authenticated/receipts/${receiptPath}`, { token: users.clientB.accessToken, allowFailure: true });
  check(!clientBReceipt.ok, "client B cannot download client A's private receipt");
  const anonymousReceipt = await request(`/storage/v1/object/authenticated/receipts/${receiptPath}`, { token: null, apiKey: publishableKey, allowFailure: true });
  check(!anonymousReceipt.ok, "anonymous access cannot download the private receipt");
  const managerReceipt = await request(`/storage/v1/object/authenticated/receipts/${receiptPath}`, { token: users.adminA.accessToken, headers: { Accept: "image/png,image/*" } });
  check(managerReceipt.ok, "admin A can download the private receipt through an ordinary admin JWT");

  const adminBAdvance = await rpc(users.adminB.accessToken, "advance_application", { p_application_id: primaryId, p_expected_status: "sent" }, true);
  check(!adminBAdvance.ok, "admin B cannot advance admin A's application through direct RPC");
  const clientClaim = await rpc(users.clientA.accessToken, "claim_application", { p_application_id: primaryId }, true);
  check(!clientClaim.ok, "client A cannot call the administrative claim RPC");

  await adminAPage.goto(`${baseUrl}/admin/applications/${primaryId}`, { waitUntil: "domcontentloaded" });
  for (const [fromStatus, label, toStatus] of [
    ["sent", "Recibido", "accepted"],
    ["accepted", "Verificación", "verification"],
    ["verification", "Pago", "payment"],
  ]) {
    if (currentStatus === fromStatus) {
      await advanceInAdminUi(adminAPage, label);
      currentStatus = toStatus;
    }
  }
  if (currentStatus === "payment") {
    check(await adminAPage.getByRole("timer").isVisible(), "payment stage displays the database countdown in admin UI");
  }
  const paymentRead = await request(`/rest/v1/applications?id=eq.${primaryId}&select=status,payment_started_at,payment_due_at`, { token: users.clientA.accessToken });
  const payment = paymentRead.payload[0];
  const deadlineDelta = new Date(payment.payment_due_at).getTime() - new Date(payment.payment_started_at).getTime();
  check(["payment", "paid"].includes(payment.status) && deadlineDelta === 7_200_000, "PostgreSQL stores a deadline exactly two hours after payment start");
  await adminAPage.screenshot({ path: join(evidenceDir, "admin-payment-desktop.png"), fullPage: true });
  if (currentStatus === "payment") {
    await advanceInAdminUi(adminAPage, "Pagado");
    currentStatus = "paid";
  }
  check((await adminAPage.getByRole("timer").count()) === 0, "admin countdown stops after paid");

  await clientAPage.goto(`${baseUrl}/account/applications/${primaryId}`, { waitUntil: "domcontentloaded" });
  await clientAPage.getByText("Pagado", { exact: true }).first().waitFor();
  check((await clientAPage.getByRole("timer").count()) === 0, "client countdown stops after paid");
  const fullHistory = await request(`/rest/v1/application_status_history?application_id=eq.${primaryId}&select=to_status,author_role_snapshot&order=created_at.asc,id.asc`, { token: users.clientA.accessToken });
  const statusSequence = fullHistory.payload.map((item) => item.to_status);
  check(JSON.stringify(statusSequence) === JSON.stringify(["new", "in_progress", "sent", "accepted", "verification", "payment", "paid"]), "status history contains the complete strict lifecycle");
  check(fullHistory.payload[0].author_role_snapshot === "client" && fullHistory.payload.at(-1).author_role_snapshot === "admin", "history preserves client and admin role snapshots");

  const clientOutbox = await request("/rest/v1/notification_outbox?select=id&limit=1", { token: users.clientA.accessToken, allowFailure: true });
  check(!clientOutbox.ok, "client cannot read notification_outbox");
  const adminOutbox = await request("/rest/v1/notification_outbox?select=id&limit=1", { token: users.adminA.accessToken, allowFailure: true });
  check(!adminOutbox.ok, "ordinary admin cannot read notification_outbox");

  await clientAPage.setViewportSize({ width: 390, height: 844 });
  await clientAPage.reload({ waitUntil: "domcontentloaded" });
  await expectNoOverflow(clientAPage, "client detail at 390px");
  await clientAPage.screenshot({ path: join(evidenceDir, "client-paid-mobile.png"), fullPage: true });
  await adminAPage.setViewportSize({ width: 390, height: 844 });
  await adminAPage.goto(`${baseUrl}/admin?view=mine`, { waitUntil: "domcontentloaded" });
  await expectNoOverflow(adminAPage, "admin dashboard at 390px");
  await adminAPage.screenshot({ path: join(evidenceDir, "admin-dashboard-mobile.png"), fullPage: true });

  const publicMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const publicMobilePage = await publicMobile.newPage();
  await publicMobilePage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await expectNoOverflow(publicMobilePage, "public calculator at 390px");
  await publicMobilePage.screenshot({ path: join(evidenceDir, "public-calculator-mobile.png"), fullPage: false });
  await publicMobilePage.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
  await expectNoOverflow(publicMobilePage, "login page at 390px");
  await publicMobilePage.goto(`${baseUrl}/auth/register`, { waitUntil: "domcontentloaded" });
  await expectNoOverflow(publicMobilePage, "register page at 390px");
  await publicMobilePage.goto(`${baseUrl}/auth/forgot-password`, { waitUntil: "domcontentloaded" });
  await expectNoOverflow(publicMobilePage, "password recovery page at 390px");
  await publicMobile.close();

  await clientAContext.close();
  await adminAContext.close();
  await adminBContext.close();
} finally {
  await browser.close();
}

const allApplicationsResponse = await request(`/rest/v1/applications?client_id=in.(${users.clientA.id},${users.clientB.id})&select=id,reference_code,status,client_id&order=created_at.asc`);
const allTestApplications = allApplicationsResponse.payload;
const testApplicationIds = allTestApplications.map((application) => application.id);
const outboxFilter = encodeURIComponent(`(${testApplicationIds.join(",")})`);
const outboxResponse = await request(`/rest/v1/notification_outbox?application_id=in.${outboxFilter}&select=id,event_type,status,event_key,application_id&order=created_at.asc`);
const outbox = outboxResponse.payload;
manifest.applications.all = allTestApplications.map(({ id, reference_code: referenceCode, status, client_id: clientId }) => ({ id, referenceCode, status, clientId }));
manifest.outboxIds = outbox.map((item) => item.id);
await saveManifest();
const eventTypeCounts = Object.fromEntries([...new Set(outbox.map((item) => item.event_type))].sort().map((eventType) => [eventType, outbox.filter((item) => item.event_type === eventType).length]));
check(outbox.length > 0 && outbox.every((item) => item.status === "pending"), "all staging test notifications remain pending because no worker ran");
check(new Set(outbox.map((item) => item.event_key)).size === outbox.length, "outbox event keys are unique for the staging test data");

const safeUsers = Object.values(users).map(({ label, email, displayName, role, id }) => ({ label, email, displayName, role, id }));
const summary = {
  passed: results.length,
  projectRef,
  users: safeUsers,
  applications: {
    lifecycle: { id: primaryApplication.id, referenceCode: primaryApplication.reference_code, finalStatus: "paid", receiptPath },
    idempotencyClientA: idemOne.payload.id,
    sameKeyClientB: otherClientKey.payload.id,
    allSynthetic: allTestApplications,
  },
  outbox: { total: outbox.length, pending: outbox.filter((item) => item.status === "pending").length, eventTypeCounts },
  playwrightProblems: playwrightLogs,
  evidenceDir,
  manifestPath,
};
check(playwrightLogs.length === 0, `browser pages have no uncaught errors (${playwrightLogs.join(" | ")})`);
process.stdout.write(`STAGING_E2E_SUMMARY=${JSON.stringify(summary)}\n`);
