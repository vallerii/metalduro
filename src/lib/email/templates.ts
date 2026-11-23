import type {
  NotificationEventType,
  NotificationJob,
  NotificationPayload,
  RenderedEmail,
} from "./types";

const TEMPLATE_EVENT_TYPES: NotificationEventType[] = [
  "application_created",
  "application_claimed",
  "receipt_uploaded",
  "payment_started",
  "application_paid",
  "payment_overdue",
];

type Copy = {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  action: string;
};

const es: Record<NotificationEventType, Copy> = {
  application_created: { subject: "Nueva solicitud recibida", eyebrow: "Nueva solicitud", title: "Hay una nueva solicitud pendiente", intro: "Un cliente ha enviado una nueva solicitud para su revisión.", action: "Abrir panel de empleados" },
  application_claimed: { subject: "Tu solicitud está en proceso", eyebrow: "Solicitud asignada", title: "Ya estamos trabajando en tu solicitud", intro: "Un miembro del equipo de Metalduro ha aceptado tu solicitud.", action: "Ver solicitud" },
  receipt_uploaded: { subject: "El cliente ha subido el comprobante", eyebrow: "Comprobante recibido", title: "Hay un comprobante pendiente de revisión", intro: "El cliente ha adjuntado el comprobante de envío a la solicitud.", action: "Revisar solicitud" },
  payment_started: { subject: "La solicitud ha pasado a la etapa de pago", eyebrow: "Etapa de pago", title: "Hemos iniciado la etapa de pago", intro: "La comprobación ha finalizado y la solicitud está ahora en la etapa de pago.", action: "Ver solicitud" },
  application_paid: { subject: "Envío de dinero registrado", eyebrow: "Pago registrado", title: "Hemos registrado la confirmación del envío de dinero", intro: "El equipo ha marcado la solicitud como pagada. Este mensaje confirma el estado registrado en Metalduro.", action: "Ver solicitud" },
  payment_overdue: { subject: "Plazo de pago superado", eyebrow: "Revisión necesaria", title: "Una solicitud ha superado el plazo de pago", intro: "La solicitud continúa en la etapa de pago después del plazo de dos horas.", action: "Revisar solicitud" },
};

