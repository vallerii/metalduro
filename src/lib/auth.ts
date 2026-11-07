import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppRole = "client" | "admin";

export type AuthProfile = {
  user_id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  locale: "es" | "ru";
  role: AppRole;
  active: boolean;
};

export type AuthContext = {
  userId: string;
  profile: AuthProfile;
};

export const getAuthenticatedUser = cache(async (): Promise<AuthContext | null> => {
  await connection();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id,email,display_name,phone,locale,role,active")
    .eq("user_id", user.id)
    .maybeSingle<AuthProfile>();

  if (profileError) {
    throw new Error(`Unable to load the authenticated profile: ${profileError.code}`);
  }
  if (!profile?.active) return null;

  return { userId: user.id, profile };
});

export async function requireUser(nextPath = "/account") {
  const context = await getAuthenticatedUser();
  if (!context) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  return context;
}

export async function requireAdmin() {
  const context = await requireUser("/admin");
  if (context.profile.role !== "admin") {
    redirect("/account?error=admin_required");
  }
  return context;
}
