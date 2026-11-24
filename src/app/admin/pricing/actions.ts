"use server";

import { revalidatePath } from "next/cache";
import { getAdminCopy } from "@/content/admin";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { unifiedPriceFormSchema } from "@/lib/pricing-management";
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

export async function updateUnifiedPriceAction(
  _state: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const copy = getAdminCopy(await getLocale()).pricing;
  const parsed = unifiedPriceFormSchema.safeParse({
    priceEurPerKg: formData.get("priceEurPerKg"),
  });
  if (!parsed.success) return { status: "error", message: copy.validationError };

  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_unified_price", {
    p_price_eur_per_kg: parsed.data.priceEurPerKg,
  });
  if (error) return { status: "error", message: mapPricingError(error.message, copy) };

  revalidatePath("/", "layout");
  return { status: "success", message: copy.saved };
}
