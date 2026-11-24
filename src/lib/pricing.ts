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

function publicPriceFromMaterials(materials: MaterialPricing[]): PublicPrice | null {
  if (materials.length === 0) return null;
  const maxRate = Math.max(...materials.map((material) => material.rateEur));
  const latest = materials
    .map((material) => material.updatedAt)
    .sort()
    .at(-1) ?? null;
  return {
    priceEurPerKg: maxRate,
    priceDate: latest ? latest.slice(0, 10) : new Date().toISOString().slice(0, 10),
    updatedAt: latest,
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
  const materialsResult = await
    supabase
      .from("materials")
      .select("id,name,rate_eur,active,updated_at")
      .eq("active", true)
      .order("id");

  const materials = materialsResult.error
    ? []
    : ((materialsResult.data ?? []) as MaterialRow[])
        .map(toMaterial)
        .filter((item): item is MaterialPricing => item !== null);
  const materialRates = Object.fromEntries(
    materials.map((material) => [material.id, material.rateEur]),
  ) as Partial<Record<MaterialId, number>>;

  return {
    // The headline price is derived from the admin-managed material rates so the
    // header, hero and calculator always show the same source of truth.
    publicPrice: publicPriceFromMaterials(materials),
    materials,
    materialRates,
  };
});
