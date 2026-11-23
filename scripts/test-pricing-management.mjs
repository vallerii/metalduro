import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  formatRateInput,
  materialRateFormSchema,
  publicPricingFormSchema,
} from "../src/lib/pricing-management.ts";
import { formatPricePerKg, formatPublicPriceDate } from "../src/lib/pricing-types.ts";

let passed = 0;
function pass(message) {
  passed += 1;
  process.stdout.write(`PASS: ${message}\n`);
}

assert.deepEqual(materialRateFormSchema.parse({ materialId: "solid", rateEur: "41,25" }), {
  materialId: "solid",
  rateEur: 41.25,
});
assert.equal(formatRateInput(30), "30.00");
pass("material rate form accepts localized input and normalizes two decimal output");

for (const rateEur of ["0", "-1", "41.001", "10000.01", "not-a-number"]) {
  assert.equal(materialRateFormSchema.safeParse({ materialId: "solid", rateEur }).success, false);
}
assert.equal(materialRateFormSchema.safeParse({ materialId: "unknown", rateEur: "40" }).success, false);
pass("material rate validation rejects invalid IDs, non-positive, excessive and over-precision values");

assert.deepEqual(publicPricingFormSchema.parse({
  priceEurPerKg: "25.00",
  priceDate: "2026-11-09",
}), {
  priceEurPerKg: 25,
  priceDate: "2026-11-09",
});
for (const priceDate of ["", "2026-02-30", "1999-12-31", "2101-01-01", "09-11-2026"]) {
  assert.equal(publicPricingFormSchema.safeParse({ priceEurPerKg: "25", priceDate }).success, false);
}
pass("public price validation requires a real bounded ISO date");

assert.equal(formatPricePerKg(25, "es"), "25 €/kg");
assert.equal(formatPublicPriceDate("2026-11-09", "es"), "9 de noviembre de 2026");
assert.equal(formatPublicPriceDate("2026-11-09", "ru"), "9 ноября 2026 г.");
pass("public price is formatted consistently for ES and RU without hardcoded JSX text");

const siteSource = await readFile(new URL("../src/content/site.ts", import.meta.url), "utf8");
assert.doesNotMatch(siteSource, /rate\s*:/);
const calculatorSource = await readFile(new URL("../src/components/Calculator.tsx", import.meta.url), "utf8");
assert.match(calculatorSource, /materialRates\[material\.id\]/);
assert.match(calculatorSource, /status === "price_changed"/);
pass("calculator uses injected database rates and retains explicit price-change reconfirmation");

const migration = await readFile(new URL("../supabase/migrations/20261109000100_pricing_management.sql", import.meta.url), "utf8");
assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
assert.match(migration, /private\.is_admin\(\)/);
assert.match(migration, /revoke execute[\s\S]*from public, anon, authenticated/i);
assert.doesNotMatch(migration, /\b(delete|truncate)\s+(?:from\s+)?public\./i);
pass("pricing migration is additive and guarded by narrow admin-only RPCs");

process.stdout.write(`Pricing management checks passed: ${passed}/${passed}.\n`);
