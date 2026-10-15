import Link from "next/link";
import type { Metadata } from "next";
import { Pic } from "@/components/Pic";
import { photo } from "@/lib/photos";
import { buyList, cities, contacts, ecoStats, flow, history } from "@/content/site";
import { guides } from "@/content/guides";

// SEO-страница «О компании». Тексты правьте здесь.

const title = "О компании Metalduro — покупка твердосплавного лома в Испании";
const description =
  "Metalduro покупает твердосплавный лом, пластины, монолитный инструмент и чистый вольфрам у частных лиц и компаний по всей Испании. Склад в Барселоне, доставка за наш счет, оплата в среднем за 2 часа после приемки.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/o-nas" },
  openGraph: { title, description, url: "/o-nas", type: "website" },
};

const sections = [
  { id: "kto-my", h: "Кто мы" },
  { id: "chto-pokupaem", h: "Что мы покупаем" },
  { id: "kak-rabotaem", h: "Как мы работаем" },
  { id: "pererabotka", h: "Зачем перерабатывать твердый сплав" },
  { id: "geografiya", h: "Где мы работаем" },
  { id: "primery", h: "Примеры сделок" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://metalduro.es/#organization",
      name: contacts.brand,
      url: "https://metalduro.es",
      logo: "https://metalduro.es/logo-mark.png",
      telephone: contacts.phone,
      address: { "@type": "PostalAddress", addressLocality: contacts.city, addressCountry: "ES" },
      areaServed: { "@type": "Country", name: "España" },
      description,
    },
    {
      "@type": "AboutPage",
      name: title,
      url: "https://metalduro.es/o-nas",
      inLanguage: "ru",
      about: { "@id": "https://metalduro.es/#organization" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: "https://metalduro.es/" },
        { "@type": "ListItem", position: 2, name: "О нас", item: "https://metalduro.es/o-nas" },
      ],
    },
  ],
};

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

