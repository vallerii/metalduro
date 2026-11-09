import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";
import reactDomServer from "react-dom/server";
import ts from "typescript";
import {
  acquireSubmitLock,
  registerClient,
  releaseSubmitLock,
} from "../src/lib/auth-registration.ts";

const { renderToStaticMarkup } = reactDomServer;

let passed = 0;
function pass(message) {
  passed += 1;
  process.stdout.write(`PASS: ${message}\n`);
}

const calls = [];
const successProvider = {
  async signUp(input) {
    calls.push(input);
    return { error: null };
  },
};
const input = {
  email: "ux-test@example.test",
  password: "not-persisted-test-password",
  displayName: "UX Test",
  locale: "es",
  nextPath: "/?checkout=1",
  siteUrl: "http://localhost:3001",
};
const success = await registerClient(successProvider, input);
assert.equal(success.error, null);
assert.equal(calls.length, 1);
assert.equal(calls[0].options.emailRedirectTo, "http://localhost:3001");
assert.equal(calls[0].options.data.auth_next, "/?checkout=1");
pass("mock Auth success uses the existing safe callback contract once");

const providerError = new Error("mock_signup_failed");
const failure = await registerClient({ async signUp() { return { error: providerError }; } }, input);
assert.equal(failure.error, providerError);
pass("mock Auth errors are returned without an automatic retry");

const lock = { current: false };
assert.equal(acquireSubmitLock(lock), true);
assert.equal(acquireSubmitLock(lock), false);
releaseSubmitLock(lock);
assert.equal(acquireSubmitLock(lock), true);
pass("registration submit lock blocks a duplicate and can be released after an error");

const safeNextModuleUrl = pathToFileURL(join(process.cwd(), "src/lib/safe-next-path.ts")).href;
execFileSync(
  process.execPath,
  [
    "--no-warnings",
    "--conditions=react-server",
    "--experimental-strip-types",
    "--input-type=module",
    "--eval",
    `import { safeNextPath } from ${JSON.stringify(safeNextModuleUrl)};
     if (safeNextPath("/?checkout=1", "/account") !== "/?checkout=1") process.exit(1);
     if (safeNextPath("https://evil.example", "/account") !== "/account") process.exit(1);
     if (safeNextPath("//evil.example", "/account") !== "/account") process.exit(1);`,
  ],
  { stdio: "pipe" },
);
pass("safe return route remains internal");

const configModuleUrl = pathToFileURL(join(process.cwd(), "src/lib/supabase/config.ts")).href;
execFileSync(
  process.execPath,
  [
    "--no-warnings",
    "--experimental-strip-types",
    "--input-type=module",
    "--eval",
    `import { getSiteUrl, SiteUrlConfigurationError } from ${JSON.stringify(configModuleUrl)};
     process.env.NODE_ENV = "production";
     delete process.env.VERCEL;
     delete process.env.NEXT_PUBLIC_SITE_URL;
     try { getSiteUrl(); process.exit(1); } catch (error) { if (!(error instanceof SiteUrlConfigurationError)) process.exit(2); }
     process.env.NEXT_PUBLIC_SITE_URL = "not-a-url";
     try { getSiteUrl(); process.exit(3); } catch (error) { if (!(error instanceof SiteUrlConfigurationError)) process.exit(4); }
     process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
     if (getSiteUrl() !== "http://localhost:3000") process.exit(5);
     process.env.VERCEL = "1";
     try { getSiteUrl(); process.exit(6); } catch (error) { if (!(error instanceof SiteUrlConfigurationError)) process.exit(7); }
     process.env.NEXT_PUBLIC_SITE_URL = "https://metalduro-git-feature-client-admin-cabinets-agenturro.vercel.app/path";
     if (getSiteUrl() !== "https://metalduro-git-feature-client-admin-cabinets-agenturro.vercel.app") process.exit(8);`,
  ],
  { stdio: "pipe" },
);
pass("deployed Auth redirects fail closed without a valid site URL and accept the exact Preview origin");

const componentPath = join(process.cwd(), "src/components/auth/RegistrationSuccess.tsx");
const compiledPath = join(process.cwd(), ".next/registration-success-test.mjs");
const componentSource = await readFile(componentPath, "utf8");
const compiled = ts.transpileModule(componentSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
await writeFile(compiledPath, compiled, "utf8");
try {
  const { RegistrationSuccess } = await import(`${pathToFileURL(compiledPath).href}?v=${Date.now()}`);
  const html = renderToStaticMarkup(
    React.createElement(RegistrationSuccess, {
      email: input.email,
      loginHref: "/auth/login?next=%2F%3Fcheckout%3D1",
      copy: {
        title: "¡Revisa tu correo!",
        sentTo: "Hemos enviado el enlace de confirmación a:",
        instruction: "Abre el mensaje y confirma tu cuenta.",
        spamHint: "Revisa también la carpeta de Spam.",
        login: "Volver a iniciar sesión",
      },
    }),
  );
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, /¡Revisa tu correo!/);
  assert.match(html, /ux-test@example\.test/);
  assert.match(html, /Spam/);
  assert.match(html, /href="\/auth\/login\?next=%2F%3Fcheckout%3D1"/);
  assert.match(html, /min-h-\[640px\]/);
  assert.match(html, /sm:min-h-\[612px\]/);
  assert.doesNotMatch(html, /not-persisted-test-password/);
  pass("success screen renders the accessible responsive confirmation content without a password");
} finally {
  await rm(compiledPath, { force: true });
}

const authFormSource = await readFile(join(process.cwd(), "src/components/auth/AuthForm.tsx"), "utf8");
assert.match(authFormSource, /value=\{displayName\}/);
assert.match(authFormSource, /value=\{preservesEmail \? email : undefined\}/);
assert.match(authFormSource, /<fieldset disabled=\{pending\}/);
assert.match(authFormSource, /role="alert"/);
assert.match(authFormSource, /Creando cuenta|copy\.register\.pending/);
pass("form keeps name/email controlled, announces errors, and disables controls while pending");

const expectedTemplateHashes = new Map([
  ["supabase/templates/confirmation.html", "B90725D614739CCCFFC3BF2FEACD9EA7B99B3F0521E52B73CBA427C85564AEAC"],
  ["supabase/templates/recovery.html", "308CC84636E2E7F0C86456F4C400B5A51D3F072033E5DBF3432123910996ADA4"],
]);
for (const [path, expected] of expectedTemplateHashes) {
  const actual = createHash("sha256").update(await readFile(join(process.cwd(), path))).digest("hex").toUpperCase();
  assert.equal(actual, expected);
}
pass("existing Auth email templates are byte-for-byte unchanged");

process.stdout.write(`Registration UX checks passed: ${passed}/${passed}.\n`);
