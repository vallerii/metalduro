"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccountCopy } from "@/content/account";
import { getLocale } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ReceiptActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function finalizeReceiptAction(
  applicationId: string,
  storagePath: string,
): Promise<ReceiptActionResult> {
  const locale = await getLocale();
  const copy = getAccountCopy(locale);
  const parsed = z.object({
    applicationId: z.string().uuid(),
    storagePath: z.string().min(3).max(1024),
  }).safeParse({ applicationId, storagePath });

  if (!parsed.success) {
    return { ok: false, message: copy.receipt.finalizeError };
  }

  const auth = await requireUser(`/account/applications/${applicationId}`);
  if (auth.profile.role !== "client") {
    return { ok: false, message: copy.overview.clientRequired };
  }

  const expectedPath = `${auth.userId}/${parsed.data.applicationId}/receipt`;
  if (parsed.data.storagePath !== expectedPath) {
    return { ok: false, message: copy.receipt.finalizeError };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("attach_receipt_and_mark_sent", {
    p_application_id: parsed.data.applicationId,
    p_storage_path: parsed.data.storagePath,
  });

  if (error) {
    return { ok: false, message: copy.receipt.finalizeError };
  }

  revalidatePath("/account");
  revalidatePath(`/account/applications/${parsed.data.applicationId}`);
  return { ok: true };
}
