import type { MetadataRoute } from "next";
import { getDict } from "@/content/dict";

const base = "https://metalduro.es";

// Карта сайта строится по испанской версии — она основная.
export default function sitemap(): MetadataRoute.Sitemap {
  const t = getDict("es");
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}${t.about.path}`, changeFrequency: "monthly", priority: 0.8 },
    ...t.guides.map((g) => ({ url: `${base}/guides/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...["aviso-legal", "privacidad", "cookies"].map((p) => ({ url: `${base}/legal/${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
