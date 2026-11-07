import type { ApplicationStatus } from "@/content/account";

export type AdminPerson = {
  id: string;
  displayName: string | null;
  email: string;
  phone?: string | null;
};

export type AdminApplicationListItem = {
  id: string;
  referenceCode: string;
  materialName: string;
  declaredWeightKg: number;
  estimatedAmountEur: number;
  status: ApplicationStatus;
  client: AdminPerson;
  manager: AdminPerson | null;
  createdAt: string;
  updatedAt: string;
  paymentStartedAt: string | null;
  paymentDueAt: string | null;
  overdue: boolean;
};

export type AdminHistoryEntry = {
  id: number;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  authorName: string;
  authorRole: "client" | "admin";
  createdAt: string;
};

export type AdminApplicationDetail = AdminApplicationListItem & {
  rateSnapshotEur: number;
  history: AdminHistoryEntry[];
  receiptSignedUrl: string | null;
  serverNow: string;
  ownedByCurrentAdmin: boolean;
  city: string | null;
  deliveryMethod: "send" | "pickup" | "warehouse" | null;
  contactPhone: string | null;
  repeatCustomer: boolean;
  paymentRecipientName: string | null;
  paymentIban: string | null;
  preferredVisitDates: string[];
};
