import Link from "next/link";
import type { Metadata } from "next";
import { Pic } from "@/components/Pic";
import { Rich } from "@/components/Rich";
import { photo } from "@/lib/photos";
import { cities, contacts } from "@/content/site";
import { getT } from "@/i18n/server";

// SEO-страница «О компании» (Sobre nosotros). Тексты — в словарях, поле `about`.

const base = "https://metalduro.es";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const a = t.about;
  return {
    title: { absolute: a.metaTitle },
    description: a.metaDescription,
    alternates: { canonical: a.path },
    openGraph: { title: a.metaTitle, description: a.metaDescription, url: a.path, type: "website" },
  };
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-[clamp(26px,2.6vw,36px)] font-medium tracking-tight">
      {children}
    </h2>
  );
}

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{children}</p>
);

export default async function AboutPage() {
  const { t } = await getT();
  const a = t.about;
  const s = a.sections;

  const toc = [
    { id: "quienes-somos", h: s.who.h },
    { id: "que-compramos", h: s.buy.h },
    { id: "como-trabajamos", h: s.how.h },
    { id: "reciclaje", h: s.recycling.h },
    { id: "donde-trabajamos", h: s.geo.h },
    { id: "operaciones", h: s.deals.h },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: contacts.brand,
        url: base,
        logo: `${base}/logo-mark.png`,
        telephone: contacts.phone,
        address: { "@type": "PostalAddress", addressLocality: contacts.city, addressCountry: "ES" },
        areaServed: { "@type": "Country", name: "España" },
        description: a.metaDescription,
      },
      {
        "@type": "AboutPage",
        name: a.metaTitle,
        url: `${base}${a.path}`,
        inLanguage: t.htmlLang,
        about: { "@id": `${base}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.nav.home, item: `${base}/` },
          { "@type": "ListItem", position: 2, name: a.crumb, item: `${base}${a.path}` },
        ],
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="wrap py-12 md:py-20">
        <nav aria-label="breadcrumb" className="label-mono text-ink-2">
          <Link href="/" className="hover:text-accent-deep">{t.nav.home}</Link>
          <span className="mx-2">/</span>
          <span>{a.crumb}</span>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <div className="label-mono flex items-center gap-2 text-ink-2">
              <span className="size-2 bg-accent" />
              {a.kicker}
            </div>
            <h1 className="display mt-5 text-[clamp(40px,5.6vw,80px)]">{a.h1}</h1>
          </div>
          <p className="text-[19px] leading-relaxed text-ink-2">{a.lead}</p>
        </div>

        <Pic src={photo("inserts-4")} alt={a.heroAlt} className="mt-12 aspect-[21/9]" sizes="100vw" priority />

        <div className="mt-16 grid gap-12 lg:grid-cols-[260px_1fr]">
          <nav className="hidden lg:block" aria-label={a.contents}>
            <div className="sticky top-24 border-t border-ink pt-4">
              <div className="label-mono mb-3 text-ink-2">{a.contents}</div>
              {toc.map((x) => (
                <a key={x.id} href={`#${x.id}`} className="block py-1.5 text-[15px] text-ink-2 hover:text-accent-deep">
                  {x.h}
                </a>
              ))}
            </div>
          </nav>

          <div className="max-w-3xl">
            <section className="border-t border-line py-8">
              <H2 id="quienes-somos">{s.who.h}</H2>
              {s.who.p.map((p) => <P key={p}>{p}</P>)}
            </section>

            <section className="border-t border-line py-8">
              <H2 id="que-compramos">{s.buy.h}</H2>
              <P>{s.buy.intro}</P>
              <ul className="mt-4">
                {t.buyList.map((b) => (
                  <li key={b.title} className="grid grid-cols-[28px_1fr] py-1.5 text-[17px] text-ink-2">
                    <span className="mt-2.5 size-2 bg-accent" />
                    <span><b className="font-medium text-ink">{b.title}</b> — {b.note}</span>
                  </li>
                ))}
              </ul>
              <P><Rich text={s.buy.outro} /></P>
            </section>

            <section className="border-t border-line py-8">
              <H2 id="como-trabajamos">{s.how.h}</H2>
              <P>{s.how.intro}</P>
              <ol className="mt-6 border-t border-ink">
                {t.flow.map((f, i) => (
                  <li key={f.title} className="grid grid-cols-[48px_1fr] border-b border-line py-5">
                    <span className="font-mono text-sm text-accent-deep">0{i + 1}</span>
                    <div>
                      <div className="text-[17px] font-medium">{f.title}</div>
                      <div className="mt-1 text-[15px] text-muted">{f.text} {f.strong}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 grid grid-cols-2 border-t border-ink sm:grid-cols-4">
                {s.how.facts.map(([ti, d]) => (
                  <div key={ti} className="border-b border-line py-5 pr-4">
                    <div className="text-[19px] font-medium tracking-tight">{ti}</div>
                    <div className="mt-1 text-[14px] text-muted">{d}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-line py-8">
              <H2 id="reciclaje">{s.recycling.h}</H2>
              {s.recycling.p.map((p) => <P key={p}>{p}</P>)}
              <div className="mt-6 border-t border-ink">
                {t.ecoStats.map((x) => (
                  <div key={x.value} className="grid grid-cols-[120px_1fr] items-baseline gap-6 border-b border-line py-5">
                    <div className="font-mono text-[28px] leading-none tracking-tight">{x.value}</div>
                    <div className="text-[14px] text-muted">{x.text}</div>
                  </div>
                ))}
              </div>
              <P><Rich text={s.recycling.outro} /></P>
            </section>

            <section className="border-t border-line py-8">
              <H2 id="donde-trabajamos">{s.geo.h}</H2>
              {s.geo.p.map((p) => <P key={p}><Rich text={p} vars={{ city: contacts.city }} /></P>)}
              <P>{s.geo.citiesIntro}</P>
              <div className="label-mono mt-5 flex flex-wrap gap-2 text-ink-2">
                {cities.slice(0, 24).map((c) => (
                  <span key={c} className="border border-ink/25 px-2.5 py-1.5">{c}</span>
                ))}
              </div>
            </section>

            <section className="border-t border-line py-8">
              <H2 id="operaciones">{s.deals.h}</H2>
              <P>{s.deals.intro}</P>
              <div className="mt-6 border-t border-ink">
                {t.history.map((h) => (
                  <div key={h.date} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                    <div>
                      <div className="text-[17px] font-medium">{h.city} · {h.material}</div>
                      <div className="text-[14px] text-muted">{h.date} · {h.method} · {h.weight}</div>
                    </div>
                    <div className="font-mono text-[20px] tracking-tight">{s.deals.payout} {h.wait}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-6 bg-ink p-8 text-paper">
              <div>
                <div className="text-[22px] font-medium tracking-tight">{a.cta}</div>
                <div className="mt-1 text-[15px] text-paper/70">
                  {a.ctaOr}{" "}
                  <a href={contacts.whatsapp} className="underline hover:text-accent">WhatsApp</a> · <a href={contacts.phoneHref} className="font-mono hover:text-accent">{contacts.phone}</a>
                </div>
              </div>
              <Link href="/#calculator" className="bg-accent px-5 py-4 text-ink hover:bg-paper">{a.ctaBtn}</Link>
            </div>
          </div>
        </div>
      </article>

      <section className="border-t border-line py-16">
        <div className="wrap">
          <div className="label-mono mb-4 text-ink-2">{a.useful}</div>
          <div className="border-t border-ink">
            {t.guides.map((o) => (
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
