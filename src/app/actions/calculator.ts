"use server";

import { revalidatePath } from "next/cache";
import { getT } from "@/i18n/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  processCalculatorApplication,
  type CalculatorApplicationInput,
  type CalculatorApplicationResult,
} from "@/lib/calculator-application";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createCalculatorApplicationAction(
  input: CalculatorApplicationInput,
): Promise<CalculatorApplicationResult> {
  const { t } = await getT();
  let clientPromise: ReturnType<typeof createServerSupabaseClient> | null = null;
  const getClient = () => {
    clientPromise ??= createServerSupabaseClient();
    return clientPromise;
  };

  const result = await processCalculatorApplication(input, t.calc, {
    configured: isSupabaseConfigured(),
    getAuthenticatedUser,
    getActiveMaterialRate: async (materialId) => {
      const supabase = await getClient();
      const material = await supabase
        .from("materials")
        .select("rate_eur")
        .eq("id", materialId)
        .eq("active", true)
        .maybeSingle();
      return {
        rateEur: material.data ? Number(material.data.rate_eur) : null,
        error: Boolean(material.error),
      };
    },
    createApplication: async (args) => {
      const supabase = await getClient();
      const { data, error } = await supabase.rpc("create_application", args);
      const application = data as { id?: string } | null;
      return {
        applicationId: application?.id ?? null,
        errorMessage: error?.message ?? null,
      };
    },
  });

  if (result.status === "success") {
    revalidatePath("/account");
    revalidatePath("/admin");
  }
  return result;
}
