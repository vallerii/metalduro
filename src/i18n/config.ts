// Языки сайта. Испанский — основной: его видят все посетители и поисковики.
// Русский нужен только на время разработки.
//
// Как убрать русский, когда он станет не нужен:
//   1. SHOW_RU = false — переключатель ES/RU исчезнет, весь сайт будет на испанском;
//   2. удалить src/content/dict/ru.ts и строку `ru` в src/content/dict/index.ts;
//   3. удалить строку `export const instant = false` в src/app/layout.tsx.

export const SHOW_RU = true;

export const locales = ["es", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";
export const LOCALE_COOKIE = "lang";
