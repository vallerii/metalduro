import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";

const expectedRef = "lavmldzccvctmegasobz";
const mode = process.argv[2];
const appUrl = "http://localhost:3001";
const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const publishableKey = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.STAGING_SUPABASE_SECRET_KEY;
const email = process.env.STAGING_PRICING_TEST_EMAIL;
const password = process.env.STAGING_PRICING_TEST_PASSWORD;
const adminId = process.env.STAGING_PRICING_TEST_ADMIN_ID;
const projectRef = process.env.STAGING_PROJECT_REF;

assert.equal(projectRef, expectedRef, "Refusing an unexpected Supabase project.");
assert.equal(supabaseUrl, `https://${expectedRef}.supabase.co`);
assert.ok(publishableKey?.startsWith("sb_publishable_"));
assert.match(email ?? "", /^metalduro-stage510d-[a-f0-9]+@example\.test$/);
assert.match(adminId ?? "", /^[0-9a-f-]{36}$/);
assert.ok(password?.length >= 32);
assert.ok(["client", "admin"].includes(mode));
if (mode === "admin") assert.ok(secretKey?.startsWith("sb_secret_"));

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const cdpPort = 46_000 + (process.pid % 10_000);
const runRoot = path.join(process.env.LOCALAPPDATA || process.cwd(), "MetalduroStage510D");
const chromeProfile = path.join(runRoot, `chrome-${process.pid}-${Date.now()}`);
const screenshotPath = path.join(runRoot, `pricing-${mode}-final.png`);
let chromeProcess;
let socket;
const consoleProblems = [];

function startProcess(command, args, options) {
  return spawn(command, args, { ...options, windowsHide: true });
}

async function waitFor(check, message, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch {}
    await delay(125);
  }
  throw new Error(message);
}

async function connectCdpSocket(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
      return;
    }
    for (const listener of listeners) listener(message);
  });
  return {
    ws,
    onEvent(listener) { listeners.push(listener); },
    send(method, params = {}) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        ws.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
  };
}

async function connectCdp() {
  const pages = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    return response.ok ? response.json() : null;
  }, "Chrome DevTools endpoint did not become ready.");
  const page = pages.find((candidate) => candidate.type === "page");
  assert.ok(page?.webSocketDebuggerUrl);
  return connectCdpSocket(page.webSocketDebuggerUrl);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Browser evaluation failed.");
  }
  return result.result.value;
}

async function navigate(cdp, route) {
  await cdp.send("Page.navigate", { url: `${appUrl}${route}` });
  const pathname = route.split("?")[0];
  await waitFor(
    () => evaluate(cdp, `document.readyState === "complete" && location.pathname === ${JSON.stringify(pathname)}`),
    `Page did not load: ${route}`,
    45_000,
  );
}

async function setInput(cdp, selector, value) {
  await evaluate(cdp, `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) throw new Error(${JSON.stringify(`Missing input: ${selector}`)});
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
}

async function login(cdp, nextPath) {
  const route = `/auth/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
  await navigate(cdp, route);
  await setInput(cdp, 'input[name="email"]', email);
  await setInput(cdp, 'input[name="password"]', password);
  await evaluate(cdp, `document.querySelector("form").requestSubmit()`);
  await waitFor(
    () => evaluate(cdp, `location.pathname !== "/auth/login"`),
    "Login did not complete.",
    30_000,
  );
}

async function screenshot(cdp) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(result.data, "base64"));
}

async function submitMaterial(cdp, value) {
  const selector = 'form:has(input[name="materialId"][value="mixed"]) input[name="rateEur"]';
  await setInput(cdp, selector, value);
  await evaluate(cdp, `document.querySelector('form:has(input[name="materialId"][value="mixed"])').requestSubmit()`);
  await delay(1_000);
  await waitFor(
    () => evaluate(cdp, `document.body.innerText.includes("El precio se ha guardado correctamente.")`),
    `Material save did not succeed for ${value}.`,
    30_000,
  );
}

