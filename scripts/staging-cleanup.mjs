import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  CLEANUP_CONFIRMATION,
  STAGING_PROJECT_URL,
  assertExecuteGate,
  assertProjectRef,
  createPreviewManifest,
  initialProgress,
  runCleanup,
  validateSchemaDump,
} from "./staging-cleanup-lib.mjs";

function parseArguments(argv) {
  const [mode, ...rest] = argv;
  const values = { mode };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) throw new Error("cleanup_argument_invalid");
    const key = token.slice(2).replaceAll("-", "_");
    if (key === "execute_approved") values[key] = true;
    else {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`cleanup_argument_value_missing:${key}`);
      values[key] = value;
      index += 1;
    }
  }
  return values;
}

function required(value, code) {
  if (!value) throw new Error(code);
  return value;
}

function assertLocalLink(projectRoot, projectRef) {
  const linkedRef = readFileSync(path.join(projectRoot, "supabase", ".temp", "project-ref"), "utf8").trim();
  if (linkedRef !== projectRef) throw new Error("cleanup_linked_project_ref_mismatch");
}

async function dumpAndValidateSchema(projectRoot) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "metalduro-cleanup-schema-"));
  const dumpPath = path.join(temporaryRoot, "schema.sql");
  try {
    const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
    const commandArguments = process.platform === "win32"
      ? ["/d", "/s", "/c", `npx supabase db dump --linked --schema public,storage --file ${dumpPath}`]
      : ["supabase", "db", "dump", "--linked", "--schema", "public,storage", "--file", dumpPath];
    const result = spawnSync(command, commandArguments, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) throw new Error("cleanup_remote_schema_dump_failed");
    return validateSchemaDump(await readFile(dumpPath, "utf8"));
  } finally {
    const resolvedTemp = path.resolve(tmpdir());
    const resolvedTarget = path.resolve(temporaryRoot);
    if (!resolvedTarget.startsWith(`${resolvedTemp}${path.sep}`)) throw new Error("cleanup_temp_path_invalid");
    await rm(resolvedTarget, { recursive: true, force: true });
  }
}

async function listAllStoragePaths(client, bucket, prefix = "", output = []) {
  let offset = 0;
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("cleanup_storage_inventory_failed");
    for (const item of data || []) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) output.push(itemPath);
      else await listAllStoragePaths(client, bucket, itemPath, output);
    }
    if (!data || data.length < 100) break;
    offset += data.length;
    if (offset > 10_000) throw new Error("cleanup_storage_inventory_limit_exceeded");
  }
  return output;
}

function createAdapter(client) {
  async function select(table, columns) {
    const { data, error } = await client.from(table).select(columns);
    if (error) throw new Error(`cleanup_inventory_failed:${table}`);
    return data || [];
  }
  return {
    async inventory() {
      const authUserIds = [];
      for (let page = 1; ; page += 1) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error("cleanup_auth_inventory_failed");
        authUserIds.push(...data.users.map((user) => user.id));
        if (data.users.length < 1000) break;
        if (page >= 10) throw new Error("cleanup_auth_inventory_limit_exceeded");
      }
      const [profiles, applications, history, receipts, outbox, storagePaths] = await Promise.all([
        select("profiles", "user_id"),
        select("applications", "id,client_id,manager_id,status"),
        select("application_status_history", "id,application_id,changed_by"),
        select("application_receipts", "id,application_id,uploaded_by,storage_path"),
        select("notification_outbox", "id,application_id,recipient_user_id,status,event_key"),
        listAllStoragePaths(client, "receipts"),
      ]);
      return { authUserIds, profileUserIds: profiles.map((row) => row.user_id), applications, history, receipts, outbox, storagePaths };
    },
    async deleteApplications(ids) {
      const { data, error } = await client.from("applications").delete().in("id", ids).select("id");
      if (error) throw new Error("cleanup_application_delete_failed");
      return (data || []).map((row) => row.id);
    },
    async deleteStorageObject(storagePath) {
      const { data, error } = await client.storage.from("receipts").remove([storagePath]);
      if (error || data?.length !== 1 || data[0].name !== storagePath) throw new Error("cleanup_storage_delete_failed");
    },
    async deleteAuthUser(userId) {
      const { error } = await client.auth.admin.deleteUser(userId, false);
      if (error) throw new Error("cleanup_auth_delete_failed");
    },
  };
}

