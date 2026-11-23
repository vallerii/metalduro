import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appPort = 3004;
const cdpPort = 9230;
const appDir = process.cwd();
const nextBin = join(appDir, "node_modules/next/dist/bin/next");
const runRoot = await mkdtemp(join(tmpdir(), "metalduro-recovery-browser-"));
const chromeProfile = join(runRoot, "chrome");
const recoveryRequests = [];
let nextProcess;
let chromeProcess;
let socket;
let nextOutput = "";
let shuttingDown = false;

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
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

function startMockAuth() {
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || !request.url?.startsWith("/auth/v1/recover")) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: "not_found" }));
      return;
    }

    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    recoveryRequests.push({
      email: payload.email,
      redirectTo: requestUrl.searchParams.get("redirect_to"),
    });
    await delay(1_200);

    if (payload.email === "error@example.test") {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "unexpected_failure", msg: "Mock recovery failed" }));
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end("{}");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function startProcess(command, args, options) {
  const child = spawn(command, args, { ...options, windowsHide: true });
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {});
  return child;
}

function stopProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

async function connectCdp() {
  const pages = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    if (!response.ok) return null;
    return response.json();
  }, "Chrome DevTools endpoint did not become ready.");
  const page = pages.find((candidate) => candidate.type === "page");
  assert(page?.webSocketDebuggerUrl, "Chrome did not expose a page target.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const callback = pending.get(message.id);
    if (!callback) return;
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(message.error.message));
    else callback.resolve(message.result);
  });

  return {
    ws,
    send(method, params = {}) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        ws.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed.");
  return result.result.value;
}

async function navigate(cdp, path) {
  await cdp.send("Page.navigate", { url: `http://localhost:${appPort}${path}` });
  await waitFor(
    () =>
      evaluate(
        cdp,
        `document.readyState === "complete" && location.pathname === ${JSON.stringify(path.split("?")[0])}`,
      ),
    `Page did not load: ${path}`,
  );
  await delay(150);
}

async function fillAndSubmit(cdp, email, doubleSubmit = false) {
  return evaluate(cdp, `(() => {
    const input = document.querySelector('[name="email"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(email)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const form = document.querySelector("form");
    const initialHeight = form.getBoundingClientRect().height;
    form.requestSubmit();
    if (${doubleSubmit}) form.requestSubmit();
    return initialHeight;
  })()`);
}

const mockAuth = await startMockAuth();
const mockAddress = mockAuth.address();
assert(mockAddress && typeof mockAddress === "object");

