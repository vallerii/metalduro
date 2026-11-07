import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const document = await readFile(new URL("../docs/STAGING_TEST_DATA_CLEANUP.md", import.meta.url), "utf8");
const transaction = document.match(/### Database transaction template[\s\S]*?```sql([\s\S]*?)```/)?.[1] || "";
const expectedUsers = [
  "95846cfe-892d-4525-b8ae-649c761171d5",
  "76763ae0-1c16-42bb-b315-97497b86ca6c",
  "673efe8b-c785-42be-bbfb-38fce2f8bbcf",
  "1f37a32c-bc37-4497-b31c-cab60c45a09f",
];
const expectedApplications = [
  "2b308451-6728-473b-b4d7-677eed3174d7",
  "c8a935e1-7265-4bc3-b6de-0a696330d273",
  "d4936daf-c1ad-45fb-8268-fa9b4f93e9a5",
  "3daafa48-3751-4ba3-877e-765d4df6b279",
  "61d6b8ad-f2eb-4fc6-bd20-13561c810755",
  "ac4eaef0-0e19-44da-83f9-856a47c395fa",
  "dc1c795d-ae9d-4864-ba92-51888cd5febf",
];

assert.ok(transaction.startsWith("\nbegin;"), "Cleanup transaction must begin explicitly.");
assert.match(transaction, /\nrollback;\s*$/i, "Reviewed cleanup must remain rollback-only by default.");
for (const id of [...expectedUsers, ...expectedApplications]) assert.ok(transaction.includes(id), `Missing exact target ID ${id}.`);
assert.match(transaction, /delete from public\.applications\s+where id = any\(/i);
assert.match(transaction, /get diagnostics v_deleted = row_count/i);
assert.match(transaction, /v_deleted <> 7/i);
assert.match(transaction, /id <> all\(v_apps\)/i);
assert.doesNotMatch(transaction, /delete\s+from\s+auth\.users/i);
assert.doesNotMatch(transaction, /delete\s+from\s+storage\.objects/i);
assert.doesNotMatch(transaction, /\b(?:like|ilike)\b/i);
assert.ok(document.includes("95846cfe-892d-4525-b8ae-649c761171d5/dc1c795d-ae9d-4864-ba92-51888cd5febf/receipt"));
assert.ok(document.includes("Storage Admin API"));
assert.ok(document.includes("Auth Admin API"));

process.stdout.write("Staging cleanup plan safety checks passed: exact IDs, relational aborts, rollback default, no broad Auth/Storage delete.\n");
