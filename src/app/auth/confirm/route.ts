import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/safe-next-path";

export async function GET(request: NextRequest) {
  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch {
    return NextResponse.json(
      { error: "Authentication callback is not configured." },
      { status: 500 },
    );
  }
  const redirectUrl = new URL("/auth/login?error=confirmation_failed", siteUrl);

  if (!isSupabaseConfigured()) return NextResponse.redirect(redirectUrl);

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"), "/account");
  const supabase = await createServerSupabaseClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation parameters") };

  if (result.error) return NextResponse.redirect(redirectUrl);

  if (type === "email") {
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { auth_next: null },
    });
    if (metadataError) {
      await supabase.auth.signOut();
      return NextResponse.redirect(redirectUrl);
    }
  }

  const successUrl = new URL(nextPath, siteUrl);
  return NextResponse.redirect(successUrl);
}
