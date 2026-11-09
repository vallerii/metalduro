import type { MaterialId } from "@/content/site";

export type PublicPrice = {
  priceEurPerKg: number;
  priceDate: string;
  updatedAt: string | null;
};

export type MaterialPricing = {
  id: MaterialId;
  name: string;
  rateEur: number;
  active: boolean;
  updatedAt: string;
};

export type PricingSnapshot = {
  publicPrice: PublicPrice | null;
  materials: MaterialPricing[];
  materialRates: Partial<Record<MaterialId, number>>;
};

export function formatPricePerKg(value: number, locale: "es" | "ru") {
  return `${value.toLocaleString(locale === "ru" ? "ru-RU" : "es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} €/kg`;
}

export function formatPublicPriceDate(value: string, locale: "es" | "ru") {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
