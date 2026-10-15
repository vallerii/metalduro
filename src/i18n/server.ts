import "server-only";
import { cookies } from "next/headers";
import { getDict } from "@/content/dict";
import { defaultLocale, LOCALE_COOKIE, SHOW_RU, type Locale } from "./config";

/** Текущий язык: испанский, если русский выключен или не выбран в переключателе. */
export async function getLocale(): Promise<Locale> {
  if (!SHOW_RU) return defaultLocale;
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "ru" ? "ru" : defaultLocale;
}

/** Словарь текстов для текущего языка. */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: getDict(locale) };
}