async function atomicJsonWrite(filePath, value, refuseOverwrite = false) {
  const absolute = path.resolve(filePath);
  if (refuseOverwrite) {
    try {
      await stat(absolute);
      throw new Error("cleanup_output_already_exists");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const temporary = `${absolute}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, absolute);
}

async function readConfirmation() {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error("cleanup_execute_tty_required");
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return (await readline.question(`Type exactly: ${CLEANUP_CONFIRMATION}\n> `)).trim();
  } finally {
    readline.close();
  }
}

const args = parseArguments(process.argv.slice(2));
if (!["preview", "execute"].includes(args.mode)) throw new Error("cleanup_mode_must_be_preview_or_execute");
const projectRef = required(args.project_ref, "cleanup_project_ref_required");
assertProjectRef(projectRef);
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
assertLocalLink(projectRoot, projectRef);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || STAGING_PROJECT_URL;
if (url !== STAGING_PROJECT_URL) throw new Error("cleanup_supabase_url_mismatch");
const secretKey = required(process.env.SUPABASE_SECRET_KEY?.trim(), "cleanup_supabase_secret_key_required");
const client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const adapter = createAdapter(client);

if (args.mode === "preview") {
  const output = required(args.output, "cleanup_preview_output_required");
  const schema = await dumpAndValidateSchema(projectRoot);
  const manifest = createPreviewManifest({ projectRef, inventory: await adapter.inventory(), schema });
  await atomicJsonWrite(output, manifest, true);
  const fileHash = createHash("sha256").update(await readFile(path.resolve(output))).digest("hex").toUpperCase();
  process.stdout.write(`${JSON.stringify({ mode: "preview", project_ref: projectRef, output: path.resolve(output), manifest_sha256: fileHash, snapshot_sha256: manifest.snapshot_sha256, counts: manifest.counts }, null, 2)}\n`);
} else {
  const manifestPath = path.resolve(required(args.manifest, "cleanup_manifest_required"));
  const expectedManifestHash = required(args.manifest_sha256, "cleanup_manifest_sha256_required").toUpperCase();
  const statePath = path.resolve(required(args.state, "cleanup_state_path_required"));
  const manifestBytes = await readFile(manifestPath);
  const actualManifestHash = createHash("sha256").update(manifestBytes).digest("hex").toUpperCase();
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  await dumpAndValidateSchema(projectRoot);
  const confirmation = await readConfirmation();
  assertExecuteGate({ projectRef, manifest, manifestSha256: expectedManifestHash, actualManifestSha256: actualManifestHash, executeApproved: args.execute_approved === true, confirmation });
  let progress;
  try {
    progress = JSON.parse(await readFile(statePath, "utf8"));
    if (progress.project_ref !== projectRef || progress.manifest_sha256 !== actualManifestHash) throw new Error("cleanup_state_mismatch");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const currentPreview = createPreviewManifest({ projectRef, inventory: await adapter.inventory(), schema: manifest.snapshot.schema, generatedAt: manifest.generated_at });
    if (currentPreview.snapshot_sha256 !== manifest.snapshot_sha256) throw new Error("cleanup_preview_snapshot_changed");
    progress = initialProgress(actualManifestHash);
    await atomicJsonWrite(statePath, progress, true);
  }
  await runCleanup({ adapter, progress, persistProgress: (next) => atomicJsonWrite(statePath, next) });
  process.stdout.write(`${JSON.stringify({ mode: "execute", project_ref: projectRef, completed: true, state: statePath }, null, 2)}\n`);
}
