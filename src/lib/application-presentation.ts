import type { Locale } from "@/i18n/config";

function intlLocale(locale: Locale) {
  return locale === "ru" ? "ru-RU" : "es-ES";
}

export function formatEuro(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatWeight(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 3,
  }).format(value)} kg`;
}

export function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function applicationNumber(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
