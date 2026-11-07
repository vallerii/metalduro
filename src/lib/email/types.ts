export const NOTIFICATION_EVENT_TYPES = [
  "application_created",
  "application_claimed",
  "receipt_uploaded",
  "payment_started",
  "application_paid",
  "payment_overdue",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];
export type NotificationPayload = Record<string, unknown>;

export type NotificationJob = {
  id: string;
  event_type: NotificationEventType;
  event_key: string;
  application_id: string;
  recipient_user_id: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_locale: "es" | "ru";
  payload: NotificationPayload;
  attempts: number;
  max_attempts: number;
  lease_token: string;
};

export type RenderedEmail = {
  eventId: string;
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
};

export type EmailDeliveryResult = { provider: string; messageId: string };

export interface EmailProvider {
  send(message: RenderedEmail): Promise<EmailDeliveryResult>;
}