try {
  const nextEnvironment = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockAddress.port}`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "mock-publishable-key",
    NEXT_PUBLIC_SITE_URL: `http://localhost:${appPort}`,
    EMAIL_PROVIDER: "mock",
    EMAIL_EXTERNAL_DELIVERY_ENABLED: "false",
  };
  delete nextEnvironment.BREVO_API_KEY;
  delete nextEnvironment.SUPABASE_SECRET_KEY;
  delete nextEnvironment.SUPABASE_SERVICE_ROLE_KEY;

  nextProcess = startProcess(process.execPath, [nextBin, "dev", "-p", String(appPort)], {
    cwd: appDir,
    env: nextEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  nextProcess.once("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      process.stderr.write(`Next.js recovery test server exited with code ${code}.\n`);
    }
  });
  nextProcess.stdout.on("data", (chunk) => {
    nextOutput = `${nextOutput}${chunk}`.slice(-4_000);
  });
  nextProcess.stderr.on("data", (chunk) => {
    nextOutput = `${nextOutput}${chunk}`.slice(-4_000);
  });
  try {
    await waitFor(async () => {
      const response = await fetch(`http://localhost:${appPort}/auth/forgot-password`);
      return response.ok && (await response.text()).includes("Restablecer contraseña");
    }, "Next.js mock recovery server did not become ready.", 60_000);
  } catch (error) {
    throw new Error(`${error.message}\n${nextOutput}`);
  }
  pass("forgot-password route runs against an isolated local mock Auth service");

  chromeProcess = startProcess(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${chromeProfile}`,
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1440,1000",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const cdp = await connectCdp();
  socket = cdp.ws;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await navigate(cdp, "/auth/forgot-password");
  const initialUi = await evaluate(cdp, `({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    hasEmail: Boolean(document.querySelector('[name="email"]')),
    loginHref: document.querySelector('a[href="/auth/login"]')?.getAttribute("href"),
  })`);
  assert.deepEqual(initialUi, { overflow: false, hasEmail: true, loginHref: "/auth/login" });
  pass("desktop recovery form renders without overflow and keeps the login route");

  const initialHeight = await fillAndSubmit(cdp, "known@example.test", true);
  await delay(100);
  const pendingUi = await evaluate(cdp, `({
    text: document.querySelector('button[type="submit"]')?.textContent?.trim(),
    disabled: document.querySelector('button[type="submit"]')?.disabled,
    busy: document.querySelector("form")?.getAttribute("aria-busy"),
  })`);
  assert.match(pendingUi.text, /Enviando enlace/);
  assert.equal(pendingUi.disabled, true);
  assert.equal(pendingUi.busy, "true");
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector('section[role="status"]'))`),
    "Recovery success screen was not shown.",
  );
  assert.equal(recoveryRequests.length, 1);
  assert.deepEqual(recoveryRequests[0], {
    email: "known@example.test",
    redirectTo: `http://localhost:${appPort}`,
  });
  pass("pending state blocks a double submit and sends exactly one recovery request");

  const successUi = await evaluate(cdp, `(() => {
    const panel = document.querySelector('section[role="status"]');
    return {
      html: panel?.outerHTML,
      generic: panel?.textContent?.includes("Si existe una cuenta asociada a este correo"),
      leaksEmail: panel?.textContent?.includes("known@example.test"),
      spam: panel?.textContent?.includes("Spam"),
      login: panel?.querySelector('a[href="/auth/login"]')?.textContent?.trim(),
      live: panel?.getAttribute("aria-live"),
      focused: document.activeElement?.id,
      height: panel?.getBoundingClientRect().height,
    };
  })()`);
  assert.equal(successUi.generic, true);
  assert.equal(successUi.leaksEmail, false);
  assert.equal(successUi.spam, true);
  assert.equal(successUi.login, "Volver a iniciar sesión");
  assert.equal(successUi.live, "polite");
  assert.equal(successUi.focused, "recovery-success-title");
  assert(Math.abs(successUi.height - initialHeight) <= 1, `Panel shifted by ${successUi.height - initialHeight}px.`);
  pass("success replaces the form with a focused generic screen without layout shift");

  await navigate(cdp, "/auth/forgot-password");
  await fillAndSubmit(cdp, "unknown@example.test");
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector('section[role="status"]'))`),
    "Unknown-account success screen was not shown.",
  );
  const unknownHtml = await evaluate(cdp, `document.querySelector('section[role="status"]')?.outerHTML`);
  assert.equal(unknownHtml, successUi.html);
  assert.equal(recoveryRequests.length, 2);
  pass("known and unknown account scenarios render byte-identical success UI");

  await navigate(cdp, "/auth/forgot-password");
  const beforeError = recoveryRequests.length;
  await fillAndSubmit(cdp, "error@example.test");
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector('[role="alert"]'))`),
    "Visible technical recovery error was not shown.",
  );
  const errorUi = await evaluate(cdp, `({
    email: document.querySelector('[name="email"]')?.value,
    visible: Boolean(document.querySelector('[role="alert"]')?.offsetParent),
    buttonDisabled: document.querySelector('button[type="submit"]')?.disabled,
  })`);
  assert.deepEqual(errorUi, {
    email: "error@example.test",
    visible: true,
    buttonDisabled: false,
  });
  await delay(700);
  assert.equal(recoveryRequests.length, beforeError + 1);
  pass("technical error stays on the form, preserves email, and does not retry");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate(cdp, "/auth/forgot-password");
  await fillAndSubmit(cdp, "mobile@example.test");
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector('section[role="status"]'))`),
    "Mobile recovery success screen was not shown.",
  );
  const mobileUi = await evaluate(cdp, `({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    panelWidth: document.querySelector('section[role="status"]')?.getBoundingClientRect().width,
  })`);
  assert.equal(mobileUi.viewport, 390);
  assert(mobileUi.scrollWidth <= 390, `Mobile page overflows: ${mobileUi.scrollWidth}px.`);
  assert(mobileUi.panelWidth <= 390);
  pass("390px recovery success screen fits without horizontal overflow");

  await navigate(cdp, "/auth/forgot-password");
  await evaluate(cdp, `document.querySelector('[name="email"]').focus()`);
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  assert.equal(await evaluate(cdp, `document.activeElement?.getAttribute("type")`), "submit");
  pass("keyboard navigation moves from email to submit in logical order");

  process.stdout.write("Recovery browser QA passed: 8/8.\n");
} finally {
  shuttingDown = true;
  socket?.close();
  stopProcessTree(chromeProcess);
  stopProcessTree(nextProcess);
  await new Promise((resolve) => mockAuth.close(resolve));
  await rm(runRoot, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 200,
  }).catch(() => {});
}
