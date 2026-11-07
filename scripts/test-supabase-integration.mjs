import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const siteUrl = process.env.TEST_SITE_URL || "http://127.0.0.1:3000";
const statusCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
const statusArguments = process.platform === "win32"
  ? ["/d", "/s", "/c", "npx supabase status -o env"]
  : ["supabase", "status", "-o", "env"];
const statusOutput = execFileSync(statusCommand, statusArguments, {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const localEnvironment = Object.fromEntries(
  statusOutput
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => {
      const value = match[2].trim();
      return [match[1], value.startsWith('"') ? JSON.parse(value) : value];
    }),
);

const apiUrl = localEnvironment.API_URL;
const publishableKey = localEnvironment.PUBLISHABLE_KEY;
const serviceRoleKey = localEnvironment.SERVICE_ROLE_KEY;
const mailpitUrl = localEnvironment.MAILPIT_URL;

if (!apiUrl || !publishableKey || !serviceRoleKey || !mailpitUrl) {
  throw new Error("Local Supabase status did not return the required test configuration.");
}

const service = createClient(apiUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = "Local-Test-123!";
const newPassword = "Local-Test-456!";
const emails = {
  clientA: `client-a-${runId}@example.test`,
  clientB: `client-b-${runId}@example.test`,
  adminA: `admin-a-${runId}@example.test`,
  adminB: `admin-b-${runId}@example.test`,
};
const createdUserIds = [];
const createdApplicationIds = [];
const createdStoragePaths = [];
const passed = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(message) {
  passed.push(message);
  process.stdout.write(`PASS: ${message}\n`);
}

function createCookieJar() {
  const cookies = new Map();
  return {
    getAll() {
      return [...cookies.entries()].map(([name, entry]) => ({
        name,
        value: entry.value,
      }));
    },
    setAll(values) {
      for (const { name, value, options } of values) {
        if (!value || options?.maxAge === 0) cookies.delete(name);
        else cookies.set(name, { value, options });
      }
    },
    header() {
      return [...cookies.entries()]
        .map(([name, entry]) => `${name}=${entry.value}`)
        .join("; ");
    },
    ingest(response) {
      const setCookies = response.headers.getSetCookie?.() || [];
      for (const setCookie of setCookies) {
        const [pair, ...attributes] = setCookie.split(";");
        const separator = pair.indexOf("=");
        if (separator < 1) continue;
        const name = pair.slice(0, separator).trim();
        const value = pair.slice(separator + 1).trim();
        const remove = attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute));
        if (!value || remove) cookies.delete(name);
        else cookies.set(name, { value, options: {} });
      }
    },
    corruptAuthCookies() {
      for (const [name, entry] of cookies.entries()) {
        if (name.startsWith("sb-") && name.includes("auth-token")) {
          cookies.set(name, { ...entry, value: "invalid-session" });
        }
      }
    },
  };
}

function createSsrAuthClient(cookieJar) {
  return createServerClient(apiUrl, publishableKey, {
    cookies: {
      getAll: () => cookieJar.getAll(),
      setAll: (values) => cookieJar.setAll(values),
    },
  });
}

