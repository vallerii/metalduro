import assert from "node:assert/strict";
import {
  CLEANUP_CONFIRMATION,
  STAGING_PROJECT_REF,
  TARGET_APPLICATION_IDS,
  TARGET_RECEIPT_ID,
  TARGET_STORAGE_PATH,
  TARGET_USER_IDS,
  assertExecuteGate,
  createPreviewManifest,
  initialProgress,
  runCleanup,
  validateFullInventory,
  validateSchemaDump,
} from "./staging-cleanup-lib.mjs";

const schema = `
ALTER TABLE ONLY "public"."application_receipts" ADD CONSTRAINT "application_receipts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."application_receipts" ADD CONSTRAINT "application_receipts_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("user_id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."application_status_history" ADD CONSTRAINT "application_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("user_id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("user_id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("user_id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."notification_outbox" ADD CONSTRAINT "notification_outbox_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notification_outbox" ADD CONSTRAINT "notification_outbox_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
CREATE OR REPLACE TRIGGER "applications_enforce_intake_immutability" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_application_intake_immutability"();
CREATE OR REPLACE TRIGGER "applications_enforce_transition" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_application_transition"();
CREATE OR REPLACE TRIGGER "applications_enqueue_created_notification" AFTER INSERT ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "private"."enqueue_application_status_notifications"();
CREATE OR REPLACE TRIGGER "applications_enqueue_status_notification" AFTER UPDATE OF "status" ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "private"."enqueue_application_status_notifications"();
CREATE OR REPLACE TRIGGER "applications_record_initial_status" AFTER INSERT ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "private"."record_application_status_history"();
CREATE OR REPLACE TRIGGER "applications_record_status_change" AFTER UPDATE OF "status" ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "private"."record_application_status_history"();
CREATE OR REPLACE TRIGGER "applications_set_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();
CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();
`;

function baseInventory() {
  const applications = TARGET_APPLICATION_IDS.map((id, index) => ({ id, client_id: TARGET_USER_IDS[index % 2], manager_id: index % 3 ? TARGET_USER_IDS[2] : null, status: "paid" }));
  const history = Array.from({ length: 13 }, (_, index) => ({ id: String(index + 1), application_id: TARGET_APPLICATION_IDS[index % TARGET_APPLICATION_IDS.length], changed_by: TARGET_USER_IDS[index % TARGET_USER_IDS.length] }));
  const outbox = Array.from({ length: 18 }, (_, index) => ({ id: `outbox-${index + 1}`, application_id: TARGET_APPLICATION_IDS[index % TARGET_APPLICATION_IDS.length], recipient_user_id: TARGET_USER_IDS[index % TARGET_USER_IDS.length], status: "pending", event_key: `event-${index + 1}` }));
  return {
    authUserIds: [...TARGET_USER_IDS],
    profileUserIds: [...TARGET_USER_IDS],
    applications,
    history,
    receipts: [{ id: TARGET_RECEIPT_ID, application_id: "dc1c795d-ae9d-4864-ba92-51888cd5febf", uploaded_by: "95846cfe-892d-4525-b8ae-649c761171d5", storage_path: TARGET_STORAGE_PATH }],
    outbox,
    storagePaths: [TARGET_STORAGE_PATH],
  };
}

function pass(message) {
  process.stdout.write(`PASS: ${message}\n`);
}

const schemaResult = validateSchemaDump(schema);
assert.equal(schemaResult.foreignKeys.length, 10);
pass("schema dependency guard accepts only the reviewed FK and trigger graph");

const inventory = baseInventory();
assert.deepEqual(validateFullInventory(inventory).authUserIds, TARGET_USER_IDS);
pass("preview requires exact user and application UUID sets");

assert.throws(() => validateFullInventory({ ...inventory, applications: [...inventory.applications, { ...inventory.applications[0], id: "00000000-0000-4000-8000-000000000000" }] }), /unexpected_application_ids/);
pass("preview rejects an unknown application");

assert.throws(() => validateFullInventory({ ...inventory, storagePaths: [...inventory.storagePaths, "unknown/object"] }), /unexpected_storage_objects/);
pass("preview rejects an unexpected Storage object");

