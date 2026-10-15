import Image from "next/image";
import Link from "next/link";
import { Calculator } from "@/components/Calculator";
import { Composition } from "@/components/Composition";
import { Element } from "@/components/Element";
import { Pic } from "@/components/Pic";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Rich } from "@/components/Rich";
import { photo } from "@/lib/photos";
import { brands, contacts, materialMeta } from "@/content/site";
import { getT } from "@/i18n/server";


function SectionHead({ title, text, dark, compact }: { title: React.ReactNode; text?: string; dark?: boolean; compact?: boolean }) {
  return (
    <div className={`grid gap-6 md:grid-cols-[1.25fr_0.75fr] md:items-end md:gap-16 ${compact ? "pb-10 md:pb-12" : "pb-12 md:pb-20"}`}>
      <div>
        <h2 className="display text-[clamp(32px,3.6vw,56px)]">{title}</h2>
      </div>
      {text && <p className={`max-w-xl text-[17px] leading-relaxed ${dark ? "text-paper/65" : "text-muted"}`}>{text}</p>}
    </div>
  );
}

// Блок «Простой способ превратить лом в деньги» пока скрыт
const SHOW_TRUST = false;

// Отзывы — скриншоты WhatsApp (src/content/dict/*.ts → reviews). Макеты (mockup: true)
// видны только при разработке; на рабочем сайте блок покажет только реальные скриншоты.
const SHOW_REVIEWS = true;
const isDev = process.env.NODE_ENV !== "production";

