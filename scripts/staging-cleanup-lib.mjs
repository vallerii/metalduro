import { createHash } from "node:crypto";

export const STAGING_PROJECT_REF = "lavmldzccvctmegasobz";
export const STAGING_PROJECT_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
export const CLEANUP_CONFIRMATION = `DELETE SYNTHETIC STAGING DATA ${STAGING_PROJECT_REF}`;

export const TARGET_USER_IDS = Object.freeze([
  "95846cfe-892d-4525-b8ae-649c761171d5",
  "76763ae0-1c16-42bb-b315-97497b86ca6c",
  "673efe8b-c785-42be-bbfb-38fce2f8bbcf",
  "1f37a32c-bc37-4497-b31c-cab60c45a09f",
].sort());

export const TARGET_APPLICATION_IDS = Object.freeze([
  "2b308451-6728-473b-b4d7-677eed3174d7",
  "c8a935e1-7265-4bc3-b6de-0a696330d273",
  "d4936daf-c1ad-45fb-8268-fa9b4f93e9a5",
  "3daafa48-3751-4ba3-877e-765d4df6b279",
  "61d6b8ad-f2eb-4fc6-bd20-13561c810755",
  "ac4eaef0-0e19-44da-83f9-856a47c395fa",
  "dc1c795d-ae9d-4864-ba92-51888cd5febf",
].sort());

export const TARGET_RECEIPT_ID = "bb3fcacc-eba5-4a8e-bdb9-9ebc3bb0f703";
export const TARGET_STORAGE_PATH = "95846cfe-892d-4525-b8ae-649c761171d5/dc1c795d-ae9d-4864-ba92-51888cd5febf/receipt";

const RELEVANT_TABLES = new Set([
  "profiles",
  "materials",
  "applications",
  "application_status_history",
  "application_receipts",
  "notification_outbox",
]);

const EXPECTED_FOREIGN_KEYS = Object.freeze([
  "application_receipts.application_id->public.applications.id:CASCADE",
  "application_receipts.uploaded_by->public.profiles.user_id:RESTRICT",
  "application_status_history.application_id->public.applications.id:CASCADE",
  "application_status_history.changed_by->public.profiles.user_id:RESTRICT",
  "applications.client_id->public.profiles.user_id:RESTRICT",
  "applications.manager_id->public.profiles.user_id:RESTRICT",
  "applications.material_id->public.materials.id:RESTRICT",
  "notification_outbox.application_id->public.applications.id:CASCADE",
  "notification_outbox.recipient_user_id->public.profiles.user_id:CASCADE",
  "profiles.user_id->auth.users.id:CASCADE",
].sort());

const EXPECTED_TRIGGERS = Object.freeze([
  "applications:applications_enforce_intake_immutability",
  "applications:applications_enforce_transition",
  "applications:applications_enqueue_created_notification",
  "applications:applications_enqueue_status_notification",
  "applications:applications_record_initial_status",
  "applications:applications_record_status_change",
  "applications:applications_set_updated_at",
  "profiles:profiles_set_updated_at",
].sort());