assert.throws(() => createPreviewManifest({ projectRef: "production-ref", inventory, schema: schemaResult }), /cleanup_project_ref_mismatch/);
pass("preview rejects a wrong Project Ref");

const manifest = createPreviewManifest({ projectRef: STAGING_PROJECT_REF, inventory, schema: schemaResult, generatedAt: "2026-11-03T00:00:00.000Z" });
assert.throws(() => assertExecuteGate({ projectRef: STAGING_PROJECT_REF, manifest, manifestSha256: "A", actualManifestSha256: "A", executeApproved: false, confirmation: CLEANUP_CONFIRMATION }), /cleanup_execute_approval_flag_required/);
assert.throws(() => assertExecuteGate({ projectRef: STAGING_PROJECT_REF, manifest, manifestSha256: "A", actualManifestSha256: "A", executeApproved: true, confirmation: "wrong" }), /cleanup_execute_confirmation_mismatch/);
pass("execute is blocked without both the explicit flag and exact interactive confirmation");

let mockInventory = structuredClone(inventory);
let storageFailsOnce = true;
const persisted = [];
const adapter = {
  async inventory() { return structuredClone(mockInventory); },
  async deleteApplications(ids) {
    assert.deepEqual([...ids].sort(), TARGET_APPLICATION_IDS);
    mockInventory.applications = [];
    mockInventory.history = [];
    mockInventory.receipts = [];
    mockInventory.outbox = [];
    return [...ids];
  },
  async deleteStorageObject(storagePath) {
    assert.equal(storagePath, TARGET_STORAGE_PATH);
    if (storageFailsOnce) { storageFailsOnce = false; throw new Error("mock_storage_failure"); }
    mockInventory.storagePaths = [];
  },
  async deleteAuthUser(userId) {
    mockInventory.authUserIds = mockInventory.authUserIds.filter((id) => id !== userId);
    mockInventory.profileUserIds = mockInventory.profileUserIds.filter((id) => id !== userId);
  },
};
const progress = initialProgress("MANIFEST");
await assert.rejects(() => runCleanup({ adapter, progress, persistProgress: async (value) => persisted.push(structuredClone(value)), now: () => "2026-11-03T00:00:00.000Z" }), /mock_storage_failure/);
assert.equal(progress.database_deleted, true);
assert.equal(progress.storage_deleted, false);
await runCleanup({ adapter, progress, persistProgress: async (value) => persisted.push(structuredClone(value)), now: () => "2026-11-03T00:00:00.000Z" });
assert.equal(progress.completed, true);
assert.deepEqual(mockInventory.authUserIds, []);
assert.deepEqual(mockInventory.storagePaths, []);
pass("cleanup resumes safely after a partial Storage-step failure without repeating database deletion");

let unexpectedDatabaseRetry = false;
const uncertainInventory = baseInventory();
uncertainInventory.applications = [];
uncertainInventory.history = [];
uncertainInventory.receipts = [];
uncertainInventory.outbox = [];
const uncertainAdapter = {
  async inventory() { return structuredClone(uncertainInventory); },
  async deleteApplications() { unexpectedDatabaseRetry = true; return []; },
  async deleteStorageObject() { uncertainInventory.storagePaths = []; },
  async deleteAuthUser(userId) {
    uncertainInventory.authUserIds = uncertainInventory.authUserIds.filter((id) => id !== userId);
    uncertainInventory.profileUserIds = uncertainInventory.profileUserIds.filter((id) => id !== userId);
  },
};
const uncertainProgress = initialProgress("UNCERTAIN");
await runCleanup({ adapter: uncertainAdapter, progress: uncertainProgress, persistProgress: async () => {}, now: () => "2026-11-03T00:00:00.000Z" });
assert.equal(unexpectedDatabaseRetry, false);
assert.equal(uncertainProgress.completed, true);
assert.ok(uncertainProgress.events.some((event) => event.step === "database" && event.recovered_after_uncertain_result));
pass("cleanup reconciles a successful database delete whose response or progress write was interrupted");

const serialized = JSON.stringify(manifest);
assert.doesNotMatch(serialized, /@|iban|password|secret/i);
pass("preview manifest contains no email, IBAN, password or secret fields");

process.stdout.write("Staging cleanup tool checks passed: 9/9. No remote data was used or modified.\n");
