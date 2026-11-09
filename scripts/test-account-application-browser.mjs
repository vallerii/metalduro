import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const appPort = 31_000 + (process.pid % 10_000);
const cdpPort = 42_000 + (process.pid % 10_000);
const appDir = process.cwd();
const nextBin = join(appDir, "node_modules/next/dist/bin/next");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const runRoot = join(process.env.LOCALAPPDATA || appDir, "MetalduroStage55BrowserQa");
const chromeProfile = join(runRoot, `chrome-${process.pid}-${Date.now()}`);
const desktopScreenshot = join(runRoot, "navigation-checkout-desktop.png");
const mobileScreenshot = join(runRoot, "navigation-checkout-mobile.png");
const adminScreenshot = join(runRoot, "admin-dashboard-desktop.png");
const pricingScreenshot = join(runRoot, "admin-pricing-desktop.png");
const pricingMobileScreenshot = join(runRoot, "admin-pricing-mobile.png");
const userMenuScreenshot = join(runRoot, "header-user-menu-desktop.png");
const publicPriceScreenshots = Object.fromEntries(
  [1440, 1280, 768, 390, 375].map((width) => [width, join(runRoot, `public-price-${width}.png`)]),
);
const userId = "55555555-5555-4555-8555-555555555555";
const applicationId = "66666666-6666-4666-8666-666666666666";
const now = new Date().toISOString();
let nextProcess;
let chromeProcess;
let socket;
let nextOutput = "";
let rpcRequests = 0;
let lastRpcBody = null;
const rpcBodies = [];
let simulatedTransientFailures = 0;
let claimRequests = 0;
let signupRequests = 0;
let materialRateUpdateRequests = 0;
let publicPriceUpdateRequests = 0;
let failNextMaterialRateUpdate = false;
const consoleProblems = [];
const networkRequests = new Map();
const networkFailures = [];

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const accessToken = `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  role: "authenticated",
  sub: userId,
})}.c2ln`;
const user = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "stage54-client@example.test",
  email_confirmed_at: now,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: now,
  updated_at: now,
};
const profile = {
  user_id: userId,
  email: user.email,
  display_name: "Stage 54 Client",
  phone: null,
  locale: "es",
  role: "client",
  active: true,
};
const materialRows = [
  { id: "inserts", name: "Plaquitas", rate_eur: 36, active: true, updated_at: now },
  { id: "mixed", name: "Metal duro mixto", rate_eur: 30, active: true, updated_at: now },
  { id: "scrap", name: "Restos de metal duro", rate_eur: 34, active: true, updated_at: now },
  { id: "solid", name: "Metal duro entero", rate_eur: 40, active: true, updated_at: now },
];
let publicPricingRow = {
  id: "default",
  price_eur_per_kg: 25,
  price_date: "2026-11-09",
  updated_at: now,
};
const pricingHistory = [];

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "content-type": "application/json",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
}

function applicationRow() {
  return {
    id: applicationId,
    material_id: "solid",
    declared_weight_kg: 20,
    rate_snapshot_eur: 40,
    estimated_amount_eur: 800,
    status: "new",
    payment_started_at: null,
    payment_due_at: null,
    created_at: now,
    updated_at: now,
    city: "Madrid",
    delivery_method: "send",
    contact_phone: "+34 600 000 000",
    repeat_customer: false,
    payment_recipient_name: "Cliente Prueba",
    payment_iban: "ES9121000418450200051332",
    preferred_visit_dates: [],
    reference_code: "BD010641",
    material: { name: "Metal duro entero" },
    client: {
      user_id: userId,
      display_name: "Stage 54 Client",
      email: user.email,
      phone: "+34 600 000 000",
    },
    manager: null,
  };
}

