import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const siteUrl = process.env.TEST_SITE_URL || "http://localhost:3300";
const supabaseTestWorkdir = process.env.SUPABASE_TEST_WORKDIR?.trim();
if (!supabaseTestWorkdir) throw new Error("SUPABASE_TEST_WORKDIR is required for isolated pricing integration.");

const statusOutput = execFileSync(process.execPath, [
  path.join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js"),
  "status",
  "-o",
  "env",
  "--workdir",
  supabaseTestWorkdir,
], { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const localEnvironment = Object.fromEntries(statusOutput.split(/\r?\n/).map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((match) => {
  const value = match[2].trim();
  return [match[1], value.startsWith('"') ? JSON.parse(value) : value];
}));
const apiUrl = localEnvironment.API_URL;
const publishableKey = localEnvironment.PUBLISHABLE_KEY;
const serviceRoleKey = localEnvironment.SERVICE_ROLE_KEY;
if (!apiUrl || !publishableKey || !serviceRoleKey || !apiUrl.includes(":55621")) {
  throw new Error("Pricing integration refused a non-isolated Supabase target.");
}

const service = createClient(apiUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(apiUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = "Local-Pricing-Test-123!";
const createdUserIds = [];
const createdApplicationIds = [];
let adminClient;
let materialChanged = false;
let publicPriceChanged = false;
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function pass(message) {
  passed += 1;
  process.stdout.write(`PASS: ${message}\n`);
}
function createCookieJar() {
  const cookies = new Map();
  return {
    getAll: () => [...cookies.entries()].map(([name, value]) => ({ name, value })),
    setAll(values) {
      for (const { name, value, options } of values) {
        if (!value || options?.maxAge === 0) cookies.delete(name);
        else cookies.set(name, value);
      }
    },
    header: () => [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
  };
}
async function createUser(label, role) {
  const email = `pricing-${label}-${runId}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Pricing ${label}`, locale: "es" },
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  if (role === "admin") {
    const { error: roleError } = await service.from("profiles").update({ role: "admin" }).eq("user_id", data.user.id);
    if (roleError) throw roleError;
  }
  const jar = createCookieJar();
  const client = createServerClient(apiUrl, publishableKey, {
    cookies: { getAll: jar.getAll, setAll: (values) => jar.setAll(values) },
  });
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  return { id: data.user.id, email, client, jar };
}
async function page(pathname, jar) {
  const response = await fetch(`${siteUrl}${pathname}`, {
    headers: jar?.header() ? { cookie: jar.header() } : {},
    redirect: "manual",
  });
  return { response, body: await response.text() };
}
function applicationInput(overrides = {}) {
  return {
    p_material_id: "solid",
    p_declared_weight_kg: 20,
    p_city: "Madrid",
    p_delivery_method: "send",
    p_idempotency_key: randomUUID(),
    p_contact_phone: "+34 600 000 000",
    p_repeat_customer: false,
    p_payment_recipient_name: "Cliente Sintético",
    p_payment_iban: "ES0000000000000000000000",
    p_preferred_visit_dates: [],
    p_expected_rate_eur: 40,
    ...overrides,
  };
}

try {
  const client = await createUser("client", "client");
  const admin = await createUser("admin", "admin");
  adminClient = admin.client;

  const { data: initialPublic, error: initialPublicError } = await anon.from("site_public_pricing").select("price_eur_per_kg,price_date").single();
  if (initialPublicError) throw initialPublicError;
  assert(Number(initialPublic.price_eur_per_kg) === 25 && initialPublic.price_date === "2026-11-09", "Unexpected initial public price.");
  pass("anonymous visitors can read the managed public price");

  const { error: anonMutationError } = await anon.rpc("update_material_rate", { p_material_id: "solid", p_new_rate_eur: 41 });
  assert(anonMutationError, "Anon changed a material rate.");
  const { error: clientMutationError } = await client.client.rpc("update_material_rate", { p_material_id: "solid", p_new_rate_eur: 41 });
  assert(clientMutationError?.message === "admin_required", "Client reached the material pricing mutation.");
  pass("anon and client cannot change pricing RPCs");

  const clientPricingPage = await page("/admin/pricing", client.jar);
  assert(clientPricingPage.body.includes("NEXT_REDIRECT") && clientPricingPage.body.includes("admin_required"), "Client opened /admin/pricing.");
  const adminPricingPage = await page("/admin/pricing", admin.jar);
  assert(adminPricingPage.response.ok && adminPricingPage.body.includes("Precios y tarifas"), "Admin pricing page did not render from PostgreSQL.");
  pass("/admin/pricing enforces the role and renders for an active admin");

  const { data: oldApplication, error: oldApplicationError } = await client.client.rpc("create_application", applicationInput());
  if (oldApplicationError) throw oldApplicationError;
  createdApplicationIds.push(oldApplication.id);
  assert(Number(oldApplication.rate_snapshot_eur) === 40 && Number(oldApplication.estimated_amount_eur) === 800, "Initial application snapshot is incorrect.");
  pass("client creates the pre-change application with trusted 40 €/kg snapshot");

  const { error: directUpdateError } = await admin.client.from("materials").update({ rate_eur: 99 }).eq("id", "solid");
  assert(directUpdateError, "Admin bypassed the guarded material RPC.");
  pass("authenticated admins cannot bypass the narrow RPC with direct UPDATE");

  const { data: changedMaterial, error: changedMaterialError } = await admin.client.rpc("update_material_rate", { p_material_id: "solid", p_new_rate_eur: 41 });
  if (changedMaterialError) throw changedMaterialError;
  materialChanged = true;
  assert(Number(changedMaterial.rate_eur) === 41, "Admin RPC did not return the updated rate.");
  const { data: materialAudit, error: materialAuditError } = await admin.client.from("pricing_change_history").select("id,target_kind,material_id,changed_by,old_rate_eur,new_rate_eur").eq("target_kind", "material_rate").order("id", { ascending: false }).limit(1).single();
  if (materialAuditError) throw materialAuditError;
  assert(materialAudit.material_id === "solid" && materialAudit.changed_by === admin.id && Number(materialAudit.old_rate_eur) === 40 && Number(materialAudit.new_rate_eur) === 41, "Material audit row is incorrect.");
  pass("admin material RPC atomically writes the new rate and exact audit row");

  const { error: forgedAuditError } = await client.client.from("pricing_change_history").insert({ target_kind: "material_rate", material_id: "solid", changed_by: client.id, old_rate_eur: 1, new_rate_eur: 2 });
  assert(forgedAuditError, "Client forged pricing audit history.");
  const { error: changedAuditError } = await admin.client.from("pricing_change_history").update({ new_rate_eur: 99 }).eq("id", materialAudit.id);
  assert(changedAuditError, "Admin changed immutable pricing history directly.");
  pass("pricing audit cannot be forged or edited through browser roles");

  const { count: auditBeforeInvalid } = await admin.client.from("pricing_change_history").select("id", { count: "exact", head: true });
  const { error: invalidRateError } = await admin.client.rpc("update_material_rate", { p_material_id: "solid", p_new_rate_eur: 41.001 });
  assert(invalidRateError?.message === "invalid_material_rate", "Over-precision rate was accepted.");
  const { data: afterInvalid } = await anon.from("materials").select("rate_eur").eq("id", "solid").single();
  const { count: auditAfterInvalid } = await admin.client.from("pricing_change_history").select("id", { count: "exact", head: true });
  assert(Number(afterInvalid.rate_eur) === 41 && auditAfterInvalid === auditBeforeInvalid, "Invalid update left a partial rate or audit mutation.");
  pass("invalid pricing fails atomically without partial data");

  const { data: publicBeforeMaterial } = await anon.from("site_public_pricing").select("price_eur_per_kg").single();
  assert(Number(publicBeforeMaterial.price_eur_per_kg) === 25, "Material update changed public pricing.");
  const { data: changedPublic, error: changedPublicError } = await admin.client.rpc("update_public_pricing", { p_price_eur_per_kg: 26.5, p_price_date: "2026-11-10" });
  if (changedPublicError) throw changedPublicError;
  publicPriceChanged = true;
  assert(Number(changedPublic.price_eur_per_kg) === 26.5, "Public price RPC returned an incorrect value.");
  const { data: materialAfterPublic } = await anon.from("materials").select("rate_eur").eq("id", "solid").single();
  assert(Number(materialAfterPublic.rate_eur) === 41, "Public price update changed the material rate.");
  pass("public price and material rate are independent managed values");

  const { data: persistedOld } = await client.client.from("applications").select("rate_snapshot_eur,estimated_amount_eur").eq("id", oldApplication.id).single();
  assert(Number(persistedOld.rate_snapshot_eur) === 40 && Number(persistedOld.estimated_amount_eur) === 800, "Historical application was recalculated.");
  pass("existing application keeps its historical amount after rate changes");

  const { error: staleRateError } = await client.client.rpc("create_application", applicationInput({ p_expected_rate_eur: 40 }));
  assert(staleRateError?.message === "material_rate_changed", "Stale preview rate created an unexpected application.");
  pass("concurrent price change rejects stale application confirmation");

  const { data: newApplication, error: newApplicationError } = await client.client.rpc("create_application", applicationInput({
    p_delivery_method: "warehouse",
    p_payment_recipient_name: null,
    p_payment_iban: null,
    p_expected_rate_eur: 41,
  }));
  if (newApplicationError) throw newApplicationError;
  createdApplicationIds.push(newApplication.id);
  assert(Number(newApplication.rate_snapshot_eur) === 41 && Number(newApplication.estimated_amount_eur) === 820, "New application did not use the current trusted rate.");
  pass("reconfirmed account-style application uses the current 41 €/kg rate");

  const updatedAdminPage = await page(`/admin/pricing?run=${runId}`, admin.jar);
  assert(updatedAdminPage.response.ok && updatedAdminPage.body.includes('value="41.00"') && updatedAdminPage.body.includes('value="26.50"'), "Admin pricing page did not reread current PostgreSQL values.");
  const updatedHome = await page(`/?run=${runId}`);
  assert(updatedHome.response.ok && updatedHome.body.includes("26,5 €/kg") && updatedHome.body.includes("820"), "Public calculator rendered stale/static pricing.");
  pass("new Next.js requests reread managed pricing without redeploy or materialMeta fallback");

  const { error: disableAdminError } = await service.from("profiles").update({ active: false }).eq("user_id", admin.id);
  if (disableAdminError) throw disableAdminError;
  const { error: inactiveAdminError } = await admin.client.rpc("update_material_rate", { p_material_id: "solid", p_new_rate_eur: 42 });
  assert(inactiveAdminError?.message === "admin_required", "Inactive admin changed a rate.");
  const { error: enableAdminError } = await service.from("profiles").update({ active: true }).eq("user_id", admin.id);
  if (enableAdminError) throw enableAdminError;
  pass("inactive admin is rejected by PostgreSQL, not only by the UI");

  process.stdout.write(`Pricing integration checks passed: ${passed}/${passed}.\n`);
} finally {
  if (adminClient && publicPriceChanged) await adminClient.rpc("update_public_pricing", { p_price_eur_per_kg: 25, p_price_date: "2026-11-09" });
  if (adminClient && materialChanged) await adminClient.rpc("update_material_rate", { p_material_id: "solid", p_new_rate_eur: 40 });
  if (createdApplicationIds.length) await service.from("applications").delete().in("id", createdApplicationIds);
  for (const userId of createdUserIds.reverse()) await service.auth.admin.deleteUser(userId);
}
