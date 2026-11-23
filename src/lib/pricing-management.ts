import { z } from "zod";

const rateText = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,2})?$/)
  .transform((value) => Number(value.replace(",", ".")))
  .refine((value) => Number.isFinite(value) && value >= 0.01 && value <= 10000);

const validDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime())
      && parsed.toISOString().slice(0, 10) === value
      && value >= "2000-01-01"
      && value <= "2100-12-31";
  });

export const materialRateFormSchema = z.object({
  materialId: z.enum(["inserts", "solid", "scrap", "mixed"]),
  rateEur: rateText,
});

export const publicPricingFormSchema = z.object({
  priceEurPerKg: rateText,
  priceDate: validDate,
});

export function formatRateInput(value: number) {
  return value.toFixed(2);
}
