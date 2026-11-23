import "server-only";

import type { MaterialId } from "@/content/site";
import type { MaterialPricing, PublicPrice } from "@/lib/pricing-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PricingHistoryItem = {
  id: number;
  targetKind: "material_rate" | "public_price";
  materialId: MaterialId | null;
  changedBy: string;
  changedByLabel: string;
  oldRateEur: number;
  newRateEur: number;
  oldPriceDate: string | null;
  newPriceDate: string | null;
  createdAt: string;
};

type HistoryRow = {
  id: number;
  target_kind: "material_rate" | "public_price";
  material_id: MaterialId | null;
  changed_by: string;
  old_rate_eur: number | string;
  new_rate_eur: number | string;
  old_price_date: string | null;
  new_price_date: string | null;
  created_at: string;
};

export async function getAdminPricingData() {
  const supabase = await createServerSupabaseClient();
  const [materialsResult, publicPriceResult, historyResult] = await Promise.all([
    supabase.from("materials").select("id,name,rate_eur,active,updated_at").order("id"),
    supabase
      .from("site_public_pricing")
      .select("price_eur_per_kg,price_date,updated_at")
      .eq("id", "default")
      .single(),
    supabase
      .from("pricing_change_history")
      .select("id,target_kind,material_id,changed_by,old_rate_eur,new_rate_eur,old_price_date,new_price_date,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(30),
  ]);

  if (materialsResult.error || publicPriceResult.error || historyResult.error) {
    throw new Error("pricing_data_unavailable");
  }

  const materials = (materialsResult.data ?? []).map((row) => ({
    id: row.id as MaterialId,
    name: row.name,
    rateEur: Number(row.rate_eur),
    active: row.active,
    updatedAt: row.updated_at,
  })) satisfies MaterialPricing[];
  const publicPrice: PublicPrice = {
    priceEurPerKg: Number(publicPriceResult.data.price_eur_per_kg),
    priceDate: publicPriceResult.data.price_date,
    updatedAt: publicPriceResult.data.updated_at,
  };
  const historyRows = (historyResult.data ?? []) as HistoryRow[];
  const actorIds = [...new Set(historyRows.map((row) => row.changed_by))];
  const actorLabels = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id,display_name,email")
      .in("user_id", actorIds);
    for (const profile of profiles ?? []) {
      actorLabels.set(profile.user_id, profile.display_name || profile.email);
    }
  }

  const history = historyRows.map((row): PricingHistoryItem => ({
    id: row.id,
    targetKind: row.target_kind,
    materialId: row.material_id,
    changedBy: row.changed_by,
    changedByLabel: actorLabels.get(row.changed_by) ?? row.changed_by,
    oldRateEur: Number(row.old_rate_eur),
    newRateEur: Number(row.new_rate_eur),
    oldPriceDate: row.old_price_date,
    newPriceDate: row.new_price_date,
    createdAt: row.created_at,
  }));

  return { materials, publicPrice, history };
}
