import "server-only";

const internalOrigin = "https://metalduro.invalid";

export function safeNextPath(value: unknown, fallback: string) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%5c/i.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, internalOrigin);
    if (parsed.origin !== internalOrigin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
