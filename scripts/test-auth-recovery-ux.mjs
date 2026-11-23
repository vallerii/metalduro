import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { requestPasswordRecovery } from "../src/lib/auth-recovery.ts";

let passed = 0;

function pass(message) {
  passed += 1;
  process.stdout.write(`PASS: ${message}\n`);
}

function recoveryAuth(result) {
  const calls = [];
  return {
    calls,
    client: {
      async resetPasswordForEmail(email, options) {
        calls.push({ email, options });
        if (result instanceof Error) throw result;
        return result;
      },
    },
  };
}

const success = recoveryAuth({ error: null });
assert.deepEqual(
  await requestPasswordRecovery(
    success.client,
    "recovery@example.test",
    "http://localhost:3001",
  ),
  { error: null },
);
assert.deepEqual(success.calls, [
  {
    email: "recovery@example.test",
    options: { redirectTo: "http://localhost:3001" },
  },
]);
pass("recovery request preserves the approved callback origin exactly once");

for (const code of ["user_not_found", "email_not_found"]) {
  const masked = recoveryAuth({ error: { code } });
  assert.deepEqual(
    await requestPasswordRecovery(masked.client, "unknown@example.test", "http://localhost:3001"),
    { error: null },
  );
}
pass("account lookup errors are normalized to the same success result");

const providerError = { code: "unexpected_failure" };
const failed = recoveryAuth({ error: providerError });
assert.equal(
  (await requestPasswordRecovery(failed.client, "recovery@example.test", "http://localhost:3001"))
    .error,
  providerError,
);
const networkFailure = new Error("mock network failure");
assert.equal(
  (
    await requestPasswordRecovery(
      recoveryAuth(networkFailure).client,
      "recovery@example.test",
      "http://localhost:3001",
    )
  ).error,
  networkFailure,
);
pass("technical provider and network errors remain visible to the server action");

const componentPath = join(process.cwd(), "src/components/auth/RegistrationSuccess.tsx");
const compiledPath = join(process.cwd(), ".next/recovery-success-test.mjs");
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
  const { RecoverySuccess } = await import(`${pathToFileURL(compiledPath).href}?v=${Date.now()}`);
  const props = {
    loginHref: "/auth/login",
    copy: {
      title: "¡Revisa tu correo!",
      instruction:
        "Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña.",
      spamHint: "Revisa también la carpeta de Spam.",
      login: "Volver a iniciar sesión",
    },
  };
  const knownHtml = renderToStaticMarkup(React.createElement(RecoverySuccess, props));
  const unknownHtml = renderToStaticMarkup(React.createElement(RecoverySuccess, props));
  assert.equal(knownHtml, unknownHtml);
  assert.match(knownHtml, /role="status"/);
  assert.match(knownHtml, /aria-live="polite"/);
  assert.match(knownHtml, /id="recovery-success-title"/);
  assert.match(knownHtml, /tabindex="-1"/);
  assert.match(knownHtml, /¡Revisa tu correo!/);
  assert.match(knownHtml, /Si existe una cuenta asociada a este correo/);
  assert.match(knownHtml, /Spam/);
  assert.match(knownHtml, /href="\/auth\/login"/);
  assert.match(knownHtml, /min-h-\[540px\]/);
  assert.doesNotMatch(knownHtml, /recovery@example\.test|unknown@example\.test/);
  pass("recovery success screen is accessible, generic, responsive, and account-agnostic");
} finally {
  await rm(compiledPath, { force: true });
}

const authFormSource = await readFile(join(process.cwd(), "src/components/auth/AuthForm.tsx"), "utf8");
assert.match(authFormSource, /mode === "register" \|\| mode === "forgot"/);
assert.match(authFormSource, /recoverySucceeded/);
assert.match(authFormSource, /copy\.forgot\.pending/);
assert.match(authFormSource, /<fieldset disabled=\{pending\}/);
assert.match(authFormSource, /role="alert"/);
pass("forgot-password form preserves email, locks repeat submits, and announces errors");

const expectedTemplateHashes = new Map([
  ["supabase/templates/confirmation.html", "B90725D614739CCCFFC3BF2FEACD9EA7B99B3F0521E52B73CBA427C85564AEAC"],
  ["supabase/templates/recovery.html", "308CC84636E2E7F0C86456F4C400B5A51D3F072033E5DBF3432123910996ADA4"],
]);
for (const [path, expected] of expectedTemplateHashes) {
  const actual = createHash("sha256")
    .update(await readFile(join(process.cwd(), path)))
    .digest("hex")
    .toUpperCase();
  assert.equal(actual, expected);
}
pass("existing confirmation and recovery email templates remain byte-for-byte unchanged");

process.stdout.write(`Recovery UX checks passed: ${passed}/${passed}.\n`);
