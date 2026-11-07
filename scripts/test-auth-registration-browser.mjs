import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, rm } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const appPort = 3003;
const cdpPort = 9229;
const appDir = process.env.AUTH_UX_TEST_APP_DIR || process.cwd();
const nextBin = join(appDir, "node_modules/next/dist/bin/next");
const runRoot = join(process.env.LOCALAPPDATA || process.cwd(), "MetalduroRegistrationUxTest");
const chromeProfile = join(runRoot, `chrome-${process.pid}`);
const password = `${randomUUID()}Aa1!`;
let signupRequests = 0;
let nextProcess;
let chromeProcess;
let socket;
let nextOutput = "";
let shuttingDown = false;

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

async function waitFor(check, message, timeoutMs = 20_000) {
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
    if (request.method !== "POST" || !request.url?.startsWith("/auth/v1/signup")) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: "not_found" }));
      return;
    }

    signupRequests += 1;
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    await delay(1_200);

    if (payload.email === "error@example.test") {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error_code: "mock_signup_failed", msg: "Mock signup failed" }));
      return;
    }

    const now = new Date().toISOString();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      id: randomUUID(),
      aud: "authenticated",
      role: "authenticated",
      email: payload.email,
      phone: "",
      confirmation_sent_at: now,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: payload.data || {},
      identities: [],
      created_at: now,
      updated_at: now,
      is_anonymous: false,
    }));
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
    () => evaluate(cdp, `document.readyState === "complete" && location.pathname === ${JSON.stringify(path.split("?")[0])}`),
    `Page did not load: ${path}`,
  );
  await delay(150);
}

async function fillAndSubmit(cdp, { name, email, doubleSubmit = false }) {
  return evaluate(cdp, `(() => {
    const setValue = (selector, value) => {
      const input = document.querySelector(selector);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setValue('[name="displayName"]', ${JSON.stringify(name)});
    setValue('[name="email"]', ${JSON.stringify(email)});
    setValue('[name="password"]', ${JSON.stringify(password)});
    setValue('[name="confirmPassword"]', ${JSON.stringify(password)});
    const form = document.querySelector("form");
    const initialHeight = form.getBoundingClientRect().height;
    form.requestSubmit();
    if (${doubleSubmit}) form.requestSubmit();
    return initialHeight;
  })()`);
}

