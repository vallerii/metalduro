import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type {
  ApplicationHistoryEntry,
  ClientApplicationDetail,
  ClientApplicationListItem,
  Material,
} from "@/lib/application-types";
import type { ApplicationStatus } from "@/content/account";

type MaterialRelation = { name: string } | { name: string }[] | null;
type ManagerRelation = { display_name: string | null } | { display_name: string | null }[] | null;

type ApplicationRow = {
  id: string;
  material_id: string;
  declared_weight_kg: number | string;
  rate_snapshot_eur: number | string;
  estimated_amount_eur: number | string;
  status: ApplicationStatus;
  payment_started_at: string | null;
  payment_due_at: string | null;
  created_at: string;
  city?: string | null;
  delivery_method?: "send" | "pickup" | "warehouse" | null;
  contact_phone?: string | null;
  repeat_customer?: boolean;
  payment_recipient_name?: string | null;
  payment_iban?: string | null;
  preferred_visit_dates?: string[];
  material: MaterialRelation;
  manager?: ManagerRelation;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toListItem(row: ApplicationRow): ClientApplicationListItem {
  return {
    id: row.id,
    materialId: row.material_id,
    materialName: relationOne(row.material)?.name ?? row.material_id,
    declaredWeightKg: Number(row.declared_weight_kg),
    rateSnapshotEur: Number(row.rate_snapshot_eur),
    estimatedAmountEur: Number(row.estimated_amount_eur),
    status: row.status,
    paymentDueAt: row.payment_due_at,
    createdAt: row.created_at,
  };
}

export async function getClientApplications() {
  const auth = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id,material_id,declared_weight_kg,rate_snapshot_eur,estimated_amount_eur,status,payment_started_at,payment_due_at,created_at,material:materials!applications_material_id_fkey(name)",
    )
    .eq("client_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load client applications: ${error.code}`);
  }

  return {
    profile: auth.profile,
    applications: ((data ?? []) as unknown as ApplicationRow[]).map(toListItem),
  };
}

export async function getAvailableMaterials() {
  const auth = await requireUser("/account/applications/new");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id,name,rate_eur")
    .eq("active", true)
    .order("name");

  if (error) {
    throw new Error(`Unable to load materials: ${error.code}`);
  }

  return {
    profile: auth.profile,
    materials: (data ?? []).map(
      (row): Material => ({
        id: row.id,
        name: row.name,
        rateEur: Number(row.rate_eur),
      }),
    ),
  };
}

export async function getClientApplicationDetail(
  applicationId: string,
): Promise<{ profile: Awaited<ReturnType<typeof requireUser>>["profile"]; application: ClientApplicationDetail } | null> {
  const auth = await requireUser(`/account/applications/${applicationId}`);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id,material_id,declared_weight_kg,rate_snapshot_eur,estimated_amount_eur,status,payment_started_at,payment_due_at,created_at,city,delivery_method,contact_phone,repeat_customer,payment_recipient_name,payment_iban,preferred_visit_dates,material:materials!applications_material_id_fkey(name),manager:profiles!applications_manager_id_fkey(display_name)",
    )
    .eq("id", applicationId)
    .eq("client_id", auth.userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load application: ${error.code}`);
  }
  if (!data) return null;

  const row = data as unknown as ApplicationRow;
  const [historyResult, receiptResult, serverTimeResult] = await Promise.all([
    supabase
      .from("application_status_history")
      .select("id,from_status,to_status,author_name_snapshot,created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("application_receipts")
      .select("storage_path")
      .eq("application_id", applicationId)
      .maybeSingle(),
    supabase.rpc("get_server_time"),
  ]);

  if (historyResult.error) {
    throw new Error(`Unable to load application history: ${historyResult.error.code}`);
  }
  if (receiptResult.error) {
    throw new Error(`Unable to load application receipt: ${receiptResult.error.code}`);
  }
  if (serverTimeResult.error || !serverTimeResult.data) {
    throw new Error(`Unable to read database time: ${serverTimeResult.error?.code ?? "missing_time"}`);
  }

  let recoveryStoragePath: string | null = null;
  const finalizedStoragePath = receiptResult.data?.storage_path ?? null;

  if (!finalizedStoragePath && row.status === "in_progress") {
    const folder = `${auth.userId}/${applicationId}`;
    const { data: objects, error: objectsError } = await supabase.storage
      .from("receipts")
      .list(folder, { limit: 2, search: "receipt" });

    if (objectsError) {
      throw new Error(`Unable to inspect pending receipt: ${objectsError.message}`);
    }
    if (objects?.some((object) => object.name === "receipt")) {
      recoveryStoragePath = `${folder}/receipt`;
    }
  }

  const storagePath = finalizedStoragePath ?? recoveryStoragePath;
  let receiptSignedUrl: string | null = null;
  if (storagePath) {
    const { data: signed, error: signedError } = await supabase.storage
      .from("receipts")
      .createSignedUrl(storagePath, 300);

    if (!signedError) receiptSignedUrl = signed.signedUrl;
  }

  const history: ApplicationHistoryEntry[] = (historyResult.data ?? []).map((entry) => ({
    id: Number(entry.id),
    fromStatus: entry.from_status as ApplicationStatus | null,
    toStatus: entry.to_status as ApplicationStatus,
    authorName: entry.author_name_snapshot,
    createdAt: entry.created_at,
  }));

  return {
    profile: auth.profile,
    application: {
      ...toListItem(row),
      managerName: relationOne(row.manager)?.display_name ?? null,
      paymentStartedAt: row.payment_started_at,
      history,
      receiptStoragePath: finalizedStoragePath,
      receiptSignedUrl,
      recoveryStoragePath,
      serverNow: String(serverTimeResult.data),
      city: row.city ?? null,
      deliveryMethod: row.delivery_method ?? null,
      contactPhone: row.contact_phone ?? null,
      repeatCustomer: row.repeat_customer ?? false,
      paymentRecipientName: row.payment_recipient_name ?? null,
      paymentIban: row.payment_iban ?? null,
      preferredVisitDates: row.preferred_visit_dates ?? [],
    },
  };
}