export default function AboutPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="wrap py-12 md:py-20">
        <nav aria-label="Хлебные крошки" className="label-mono text-ink-2">
          <Link href="/" className="hover:text-accent-deep">Главная</Link>
          <span className="mx-2">/</span>
          <span>О нас</span>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <div className="label-mono flex items-center gap-2 text-ink-2">
              <span className="size-2 bg-accent" />
              О компании
            </div>
            <h1 className="display mt-5 text-[clamp(40px,5.6vw,80px)]">Metalduro — покупаем твердосплавный лом по всей Испании</h1>
          </div>
          <p className="text-[19px] leading-relaxed text-ink-2">
            Мы скупаем твердый сплав (карбид вольфрама) и чистый вольфрам у частных лиц, мастерских и производственных компаний и передаем его в переработку. Склад находится в Барселоне, материал принимаем со всей Испании.
          </p>
        </div>

        <Pic src={photo("inserts-4")} alt="Твердосплавные пластины, принятые на склад Metalduro" className="mt-12 aspect-[21/9]" sizes="100vw" priority />

        <div className="mt-16 grid gap-12 lg:grid-cols-[260px_1fr]">
          <nav className="hidden lg:block" aria-label="Содержание">
            <div className="sticky top-24 border-t border-ink pt-4">
              <div className="label-mono mb-3 text-ink-2">Содержание</div>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="block py-1.5 text-[15px] text-ink-2 hover:text-accent-deep">
                  {s.h}
                </a>
              ))}
            </div>
          </nav>

          <div className="max-w-3xl">
            {/* КТО МЫ */}
            <section className="border-t border-line py-8">
              <H2 id="kto-my">Кто мы</H2>
              <P>
                Metalduro — компания, которая специализируется на покупке твердосплавного и вольфрамсодержащего лома в Испании. Мы работаем только с этим материалом, поэтому быстро определяем, что перед нами, и платим за твердый сплав как за твердый сплав, а не как за обычный металлолом.
              </P>
              <P>
                Продать нам материал могут как физические лица, так и компании: токарные и фрезерные производства, инструментальные участки, сервисные мастерские, магазины инструмента. Подходит и одна коробка изношенных пластин, и партия больше 100 кг — для крупных объемов условия рассчитываем индивидуально.
              </P>
            </section>

            {/* ЧТО ПОКУПАЕМ */}
            <section className="border-t border-line py-8">
              <H2 id="chto-pokupaem">Что мы покупаем</H2>
              <P>Принимаем материал, который содержит карбид вольфрама или чистый вольфрам — новый, б/у, изношенный или сломанный:</P>
              <ul className="mt-4">
                {buyList.map((b) => (
                  <li key={b.title} className="grid grid-cols-[28px_1fr] py-1.5 text-[17px] text-ink-2">
                    <span className="mt-2.5 size-2 bg-accent" />
                    <span><b className="font-medium text-ink">{b.title}</b> — {b.note}</span>
                  </li>
                ))}
              </ul>
              <P>
                Особенно интересует новый инструмент в заводской упаковке ISCAR, Sandvik Coromant, Kennametal, Walter, Seco Tools, Mitsubishi Materials и других производителей. Быстрорежущую сталь (HSS), кермет, керамику и напайной твердый сплав не принимаем — подробнее на{" "}
                <Link href="/#materials" className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">главной странице</Link>{" "}
                и в гайде{" "}
                <Link href="/guides/kak-opredelit-tverdyj-splav" className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">«Как определить твердый сплав»</Link>.
              </P>
            </section>

            {/* КАК РАБОТАЕМ */}
            <section className="border-t border-line py-8">
              <H2 id="kak-rabotaem">Как мы работаем</H2>
              <P>
                Мы выстроили процесс так, чтобы продавцу не приходилось рисковать: без предоплаты, с фиксацией веса и видеозаписью вскрытия посылки.
              </P>
              <ol className="mt-6 border-t border-ink">
                {flow.map((f, i) => (
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
                {[
                  ["Без предоплаты", "платим после приемки"],
                  ["Доставка", "за наш счет"],
                  ["2 часа", "в среднем до выплаты"],
                  ["Перевод", "на банковский счет"],
                ].map(([t, d]) => (
                  <div key={t} className="border-b border-line py-5 pr-4">
                    <div className="text-[19px] font-medium tracking-tight">{t}</div>
                    <div className="mt-1 text-[14px] text-muted">{d}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* ПЕРЕРАБОТКА */}
            <section className="border-t border-line py-8">
              <H2 id="pererabotka">Зачем перерабатывать твердый сплав</H2>
              <P>
                Твердый сплав на 70–90% состоит из карбида вольфрама, еще 6–15% приходится на кобальтовую связку. Оба металла относятся к стратегическому сырью: вольфрам и кобальт входят в список критически важных материалов Европейского союза, а их добыча сосредоточена в небольшом числе стран.
              </P>
              <P>
                Для вольфрама уже существует развитая индустрия вторичной переработки: из лома получают порошок, из которого снова делают пластины, сверла и фрезы. Каждый килограмм сданного лома — это металл, который возвращается в производственный цикл вместо того, чтобы оказаться на свалке или в черном металлоломе.
              </P>
              <div className="mt-6 border-t border-ink">
                {ecoStats.map((s) => (
                  <div key={s.value} className="grid grid-cols-[120px_1fr] items-baseline gap-6 border-b border-line py-5">
                    <div className="font-mono text-[28px] leading-none tracking-tight">{s.value}</div>
                    <div className="text-[14px] text-muted">{s.text}</div>
                  </div>
                ))}
              </div>
              <P>
                Подробнее о составе и свойствах материала — в статье{" "}
                <Link href="/guides/chto-takoe-karbid-volframa" className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">«Что такое карбид вольфрама»</Link>.
              </P>
            </section>

            {/* ГЕОГРАФИЯ */}
            <section className="border-t border-line py-8">
              <H2 id="geografiya">Где мы работаем</H2>
              <P>
                Склад Metalduro находится в {contacts.city}. Материал можно отправить транспортной компанией из любого города Испании — стоимость отправки компенсируем мы. Привезти лом лично на склад можно по предварительному согласованию.
              </P>
              <P>Принимаем твердосплавный лом в том числе из этих городов:</P>
              <div className="label-mono mt-5 flex flex-wrap gap-2 text-ink-2">
                {cities.slice(0, 24).map((c) => (
                  <span key={c} className="border border-ink/25 px-2.5 py-1.5">{c}</span>
                ))}
              </div>
            </section>

            {/* ПРИМЕРЫ */}
            <section className="border-t border-line py-8">
              <H2 id="primery">Примеры сделок</H2>
              <P>Несколько недавних партий: откуда пришел материал, сколько весил и сколько времени прошло от получения до выплаты.</P>
              <div className="mt-6 border-t border-ink">
                {history.map((h) => (
                  <div key={h.date} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                    <div>
                      <div className="text-[17px] font-medium">{h.city} · {h.material}</div>
                      <div className="text-[14px] text-muted">{h.date} · {h.method} · {h.weight}</div>
                    </div>
                    <div className="font-mono text-[20px] tracking-tight">выплата через {h.wait}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-6 bg-ink p-8 text-paper">
              <div>
                <div className="text-[22px] font-medium tracking-tight">Узнайте стоимость вашего материала</div>
                <div className="mt-1 text-[15px] text-paper/70">
                  Или напишите в{" "}
                  <a href={contacts.whatsapp} className="underline hover:text-accent">WhatsApp</a> · <a href={contacts.phoneHref} className="font-mono hover:text-accent">{contacts.phone}</a>
                </div>
              </div>
              <Link href="/#calculator" className="bg-accent px-5 py-4 text-ink hover:bg-paper">Рассчитать →</Link>
            </div>
          </div>
        </div>
      </article>

      <section className="border-t border-line py-16">
        <div className="wrap">
          <div className="label-mono mb-4 text-ink-2">Полезно знать</div>
          <div className="border-t border-ink">
            {guides.map((o) => (
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
