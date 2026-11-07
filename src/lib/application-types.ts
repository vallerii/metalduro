import type { ApplicationStatus } from "@/content/account";

export type Material = {
  id: string;
  name: string;
  rateEur: number;
};

export type ClientApplicationListItem = {
  id: string;
  materialId: string;
  materialName: string;
  declaredWeightKg: number;
  rateSnapshotEur: number;
  estimatedAmountEur: number;
  status: ApplicationStatus;
  paymentDueAt: string | null;
  createdAt: string;
};

export type ApplicationHistoryEntry = {
  id: number;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  authorName: string;
  createdAt: string;
};

export type ClientApplicationDetail = ClientApplicationListItem & {
  managerName: string | null;
  paymentStartedAt: string | null;
  history: ApplicationHistoryEntry[];
  receiptStoragePath: string | null;
  receiptSignedUrl: string | null;
  recoveryStoragePath: string | null;
  serverNow: string;
  city: string | null;
  deliveryMethod: "send" | "pickup" | "warehouse" | null;
  contactPhone: string | null;
  repeatCustomer: boolean;
  paymentRecipientName: string | null;
  paymentIban: string | null;
  preferredVisitDates: string[];
};
