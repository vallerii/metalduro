import assert from "node:assert/strict";
import {
  calculatorDraftKey,
  calculatorDraftTtlMs,
  clearCalculatorDraft,
  readCalculatorDraft,
  writeCalculatorDraft,
} from "../src/lib/calculator-draft.ts";

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    raw(key) { return values.get(key) ?? null; },
  };
}

const now = Date.UTC(2026, 10, 7, 12, 0, 0);
const safeValues = {
  materialId: "solid",
  weightText: "25",
  city: "Madrid",
  deliveryMethod: "send",
};

const storage = memoryStorage();
assert.equal(writeCalculatorDraft(storage, safeValues, now), true);
const restored = readCalculatorDraft(storage, now + 1000);
assert.deepEqual(restored, {
  version: 2,
  savedAt: now,
  expiresAt: now + calculatorDraftTtlMs,
  ...safeValues,
});
pass("versioned safe draft is restored within the 60-minute TTL");

const serialized = storage.raw(calculatorDraftKey);
assert(serialized);
for (const forbidden of ["phone", "iban", "recipient", "password", "token", "idempotency"]) {
  assert.equal(serialized.toLowerCase().includes(forbidden), false);
}
pass("draft contains no phone, IBAN, recipient, password, token or idempotency data");

assert.equal(readCalculatorDraft(storage, now + calculatorDraftTtlMs + 1), null);
assert.equal(storage.raw(calculatorDraftKey), null);
pass("expired draft is removed instead of restored");

const corrupt = memoryStorage({ [calculatorDraftKey]: "{not-json" });
assert.equal(readCalculatorDraft(corrupt, now), null);
assert.equal(corrupt.raw(calculatorDraftKey), null);
pass("corrupted JSON fails closed and is removed");

const invalid = memoryStorage({
  [calculatorDraftKey]: JSON.stringify({
    version: 2,
    savedAt: now,
    expiresAt: now + calculatorDraftTtlMs,
    ...safeValues,
    deliveryMethod: "external",
  }),
});
assert.equal(readCalculatorDraft(invalid, now), null);
pass("invalid material, weight, city or delivery values are rejected");

const unavailable = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
};
assert.equal(writeCalculatorDraft(unavailable, safeValues, now), false);
assert.equal(readCalculatorDraft(unavailable, now), null);
assert.doesNotThrow(() => clearCalculatorDraft(unavailable));
pass("unavailable browser storage does not break the calculator");

const clearable = memoryStorage();
writeCalculatorDraft(clearable, safeValues, now);
clearCalculatorDraft(clearable);
assert.equal(clearable.raw(calculatorDraftKey), null);
pass("explicit discard and successful creation can clear the draft");

process.stdout.write("Calculator draft checks passed: 6/6.\n");
