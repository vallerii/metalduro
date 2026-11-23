import { AuthForm } from "@/components/auth/AuthForm";
import { SupabaseSetupNotice } from "@/components/auth/SupabaseSetupNotice";
import { getAuthCopy } from "@/content/auth";
import { getLocale } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const locale = await getLocale();
  const copy = getAuthCopy(locale);
  if (!isSupabaseConfigured()) return <SupabaseSetupNotice copy={copy} />;
  const params = await searchParams;
  return <AuthForm mode="register" copy={copy} nextPath={params.next} />;
}
