"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthCopy } from "@/content/auth";
import { getLocale } from "@/i18n/server";
import {
  getSiteUrl,
  SiteUrlConfigurationError,
  SupabaseConfigurationError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { registerClient } from "@/lib/auth-registration";
import { requestPasswordRecovery } from "@/lib/auth-recovery";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  submittedEmail?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function actionContext() {
  const locale = await getLocale();
  return { locale, copy: getAuthCopy(locale) };
}

function configurationError(error: unknown, message: string): AuthActionState | null {
  if (error instanceof SupabaseConfigurationError || error instanceof SiteUrlConfigurationError) {
    return { status: "error", message };
  }
  return null;
}

export async function signInAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { copy } = await actionContext();
  const schema = z.object({
    email: z.string().trim().email(copy.messages.invalidEmail),
    password: z.string().min(8, copy.messages.passwordLength).max(72, copy.messages.passwordLength),
  });
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    return configurationError(error, copy.messages.configMissing) ?? {
      status: "error",
      message: copy.messages.genericError,
    };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: copy.messages.invalidCredentials };

  redirect(safeNextPath(formData.get("next"), "/account"));
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { locale, copy } = await actionContext();
  const nextPath = safeNextPath(formData.get("next"), "/account");
  const schema = z
    .object({
      displayName: z.string().trim().min(2, copy.messages.displayNameLength).max(120, copy.messages.displayNameLength),
      email: z.string().trim().email(copy.messages.invalidEmail),
      password: z.string().min(8, copy.messages.passwordLength).max(72, copy.messages.passwordLength),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: copy.messages.passwordMismatch,
    });
  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    return configurationError(error, copy.messages.configMissing) ?? {
      status: "error",
      message: copy.messages.genericError,
    };
  }

  let siteUrl;
  try {
    siteUrl = getSiteUrl();
  } catch (error) {
    return configurationError(error, copy.messages.configMissing) ?? {
      status: "error",
      message: copy.messages.genericError,
    };
  }

  const { error } = await registerClient(supabase.auth, {
    email: parsed.data.email,
    password: parsed.data.password,
    displayName: parsed.data.displayName,
    locale,
    nextPath,
    siteUrl,
  });

  if (error) return { status: "error", message: copy.messages.genericError };
  return {
    status: "success",
    message: copy.messages.signupSuccess,
    submittedEmail: parsed.data.email,
  };
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { copy } = await actionContext();
  const parsed = z.string().trim().email(copy.messages.invalidEmail).safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", fieldErrors: { email: [copy.messages.invalidEmail] } };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    return configurationError(error, copy.messages.configMissing) ?? {
      status: "error",
      message: copy.messages.genericError,
    };
  }

  let siteUrl;
  try {
    siteUrl = getSiteUrl();
  } catch (error) {
    return configurationError(error, copy.messages.configMissing) ?? {
      status: "error",
      message: copy.messages.genericError,
    };
  }

  const { error } = await requestPasswordRecovery(supabase.auth, parsed.data, siteUrl);
  if (error) return { status: "error", message: copy.messages.genericError };

  return { status: "success", message: copy.messages.recoverySent };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { copy } = await actionContext();
  const schema = z
    .object({
      password: z.string().min(8, copy.messages.passwordLength).max(72, copy.messages.passwordLength),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: copy.messages.passwordMismatch,
    });
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    return configurationError(error, copy.messages.configMissing) ?? {
      status: "error",
      message: copy.messages.genericError,
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: copy.messages.missingSession };

  await supabase.auth.signOut();
  redirect("/auth/login?password=updated");
}

export async function signOutAction() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    if (!(error instanceof SupabaseConfigurationError)) throw error;
  }
  redirect("/auth/login");
}