function cleanupError(code, details) {
  const error = new Error(code);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function assertExactIds(actual, expected, code) {
  const normalized = sortedUnique(actual);
  if (normalized.length !== actual.length || JSON.stringify(normalized) !== JSON.stringify(expected)) {
    throw cleanupError(code, { expected, actual: normalized });
  }
}

export function assertProjectRef(projectRef) {
  if (projectRef !== STAGING_PROJECT_REF) {
    throw cleanupError("cleanup_project_ref_mismatch", { expected: STAGING_PROJECT_REF, actual: projectRef || null });
  }
}

export function normalizeInventory(input) {
  return {
    authUserIds: sortedUnique(input.authUserIds || []),
    profileUserIds: sortedUnique(input.profileUserIds || []),
    applications: [...(input.applications || [])].map((row) => ({
      id: row.id,
      client_id: row.client_id,
      manager_id: row.manager_id || null,
      status: row.status,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    history: [...(input.history || [])].map((row) => ({
      id: String(row.id),
      application_id: row.application_id,
      changed_by: row.changed_by || null,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    receipts: [...(input.receipts || [])].map((row) => ({
      id: row.id,
      application_id: row.application_id,
      uploaded_by: row.uploaded_by,
      storage_path: row.storage_path,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    outbox: [...(input.outbox || [])].map((row) => ({
      id: row.id,
      application_id: row.application_id || null,
      recipient_user_id: row.recipient_user_id || null,
      status: row.status,
      event_key: row.event_key,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    storagePaths: sortedUnique(input.storagePaths || []),
  };
}

export function validateFullInventory(rawInventory) {
  const inventory = normalizeInventory(rawInventory);
  assertExactIds(inventory.authUserIds, TARGET_USER_IDS, "unexpected_auth_user_ids");
  assertExactIds(inventory.profileUserIds, TARGET_USER_IDS, "unexpected_profile_ids");
  assertExactIds(inventory.applications.map((row) => row.id), TARGET_APPLICATION_IDS, "unexpected_application_ids");
  assertExactIds(inventory.storagePaths, [TARGET_STORAGE_PATH], "unexpected_storage_objects");

  if (inventory.history.length !== 13) throw cleanupError("unexpected_history_count", inventory.history.length);
  if (inventory.receipts.length !== 1) throw cleanupError("unexpected_receipt_count", inventory.receipts.length);
  if (inventory.outbox.length !== 18) throw cleanupError("unexpected_outbox_count", inventory.outbox.length);
  if (new Set(inventory.history.map((row) => row.id)).size !== inventory.history.length) throw cleanupError("duplicate_history_ids");
  if (new Set(inventory.outbox.map((row) => row.id)).size !== inventory.outbox.length) throw cleanupError("duplicate_outbox_ids");
  if (new Set(inventory.outbox.map((row) => row.event_key)).size !== inventory.outbox.length) throw cleanupError("duplicate_outbox_event_keys");

  const userIds = new Set(TARGET_USER_IDS);
  const applicationIds = new Set(TARGET_APPLICATION_IDS);
  if (inventory.applications.some((row) => !userIds.has(row.client_id) || (row.manager_id && !userIds.has(row.manager_id)))) {
    throw cleanupError("unexpected_application_user_link");
  }
  if (inventory.history.some((row) => !applicationIds.has(row.application_id) || (row.changed_by && !userIds.has(row.changed_by)))) {
    throw cleanupError("unexpected_history_link");
  }
  const receipt = inventory.receipts[0];
  if (receipt.id !== TARGET_RECEIPT_ID || !applicationIds.has(receipt.application_id) || !userIds.has(receipt.uploaded_by) || receipt.storage_path !== TARGET_STORAGE_PATH) {
    throw cleanupError("unexpected_receipt_link");
  }
  if (inventory.outbox.some((row) => !row.application_id || !applicationIds.has(row.application_id) || (row.recipient_user_id && !userIds.has(row.recipient_user_id)))) {
    throw cleanupError("unexpected_outbox_link");
  }
  if (inventory.outbox.some((row) => row.status !== "pending")) throw cleanupError("outbox_not_all_pending");
  return inventory;
}

function deleteActionFromSuffix(suffix) {
  const match = suffix.match(/ON DELETE\s+(CASCADE|RESTRICT|SET NULL|SET DEFAULT|NO ACTION)/i);
  return (match?.[1] || "NO ACTION").toUpperCase();
}

export function validateSchemaDump(schemaSql) {
  const foreignKeys = [];
  const fkPattern = /ALTER TABLE ONLY "([^"]+)"\."([^"]+)"\s+ADD CONSTRAINT "([^"]+)" FOREIGN KEY \("([^"]+)"\) REFERENCES "([^"]+)"\."([^"]+)"\("([^"]+)"\)([^;]*);/g;
  for (const match of schemaSql.matchAll(fkPattern)) {
    const [, childSchema, childTable, , childColumn, parentSchema, parentTable, parentColumn, suffix] = match;
    if (childSchema === "public" && (RELEVANT_TABLES.has(childTable) || RELEVANT_TABLES.has(parentTable))) {
      foreignKeys.push(`${childTable}.${childColumn}->${parentSchema}.${parentTable}.${parentColumn}:${deleteActionFromSuffix(suffix)}`);
    }
  }
  foreignKeys.sort();
  if (JSON.stringify(foreignKeys) !== JSON.stringify(EXPECTED_FOREIGN_KEYS)) {
    throw cleanupError("unexpected_cleanup_foreign_keys", { expected: EXPECTED_FOREIGN_KEYS, actual: foreignKeys });
  }

  const triggers = [];
  const triggerPattern = /CREATE OR REPLACE TRIGGER "([^"]+)" ([^;]+?) ON "public"\."([^"]+)" ([^;]+);/g;
  for (const match of schemaSql.matchAll(triggerPattern)) {
    const [, name, eventClause, table, tail] = match;
    if (!["applications", "profiles", "application_status_history", "application_receipts", "notification_outbox"].includes(table)) continue;
    if (/\bDELETE\b/i.test(`${eventClause} ${tail}`)) throw cleanupError("unexpected_cleanup_delete_trigger", { table, name });
    triggers.push(`${table}:${name}`);
  }
  triggers.sort();
  if (JSON.stringify(triggers) !== JSON.stringify(EXPECTED_TRIGGERS)) {
    throw cleanupError("unexpected_cleanup_triggers", { expected: EXPECTED_TRIGGERS, actual: triggers });
  }
  return { foreignKeys, triggers };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

export function createPreviewManifest({ projectRef, inventory: rawInventory, schema, generatedAt = new Date().toISOString() }) {
  assertProjectRef(projectRef);
  const inventory = validateFullInventory(rawInventory);
  const snapshot = { projectRef, inventory, schema };
  return {
    manifest_version: 1,
    mode: "preview",
    project_ref: projectRef,
    generated_at: generatedAt,
    snapshot_sha256: sha256Text(stableJson(snapshot)),
    counts: {
      auth_users: inventory.authUserIds.length,
      profiles: inventory.profileUserIds.length,
      applications: inventory.applications.length,
      status_history: inventory.history.length,
      receipt_metadata: inventory.receipts.length,
      storage_objects: inventory.storagePaths.length,
      notification_outbox: inventory.outbox.length,
      pending_outbox: inventory.outbox.filter((row) => row.status === "pending").length,
    },
    target_ids: {
      auth_users: inventory.authUserIds,
      profiles: inventory.profileUserIds,
      applications: inventory.applications.map((row) => row.id),
      status_history: inventory.history.map((row) => row.id),
      receipt_metadata: inventory.receipts.map((row) => row.id),
      storage_objects: inventory.storagePaths,
      notification_outbox: inventory.outbox.map((row) => row.id),
    },
    snapshot,
  };
}

export function assertExecuteGate({ projectRef, manifest, manifestSha256, actualManifestSha256, executeApproved, confirmation }) {
  assertProjectRef(projectRef);
  if (!executeApproved) throw cleanupError("cleanup_execute_approval_flag_required");
  if (confirmation !== CLEANUP_CONFIRMATION) throw cleanupError("cleanup_execute_confirmation_mismatch");
  if (manifest.project_ref !== projectRef || manifest.mode !== "preview" || manifest.manifest_version !== 1) throw cleanupError("cleanup_manifest_invalid");
  if (!manifestSha256 || manifestSha256 !== actualManifestSha256) throw cleanupError("cleanup_manifest_file_hash_mismatch");
}

export function initialProgress(manifestSha256) {
  return {
    state_version: 1,
    project_ref: STAGING_PROJECT_REF,
    manifest_sha256: manifestSha256,
    database_deleted: false,
    storage_deleted: false,
    auth_user_ids_deleted: [],
    completed: false,
    events: [],
  };
}

function validateRemainingInventory(rawInventory, progress) {
  const inventory = normalizeInventory(rawInventory);
  const deletedUsers = new Set(progress.auth_user_ids_deleted || []);
  const expectedUsers = TARGET_USER_IDS.filter((id) => !deletedUsers.has(id));
  assertExactIds(inventory.authUserIds, expectedUsers, "unexpected_remaining_auth_user_ids");
  assertExactIds(inventory.profileUserIds, expectedUsers, "unexpected_remaining_profile_ids");
  if (progress.database_deleted) {
    if (inventory.applications.length || inventory.history.length || inventory.receipts.length || inventory.outbox.length) throw cleanupError("database_cleanup_step_incomplete");
  } else {
    validateFullInventory(inventory);
  }
  const expectedStorage = progress.storage_deleted ? [] : [TARGET_STORAGE_PATH];
  assertExactIds(inventory.storagePaths, expectedStorage, "unexpected_remaining_storage_objects");
  return inventory;
}

async function reconcileUncertainCompletion(adapter, progress, persistProgress, now) {
  const inventory = normalizeInventory(await adapter.inventory());
  const relationalRowsAreAbsent = inventory.applications.length === 0
    && inventory.history.length === 0
    && inventory.receipts.length === 0
    && inventory.outbox.length === 0;

  if (!progress.database_deleted && relationalRowsAreAbsent) {
    progress.database_deleted = true;
    progress.events.push({ step: "database", recovered_after_uncertain_result: true, completed_at: now() });
    await persistProgress(progress);
  }
  if (progress.database_deleted && !progress.storage_deleted && inventory.storagePaths.length === 0) {
    progress.storage_deleted = true;
    progress.events.push({ step: "storage", recovered_after_uncertain_result: true, completed_at: now() });
    await persistProgress(progress);
  }
  if (progress.database_deleted && progress.storage_deleted) {
    const actualUsers = sortedUnique(inventory.authUserIds);
    const actualProfiles = sortedUnique(inventory.profileUserIds);
    const targetSet = new Set(TARGET_USER_IDS);
    if (actualUsers.every((id) => targetSet.has(id)) && JSON.stringify(actualUsers) === JSON.stringify(actualProfiles)) {
      const recoveredIds = TARGET_USER_IDS.filter((id) => !actualUsers.includes(id) && !progress.auth_user_ids_deleted.includes(id));
      if (recoveredIds.length) {
        progress.auth_user_ids_deleted = sortedUnique([...progress.auth_user_ids_deleted, ...recoveredIds]);
        for (const userId of recoveredIds) progress.events.push({ step: "auth", target_id: userId, recovered_after_uncertain_result: true, completed_at: now() });
        await persistProgress(progress);
      }
    }
  }
}

export async function runCleanup({ adapter, progress, persistProgress, now = () => new Date().toISOString() }) {
  await reconcileUncertainCompletion(adapter, progress, persistProgress, now);
  validateRemainingInventory(await adapter.inventory(), progress);
  if (progress.completed) return progress;

  if (!progress.database_deleted) {
    const deletedIds = sortedUnique(await adapter.deleteApplications(TARGET_APPLICATION_IDS));
    assertExactIds(deletedIds, TARGET_APPLICATION_IDS, "database_delete_count_mismatch");
    progress.database_deleted = true;
    progress.events.push({ step: "database", completed_at: now() });
    await persistProgress(progress);
    validateRemainingInventory(await adapter.inventory(), progress);
  }

  if (!progress.storage_deleted) {
    await adapter.deleteStorageObject(TARGET_STORAGE_PATH);
    progress.storage_deleted = true;
    progress.events.push({ step: "storage", completed_at: now() });
    await persistProgress(progress);
    validateRemainingInventory(await adapter.inventory(), progress);
  }

  for (const userId of TARGET_USER_IDS) {
    if (progress.auth_user_ids_deleted.includes(userId)) continue;
    await adapter.deleteAuthUser(userId);
    progress.auth_user_ids_deleted = sortedUnique([...progress.auth_user_ids_deleted, userId]);
    progress.events.push({ step: "auth", target_id: userId, completed_at: now() });
    await persistProgress(progress);
    validateRemainingInventory(await adapter.inventory(), progress);
  }

  progress.completed = true;
  progress.events.push({ step: "complete", completed_at: now() });
  await persistProgress(progress);
  validateRemainingInventory(await adapter.inventory(), progress);
  return progress;
}
