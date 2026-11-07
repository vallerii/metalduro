export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
    this.name = "SupabaseConfigurationError";
  }
}

function readPublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return { url, publishableKey };
}

export function isSupabaseConfigured() {
  const { url, publishableKey } = readPublicConfig();
  if (!url || !publishableKey) return false;

  try {
    return new URL(url).protocol === "https:" || new URL(url).hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getSupabasePublicConfig() {
  const { url, publishableKey } = readPublicConfig();
  if (!url || !publishableKey) throw new SupabaseConfigurationError();

  try {
    new URL(url);
  } catch {
    throw new SupabaseConfigurationError();
  }

  return { url, publishableKey };
}

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  try {
    return new URL(value).origin;
  } catch {
    return "http://localhost:3000";
  }
}