function startMockSupabase() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    if (request.method === "POST" && url.pathname === "/auth/v1/token") {
      await readJson(request);
      sendJson(response, 200, {
        access_token: accessToken,
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user,
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/auth/v1/signup") {
      signupRequests += 1;
      await readJson(request);
      sendJson(response, 200, { ...user, confirmation_sent_at: now });
      return;
    }
    if (request.method === "POST" && url.pathname === "/auth/v1/verify") {
      await readJson(request);
      sendJson(response, 200, {
        access_token: accessToken,
        refresh_token: "mock-confirmation-refresh-token",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user,
      });
      return;
    }
    if (request.method === "PUT" && url.pathname === "/auth/v1/user") {
      await readJson(request);
      sendJson(response, 200, user);
      return;
    }
    if (request.method === "POST" && url.pathname === "/auth/v1/logout") {
      sendJson(response, 200, {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/auth/v1/user") {
      sendJson(response, 200, user);
      return;
    }
    if (request.method === "GET" && url.pathname === "/rest/v1/profiles") {
      const wantsObject = request.headers.accept?.includes("application/vnd.pgrst.object");
      sendJson(response, 200, wantsObject ? profile : [profile]);
      return;
    }
    if (request.method === "GET" && url.pathname === "/rest/v1/materials") {
      const wantsObject = request.headers.accept?.includes("application/vnd.pgrst.object");
      const requestedId = url.searchParams.get("id")?.replace(/^eq\./, "");
      const selected = materialRows.find((row) => row.id === requestedId) ?? materialRows[0];
      sendJson(response, 200, wantsObject || requestedId ? selected : materialRows);
      return;
    }
    if (request.method === "GET" && url.pathname === "/rest/v1/site_public_pricing") {
      sendJson(response, 200, publicPricingRow);
      return;
    }
    if (request.method === "GET" && url.pathname === "/rest/v1/pricing_change_history") {
      sendJson(response, 200, pricingHistory);
      return;
    }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/update_material_rate") {
      materialRateUpdateRequests += 1;
      const body = await readJson(request);
      if (profile.role !== "admin") {
        sendJson(response, 403, { message: "admin_required" });
        return;
      }
      if (failNextMaterialRateUpdate) {
        failNextMaterialRateUpdate = false;
        await delay(250);
        sendJson(response, 500, { message: "database_unavailable" });
        return;
      }
      const material = materialRows.find((row) => row.id === body?.p_material_id);
      if (!material) {
        sendJson(response, 400, { message: "material_not_found" });
        return;
      }
      const previous = material.rate_eur;
      material.rate_eur = Number(body.p_new_rate_eur);
      material.updated_at = new Date().toISOString();
      if (previous !== material.rate_eur) {
        pricingHistory.unshift({
          id: pricingHistory.length + 1,
          target_kind: "material_rate",
          material_id: material.id,
          changed_by: userId,
          old_rate_eur: previous,
          new_rate_eur: material.rate_eur,
          old_price_date: null,
          new_price_date: null,
          created_at: material.updated_at,
        });
      }
      await delay(450);
      sendJson(response, 200, material);
      return;
    }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/update_public_pricing") {
      publicPriceUpdateRequests += 1;
      const body = await readJson(request);
      if (profile.role !== "admin") {
        sendJson(response, 403, { message: "admin_required" });
        return;
      }
      const previous = { ...publicPricingRow };
      publicPricingRow = {
        ...publicPricingRow,
        price_eur_per_kg: Number(body.p_price_eur_per_kg),
        price_date: body.p_price_date,
        updated_at: new Date().toISOString(),
      };
      pricingHistory.unshift({
        id: pricingHistory.length + 1,
        target_kind: "public_price",
        material_id: null,
        changed_by: userId,
        old_rate_eur: previous.price_eur_per_kg,
        new_rate_eur: publicPricingRow.price_eur_per_kg,
        old_price_date: previous.price_date,
        new_price_date: publicPricingRow.price_date,
        created_at: publicPricingRow.updated_at,
      });
      await delay(450);
      sendJson(response, 200, publicPricingRow);
      return;
    }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/create_application") {
      rpcRequests += 1;
      lastRpcBody = await readJson(request);
      rpcBodies.push(lastRpcBody);
      await delay(550);
      if (
        lastRpcBody?.p_contact_phone === "+34 600 000 009" &&
        simulatedTransientFailures < 2
      ) {
        simulatedTransientFailures += 1;
        sendJson(response, 503, { message: "temporary mock network failure" });
        return;
      }
      sendJson(response, 200, applicationRow());
      return;
    }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/get_server_time") {
      sendJson(response, 200, now);
      return;
    }
    if (request.method === "POST" && url.pathname === "/rest/v1/rpc/claim_application") {
      claimRequests += 1;
      await readJson(request);
      sendJson(response, 200, applicationRow());
      return;
    }
    if (request.method === "HEAD" && url.pathname === "/rest/v1/applications") {
      response.writeHead(200, { "content-range": "0-0/1" });
      response.end();
      return;
    }
    if (request.method === "GET" && url.pathname === "/rest/v1/applications") {
      const wantsObject = request.headers.accept?.includes("application/vnd.pgrst.object");
      sendJson(response, 200, wantsObject ? applicationRow() : [applicationRow()], {
        "content-range": "0-0/1",
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/rest/v1/application_status_history") {
      sendJson(response, 200, [
        {
          id: 1,
          from_status: null,
          to_status: "new",
          author_name_snapshot: "Stage 54 Client",
          author_role_snapshot: "client",
          created_at: now,
        },
      ]);
      return;
    }
    if (request.method === "GET" && url.pathname === "/rest/v1/application_receipts") {
      sendJson(response, 200, null);
      return;
    }

    sendJson(response, 404, { message: `mock_not_found:${request.method}:${url.pathname}` });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function startProcess(command, args, options) {
  return spawn(command, args, { ...options, windowsHide: true });
}

function stopProcessTree(child) {
  if (!child?.pid) return;
  child.kill("SIGTERM");
}

async function waitFor(check, message, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch {}
    await delay(100);
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
  assert(page?.webSocketDebuggerUrl);
  return connectCdpSocket(page.webSocketDebuggerUrl);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "Browser evaluation failed.",
    );
  }
  return result.result.value;
}