function createPasswordClient() {
  return createClient(apiUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getMailMessage(email, excludedIds = new Set()) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages`);
    assert(response.ok, "Mailpit message listing failed.");
    const payload = await response.json();
    const message = payload.messages?.find(
      (candidate) =>
        !excludedIds.has(candidate.ID) &&
        candidate.To?.some((recipient) => recipient.Address?.toLowerCase() === email.toLowerCase()),
    );
    if (message) {
      const detailResponse = await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`);
      assert(detailResponse.ok, "Mailpit message retrieval failed.");
      return { summary: message, detail: await detailResponse.json() };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local email was not delivered for ${email}.`);
}

function findVerificationUrl(message) {
  const content = `${message.detail.HTML || ""}\n${message.detail.Text || ""}`.replaceAll("&amp;", "&");
  const urls = content.match(/https?:\/\/[^\s"'<>]+/g) || [];
  const verificationUrl = urls.find(
    (url) => url.includes("/auth/v1/verify") || (url.includes("/auth/confirm?") && url.includes("token_hash=")),
  );
  if (!verificationUrl) throw new Error("Supabase verification URL was not found in the local email.");
  return verificationUrl;
}

async function completeEmailFlow(message, cookieJar, expectedNextPath) {
  const verificationUrl = findVerificationUrl(message);
  if (verificationUrl.includes("/auth/confirm?")) {
    const callbackResponse = await fetch(verificationUrl, {
      headers: { cookie: cookieJar.header() },
      redirect: "manual",
    });
    cookieJar.ingest(callbackResponse);
    assert(
      callbackResponse.status >= 300 && callbackResponse.status < 400,
      `Unexpected auth callback response: ${callbackResponse.status}`,
    );
    const location = callbackResponse.headers.get("location") || "";
    assert(location.endsWith(expectedNextPath), `Unexpected callback destination: ${location}`);
    return verificationUrl;
  }

  const verificationResponse = await fetch(verificationUrl, { redirect: "manual" });
  assert(
    verificationResponse.status >= 300 && verificationResponse.status < 400,
    `Unexpected verification response: ${verificationResponse.status}`,
  );
  const callbackUrl = verificationResponse.headers.get("location");
  assert(callbackUrl, "Verification response did not include a callback location.");
  const callbackResponse = await fetch(callbackUrl, {
    headers: { cookie: cookieJar.header() },
    redirect: "manual",
  });
  cookieJar.ingest(callbackResponse);
  assert(
    callbackResponse.status >= 300 && callbackResponse.status < 400,
    `Unexpected auth callback response: ${callbackResponse.status}`,
  );
  const location = callbackResponse.headers.get("location") || "";
  assert(location.endsWith(expectedNextPath), `Unexpected callback destination: ${location}`);
  return verificationUrl;
}

async function createConfirmedUser(email, displayName, role = "client") {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, locale: "es" },
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  if (role === "admin") {
    const { error: roleError } = await service
      .from("profiles")
      .update({ role: "admin" })
      .eq("user_id", data.user.id);
    if (roleError) throw roleError;
  }
  const client = createPasswordClient();
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  return { id: data.user.id, client };
}

async function getPage(path, cookieJar) {
  const response = await fetch(`${siteUrl}${path}`, {
    headers: cookieJar.header() ? { cookie: cookieJar.header() } : {},
    redirect: "manual",
  });
  return { response, body: await response.text() };
}

async function assertAuthCallbackFailure(url, label) {
  const response = await fetch(url, { redirect: "manual" });
  assert(
    response.status >= 300 && response.status < 400,
    `${label} did not redirect safely: ${response.status}`,
  );
  const location = response.headers.get("location") || "";
  assert(location.includes("/auth/login?error=confirmation_failed"), `${label} did not fail closed: ${location}`);
}

async function cleanup() {
  if (createdStoragePaths.length) {
    await service.storage.from("receipts").remove(createdStoragePaths);
  }
  if (createdApplicationIds.length) {
    await service.from("applications").delete().in("id", createdApplicationIds);
  }
  for (const userId of createdUserIds.reverse()) {
    await service.auth.admin.deleteUser(userId);
  }
}

try {
  const signupJar = createCookieJar();
  const signupClient = createSsrAuthClient(signupJar);
  const signupNextPath = "/?checkout=1";
  const { data: signupData, error: signupError } = await signupClient.auth.signUp({
    email: emails.clientA,
    password,
    options: {
      emailRedirectTo: siteUrl,
      data: {
        display_name: "Integration Client A",
        locale: "es",
        role: "admin",
        auth_next: signupNextPath,
      },
    },
  });
  if (signupError) throw signupError;
  assert(signupData.user && !signupData.session, "Signup should require email confirmation.");
  createdUserIds.push(signupData.user.id);
  pass("signup requires email confirmation");

  const signupMail = await getMailMessage(emails.clientA);
  pass("confirmation email is delivered to local Mailpit");
  const confirmationUrl = await completeEmailFlow(signupMail, signupJar, signupNextPath);
  pass("Next.js auth callback exchanges the confirmation code");

  await assertAuthCallbackFailure(`${siteUrl}/auth/confirm?type=email`, "missing token callback");
  await assertAuthCallbackFailure(
    `${siteUrl}/auth/confirm?token_hash=damaged-token&type=email`,
    "damaged token callback",
  );
  await assertAuthCallbackFailure(confirmationUrl, "consumed or expired confirmation callback");
  pass("missing, damaged, and consumed confirmation links fail closed");

  const { data: authenticatedUser, error: authenticatedUserError } = await signupClient.auth.getUser();
  if (authenticatedUserError) throw authenticatedUserError;
  assert(authenticatedUser.user?.id === signupData.user.id, "Confirmed user session is invalid.");
  assert(authenticatedUser.user.user_metadata.auth_next === null, "Transient auth_next metadata was not cleared.");
  pass("confirmed client has a valid server-verifiable session");
  pass("confirmation clears transient auth_next metadata");

  const { data: clientProfile, error: profileError } = await signupClient
    .from("profiles")
    .select("role,active")
    .single();
  if (profileError) throw profileError;
  assert(clientProfile.role === "client" && clientProfile.active, "Signup metadata elevated the role.");
  pass("profile trigger ignores attempted admin metadata");

  const accountPage = await getPage("/account", signupJar);
  assert(accountPage.response.ok && accountPage.body.includes(emails.clientA), "Authenticated account page failed.");
  pass("authenticated client can open /account");

  const clientAdminPage = await getPage("/admin", signupJar);
  assert(
    clientAdminPage.body.includes("NEXT_REDIRECT") && clientAdminPage.body.includes("admin_required"),
    "Client was not rejected from /admin.",
  );
  pass("client role is rejected from /admin");

  const applicationRequestKey = randomUUID();
  const applicationInput = {
    p_material_id: "solid",
    p_declared_weight_kg: 2,
    p_city: "Madrid",
    p_delivery_method: "send",
    p_idempotency_key: applicationRequestKey,
  };
  const { data: application, error: applicationError } = await signupClient.rpc(
    "create_application",
    applicationInput,
  );
  if (applicationError) throw applicationError;
  createdApplicationIds.push(application.id);
  assert(application.estimated_amount_eur === 80, "Application amount was not calculated by PostgreSQL.");
  pass("client creates an application with a trusted server-side estimate");

  const { data: repeatedApplication, error: repeatedApplicationError } = await signupClient.rpc(
    "create_application",
    applicationInput,
  );
  if (repeatedApplicationError) throw repeatedApplicationError;
  assert(repeatedApplication.id === application.id, "Idempotent retry created a different application.");
  const { count: applicationCount, error: applicationCountError } = await signupClient
    .from("applications")
    .select("id", { count: "exact", head: true });
  if (applicationCountError) throw applicationCountError;
  assert(applicationCount === 1, "Idempotent retry created a duplicate application.");
  pass("application creation is idempotent across repeated requests");

  const { error: reusedKeyError } = await signupClient.rpc("create_application", {
    ...applicationInput,
    p_declared_weight_kg: 3,
  });
  assert(reusedKeyError?.message === "idempotency_key_conflict", "Reused request key accepted different input.");
  pass("an application request key cannot be reused with different input");

  const receiptPath = `${signupData.user.id}/${application.id}/receipt`;
  createdStoragePaths.push(receiptPath);
  const receiptBytes = new Uint8Array([82, 73, 70, 70, 8, 0, 0, 0, 87, 69, 66, 80]);
  const { error: prematureUploadError } = await signupClient.storage
    .from("receipts")
    .upload(receiptPath, receiptBytes, { contentType: "image/webp", upsert: false });
  assert(prematureUploadError, "Receipt upload was allowed before in_progress.");
  pass("receipt upload is blocked before in_progress");

  const clientB = await createConfirmedUser(emails.clientB, "Integration Client B");
  const adminA = await createConfirmedUser(emails.adminA, "Integration Admin A", "admin");
  const adminB = await createConfirmedUser(emails.adminB, "Integration Admin B", "admin");

  const calculatorKey = randomUUID();
  const calculatorInput = {
    p_material_id: "solid",
    p_declared_weight_kg: 20,
    p_city: "Valencia",
    p_delivery_method: "send",
    p_idempotency_key: calculatorKey,
    p_contact_phone: "+34 600 123 456",
    p_repeat_customer: true,
    p_payment_recipient_name: "Cliente Integración",
    p_payment_iban: "ES00 0000 0000 0000 0000 0000",
    p_preferred_visit_dates: [],
    p_expected_rate_eur: 40,
  };
  const { data: calculatorApplication, error: calculatorError } =
    await signupClient.rpc("create_application", calculatorInput);
  if (calculatorError) throw calculatorError;
  createdApplicationIds.push(calculatorApplication.id);
  assert(
    Number(calculatorApplication.rate_snapshot_eur) === 40
      && Number(calculatorApplication.estimated_amount_eur) === 800
      && calculatorApplication.payment_iban === "ES0000000000000000000000",
    "Calculator application did not use trusted pricing or normalized intake data.",
  );
  pass("public calculator RPC stores trusted pricing and normalized intake data");

  const { data: repeatedCalculator, error: repeatedCalculatorError } =
    await signupClient.rpc("create_application", calculatorInput);
  if (repeatedCalculatorError) throw repeatedCalculatorError;
  assert(
    repeatedCalculator.id === calculatorApplication.id,
    "Calculator retry created a duplicate application.",
  );
  pass("public calculator retry returns the existing application");

  const anonymousClient = createPasswordClient();
  const { error: anonymousCalculatorError } = await anonymousClient.rpc(
    "create_application",
    { ...calculatorInput, p_idempotency_key: randomUUID() },
  );
  assert(anonymousCalculatorError, "Anonymous calculator caller created an application.");
  pass("anonymous calculator caller cannot create an application");

  const { error: invalidCalculatorMaterial } = await signupClient.rpc(
    "create_application",
    {
      ...calculatorInput,
      p_material_id: "forged-material",
      p_idempotency_key: randomUUID(),
    },
  );
  assert(
    invalidCalculatorMaterial?.message === "material_not_available",
    "Calculator accepted a forged material id.",
  );
  pass("calculator rejects a forged material id");

  const { data: foreignApplications, error: foreignApplicationsError } = await clientB.client
    .from("applications")
    .select("id")
    .eq("id", application.id);
  if (foreignApplicationsError) throw foreignApplicationsError;
  assert(foreignApplications.length === 0, "Client B can read Client A application.");
  pass("RLS hides Client A application from Client B over REST");

  const { data: foreignCalculatorApplications, error: foreignCalculatorError } =
    await clientB.client
      .from("applications")
      .select("id")
      .eq("id", calculatorApplication.id);
  if (foreignCalculatorError) throw foreignCalculatorError;
  assert(
    foreignCalculatorApplications.length === 0,
    "Client B can read Client A calculator application.",
  );
  pass("RLS hides a calculator application from another client");

  const { data: calculatorQueueEntry, error: calculatorQueueError } =
    await adminA.client
      .from("applications")
      .select("id,status,manager_id")
      .eq("id", calculatorApplication.id)
      .single();
  if (calculatorQueueError) throw calculatorQueueError;
  assert(
    calculatorQueueEntry.status === "new" && calculatorQueueEntry.manager_id === null,
    "Calculator application did not enter the administrative new queue.",
  );
  pass("calculator application appears in the administrative new queue");

  const { error: calculatorClaimError } = await adminA.client.rpc(
    "claim_application",
    { p_application_id: calculatorApplication.id },
  );
  if (calculatorClaimError) throw calculatorClaimError;
  const { data: claimedCalculator, error: claimedCalculatorError } =
    await adminA.client
      .from("applications")
      .select("status,manager_id")
      .eq("id", calculatorApplication.id)
      .single();
  if (claimedCalculatorError) throw claimedCalculatorError;
  assert(
    claimedCalculator.status === "in_progress"
      && claimedCalculator.manager_id === adminA.id,
    "Calculator application was not moved to the assigned admin queue.",
  );
  pass("admin claims a calculator application atomically");

  const { error: clientClaimError } = await signupClient.rpc("claim_application", {
    p_application_id: application.id,
  });
  assert(clientClaimError?.message === "admin_required", "Client executed the administrative claim RPC.");
  pass("client cannot execute the administrative claim operation");

  const { error: claimError } = await adminA.client.rpc("claim_application", {
    p_application_id: application.id,
  });
  if (claimError) throw claimError;
  pass("Admin A claims the application through RPC");

  const { data: adminBRead, error: adminBReadError } = await adminB.client
    .from("applications")
    .select("id,manager_id,status")
    .eq("id", application.id)
    .single();
  if (adminBReadError) throw adminBReadError;
  assert(
    adminBRead.manager_id === adminA.id && adminBRead.status === "in_progress",
    "Admin B cannot inspect the application assigned to Admin A.",
  );
  pass("other admins can read assigned applications without owning them");

  const { error: secondClaimError } = await adminB.client.rpc("claim_application", {
    p_application_id: application.id,
  });
  assert(secondClaimError?.message === "application_not_available", "Admin B claimed an assigned application.");
  pass("Admin B cannot claim the assigned application");

  const { error: foreignUploadError } = await clientB.client.storage
    .from("receipts")
    .upload(`${clientB.id}/${application.id}/foreign.webp`, receiptBytes, {
      contentType: "image/webp",
      upsert: false,
    });
  assert(foreignUploadError, "Client B uploaded a receipt for Client A application.");
  pass("Storage policy blocks upload for another client application");

  const { error: alternateNameError } = await signupClient.storage
    .from("receipts")
    .upload(`${signupData.user.id}/${application.id}/receipt.webp`, receiptBytes, {
      contentType: "image/webp",
      upsert: false,
    });
  assert(alternateNameError, "Storage allowed an alternate receipt filename.");
  pass("Storage accepts only the deterministic receipt object path");

  const { error: uploadError } = await signupClient.storage
    .from("receipts")
    .upload(receiptPath, receiptBytes, { contentType: "image/webp", upsert: false });
  if (uploadError) throw uploadError;
  pass("Client A uploads a private receipt at in_progress");

  const { error: duplicateUploadError } = await signupClient.storage
    .from("receipts")
    .upload(receiptPath, receiptBytes, { contentType: "image/webp", upsert: false });
  assert(duplicateUploadError, "Storage allowed overwriting the receipt.");
  pass("Storage refuses receipt overwrite");

  const { error: foreignDownloadError } = await clientB.client.storage.from("receipts").download(receiptPath);
  assert(foreignDownloadError, "Client B downloaded Client A receipt.");
  pass("Client B cannot download Client A private receipt");

  const { error: adminDownloadError } = await adminA.client.storage.from("receipts").download(receiptPath);
  if (adminDownloadError) throw adminDownloadError;
  pass("admin role can download a private receipt");

  const { error: attachError } = await signupClient.rpc("attach_receipt_and_mark_sent", {
    p_application_id: application.id,
    p_storage_path: receiptPath,
  });
  if (attachError) throw attachError;
  pass("receipt finalization atomically moves the application to sent");

  const { error: attachRetryError } = await signupClient.rpc("attach_receipt_and_mark_sent", {
    p_application_id: application.id,
    p_storage_path: receiptPath,
  });
  if (attachRetryError) throw attachRetryError;
  const [{ count: receiptCount, error: receiptCountError }, { count: historyCount, error: historyCountError }] =
    await Promise.all([
      signupClient
        .from("application_receipts")
        .select("id", { count: "exact", head: true })
        .eq("application_id", application.id),
      signupClient
        .from("application_status_history")
        .select("id", { count: "exact", head: true })
        .eq("application_id", application.id),
    ]);
  if (receiptCountError) throw receiptCountError;
  if (historyCountError) throw historyCountError;
  assert(receiptCount === 1 && historyCount === 3, "Receipt finalization retry duplicated database records.");
  pass("receipt finalization safely recovers from an uncertain response");

  const { error: confirmedOverwriteError } = await signupClient.storage
    .from("receipts")
    .upload(receiptPath, receiptBytes, { contentType: "image/webp", upsert: true });
  assert(confirmedOverwriteError, "Confirmed receipt was overwritten.");
  pass("confirmed receipt cannot be overwritten");

  const { error: foreignAdvanceError } = await adminB.client.rpc("advance_application", {
    p_application_id: application.id,
    p_expected_status: "sent",
  });
  assert(foreignAdvanceError?.message === "assigned_manager_required", "Admin B advanced Admin A application.");
  pass("Admin B cannot advance Admin A application");

  const { error: acceptError } = await adminA.client.rpc("advance_application", {
    p_application_id: application.id,
    p_expected_status: "sent",
  });
  if (acceptError) throw acceptError;
  pass("assigned admin advances the application sequentially");

  const { data: roleSnapshots, error: roleSnapshotsError } = await adminA.client
    .from("application_status_history")
    .select("to_status,author_role_snapshot")
    .eq("application_id", application.id)
    .order("id");
  if (roleSnapshotsError) throw roleSnapshotsError;
  assert(
    roleSnapshots.some((entry) => entry.to_status === "new" && entry.author_role_snapshot === "client")
      && roleSnapshots.some((entry) => entry.to_status === "in_progress" && entry.author_role_snapshot === "admin"),
    "Status history does not preserve author role snapshots.",
  );
  pass("status history preserves client and admin role snapshots");

  const { error: promoteError } = await service
    .from("profiles")
    .update({ role: "admin" })
    .eq("user_id", signupData.user.id);
  if (promoteError) throw promoteError;
  const promotedAdminPage = await getPage("/admin", signupJar);
  assert(
    promotedAdminPage.response.ok && promotedAdminPage.body.includes(emails.clientA),
    "Database admin role was not recognized by /admin.",
  );
  pass("/admin trusts the database role after a trusted promotion");

  const recoveryJar = createCookieJar();
  const recoveryClient = createSsrAuthClient(recoveryJar);
  const knownMessageIds = new Set([signupMail.summary.ID]);
  const { error: recoveryRequestError } = await recoveryClient.auth.resetPasswordForEmail(emails.clientA, {
    redirectTo: siteUrl,
  });
  if (recoveryRequestError) throw recoveryRequestError;
  const recoveryMail = await getMailMessage(emails.clientA, knownMessageIds);
  pass("password recovery email is delivered to local Mailpit");
  const recoveryUrl = await completeEmailFlow(recoveryMail, recoveryJar, "/auth/update-password");
  pass("Next.js auth callback creates a recovery session");
  await assertAuthCallbackFailure(recoveryUrl, "consumed or expired recovery callback");
  pass("consumed recovery link fails closed");

  const { error: passwordUpdateError } = await recoveryClient.auth.updateUser({ password: newPassword });
  if (passwordUpdateError) throw passwordUpdateError;
  const { error: recoverySignOutError } = await recoveryClient.auth.signOut();
  if (recoverySignOutError) throw recoverySignOutError;
  pass("password update and logout succeed");

  const oldPasswordClient = createPasswordClient();
  const { error: oldPasswordError } = await oldPasswordClient.auth.signInWithPassword({
    email: emails.clientA,
    password,
  });
  assert(oldPasswordError, "Old password remained valid after recovery.");

  const newPasswordJar = createCookieJar();
  const newPasswordClient = createSsrAuthClient(newPasswordJar);
  const { error: newPasswordError } = await newPasswordClient.auth.signInWithPassword({
    email: emails.clientA,
    password: newPassword,
  });
  if (newPasswordError) throw newPasswordError;
  pass("only the recovered password can log in");

  await newPasswordClient.auth.signOut();
  const loggedOutAccount = await getPage("/account", newPasswordJar);
  assert(loggedOutAccount.body.includes("NEXT_REDIRECT"), "Logged-out session retained account access.");
  pass("logout removes access to /account");

  const expiredJar = createCookieJar();
  const expiredClient = createSsrAuthClient(expiredJar);
  const { error: expiredLoginError } = await expiredClient.auth.signInWithPassword({
    email: emails.clientA,
    password: newPassword,
  });
  if (expiredLoginError) throw expiredLoginError;
  expiredJar.corruptAuthCookies();
  const expiredAccount = await getPage("/account", expiredJar);
  assert(
    expiredAccount.body.includes("NEXT_REDIRECT") && expiredAccount.body.includes("/auth/login"),
    "Invalid session did not fail safely.",
  );
  pass("invalid session fails safely and redirects to login");

  process.stdout.write(`Integration checks passed: ${passed.length}\n`);
} finally {
  await cleanup();
}