await mkdir(runRoot, { recursive: true });
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
  const build = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: appDir,
    env: nextEnvironment,
    encoding: "utf8",
    windowsHide: true,
  });
  if (build.status !== 0) {
    throw new Error(`Isolated Next.js build failed.\n${`${build.stdout || ""}${build.stderr || ""}`.slice(-4_000)}`);
  }
  pass("isolated production build succeeds with mock Auth configuration");

  nextProcess = startProcess(
    process.execPath,
    [nextBin, "start", "-p", String(appPort)],
    {
      cwd: appDir,
      env: nextEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  nextProcess.once("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      process.stderr.write(`Next.js test server exited with code ${code}.\n`);
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
      const response = await fetch(`http://localhost:${appPort}/auth/register`);
      return response.ok && (await response.text()).includes("Crear una cuenta");
    }, "Next.js mock-auth test server did not become ready.", 30_000);
  } catch (error) {
    throw new Error(`${error.message}\n${nextOutput}`);
  }

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

  await navigate(cdp, "/auth/register?next=%2F%3Fcheckout%3D1");
  const desktopForm = await evaluate(cdp, `({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    hasName: Boolean(document.querySelector('[name="displayName"]')),
    hasEmail: Boolean(document.querySelector('[name="email"]')),
    next: document.querySelector('[name="next"]')?.value,
  })`);
  assert.deepEqual(desktopForm, { overflow: false, hasName: true, hasEmail: true, next: "/?checkout=1" });
  pass("desktop registration form renders without horizontal overflow and preserves safe next");

  const initialHeight = await fillAndSubmit(cdp, {
    name: "Mock Success",
    email: "success@example.test",
    doubleSubmit: true,
  });
  const pendingUi = await waitFor(() => evaluate(cdp, `(() => {
    const text = document.querySelector('button[type="submit"]')?.textContent?.trim();
    if (!text?.includes("Creando cuenta")) return null;
    return {
      text,
      disabled: document.querySelector('button[type="submit"]')?.disabled,
      busy: document.querySelector("form")?.getAttribute("aria-busy"),
    };
  })()`), "Registration pending state was not shown");
  assert.match(pendingUi.text, /Creando cuenta/);
  assert.equal(pendingUi.disabled, true);
  assert.equal(pendingUi.busy, "true");
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector('section[role="status"]'))`),
    "Success screen was not shown.",
  );
  const successUi = await evaluate(cdp, `(() => {
    const panel = document.querySelector('section[role="status"]');
    return {
      email: document.body.textContent.includes("success@example.test"),
      spam: document.body.textContent.includes("Spam"),
      login: panel?.querySelector('a[href^="/auth/login"]')?.textContent?.trim(),
      live: panel?.getAttribute("aria-live"),
      labelled: panel?.getAttribute("aria-labelledby"),
      focused: document.activeElement?.id,
      height: panel?.getBoundingClientRect().height,
    };
  })()`);
  assert.equal(signupRequests, 1);
  assert.equal(successUi.email, true);
  assert.equal(successUi.spam, true);
  assert.equal(successUi.login, "Volver a iniciar sesión");
  assert.equal(successUi.live, "polite");
  assert.equal(successUi.labelled, "registration-success-title");
  assert.equal(successUi.focused, "registration-success-title");
  assert(Math.abs(successUi.height - initialHeight) <= 1, `Panel shifted by ${successUi.height - initialHeight}px.`);
  pass("successful mock signup shows a focused email confirmation screen without layout shift");
  pass("double submit produces exactly one mock Auth request");

  await navigate(cdp, "/auth/register");
  const beforeErrorRequests = signupRequests;
  await fillAndSubmit(cdp, { name: "Preserved Name", email: "error@example.test" });
  await waitFor(() => evaluate(cdp, `Boolean(document.querySelector('[role="alert"]'))`), "Visible signup error was not shown.");
  const errorUi = await evaluate(cdp, `({
    name: document.querySelector('[name="displayName"]')?.value,
    email: document.querySelector('[name="email"]')?.value,
    visible: Boolean(document.querySelector('[role="alert"]')?.offsetParent),
  })`);
  assert.deepEqual(errorUi, { name: "Preserved Name", email: "error@example.test", visible: true });
  await delay(700);
  assert.equal(signupRequests, beforeErrorRequests + 1);
  pass("mock Auth error stays on the form, preserves name/email, and does not retry");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate(cdp, "/auth/register");
  await fillAndSubmit(cdp, { name: "Mobile Mock", email: "mobile@example.test" });
  await waitFor(
    () => evaluate(cdp, `Boolean(document.querySelector('section[role="status"]'))`),
    "Mobile success screen was not shown.",
  );
  const mobileUi = await evaluate(cdp, `({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    panelWidth: document.querySelector('section[role="status"]')?.getBoundingClientRect().width,
    emailVisible: document.body.textContent.includes("mobile@example.test"),
  })`);
  assert.equal(mobileUi.viewport, 390);
  assert(mobileUi.scrollWidth <= 390, `Mobile page overflows: ${mobileUi.scrollWidth}px.`);
  assert(mobileUi.panelWidth <= 390);
  assert.equal(mobileUi.emailVisible, true);
  pass("390px mobile success screen fits without horizontal overflow");

  await navigate(cdp, "/auth/register");
  await evaluate(cdp, `document.querySelector('[name="displayName"]').focus()`);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate(cdp, `document.activeElement?.getAttribute("name")`), "email");
  pass("keyboard navigation moves from name to email in logical order");

  process.stdout.write("Registration browser QA passed: 7/7.\n");
} finally {
  shuttingDown = true;
  socket?.close();
  stopProcessTree(chromeProcess);
  stopProcessTree(nextProcess);
  await new Promise((resolve) => mockAuth.close(resolve));
  await rm(chromeProfile, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 200,
  }).catch(() => {});
}
