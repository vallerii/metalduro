import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Pic } from "@/components/Pic";
import { photo } from "@/lib/photos";
import { getDict } from "@/content/dict";
import { getT } from "@/i18n/server";
import { OG_IMAGE, SITE_URL, ORGANIZATION_ID, jsonLdScript, metaDescription } from "@/lib/seo";

// Старые русские адреса гайдов → новые испанские
const legacySlugs: Record<string, string> = {
  "kak-opredelit-tverdyj-splav": "como-identificar-metal-duro",
  "kak-upakovat-lom": "como-embalar-chatarra-metal-duro",
  "chto-takoe-karbid-volframa": "que-es-el-carburo-de-tungsteno",
};

export function generateStaticParams() {
  return getDict("es").guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const g = t.guides.find((x) => x.slug === slug);
  if (!g) return {};
  const image = photo(g.photo);
  return {
    title: g.title,
    description: metaDescription(g.lead),
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
      title: g.title,
      description: metaDescription(g.lead),
      url: `/guides/${g.slug}`,
      type: "article",
      images: [image ? { url: image, alt: g.title } : OG_IMAGE],
    },
  };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  if (legacySlugs[slug]) permanentRedirect(`/guides/${legacySlugs[slug]}`);
  const { t } = await getT();
  const guides = t.guides;
  const g = guides.find((x) => x.slug === slug);
  if (!g) notFound();
  const others = guides.filter((x) => x.slug !== g.slug);
  const url = `${SITE_URL}/guides/${g.slug}`;
  const image = photo(g.photo);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: g.title,
        description: g.lead,
        url,
        mainEntityOfPage: url,
        inLanguage: t.htmlLang,
        image: `${SITE_URL}${image ?? OG_IMAGE.url}`,
        author: { "@id": ORGANIZATION_ID },
        publisher: { "@id": ORGANIZATION_ID, "@type": "Organization", name: "Metalduro", logo: `${SITE_URL}/logo-mark.png` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.nav.home, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: g.title, item: url },
        ],
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <article className="wrap py-12 md:py-20">
        <Link href="/" className="label-mono text-ink-2 hover:text-accent-deep">{t.guidePage.back}</Link>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <h1 className="display text-[clamp(40px,5.6vw,80px)]">{g.title}</h1>
          </div>
          <p className="text-[19px] leading-relaxed text-ink-2">{g.lead}</p>
        </div>
        {g.photo && <Pic src={photo(g.photo)} alt={g.title} className="mt-12 aspect-[21/9]" sizes="100vw" priority />}

        <div className="mt-16 grid gap-12 lg:grid-cols-[260px_1fr]">
          <nav className="hidden lg:block">
            <div className="sticky top-24 border-t border-line pt-4">
              <div className="label-mono mb-3 text-ink-2">{t.guidePage.contents}</div>
              {g.sections.map((s, i) => (
                <a key={s.h} href={`#s${i}`} className="block py-1.5 text-[15px] text-ink-2 hover:text-accent-deep">
                  {s.h}
                </a>
              ))}
            </div>
          </nav>
          <div className="max-w-3xl">
            {g.sections.map((s, i) => (
              <section key={s.h} id={`s${i}`} className="scroll-mt-24 border-t border-line py-8">
                <h2 className="text-[28px] font-medium tracking-tight">{s.h}</h2>
                {s.p?.map((p) => (
                  <p key={p} className="mt-4 text-[17px] leading-relaxed text-ink-2">{p}</p>
                ))}
                {s.list && (
                  <ul className="mt-4">
                    {s.list.map((li) => (
                      <li key={li} className="grid grid-cols-[28px_1fr] py-1.5 text-[17px] text-ink-2">
                        <span className="mt-2.5 size-2 bg-accent" />
                        {li}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-6 bg-ink p-8 text-paper">
              <div className="text-[22px] font-medium tracking-tight">{t.guidePage.cta}</div>
              <Link href="/#calculator" className="bg-accent px-5 py-4 text-ink hover:bg-paper">{t.guidePage.ctaBtn}</Link>
            </div>
          </div>
        </div>
      </article>

      <section className="border-t border-line py-16">
        <div className="wrap">
          <div className="label-mono mb-4 text-ink-2">{t.guidePage.readAlso}</div>
          <div className="border-t border-line">
            {others.map((o) => (
              <Link key={o.slug} href={`/guides/${o.slug}`} className="group grid items-baseline gap-2 border-b border-line py-6 md:grid-cols-[160px_1fr_auto] md:gap-8">
                <span className="label-mono text-ink-2">{o.kind}</span>
                <span className="text-[clamp(20px,2.2vw,30px)] font-medium tracking-tight group-hover:text-accent-deep">{o.title}</span>
                <span className="hidden text-2xl md:block">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
