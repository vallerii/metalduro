import type { MetadataRoute } from "next";
import { guides } from "@/content/guides";

const base = "https://metalduro.es";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/o-nas`, changeFrequency: "monthly", priority: 0.8 },
    ...guides.map((g) => ({ url: `${base}/guides/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
