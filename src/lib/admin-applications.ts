import "server-only";

import type { ApplicationStatus } from "@/content/account";
import type { AdminSort, AdminView } from "@/content/admin";
import type {
  AdminApplicationDetail,
  AdminApplicationListItem,
  AdminHistoryEntry,
  AdminPerson,
} from "@/lib/admin-application-types";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const pageSize = 20;

type PersonRelation = {
  user_id: string;
  display_name: string | null;
  email: string;
  phone?: string | null;
} | {
  user_id: string;
  display_name: string | null;
  email: string;
  phone?: string | null;
}[] | null;

type MaterialRelation = { name: string } | { name: string }[] | null;

type AdminApplicationRow = {
  id: string;
  reference_code: string;
  declared_weight_kg: number | string;
  rate_snapshot_eur?: number | string;
  estimated_amount_eur: number | string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  payment_started_at: string | null;
  payment_due_at: string | null;
  material: MaterialRelation;
  client: PersonRelation;
  manager: PersonRelation;
  city?: string | null;
  delivery_method?: "send" | "pickup" | "warehouse" | null;
  contact_phone?: string | null;
  repeat_customer?: boolean;
  payment_recipient_name?: string | null;
  payment_iban?: string | null;
  preferred_visit_dates?: string[];
};

export type AdminDashboardFilters = {
  view: AdminView;
  status: ApplicationStatus | null;
  sort: AdminSort;
  query: string;
  page: number;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toPerson(value: PersonRelation): AdminPerson | null {
  const person = relationOne(value);
  if (!person) return null;
  return {
    id: person.user_id,
    displayName: person.display_name,
    email: person.email,
    phone: person.phone ?? null,
  };
}

function isOverdue(row: AdminApplicationRow, serverNow: string) {
  return row.status === "payment"
    && Boolean(row.payment_due_at)
    && Date.parse(row.payment_due_at as string) < Date.parse(serverNow);
}

function toListItem(row: AdminApplicationRow, serverNow: string): AdminApplicationListItem {
  const client = toPerson(row.client);
  if (!client) throw new Error("Admin application is missing its client relation.");
  return {
    id: row.id,
    referenceCode: row.reference_code,
    materialName: relationOne(row.material)?.name ?? "—",
    declaredWeightKg: Number(row.declared_weight_kg),
    estimatedAmountEur: Number(row.estimated_amount_eur),
    status: row.status,
    client,
    manager: toPerson(row.manager),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paymentStartedAt: row.payment_started_at,
    paymentDueAt: row.payment_due_at,
    overdue: isOverdue(row, serverNow),
  };
}

function applyView<T extends {
  eq(column: string, value: string): T;
  is(column: string, value: null): T;
  not(column: string, operator: string, value: null): T;
  neq(column: string, value: string): T;
}>(query: T, view: AdminView, adminId: string) {
  if (view === "new") return query.eq("status", "new").is("manager_id", null);
  if (view === "mine") return query.eq("manager_id", adminId);
  return query.not("manager_id", "is", null).neq("manager_id", adminId);
}

export async function getAdminDashboard(filters: AdminDashboardFilters) {
  const auth = await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const newCountQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "new")
    .is("manager_id", null);
  const mineCountQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", auth.userId);
  const otherCountQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .not("manager_id", "is", null)
    .neq("manager_id", auth.userId);

  let applicationsQuery = supabase
    .from("applications")
    .select(
      "id,reference_code,declared_weight_kg,estimated_amount_eur,status,created_at,updated_at,payment_started_at,payment_due_at,material:materials!applications_material_id_fkey(name),client:profiles!applications_client_id_fkey(user_id,display_name,email),manager:profiles!applications_manager_id_fkey(user_id,display_name,email)",
      { count: "exact" },
    );
  applicationsQuery = applyView(applicationsQuery, filters.view, auth.userId);
  if (filters.view !== "new" && filters.status) {
    applicationsQuery = applicationsQuery.eq("status", filters.status);
  }

  const normalizedQuery = filters.query.replace(/^#/, "").trim().toUpperCase();
  if (/^[0-9A-F]{8}$/.test(normalizedQuery)) {
    applicationsQuery = applicationsQuery.eq("reference_code", normalizedQuery);
  } else if (/^[0-9a-fA-F-]{36}$/.test(filters.query.trim())) {
    applicationsQuery = applicationsQuery.eq("id", filters.query.trim());
  } else if (filters.query) {
    applicationsQuery = applicationsQuery.eq("reference_code", "INVALID");
  }

  const sortColumn = filters.sort === "updated_desc" ? "updated_at" : "created_at";
  const ascending = filters.sort === "created_asc";
  const rangeStart = (filters.page - 1) * pageSize;
  applicationsQuery = applicationsQuery
    .order(sortColumn, { ascending })
    .order("id", { ascending })
    .range(rangeStart, rangeStart + pageSize - 1);

  const [newCount, mineCount, otherCount, applicationsResult, serverTimeResult] = await Promise.all([
    newCountQuery,
    mineCountQuery,
    otherCountQuery,
    applicationsQuery,
    supabase.rpc("get_server_time"),
  ]);

  for (const result of [newCount, mineCount, otherCount, applicationsResult, serverTimeResult]) {
    if (result.error) throw new Error(`Unable to load admin dashboard: ${result.error.code}`);
  }
  if (!serverTimeResult.data) throw new Error("Unable to load PostgreSQL time.");

  const total = applicationsResult.count ?? 0;
  return {
    profile: auth.profile,
    counts: {
      new: newCount.count ?? 0,
      mine: mineCount.count ?? 0,
      other: otherCount.count ?? 0,
    },
    applications: ((applicationsResult.data ?? []) as unknown as AdminApplicationRow[])
      .map((row) => toListItem(row, serverTimeResult.data as string)),
    total,
    page: filters.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    serverNow: serverTimeResult.data as string,
  };
}

export async function getAdminApplicationDetail(applicationId: string): Promise<AdminApplicationDetail | null> {
  const auth = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const applicationResult = await supabase
    .from("applications")
    .select(
      "id,reference_code,declared_weight_kg,rate_snapshot_eur,estimated_amount_eur,status,created_at,updated_at,payment_started_at,payment_due_at,city,delivery_method,contact_phone,repeat_customer,payment_recipient_name,payment_iban,preferred_visit_dates,material:materials!applications_material_id_fkey(name),client:profiles!applications_client_id_fkey(user_id,display_name,email,phone),manager:profiles!applications_manager_id_fkey(user_id,display_name,email)",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationResult.error) {
    throw new Error(`Unable to load admin application: ${applicationResult.error.code}`);
  }
  if (!applicationResult.data) return null;

  const [historyResult, receiptResult, serverTimeResult] = await Promise.all([
    supabase
      .from("application_status_history")
      .select("id,from_status,to_status,author_name_snapshot,author_role_snapshot,created_at")
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

  if (historyResult.error || receiptResult.error || serverTimeResult.error || !serverTimeResult.data) {
    throw new Error("Unable to load protected admin application details.");
  }

  let receiptSignedUrl: string | null = null;
  if (receiptResult.data?.storage_path) {
    const signedResult = await supabase.storage
      .from("receipts")
      .createSignedUrl(receiptResult.data.storage_path, 300);
    if (!signedResult.error) receiptSignedUrl = signedResult.data.signedUrl;
  }

  const row = applicationResult.data as unknown as AdminApplicationRow;
  const listItem = toListItem(row, serverTimeResult.data as string);
  const history: AdminHistoryEntry[] = (historyResult.data ?? []).map((entry) => ({
    id: Number(entry.id),
    fromStatus: entry.from_status as ApplicationStatus | null,
    toStatus: entry.to_status as ApplicationStatus,
    authorName: entry.author_name_snapshot,
    authorRole: entry.author_role_snapshot as "client" | "admin",
    createdAt: entry.created_at,
  }));

  return {
    ...listItem,
    rateSnapshotEur: Number(row.rate_snapshot_eur),
    history,
    receiptSignedUrl,
    serverNow: serverTimeResult.data as string,
    ownedByCurrentAdmin: listItem.manager?.id === auth.userId,
    city: row.city ?? null,
    deliveryMethod: row.delivery_method ?? null,
    contactPhone: row.contact_phone ?? null,
    repeatCustomer: row.repeat_customer ?? false,
    paymentRecipientName: row.payment_recipient_name ?? null,
    paymentIban: row.payment_iban ?? null,
    preferredVisitDates: row.preferred_visit_dates ?? [],
  };
}