async function navigate(cdp, path) {
  await cdp.send("Page.navigate", { url: `http://localhost:${appPort}${path}` });
  await waitFor(
    () => evaluate(cdp, `document.readyState === "complete" && location.pathname === ${JSON.stringify(path.split("?")[0])}`),
    `Page did not load: ${path}`,
  );
}

async function screenshot(cdp, path) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(path, Buffer.from(result.data, "base64"));
}

async function click(cdp, selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
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

await mkdir(runRoot, { recursive: true });
await rm(chromeProfile, { recursive: true, force: true });
const mock = await startMockSupabase();
const address = mock.address();
assert(address && typeof address === "object");

try {
  const environment = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "mock-publishable-key",
    NEXT_PUBLIC_SITE_URL: `http://localhost:${appPort}`,
    EMAIL_PROVIDER: "mock",
    EMAIL_EXTERNAL_DELIVERY_ENABLED: "false",
  };
  delete environment.BREVO_API_KEY;
  delete environment.SUPABASE_SECRET_KEY;
  delete environment.SUPABASE_SERVICE_ROLE_KEY;

  nextProcess = startProcess(process.execPath, [nextBin, "dev", "-p", String(appPort)], {
    cwd: appDir,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  nextProcess.stdout.on("data", (chunk) => { nextOutput = `${nextOutput}${chunk}`.slice(-8_000); });
  nextProcess.stderr.on("data", (chunk) => { nextOutput = `${nextOutput}${chunk}`.slice(-8_000); });
  await waitFor(async () => {
    const response = await fetch(`http://localhost:${appPort}/auth/login`);
    return response.ok;
  }, `Next.js did not start.\n${nextOutput}`, 60_000);
  pass("Next.js uses an isolated local mock Supabase; staging is not contacted");

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
  await cdp.send("Network.enable");
  cdp.onEvent((message) => {
    if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params.type)) {
      consoleProblems.push(message.params.args.map((item) => item.value || item.description).join(" "));
    }
    if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
      if (!message.params.entry.text.includes("net::ERR_NAME_NOT_RESOLVED")) {
        consoleProblems.push(message.params.entry.text);
      }
    }
    if (message.method === "Network.requestWillBeSent") {
      networkRequests.set(message.params.requestId, message.params.request.url);
    }
    if (message.method === "Network.loadingFailed" && !message.params.canceled) {
      networkFailures.push({
        url: networkRequests.get(message.params.requestId) ?? "unknown",
        error: message.params.errorText,
      });
    }
  });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await navigate(cdp, "/");
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector("#calculator"))`), true);
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector('.lang-switch'))`), false);
  assert.equal(await evaluate(cdp, `document.querySelector('.header-phone').getAttribute('href')`), "tel:+34603623275");
  assert.match(await evaluate(cdp, `document.querySelector('.public-price-chip').innerText`), /25\s*€\/kg/);
  assert.match(await evaluate(cdp, `document.querySelector('.public-price-card-hero').innerText`), /9 de noviembre de 2026/);
  const guestHeader = await evaluate(cdp, `document.querySelector(".header-user-menu").textContent`);
  assert.match(guestHeader, /Iniciar sesión/);
  assert.match(guestHeader, /Registrarse/);
  assert.doesNotMatch(guestHeader, /Mi cuenta|Panel de administración/);
  await delay(300);
  await click(cdp, ".header-user-menu summary");
  assert.equal(await evaluate(cdp, `document.querySelector(".header-user-menu").open`), true);
  await screenshot(cdp, userMenuScreenshot);
  await click(cdp, ".header-user-menu summary");
  pass("guest header exposes the phone, managed public price and correct account menu without the language switch");

  for (const [width, height] of [[1440, 1000], [1280, 900], [768, 900], [390, 844], [375, 812]]) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await screenshot(cdp, publicPriceScreenshots[width]);
    assert.equal(await evaluate(cdp, `document.documentElement.scrollWidth - document.documentElement.clientWidth`), 0);
    assert.equal(await evaluate(cdp, `document.querySelector('.public-price-chip').getBoundingClientRect().width > 0`), true);
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  pass("header and hero price variants remain visible without overflow at 1440/1280/768/390/375px");

  await cdp.send("Page.navigate", { url: `http://localhost:${appPort}/admin/pricing` });
  await waitFor(() => evaluate(cdp, `location.pathname === "/auth/login"`), "Anonymous user was not rejected from admin pricing");
  pass("anonymous users cannot open /admin/pricing");
  await navigate(cdp, "/");

  await click(cdp, ".calc-action");
  await waitFor(() => evaluate(cdp, `document.body.innerText.includes("¿Dónde está el material")`), "Guest step 2 did not open");
  await evaluate(cdp, `(() => {
    const input = [...document.querySelectorAll("input")].find((item) => item.type === "text");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Madrid"); input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await evaluate(cdp, `[...document.querySelectorAll("button")].find((button) => button.textContent.includes("Continuar"))?.click()`);
  await waitFor(() => evaluate(cdp, `Boolean(document.querySelector(".calc-auth-callout"))`), "Guest auth callout did not appear");
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector('input[type="tel"]'))`), false);
  const storedDraft = await evaluate(cdp, `localStorage.getItem("metalduro:calculator-draft:v2")`);
  assert(storedDraft);
  assert.deepEqual(Object.keys(JSON.parse(storedDraft)).sort(), [
    "city", "deliveryMethod", "expiresAt", "materialId", "savedAt", "version", "weightText",
  ].sort());
  assert.doesNotMatch(storedDraft.toLowerCase(), /phone|iban|recipient|password|token|idempotency/);
  pass("guest receives Auth before sensitive fields and only a safe cross-tab draft is stored");

  await click(cdp, '.calc-auth-callout a[href^="/auth/login"]');
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector('input[name="email"]') && document.querySelector('input[name="password"]'))`),
    "Login form did not render",
  );
  await setInput(cdp, 'input[name="email"]', user.email);
  await setInput(cdp, 'input[name="password"]', "Stage54-Mock-Password-Only!");
  await evaluate(cdp, `document.querySelector("form").requestSubmit()`);
  await waitFor(
    () => evaluate(cdp, `location.pathname === "/" && location.search === "?checkout=1" && Boolean(document.querySelector('input[type="tel"]'))`),
    `Login did not restore the public calculator.\n${nextOutput}`,
  );
  const clientHeader = await evaluate(cdp, `document.querySelector(".header-user-menu").textContent`);
  assert.match(clientHeader, /Mi cuenta/);
  assert.doesNotMatch(clientHeader, /Panel de administración/);
  assert.equal(await evaluate(cdp, `localStorage.getItem("metalduro:calculator-draft:v2") !== null`), true);
  pass("login returns to checkout and restores the safe draft without auto-submit");

  const secondTarget = await cdp.send("Target.createTarget", {
    url: `http://localhost:${appPort}/?checkout=1`,
  });
  const secondPage = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    const pages = response.ok ? await response.json() : [];
    return pages.find((candidate) => candidate.id === secondTarget.targetId);
  }, "Second checkout tab did not open");
  const secondCdp = await connectCdpSocket(secondPage.webSocketDebuggerUrl);
  await secondCdp.send("Page.enable");
  await secondCdp.send("Runtime.enable");
  await waitFor(
    () => evaluate(secondCdp, `location.pathname === "/" && Boolean(document.querySelector('input[type="tel"]'))`),
    "Authenticated checkout did not restore in the new tab",
  );
  assert.equal(await evaluate(secondCdp, `Boolean(document.querySelector('.calc-notice'))`), true);
  secondCdp.ws.close();
  await cdp.send("Target.closeTarget", { targetId: secondPage.id });
  pass("an authenticated confirmation-style new tab restores the safe draft without tokens in storage");

  await setInput(cdp, 'input[type="tel"]', "+34 600 000 009");
  const stepThreeTextInputs = await evaluate(cdp, `[...document.querySelectorAll('input.calc-text-field:not([type="tel"])')].length`);
  assert.equal(stepThreeTextInputs >= 2, true);
  await evaluate(cdp, `(() => {
    const inputs = [...document.querySelectorAll('input.calc-text-field:not([type="tel"])')];
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(inputs[0], "Cliente Prueba"); inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    setter.call(inputs[1], "ES9121000418450200051332"); inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await screenshot(cdp, desktopScreenshot);
  const desktopOverflow = await evaluate(cdp, `document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  assert.equal(desktopOverflow, 0);
  pass("desktop 1440px form has no horizontal overflow");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot(cdp, mobileScreenshot);
  const mobileOverflow = await evaluate(cdp, `document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  assert.equal(mobileOverflow, 0);
  pass("mobile 390px form has no horizontal overflow");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate(cdp, `document.documentElement.scrollWidth - document.documentElement.clientWidth`), 0);
  pass("mobile 375px form and role-aware header have no horizontal overflow");

  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab" });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
  assert.equal(await evaluate(cdp, `document.activeElement !== document.body`), true);
  pass("form remains keyboard focusable");

  await evaluate(cdp, `(() => {
    const button = document.querySelector(".calc-inline-actions button.btn");
    button.click(); button.click();
  })()`);
  await waitFor(
    async () => rpcRequests === 1 || await evaluate(cdp, `Boolean(document.querySelector(".calc-error"))`),
    "RPC did not start and the UI did not report a validation error",
  );
  if (rpcRequests !== 1) {
    throw new Error(`RPC was not called: ${await evaluate(cdp, `document.querySelector(".calc-error")?.innerText`)}`);
  }
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector(".calc-error"))`),
    "Transient RPC failure was not shown",
  );
  assert.equal(rpcRequests, 1);
  pass("double click during a failed request still produces one RPC");

  await click(cdp, ".calc-inline-actions button.btn");
  await waitFor(() => rpcRequests === 2, "Unchanged retry did not call RPC once");
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector(".calc-error"))`),
    "Retry failure was not shown",
  );
  assert.equal(rpcBodies[0].p_idempotency_key, rpcBodies[1].p_idempotency_key);
  pass("an unchanged retry after a transient failure reuses the same intent UUID");

  await setInput(cdp, 'input[type="tel"]', "+34 600 000 000");
  await evaluate(cdp, `(() => {
    const button = document.querySelector(".calc-inline-actions button.btn");
    button.click(); button.click();
  })()`);
  await waitFor(() => rpcRequests === 3, "Changed intent did not call RPC exactly once");
  await waitFor(
    () => evaluate(cdp, `location.pathname === "/account/applications/${applicationId}"`),
    `Successful creation did not redirect to detail.\n${nextOutput}`,
  );
  assert.equal(rpcRequests, 3);
  assert.notEqual(rpcBodies[1].p_idempotency_key, rpcBodies[2].p_idempotency_key);
  assert.deepEqual(Object.keys(lastRpcBody).sort(), [
    "p_city",
    "p_contact_phone",
    "p_declared_weight_kg",
    "p_delivery_method",
    "p_expected_rate_eur",
    "p_idempotency_key",
    "p_material_id",
    "p_payment_iban",
    "p_payment_recipient_name",
    "p_preferred_visit_dates",
    "p_repeat_customer",
  ].sort());
  assert.equal(lastRpcBody.p_delivery_method, "send");
  assert.match(lastRpcBody.p_idempotency_key, /^[0-9a-f-]{36}$/i);
  pass("changing a sensitive field starts a fresh intent and one current-signature RPC");
  pass("successful creation redirects to the application detail route");
  assert.equal(await evaluate(cdp, `localStorage.getItem("metalduro:calculator-draft:v2")`), null);
  pass("successful creation clears the draft");

  await navigate(cdp, "/account/applications/new");
  await waitFor(() => evaluate(cdp, `Boolean(document.querySelector("#calculator"))`), "Account calculator did not render");
  await click(cdp, ".calc-action");
  await waitFor(() => evaluate(cdp, `document.body.innerText.includes("¿Dónde está el material")`), "Account step 2 did not open");
  await evaluate(cdp, `(() => {
    const input = [...document.querySelectorAll("input")].find((item) => item.type === "text");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Barcelona"); input.dispatchEvent(new Event("input", { bubbles: true }));
    [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Continuar"))?.click();
  })()`);
  await waitFor(() => evaluate(cdp, `Boolean(document.querySelector('input[type="tel"]'))`), "Authenticated account did not reach sensitive step");
  await setInput(cdp, 'input[type="tel"]', "+34 600 000 001");
  await evaluate(cdp, `(() => {
    const inputs = [...document.querySelectorAll('input.calc-text-field:not([type="tel"])')];
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(inputs[0], "Cliente Cuenta"); inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    setter.call(inputs[1], "ES9121000418450200051332"); inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    const button = document.querySelector(".calc-inline-actions button.btn");
    button.click(); button.click();
  })()`);
  await waitFor(() => rpcRequests === 4, "Account calculator did not call RPC exactly once");
  await waitFor(() => evaluate(cdp, `location.pathname === "/account/applications/${applicationId}"`), "Account creation did not redirect");
  assert.notEqual(rpcBodies[2].p_idempotency_key, rpcBodies[3].p_idempotency_key);
  pass("authenticated client creates from /account with one RPC and a fresh intent key");

  await evaluate(cdp, `document.querySelector("form:has(.header-signout)").requestSubmit()`);
  await waitFor(() => evaluate(cdp, `location.pathname === "/auth/login"`), "Sign-out did not return to login");
  await navigate(cdp, "/");
  await click(cdp, ".calc-action");
  await waitFor(() => evaluate(cdp, `document.body.innerText.includes("¿Dónde está el material")`), "Registration draft step 2 did not open");
  await evaluate(cdp, `(() => {
    const input = [...document.querySelectorAll("input")].find((item) => item.type === "text");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "Valencia"); input.dispatchEvent(new Event("input", { bubbles: true }));
    [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Continuar"))?.click();
  })()`);
  await waitFor(() => evaluate(cdp, `Boolean(document.querySelector('.calc-auth-callout'))`), "Registration Auth prompt missing");
  await click(cdp, '.calc-auth-callout a[href^="/auth/register"]');
  await waitFor(() => evaluate(cdp, `Boolean(document.querySelector('input[name="displayName"]'))`), "Registration form did not open");
  await setInput(cdp, 'input[name="displayName"]', "Cliente Registro");
  await setInput(cdp, 'input[name="email"]', "stage55-register@example.test");
  await setInput(cdp, 'input[name="password"]', "Stage55-Mock-Password!");
  await setInput(cdp, 'input[name="confirmPassword"]', "Stage55-Mock-Password!");
  await evaluate(cdp, `document.querySelector("form").requestSubmit()`);
  await waitFor(() => evaluate(cdp, `document.body.innerText.includes("¡Revisa tu correo!")`), "Registration success screen missing");
  assert.equal(signupRequests, 1);

  const confirmationTarget = await cdp.send("Target.createTarget", {
    url: `http://localhost:${appPort}/auth/confirm?token_hash=${"a".repeat(64)}&type=email&next=%2F%3Fcheckout%3D1`,
  });
  const confirmationPage = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    const pages = response.ok ? await response.json() : [];
    return pages.find((candidate) => candidate.id === confirmationTarget.targetId);
  }, "Confirmation tab did not open");
  const confirmationCdp = await connectCdpSocket(confirmationPage.webSocketDebuggerUrl);
  await confirmationCdp.send("Page.enable");
  await confirmationCdp.send("Runtime.enable");
  await waitFor(
    () => evaluate(confirmationCdp, `location.pathname === "/" && Boolean(document.querySelector('input[type="tel"]'))`),
    "Confirmation callback did not restore the draft in its new tab",
  );
  assert.equal(await evaluate(confirmationCdp, `localStorage.getItem("metalduro:calculator-draft:v2") !== null`), true);
  confirmationCdp.ws.close();
  await cdp.send("Target.closeTarget", { targetId: confirmationPage.id });
  pass("mock registration and email confirmation in a new tab restore the safe draft");

  await navigate(cdp, "/");

  profile.role = "client";
  await cdp.send("Page.navigate", { url: `http://localhost:${appPort}/admin` });
  await waitFor(() => evaluate(cdp, `location.pathname === "/account"`), "Client was not rejected from admin");
  pass("client cannot open the admin route");
  await cdp.send("Page.navigate", { url: `http://localhost:${appPort}/admin/pricing` });
  await waitFor(() => evaluate(cdp, `location.pathname === "/account"`), "Client was not rejected from admin pricing");
  pass("client cannot open /admin/pricing");

  profile.role = "admin";
  await navigate(cdp, "/");
  const adminHeader = await evaluate(cdp, `document.querySelector(".header-user-menu").textContent`);
  assert.match(adminHeader, /Panel de administración/);
  assert.doesNotMatch(adminHeader, /Mi cuenta/);
  pass("admin header exposes only the administration destination and sign-out");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate(cdp, "/admin");
  await waitFor(
    () => evaluate(cdp, `document.body.innerText.includes("Gestión de solicitudes") && document.body.innerText.includes("#BD010641")`),
    `Admin dashboard did not render the mock queue.\n${nextOutput}`,
  );
  assert.match(await evaluate(cdp, `document.body.innerText`), /Tomar/);
  await screenshot(cdp, adminScreenshot);
  pass("admin dashboard renders the new queue and primary claim action");

  await navigate(cdp, "/admin/pricing");
  await waitFor(
    () => evaluate(cdp, `document.body.innerText.includes("Precios y tarifas") && document.querySelectorAll('input[name="rateEur"]').length === 4`),
    `Admin pricing did not render managed values.\n${nextOutput}`,
  );
  assert.match(await evaluate(cdp, `document.body.innerText`), /Precio informativo/);
  assert.equal(
    await evaluate(cdp, `document.querySelector('form:has(input[name="materialId"][value="solid"]) input[name="rateEur"]').value`),
    "40.00",
  );
  await screenshot(cdp, pricingScreenshot);
  pass("admin pricing renders the public reference separately from four material rates");

  await evaluate(cdp, `window.confirm = () => true`);
  await setInput(cdp, 'form:has(input[name="materialId"][value="solid"]) input[name="rateEur"]', "41.00");
  await evaluate(cdp, `document.querySelector('form:has(input[name="materialId"][value="solid"])').requestSubmit()`);
  await waitFor(
    () => evaluate(cdp, `document.querySelector('form:has(input[name="materialId"][value="solid"]) button[type="submit"]').disabled`),
    "Material save did not enter a pending state",
  );
  await click(cdp, 'form:has(input[name="materialId"][value="solid"]) button[type="submit"]');
  await waitFor(() => materialRateUpdateRequests === 1, "Material rate RPC was not called once");
  await waitFor(() => evaluate(cdp, `document.body.innerText.includes("El precio se ha guardado correctamente")`), "Material success state missing");
  assert.equal(materialRateUpdateRequests, 1);
  pass("material rate save is pending-safe and one double click cannot create a second change");

  failNextMaterialRateUpdate = true;
  await setInput(cdp, 'form:has(input[name="materialId"][value="solid"]) input[name="rateEur"]', "42.00");
  await evaluate(cdp, `document.querySelector('form:has(input[name="materialId"][value="solid"])').requestSubmit()`);
  await waitFor(() => materialRateUpdateRequests === 2, "Material error RPC was not called once");
  await waitFor(() => evaluate(cdp, `document.body.innerText.includes("No se ha podido guardar")`), "Material database error was not shown");
  assert.equal(materialRows.find((row) => row.id === "solid").rate_eur, 41);
  pass("database errors remain visible and never produce false success or mutate the prior rate");

  await setInput(cdp, 'input[name="priceEurPerKg"]', "26.50");
  await setInput(cdp, 'input[name="priceDate"]', "2026-11-10");
  await evaluate(cdp, `document.querySelector('input[name="priceEurPerKg"]').closest("form").requestSubmit()`);
  await waitFor(
    () => evaluate(cdp, `document.querySelector('input[name="priceEurPerKg"]').closest("form").querySelector('button[type="submit"]').disabled`),
    "Public price save did not enter a pending state",
  );
  await waitFor(() => publicPriceUpdateRequests === 1, "Public price RPC was not called once");
  await waitFor(() => evaluate(cdp, `document.body.innerText.includes("26,5 €/kg")`), "Public price preview was not refreshed");
  assert.equal(publicPriceUpdateRequests, 1);
  assert.equal(pricingHistory.length, 2);
  pass("public price and date update independently and both changes appear in the audit history");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot(cdp, pricingMobileScreenshot);
  assert.equal(await evaluate(cdp, `document.documentElement.scrollWidth - document.documentElement.clientWidth`), 0);
  pass("admin pricing remains usable at 390px without horizontal page overflow");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await navigate(cdp, "/");
  await waitFor(() => evaluate(cdp, `document.querySelector("#price").innerText.includes("820")`), "Calculator did not receive the changed material rate");
  assert.match(await evaluate(cdp, `document.querySelector('.public-price-chip').innerText`), /26,5\s*€\/kg/);
  pass("new public visits receive the updated DB-backed material rate and public price without a deploy");

  await navigate(cdp, "/admin");

  await evaluate(cdp, `[...document.querySelectorAll("button")].find((button) => button.textContent.includes("Tomar"))?.click()`);
  await waitFor(() => claimRequests === 1, "Admin claim RPC was not called once");
  await waitFor(
    () => evaluate(cdp, `location.pathname === "/admin" && location.search.includes("view=mine")`),
    "Successful claim did not return to the manager queue",
  );
  assert.equal(claimRequests, 1);
  pass("admin claim uses the protected RPC once and refreshes the assigned view");

  await navigate(cdp, `/admin/applications/${applicationId}`);
  await waitFor(
    () => evaluate(cdp, `document.body.innerText.includes("#BD010641")`),
    `Admin application detail or history did not render.\n${nextOutput}`,
  );
  assert.match(await evaluate(cdp, `document.body.innerText`), /historial de estados/i);
  assert.match(await evaluate(cdp, `document.body.innerText`), /40(?:[,.]00)?\s*€\s*\/\s*kg/);
  pass("an existing application retains its 40 €/kg historical snapshot after the live rate becomes 41 €/kg");
  pass("admin application detail renders client data and the shared status history");

  await cdp.send("Network.setCookie", {
    name: "lang",
    value: "ru",
    url: `http://localhost:${appPort}/`,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
  await navigate(cdp, "/");
  await waitFor(() => evaluate(cdp, `document.documentElement.lang === "ru" && document.querySelector(".header-user-menu").textContent.includes("Админ-панель")`), "Russian navigation did not render");
  pass("ES/RU role-aware navigation renders correctly");

  await delay(300);
  assert.deepEqual(consoleProblems, []);
  const unexpectedNetworkFailures = networkFailures.filter(({ url }) =>
    !url.startsWith("https://fonts.googleapis.com/") &&
    !url.startsWith("https://fonts.gstatic.com/"),
  );
  assert.deepEqual(unexpectedNetworkFailures, []);
  pass("browser console and application requests have no unexpected warnings or errors");
  assert.doesNotMatch(
    nextOutput,
    /blocking-prerender-current-time|unstable value `(?:Date\.now\(\)|new Date\(\))` while prerendering/,
  );
  pass("Next.js prerender logs contain no request-time clock diagnostics");
  process.stdout.write(`SCREENSHOT_DESKTOP=${desktopScreenshot}\n`);
  process.stdout.write(`SCREENSHOT_MOBILE=${mobileScreenshot}\n`);
  process.stdout.write(`SCREENSHOT_ADMIN=${adminScreenshot}\n`);
  process.stdout.write(`SCREENSHOT_ADMIN_PRICING=${pricingScreenshot}\n`);
  process.stdout.write(`SCREENSHOT_ADMIN_PRICING_MOBILE=${pricingMobileScreenshot}\n`);
  process.stdout.write(`SCREENSHOT_USER_MENU=${userMenuScreenshot}\n`);
  for (const [width, path] of Object.entries(publicPriceScreenshots)) {
    process.stdout.write(`SCREENSHOT_PUBLIC_PRICE_${width}=${path}\n`);
  }
} finally {
  socket?.close();
  stopProcessTree(chromeProcess);
  stopProcessTree(nextProcess);
  await new Promise((resolve) => mock.close(resolve));
  await delay(1_000);
  await rm(chromeProfile, { recursive: true, force: true }).catch(() => {});
}