async function submitPublic(cdp, rate, date) {
  await setInput(cdp, 'input[name="priceEurPerKg"]', rate);
  await setInput(cdp, 'input[name="priceDate"]', date);
  await evaluate(cdp, `document.querySelector('form:has(input[name="priceEurPerKg"])').requestSubmit()`);
  await delay(1_000);
  await waitFor(
    () => evaluate(cdp, `document.body.innerText.includes("El precio se ha guardado correctamente.")`),
    `Public price save did not succeed for ${rate}/${date}.`,
    30_000,
  );
}

async function chooseMixedAndReadEstimate(cdp) {
  await evaluate(cdp, `(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("Todo mezclado"));
    if (!button) throw new Error("Mixed material control not found");
    button.click();
  })()`);
  await delay(300);
  return evaluate(cdp, `document.querySelector("#calculator").innerText`);
}

await mkdir(runRoot, { recursive: true });
await rm(chromeProfile, { recursive: true, force: true });

try {
  chromeProcess = startProcess(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${chromeProfile}`,
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1000",
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const cdp = await connectCdp();
  socket = cdp.ws;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  cdp.onEvent((message) => {
    if (message.method === "Page.javascriptDialogOpening") {
      cdp.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
    }
    if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params.type)) {
      consoleProblems.push(message.params.args.map((item) => item.value || item.description).join(" "));
    }
    if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
      consoleProblems.push(message.params.entry.text);
    }
  });

  if (mode === "client") {
    await login(cdp, null);
    await cdp.send("Page.navigate", { url: `${appUrl}/admin/pricing` });
    await waitFor(() => evaluate(cdp, `location.pathname === "/account"`), "Client was not rejected from /admin/pricing.");
    assert.deepEqual(consoleProblems, []);
    console.log(JSON.stringify({ mode, login: true, adminPricingDenied: true, finalPath: "/account" }));
  } else {
    const service = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const admin = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInError } = await admin.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    let materialNeedsRestore = false;
    let publicNeedsRestore = false;
    try {
      await login(cdp, "/admin/pricing");
      await waitFor(() => evaluate(cdp, `location.pathname === "/admin/pricing"`), "Admin pricing did not open.");
      await waitFor(
        () => evaluate(cdp, `Boolean(document.querySelector('form input[name="materialId"][value="mixed"]'))`),
        "Admin pricing form did not finish rendering.",
        45_000,
      );

      await submitMaterial(cdp, "30.50");
      materialNeedsRestore = true;
      const { data: changedMaterial, error: changedMaterialError } = await service.from("materials").select("rate_eur").eq("id", "mixed").single();
      if (changedMaterialError) throw changedMaterialError;
      assert.equal(Number(changedMaterial.rate_eur), 30.5);

      await navigate(cdp, "/");
      assert.match(await chooseMixedAndReadEstimate(cdp), /610\s*€/);
      await cdp.send("Page.navigate", { url: `${appUrl}/account/applications/new` });
      await waitFor(
        () => evaluate(cdp, `location.pathname === "/account" && location.search.includes("client_required")`),
        "Admin was not rejected from the client-only calculator.",
      );

      await navigate(cdp, "/admin/pricing");
      await submitMaterial(cdp, "30.00");
      materialNeedsRestore = false;
      const { data: restoredMaterial } = await service.from("materials").select("rate_eur").eq("id", "mixed").single();
      assert.equal(Number(restoredMaterial.rate_eur), 30);

      await submitPublic(cdp, "25.50", "2026-11-10");
      publicNeedsRestore = true;
      const { data: changedPublic, error: changedPublicError } = await service.from("site_public_pricing").select("price_eur_per_kg,price_date").single();
      if (changedPublicError) throw changedPublicError;
      assert.equal(Number(changedPublic.price_eur_per_kg), 25.5);
      assert.equal(changedPublic.price_date, "2026-11-10");

      await navigate(cdp, "/");
      const priceChip = await evaluate(cdp, `document.querySelector(".public-price-chip").innerText`);
      const heroPrice = await evaluate(cdp, `document.querySelector(".public-price-card-hero").innerText`);
      assert.match(priceChip, /25[,.]5\s*€\/kg/);
      assert.match(heroPrice, /25[,.]5\s*€\/kg/);
      assert.match(heroPrice, /10 de noviembre de 2026/);
      assert.match(await chooseMixedAndReadEstimate(cdp), /600\s*€/);

      await navigate(cdp, "/admin/pricing");
      await submitPublic(cdp, "25.00", "2026-11-09");
      publicNeedsRestore = false;

      const { data: finalMaterials, error: finalMaterialsError } = await service.from("materials").select("id,rate_eur").order("id");
      if (finalMaterialsError) throw finalMaterialsError;
      assert.deepEqual(Object.fromEntries(finalMaterials.map((row) => [row.id, Number(row.rate_eur)])), {
        inserts: 36,
        mixed: 30,
        scrap: 34,
        solid: 40,
      });
      const { data: finalPublic, error: finalPublicError } = await service.from("site_public_pricing").select("price_eur_per_kg,price_date").single();
      if (finalPublicError) throw finalPublicError;
      assert.equal(Number(finalPublic.price_eur_per_kg), 25);
      assert.equal(finalPublic.price_date, "2026-11-09");
      const { data: audit, error: auditError } = await service.from("pricing_change_history").select("id,target_kind,material_id,changed_by,old_rate_eur,new_rate_eur,old_price_date,new_price_date,created_at").order("id");
      if (auditError) throw auditError;
      assert.equal(audit.length, 4);
      assert.ok(audit.every((row) => row.changed_by === adminId));

      const directUpdate = await admin.from("materials").update({ rate_eur: 31 }).eq("id", "mixed").select("id");
      assert.ok(directUpdate.error);
      const auditUpdate = await admin.from("pricing_change_history").update({ new_rate_eur: 99 }).eq("id", audit[0].id).select("id");
      assert.ok(auditUpdate.error);

      const documentHtml = await (await fetch(`${appUrl}/admin/pricing`)).text();
      const scriptPaths = [...documentHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
      const clientAssets = await Promise.all(scriptPaths.map(async (src) => (await (await fetch(new URL(src, appUrl))).text())));
      assert.ok(!clientAssets.some((asset) => asset.includes(secretKey) || /sb_secret_[A-Za-z0-9_-]{20,}/.test(asset)));

      await navigate(cdp, "/");
      assert.match(await evaluate(cdp, `document.querySelector(".public-price-chip").innerText`), /25\s*€\/kg/);
      assert.match(await evaluate(cdp, `document.querySelector(".public-price-card-hero").innerText`), /9 de noviembre de 2026/);
      await navigate(cdp, "/admin/pricing");
      await screenshot(cdp);
      assert.deepEqual(consoleProblems, []);
      console.log(JSON.stringify({
        mode,
        materialChangedAndRestored: true,
        publicPriceChangedAndRestored: true,
        publicCalculatorObserved30_5: true,
        adminRejectedFromClientCalculator: true,
        auditRows: audit,
        directUpdateDenied: true,
        auditMutationDenied: true,
        secretAbsentFromClientAssets: true,
        screenshot: screenshotPath,
      }));
    } catch (error) {
      const restoreErrors = [];
      if (materialNeedsRestore) {
        const restored = await admin.rpc("update_material_rate", { p_material_id: "mixed", p_new_rate_eur: 30 });
        if (restored.error) restoreErrors.push(`material:${restored.error.message}`);
      }
      if (publicNeedsRestore) {
        const restored = await admin.rpc("update_public_pricing", { p_price_eur_per_kg: 25, p_price_date: "2026-11-09" });
        if (restored.error) restoreErrors.push(`public:${restored.error.message}`);
      }
      if (restoreErrors.length) throw new Error(`Emergency restore failed: ${restoreErrors.join(" | ")}`, { cause: error });
      throw error;
    }
  }
} finally {
  socket?.close();
  chromeProcess?.kill("SIGTERM");
  await delay(750);
  await rm(chromeProfile, { recursive: true, force: true }).catch(() => {});
}
