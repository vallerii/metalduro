"use server";

import { revalidatePath } from "next/cache";
import { getAdminCopy } from "@/content/admin";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { materialRateFormSchema, publicPricingFormSchema } from "@/lib/pricing-management";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PricingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function mapPricingError(message: string, copy: ReturnType<typeof getAdminCopy>["pricing"]) {
  return ["admin_required", "authentication_required"].includes(message)
    ? copy.forbidden
    : ["invalid_material_rate", "invalid_public_price", "invalid_public_price_date", "invalid_material_id"].includes(message)
      ? copy.validationError
      : copy.saveError;
}

export async function updateMaterialRateAction(
  _state: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const copy = getAdminCopy(await getLocale()).pricing;
  const parsed = materialRateFormSchema.safeParse({
    materialId: formData.get("materialId"),
    rateEur: formData.get("rateEur"),
  });
  if (!parsed.success) return { status: "error", message: copy.validationError };

  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_material_rate", {
    p_material_id: parsed.data.materialId,
    p_new_rate_eur: parsed.data.rateEur,
  });
  if (error) return { status: "error", message: mapPricingError(error.message, copy) };

  revalidatePath("/");
  revalidatePath("/account/applications/new");
  revalidatePath("/admin/pricing");
  return { status: "success", message: copy.saved };
}

export async function updatePublicPricingAction(
  _state: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const copy = getAdminCopy(await getLocale()).pricing;
  const parsed = publicPricingFormSchema.safeParse({
    priceEurPerKg: formData.get("priceEurPerKg"),
    priceDate: formData.get("priceDate"),
  });
  if (!parsed.success) return { status: "error", message: copy.validationError };

  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_public_pricing", {
    p_price_eur_per_kg: parsed.data.priceEurPerKg,
    p_price_date: parsed.data.priceDate,
  });
  if (error) return { status: "error", message: mapPricingError(error.message, copy) };

  revalidatePath("/");
  revalidatePath("/admin/pricing");
  return { status: "success", message: copy.saved };
}
