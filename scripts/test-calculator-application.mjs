import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { es } from "../src/content/dict/es.ts";
import { ru } from "../src/content/dict/ru.ts";
import {
  processCalculatorApplication,
} from "../src/lib/calculator-application.ts";

const applicationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const idempotencyKey = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let passed = 0;

function pass(message) {
  passed += 1;
  process.stdout.write(`PASS: ${message}\n`);
}

function input(overrides = {}) {
  return {
    materialId: "solid",
    weightKg: 20,
    city: "Barcelona",
    deliveryMethod: "send",
    phone: "+34900000000",
    repeatCustomer: false,
    paymentRecipientName: "Cliente Prueba",
    paymentIban: "ES00 0000 0000 0000 0000 0000",
    preferredVisitDates: [],
    idempotencyKey,
    previewRateEur: 40,
    ...overrides,
  };
}

function harness({ authenticated = true, role = "client", rateEur = 40, rpcError = null } = {}) {
  const applications = new Map();
  const inFlight = new Map();
  const rpcCalls = [];
  let inserts = 0;

  const dependencies = {
    configured: true,
    getAuthenticatedUser: async () => authenticated ? { profile: { role } } : null,
    getActiveMaterialRate: async () => ({ rateEur, error: false }),
    createApplication: async (args) => {
      rpcCalls.push(args);
      if (rpcError) return { applicationId: null, errorMessage: rpcError };
      const key = args.p_idempotency_key;
      const fingerprint = JSON.stringify(args);
      const existing = applications.get(key);
      if (existing) {
        return existing.fingerprint === fingerprint
          ? { applicationId: existing.id, errorMessage: null }
          : { applicationId: null, errorMessage: "idempotency_key_conflict" };
      }
      if (inFlight.has(key)) return inFlight.get(key);
      const operation = (async () => {
        await delay(25);
        inserts += 1;
        applications.set(key, { id: applicationId, fingerprint });
        inFlight.delete(key);
        return { applicationId, errorMessage: null };
      })();
      inFlight.set(key, operation);
      return operation;
    },
  };

  return {
    dependencies,
    rpcCalls,
    get inserts() { return inserts; },
  };
}

{
  const mock = harness();
  const result = await processCalculatorApplication(input(), es.calc, mock.dependencies);
  assert.deepEqual(result, { status: "success", applicationId });
  assert.deepEqual(mock.rpcCalls[0], {
    p_material_id: "solid",
    p_declared_weight_kg: 20,
    p_city: "Barcelona",
    p_delivery_method: "send",
    p_idempotency_key: idempotencyKey,
    p_contact_phone: "+34900000000",
    p_repeat_customer: false,
    p_payment_recipient_name: "Cliente Prueba",
    p_payment_iban: "ES0000000000000000000000",
    p_preferred_visit_dates: [],
    p_expected_rate_eur: 40,
  });
  pass("authenticated client sends the complete current RPC signature");
}

for (const deliveryMethod of ["pickup", "warehouse"]) {
  const mock = harness();
  const result = await processCalculatorApplication(input({
    deliveryMethod,
    weightKg: deliveryMethod === "pickup" ? 60 : 20,
    paymentRecipientName: "must not be sent",
    paymentIban: "ES0000000000000000000000",
    preferredVisitDates: ["2026-11-14", "2026-11-15"],
  }), es.calc, mock.dependencies);
  assert.equal(result.status, "success");
  assert.equal(mock.rpcCalls[0].p_payment_recipient_name, null);
  assert.equal(mock.rpcCalls[0].p_payment_iban, null);
  assert.deepEqual(mock.rpcCalls[0].p_preferred_visit_dates, ["2026-11-14", "2026-11-15"]);
  pass(`${deliveryMethod} omits payment data and keeps visit dates`);
}

for (const [invalid, message] of [
  [input({ weightKg: 4 }), es.calc.errWeight],
  [input({ paymentIban: "ES-invalid" }), es.calc.errIban],
  [input({ paymentRecipientName: "" }), es.calc.errPayName],
]) {
  const mock = harness();
  const result = await processCalculatorApplication(invalid, es.calc, mock.dependencies);
  assert.deepEqual(result, { status: "error", message });
  assert.equal(mock.rpcCalls.length, 0);
}
pass("invalid weight, IBAN and payment recipient are rejected before RPC");

{
  const mock = harness();
  const [first, second] = await Promise.all([
    processCalculatorApplication(input(), es.calc, mock.dependencies),
    processCalculatorApplication(input(), es.calc, mock.dependencies),
  ]);
  assert.deepEqual(first, second);
  assert.equal(mock.inserts, 1);
  const retry = await processCalculatorApplication(input(), es.calc, mock.dependencies);
  assert.deepEqual(retry, first);
  assert.equal(mock.inserts, 1);
  pass("double submit and retry with one idempotency UUID create one application");

  const changed = await processCalculatorApplication(input({ weightKg: 21 }), es.calc, mock.dependencies);
  assert.deepEqual(changed, { status: "error", message: es.calc.errIntentChanged });
  assert.equal(mock.inserts, 1);
  pass("changed input with the same idempotency UUID is rejected");
}

{
  const mock = harness({ rpcError: "database_unavailable" });
  const result = await processCalculatorApplication(input(), es.calc, mock.dependencies);
  assert.deepEqual(result, { status: "error", message: es.calc.errCreate });
  pass("RPC errors produce a safe localized error without false success");
}

{
  const mock = harness({ authenticated: false });
  const result = await processCalculatorApplication(input(), es.calc, mock.dependencies);
  assert.deepEqual(result, { status: "auth_required", message: es.calc.authRequired });
  assert.equal(mock.rpcCalls.length, 0);
  pass("expired session cannot reach material or create RPC operations");
}

{
  const mock = harness({ rateEur: 41 });
  const result = await processCalculatorApplication(input(), es.calc, mock.dependencies);
  assert.deepEqual(result, {
    status: "price_changed",
    message: es.calc.priceChanged,
    currentRateEur: 41,
    currentEstimateEur: 820,
  });
  assert.equal(mock.rpcCalls.length, 0);
  pass("changed trusted rate requires a fresh confirmation before RPC");
}

{
  const mock = harness({ rateEur: 41 });
  const result = await processCalculatorApplication(input({ previewRateEur: 41 }), es.calc, mock.dependencies);
  assert.deepEqual(result, { status: "success", applicationId });
  assert.equal(mock.rpcCalls[0].p_expected_rate_eur, 41);
  pass("a reconfirmed current material rate is passed to the protected creation RPC");
}

for (const copy of [es.calc, ru.calc]) {
  const mock = harness();
  const result = await processCalculatorApplication(input({ paymentIban: "bad" }), copy, mock.dependencies);
  assert.deepEqual(result, { status: "error", message: copy.errIban });
}
pass("validation errors follow the active ES/RU locale");

process.stdout.write(`Calculator application checks passed: ${passed}/${passed}.\n`);
