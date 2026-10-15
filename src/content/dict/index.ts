import type { Locale } from "@/i18n/config";
import { es } from "./es";
import { ru } from "./ru"; // только для разработки — удалить вместе с ru.ts
import type { Dict } from "./types";

export type { Dict, Guide, LegalDoc } from "./types";

const dicts: Record<Locale, Dict> = { es, ru };

export const getDict = (locale: Locale): Dict => dicts[locale] ?? es;
