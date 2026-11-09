import "server-only";

import { connection } from "next/server";
import { cache } from "react";
import type { MaterialId } from "@/content/site";
import type { MaterialPricing, PricingSnapshot, PublicPrice } from "@/lib/pricing-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MaterialRow = {
  id: string;
  name: string;
  rate_eur: number | string;
  active: boolean;
  updated_at: string;
};

type PublicPriceRow = {
  price_eur_per_kg: number | string;
  price_date: string;
  updated_at: string | null;
};

const materialIds = new Set<MaterialId>(["inserts", "solid", "scrap", "mixed"]);

function toMaterial(row: MaterialRow): MaterialPricing | null {
  if (!materialIds.has(row.id as MaterialId)) return null;
  const rateEur = Number(row.rate_eur);
  if (!Number.isFinite(rateEur) || rateEur <= 0) return null;
  return {
    id: row.id as MaterialId,
    name: row.name,
    rateEur,
    active: row.active,
    updatedAt: row.updated_at,
  };
}

function toPublicPrice(row: PublicPriceRow | null): PublicPrice | null {
  if (!row) return null;
  const priceEurPerKg = Number(row.price_eur_per_kg);
  if (!Number.isFinite(priceEurPerKg) || priceEurPerKg <= 0) return null;
  return {
    priceEurPerKg,
    priceDate: row.price_date,
    updatedAt: row.updated_at,
  };
}

export const getPublicPricingSnapshot = cache(async (): Promise<PricingSnapshot> => {
  if (!isSupabaseConfigured()) {
    return { publicPrice: null, materials: [], materialRates: {} };
  }

  // Pricing is mutable operational data. Wait for a real request before the
  // Supabase client (and its session-aware clock) is created, but only dedupe
  // this read within the current React render via cache().
  await connection();
  const supabase = await createServerSupabaseClient();
  const [materialsResult, publicPriceResult] = await Promise.all([
    supabase
      .from("materials")
      .select("id,name,rate_eur,active,updated_at")
      .eq("active", true)
      .order("id"),
    supabase
      .from("site_public_pricing")
      .select("price_eur_per_kg,price_date,updated_at")
      .eq("id", "default")
      .maybeSingle<PublicPriceRow>(),
  ]);

  const materials = materialsResult.error
    ? []
    : ((materialsResult.data ?? []) as MaterialRow[])
        .map(toMaterial)
        .filter((item): item is MaterialPricing => item !== null);
  const materialRates = Object.fromEntries(
    materials.map((material) => [material.id, material.rateEur]),
  ) as Partial<Record<MaterialId, number>>;

  return {
    publicPrice: publicPriceResult.error ? null : toPublicPrice(publicPriceResult.data),
    materials,
    materialRates,
  };
});