const ru: Record<NotificationEventType, Copy> = {
  application_created: { subject: "Получена новая заявка", eyebrow: "Новая заявка", title: "Новая заявка ожидает обработки", intro: "Клиент отправил новую заявку на рассмотрение.", action: "Открыть кабинет сотрудника" },
  application_claimed: { subject: "Ваша заявка принята в работу", eyebrow: "Заявка назначена", title: "Мы уже работаем над вашей заявкой", intro: "Сотрудник Metalduro принял вашу заявку в работу.", action: "Открыть заявку" },
  receipt_uploaded: { subject: "Клиент загрузил чек", eyebrow: "Чек получен", title: "Чек ожидает проверки", intro: "Клиент прикрепил к заявке чек об отправке.", action: "Проверить заявку" },
  payment_started: { subject: "Заявка перешла на этап оплаты", eyebrow: "Этап оплаты", title: "Мы начали этап оплаты", intro: "Проверка завершена, и заявка перешла на этап оплаты.", action: "Открыть заявку" },
  application_paid: { subject: "Отправка денег подтверждена", eyebrow: "Оплата зарегистрирована", title: "Мы зарегистрировали подтверждение отправки денег", intro: "Сотрудник отметил заявку как оплаченную. Это письмо подтверждает статус, зарегистрированный в Metalduro.", action: "Открыть заявку" },
  payment_overdue: { subject: "Срок оплаты превышен", eyebrow: "Требуется проверка", title: "Заявка превысила срок оплаты", intro: "Заявка всё ещё находится на этапе оплаты после истечения двухчасового срока.", action: "Проверить заявку" },
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function payloadString(payload: NotificationPayload, key: string) {
  const value = payload[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function displayReference(payload: NotificationPayload, applicationId: string) {
  const reference = payloadString(payload, "reference_code");
  return `#${reference || applicationId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function formatDate(value: string | null, locale: "es" | "ru") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" }).format(date);
}

function normalizedSiteOrigin(siteUrl: string) {
  const url = new URL(siteUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid_site_url");
  return url.origin;
}

function detailRows(job: NotificationJob, locale: "es" | "ru") {
  const rows: Array<[string, string]> = [[locale === "ru" ? "Заявка" : "Solicitud", displayReference(job.payload, job.application_id)]];
  const material = payloadString(job.payload, "material_name");
  const weight = payloadString(job.payload, "declared_weight_kg");
  const manager = payloadString(job.payload, "manager_name");
  const createdAt = formatDate(payloadString(job.payload, "created_at"), locale);
  const dueAt = formatDate(payloadString(job.payload, "payment_due_at"), locale);
  if (material) rows.push([locale === "ru" ? "Материал" : "Material", material]);
  if (weight) rows.push([locale === "ru" ? "Вес" : "Peso", `${weight} kg`]);
  if (manager) rows.push([locale === "ru" ? "Менеджер" : "Responsable", manager]);
  if (createdAt) rows.push([locale === "ru" ? "Создана" : "Creada", createdAt]);
  if (dueAt) rows.push([locale === "ru" ? "Срок" : "Plazo", dueAt]);
  return rows;
}

export function renderNotificationEmail(job: NotificationJob, siteUrl: string): RenderedEmail {
  if (!TEMPLATE_EVENT_TYPES.includes(job.event_type)) throw new Error("unsupported_notification_event");
  const locale = job.recipient_locale === "ru" ? "ru" : "es";
  const copy = (locale === "ru" ? ru : es)[job.event_type];
  const baseUrl = normalizedSiteOrigin(siteUrl);
  const isAdminDestination = ["application_created", "receipt_uploaded", "payment_overdue"].includes(job.event_type);
  const destination = isAdminDestination ? `${baseUrl}/admin/applications/${job.application_id}` : `${baseUrl}/account/applications/${job.application_id}`;
  const greetingName = job.recipient_name?.trim();
  const greeting = greetingName ? (locale === "ru" ? `Здравствуйте, ${greetingName}.` : `Hola, ${greetingName}.`) : (locale === "ru" ? "Здравствуйте." : "Hola.");
  const rows = detailRows(job, locale);
  const rowHtml = rows.map(([label, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #363638;color:#9d9d9f;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top">${escapeHtml(label)}</td><td style="padding:12px 0;border-bottom:1px solid #363638;color:#f5f5f5;font-size:15px;text-align:right;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("");
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const footer = locale === "ru" ? "Это транзакционное уведомление по вашей заявке Metalduro." : "Este es un aviso transaccional relacionado con una solicitud de Metalduro.";

  return {
    eventId: job.id,
    to: { email: job.recipient_email, ...(greetingName ? { name: greetingName } : {}) },
    subject: `${copy.subject} · ${displayReference(job.payload, job.application_id)}`,
    html: `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0b0b0c;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0c"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#1b1b1d;border:1px solid #363638;border-radius:18px;overflow:hidden"><tr><td style="padding:28px 32px 20px;border-bottom:3px solid #ff5c39"><div style="font-size:28px;font-weight:800;letter-spacing:-.04em">metalduro<span style="color:#ff5c39">.</span></div></td></tr><tr><td style="padding:32px"><div style="color:#ff5c39;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em">${escapeHtml(copy.eyebrow)}</div><h1 style="margin:12px 0 18px;font-size:30px;line-height:1.12;letter-spacing:-.03em;word-break:break-word">${escapeHtml(copy.title)}</h1><p style="margin:0 0 12px;color:#f5f5f5;font-size:16px;line-height:1.6;word-break:break-word">${escapeHtml(greeting)}</p><p style="margin:0 0 24px;color:#b8b8ba;font-size:16px;line-height:1.6">${escapeHtml(copy.intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px">${rowHtml}</table><a href="${escapeHtml(destination)}" style="display:inline-block;background:#ff5c39;color:#111113;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">${escapeHtml(copy.action)}</a></td></tr><tr><td style="padding:20px 32px;background:#131315;color:#858588;font-size:12px;line-height:1.5">${escapeHtml(footer)}</td></tr></table></td></tr></table></body></html>`,
    text: `${copy.title}\n\n${greeting}\n${copy.intro}\n\n${textRows}\n\n${copy.action}: ${destination}\n\n${footer}`,
  };
}
