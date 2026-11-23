"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminCopy } from "@/content/admin";
import { getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminActionState = {
  status: "idle" | "error";
  message?: string;
};

const applicationIdSchema = z.string().uuid();

export async function claimApplicationAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const copy = getAdminCopy(await getLocale());
  const parsed = applicationIdSchema.safeParse(formData.get("applicationId"));
  if (!parsed.success) return { status: "error", message: copy.actions.generic };

  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("claim_application", {
    p_application_id: parsed.data,
  });

  if (error) {
    return {
      status: "error",
      message: error.message === "application_not_available"
        ? copy.actions.claimConflict
        : error.message === "admin_required"
          ? copy.actions.forbidden
          : copy.actions.generic,
    };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/applications/${parsed.data}`);
  redirect("/admin?view=mine&notice=claimed");
}

export async function advanceApplicationAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const copy = getAdminCopy(await getLocale());
  const parsed = z.object({
    applicationId: applicationIdSchema,
    expectedStatus: z.enum(["sent", "accepted", "verification", "payment"]),
  }).safeParse({
    applicationId: formData.get("applicationId"),
    expectedStatus: formData.get("expectedStatus"),
  });
  if (!parsed.success) return { status: "error", message: copy.actions.generic };

  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("advance_application", {
    p_application_id: parsed.data.applicationId,
    p_expected_status: parsed.data.expectedStatus,
  });

  if (error) {
    const message = error.message === "assigned_manager_required"
      ? copy.actions.forbidden
      : ["application_status_changed", "application_cannot_advance", "invalid_status_transition"].includes(error.message)
        ? copy.actions.changedElsewhere
        : copy.actions.generic;
    revalidatePath("/admin");
    revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
    return { status: "error", message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/applications/${parsed.data.applicationId}`);
  redirect(`/admin/applications/${parsed.data.applicationId}?notice=advanced`);
}