export default async function Home() {
  const { t } = await getT();
  const h = t.home;
  const { buyList, noBuyList, packingSteps, history, flow, faq } = t;
  const guideLink = (slug: string) => `/guides/${slug}`;
  const reviews = t.reviews.items;
  const calcPhotos = Object.fromEntries(
    [...Object.values(materialMeta), ...history].map((m) => [m.photo, photo(m.photo)]),
  );

  return (
    <main>
      {/* HERO */}
      <section className="border-b border-line">
        <div className="wrap grid gap-8 py-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[1fr_minmax(0,520px)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-14 lg:gap-y-0 lg:py-6">
          <div className="lg:col-start-1 lg:row-start-2">
            <h1 className="display text-[clamp(36px,min(4.4vw,7.6vh),68px)]">
              {h.h1}
            </h1>
          </div>

          <div className="lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center">
            <Calculator photos={calcPhotos} t={t.calc} cityT={t.city} materials={t.materials} history={history} numberLocale={t.numberLocale} />
          </div>

          <div className="lg:col-start-1 lg:row-start-3">
            <ol className="border-t border-line lg:mt-10">
              {h.heroPoints.map((p, i) => (
                <li key={p} className="grid grid-cols-[44px_1fr] items-baseline gap-2 border-b border-line py-[clamp(14px,2.4vh,22px)]">
                  <span className="font-mono text-sm text-accent-deep">0{i + 1}</span>
                  <div className="text-[16px] font-medium">{p}</div>
                </li>
              ))}
            </ol>

            <p className="mt-8 border-l-2 border-accent pl-4 text-[14px] text-ink-2">
              <Rich text={h.heroNote} boldClass="text-ink" />
            </p>
          </div>
        </div>
      </section>

      {/* ЧТО ПОКУПАЕМ */}
      <section id="materials" className="scroll-mt-16 py-[clamp(48px,7vh,88px)]">
        <div className="wrap">
          <SectionHead
            compact
            title={h.materialsTitle}
          />
          <div className="grid gap-16 lg:grid-cols-[1.25fr_1fr] lg:gap-0">
            <div className="lg:border-r lg:border-line lg:pr-16">
              <div className="mb-6 flex items-center gap-3 text-[20px] font-medium">
                <span className="grid size-7 place-items-center bg-accent text-sm text-ink">✓</span> {h.buy}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                {buyList.map((b) => (
                  <figure key={b.title}>
                    {b.photo ? (
                      <Pic src={photo(b.photo)} alt={b.title} className="h-[clamp(100px,14vh,150px)]" sizes="(min-width:1024px) 22vw, 45vw" />
                    ) : (
                      <div className="flex h-[clamp(100px,14vh,150px)] items-center justify-center bg-ink">
                        <Element tone="accent" className="h-[70%] w-auto" />
                      </div>
                    )}
                    <figcaption className="mt-4">
                      <div className="text-[16px] font-medium">{b.title}</div>
                      <div className="text-[14px] text-muted">{b.note}</div>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="mt-10">
              <div className="label-mono text-ink-2">{h.brandsLabel}</div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[16px] font-medium tracking-tight text-ink-2">
                {brands.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
              </div>
            </div>
            <div className="lg:pl-16">
              <div className="mb-6 flex items-center gap-3 text-[20px] font-medium">
                <span className="grid size-7 place-items-center bg-ink text-sm text-paper">✕</span> {h.noBuy}
              </div>
              <ul className="border-t border-line">
                {noBuyList.map((n) => (
                  <li key={n.title} className="grid grid-cols-[36px_1fr] border-b border-line py-4">
                    <span className="font-mono text-muted">✕</span>
                    <div>
                      <div className="text-[16px] font-medium">{n.title}</div>
                      <div className="text-[14px] text-muted">{n.note}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[14px] leading-relaxed text-muted">
                <Rich text={h.contamination} boldClass="text-ink" />
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link href={guideLink("como-identificar-metal-duro")} className="text-[16px] font-medium underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
              {h.guideIdentify}
            </Link>
          </div>
        </div>
      </section>
      {/* КАК МЫ ПЛАТИМ */}
      <section className="bg-ink py-[clamp(88px,14vh,160px)] text-paper">
        <div className="wrap grid items-center gap-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-24">
          <div>
            <div className="display text-[clamp(64px,7.5vw,120px)] leading-[0.8] tracking-[-0.055em] text-accent">{h.payBig}</div>
            <div className="mt-4 text-[clamp(22px,2.4vw,32px)] tracking-tight">{h.paySub}</div>
          </div>
          <div className="text-[19px] leading-relaxed text-paper/65">
            <p>
              <b className="text-paper">{h.payLead}</b>
            </p>
            <p className="mt-4">
              {h.payText}
            </p>
            <div className="label-mono mt-8 inline-block border border-paper/25 px-3 py-2 text-paper/75">
              {h.payTag}
            </div>
          </div>
        </div>
      </section>

      {/* ИСТОРИЯ */}
      <section className="bg-paper-hi py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead
            title={h.historyTitle}
          />
          <div className="flex flex-col gap-[clamp(40px,6vh,72px)]">
            {history.map((x) => (
              <article key={x.date} className="grid gap-6 border-t border-line pt-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12">
                <Pic src={photo(x.photo)} alt={x.material} className="aspect-[4/3] md:aspect-auto md:min-h-[360px]" sizes="(min-width:768px) 50vw, 100vw" />
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="label-mono text-ink-2">{x.date}</span>
                    <span className="label-mono border border-ink/30 px-2.5 py-1 text-ink-2">{x.method}</span>
                  </div>
                  <div className="mt-4 text-[clamp(30px,3vw,44px)] leading-none font-medium tracking-tight">{x.city}</div>
                  <div className="mt-3 text-[18px] text-ink-2">{x.material}</div>

                  <div className="mt-8 grid grid-cols-3">
                    {[
                      [h.historyLabels.weight, x.weight],
                      [h.historyLabels.received, x.received],
                      [h.historyLabels.paid, x.paid.split("· ")[1] ?? x.paid],
                    ].map(([l, v], i) => (
                      <div key={l} className={`py-4 ${i > 0 ? "border-l border-line pl-4" : ""}`}>
                        <div className="label-mono text-ink-2">{l}</div>
                        <div className="mt-1.5 font-mono text-[22px] tracking-tight">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto bg-ink px-6 py-6 text-paper">
                    <div className="label-mono text-paper/75">{h.historyLabels.wait}</div>
                    <div className="mt-3 flex items-baseline justify-between gap-4">
                      <span className="display text-[clamp(44px,4.6vw,68px)] text-accent">{x.wait}</span>
                      <span className="grid size-10 shrink-0 place-items-center bg-accent text-lg text-ink">✓</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* НЕ УВЕРЕНЫ */}
      <a
        href={contacts.whatsapp}
        className="group block bg-accent text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <div className="wrap flex items-center justify-between gap-6 py-12">
          <span className="text-[clamp(20px,2.4vw,32px)] font-medium tracking-tight">
            {h.unsure}
          </span>
          <span className="text-3xl transition-transform group-hover:translate-x-2">→</span>
        </div>
      </a>

      {/* КАК ВСЁ ПРОИСХОДИТ */}
      <section id="how" className="scroll-mt-16 border-b border-line py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead title={h.howTitle} text={h.howText} />
          <ol className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-5">
            {flow.map((f, i) => (
              <li key={f.title} className={`flex min-h-[300px] flex-col border-b border-line py-10 sm:pr-8 lg:border-b-0 ${i < 4 ? "lg:border-r lg:border-line" : ""} ${i > 0 ? "lg:pl-8" : ""}`}>
                <span className="font-mono text-[40px] leading-none text-accent-deep">0{i + 1}</span>
                <h3 className="mt-10 text-[21px] font-medium tracking-tight">{f.title}</h3>
                <p className="mt-4 text-[16px] leading-relaxed text-muted">{f.text}</p>
                {f.strong && <p className="mt-3 text-[16px] font-medium text-ink">{f.strong}</p>}
                {f.link && (
                  <Link href={f.link.href} className="mt-auto pt-6 text-[15px] font-medium whitespace-nowrap underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
                    {f.link.label} →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* УПАКОВКА */}
      <section id="packing" className="scroll-mt-16 py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead
            title={h.packTitle}
            text={h.packText}
          />
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h3 className="text-[24px] font-medium tracking-tight">{h.packBefore}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">
                {h.packBeforeText}
              </p>
              <ol className="mt-10 border-t border-line">
                {packingSteps.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[48px_1fr] border-b border-line py-6">
                    <span className="font-mono text-sm text-accent-deep">0{i + 1}</span>
                    <div>
                      <div className="text-[16px] font-medium">{s.title}</div>
                      <div className="mt-0.5 text-[14px] text-muted">{s.text}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
                <Link href="#calculator" className="shrink-0 bg-accent px-6 py-4 font-medium text-ink transition-colors hover:bg-ink hover:text-paper">
                  {h.packCta}
                </Link>
                <Link href={guideLink("como-embalar-chatarra-metal-duro")} className="whitespace-nowrap text-[16px] font-medium underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
                  {h.guidePack}
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <VideoPlayer
                src="/video/unpacking.mp4?v=34s"
                poster="/video/unpacking-poster.jpg"
                title={h.videoTitle}
                caption={h.videoCaption}
                watchLabel={t.video.watch}
                className="h-[clamp(260px,42vh,460px)]"
              />
              <div className="grid grid-cols-3 gap-5">
                {(["pack-1", "bucket", "pack-3"] as const).map((k, i) => [k, h.packPhotos[i]]).map(([k, l]) => (
                  <figure key={k}>
                    <Pic src={photo(k)} alt={l} label="" className="h-[clamp(100px,15vh,170px)]" sizes="(min-width:1024px) 16vw, 33vw" />
                    <figcaption className="label-mono mt-1.5 text-ink-2">{l}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ДОВЕРИЕ — временно скрыт. Чтобы вернуть, поставьте SHOW_TRUST = true */}
      {SHOW_TRUST && (
        <>
      <section className="border-b border-line py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead title={h.trustTitle} />
          <div className="grid grid-cols-2 border-t border-line lg:grid-cols-4">
            {h.trustItems.map(([ti, d], i) => (
              <div key={ti} className={`border-b border-line py-8 lg:border-b-0 ${i % 2 ? "pl-6" : "pr-6"} ${i > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""} lg:pr-8`}>
                <div className="text-[clamp(20px,1.8vw,26px)] font-medium tracking-tight">{ti}</div>
                <div className="mt-1 text-[15px] text-muted">{d}</div>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col gap-8 bg-ink p-8 text-paper md:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[clamp(24px,2.4vw,32px)] font-medium tracking-tight">{h.trustAskTitle}</div>
              <div className="mt-2 text-[16px] text-paper/70">{h.trustAskText}</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <a href={contacts.phoneHref} className="font-mono text-[clamp(22px,2vw,28px)] tracking-tight hover:text-accent">{contacts.phone}</a>
              <a href={contacts.whatsapp} className="bg-accent px-6 py-4 font-medium text-ink transition-colors hover:bg-paper">{h.whatsappWrite}</a>
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      {/* ЭКОЛОГИЯ — коротко; подробности на странице «О нас» (#reciclaje) */}
      <section id="recycling" className="scroll-mt-16 bg-paper-lo py-[clamp(80px,12vh,144px)]">
        <div className="wrap grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-24">
          <div>
            <h2 className="display text-[clamp(32px,3.6vw,56px)]">{h.ecoTitle}</h2>
            <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-ink-2">
              <Rich text={h.ecoP1} boldClass="font-bold" />
            </p>
            <Link href={`${t.about.path}#reciclaje`} className="mt-8 block w-fit text-[16px] font-medium underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
              {h.ecoLink}
            </Link>
            <Link href={guideLink("que-es-el-carburo-de-tungsteno")} className="mt-3 block w-fit text-[16px] font-medium underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
              {h.guideCarbide}
            </Link>
            <div className="label-mono mt-10 flex flex-wrap gap-3 text-ink-2">
              {h.ecoTags.map((tag) => (
                <span key={tag} className="border border-ink/30 px-2.5 py-1.5">{tag}</span>
              ))}
            </div>
          </div>
          <Composition stacked label={h.ecoComposition} w={h.ecoW} co={h.ecoCo} />
        </div>
      </section>

      {/* ОТЗЫВЫ — скриншоты переписок в WhatsApp */}
      {SHOW_REVIEWS && reviews.length > 0 && (
        <section id="reviews" className="scroll-mt-16 border-b border-line py-[clamp(80px,12vh,144px)]">
          <div className="wrap">
            <div className="grid gap-6 pb-12 md:grid-cols-[1.25fr_0.75fr] md:items-end md:gap-16 md:pb-20">
              <h2 className="display text-[clamp(32px,3.6vw,56px)]">{t.reviews.title}</h2>
              <div className="max-w-xl">
                <p className="text-[17px] leading-relaxed text-muted">{t.reviews.text}</p>
                <a href={contacts.whatsapp} className="mt-6 inline-block bg-accent px-6 py-4 font-medium text-ink transition-colors hover:bg-ink hover:text-paper">
                  {t.reviews.cta} →
                </a>
              </div>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 [scrollbar-width:none]">
              {reviews.map((r) => (
                <figure
                  key={r.src}
                  className="relative block w-[78vw] max-w-[360px] shrink-0 snap-center overflow-hidden border-[6px] border-ink bg-ink shadow-[0_24px_48px_-24px_rgb(33_33_35/0.5)] md:w-auto md:max-w-none"
                >
                  <div className="relative aspect-[9/14] overflow-hidden">
                    <Image
                      src={r.src}
                      alt={r.alt}
                      fill
                      sizes="(min-width:768px) 30vw, 78vw"
                      className="pointer-events-none object-cover object-top select-none"
                      draggable={false}
                    />
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 py-[clamp(80px,12vh,144px)]">
        <div className="wrap grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <h2 className="display text-[clamp(32px,3.6vw,56px)]">{h.faqTitle}</h2>
            <p className="mt-6 text-[17px] text-muted">{h.faqText}</p>
            <div className="mt-12 lg:sticky lg:top-24">
              <div className="text-[20px] font-medium tracking-tight">{h.faqNotFound}</div>
              <p className="mt-2 text-[15px] text-muted">{h.faqNotFoundText}</p>
              <a href={contacts.phoneHref} className="mt-6 block font-mono text-[clamp(24px,2.2vw,32px)] tracking-tight hover:text-accent-deep">
                {contacts.phone}
              </a>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={contacts.whatsapp} className="bg-accent px-5 py-3.5 font-medium text-ink transition-colors hover:bg-ink hover:text-paper">{h.faqWhatsapp}</a>
                <a href={contacts.phoneHref} className="border border-ink px-5 py-3.5 transition-colors hover:bg-ink hover:text-paper">{h.call}</a>
              </div>
            </div>
          </div>
          <div className="border-t border-line">
            {faq.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-7 text-[18px] font-medium">
                  {f.q}
                  <span className="font-mono text-2xl text-accent-deep transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pb-8 text-[16px] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
