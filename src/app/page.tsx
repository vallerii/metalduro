/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Calculator } from "@/components/Calculator";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SpeedClock } from "@/components/SpeedClock";
import { CaseRail } from "@/components/CaseRail";
import { photo } from "@/lib/photos";
import { homeCopy } from "@/content/home-copy";
import { getT } from "@/i18n/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Разметка и классы перенесены из index.html (референс). Тексты — из home-copy.ts (ES + RU).
// Калькулятор — наш компонент с прежней логикой, вставлен в блок hero.

const img = (key: string) => photo(key) ?? "";

export const instant = false;

export default async function Home() {
  const [{ locale, t }, auth] = await Promise.all([
    getT(),
    isSupabaseConfigured()
      ? getAuthenticatedUser().catch(() => null)
      : Promise.resolve(null),
  ]);
  const c = homeCopy[locale];
  const { history } = t;
  const [proofA, proofB] = c.proof.split(" · ");

  return (
    <div className="ref-home">
      <main>
        {/* HERO */}
        <section className="hero">
          <div aria-label="Plaquitas de metal duro" className="hero-photo" role="img" />
          <div className="hero-inner">
            <div className="hero-copy">
              <h1>
                {c.heroTitle1}
                <br />
                <span className="accent-text">{c.heroTitle2}</span>
              </h1>
              <p style={{ fontSize: "clamp(17px,2vw,22px)", maxWidth: 610, color: "#e6e6e8" }}>{c.heroSub}</p>
              <div className="hero-bullets">
                {c.heroPoints.map((p) => (
                  <div key={p}>
                    <span className="check">✓</span>
                    {p}
                  </div>
                ))}
              </div>
              <div className="hero-proof">
                <span className="stars">★★★★★</span>
                <span>
                  <strong>{proofA}</strong> · {proofB}
                </span>
              </div>
            </div>

            <Calculator
              t={t.calc}
              cityT={t.city}
              materials={t.materials}
              numberLocale={t.numberLocale}
              copy={c.calc}
              viewerRole={auth?.profile.role ?? null}
            />
          </div>
          <div className="scroll-note">{c.scrollNote}</div>
        </section>

        <div className="wrap">
          <p className="manifesto">
            <span>{c.manifesto[0]}</span>
            {c.manifesto[1]}
            <span>{c.manifesto[2]}</span>
          </p>
        </div>

        {/* QUÉ COMPRAMOS */}
        <section className="section wrap" id="materiales">
          <div className="section-head">
            <div>
              <h2 style={{ marginTop: 0 }}>
                {c.materialsTitle1}
                <span className="muted">.</span>
              </h2>
            </div>
            <p>{c.materialsText}</p>
          </div>
          <div className="materials-grid">
            {c.materialCards.map((m, i) => (
              <article key={m.title} className="photo-card">
                <img alt={m.title} loading="lazy" src={img(["inserts-2", "solid-4", "wear-1", "rings-2"][i])} />
                <span className="tag">{m.tag}</span>
                <h3>{m.title}</h3>
              </article>
            ))}
          </div>
          <div className="not-buy">
            <span className="eyebrow">✕ {c.noBuyLabel}</span>
            <div className="chips">
              {c.noBuyChips.map((x) => (
                <span key={x} className="chip">
                  <b>✕</b>
                  {x}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* RECIBIMOS · REVISAMOS · PAGAMOS */}
        <div className="wrap">
          <section className="speed">
            <img alt="" src={img("solid-2")} />
            <div className="speed-title">
              <h2>
                {c.speedWords[0]}
                <br />
                {c.speedWords[1]}
                <br />
                <span className="accent-text">{c.speedWords[2]}</span>
              </h2>
            </div>
            <div className="speed-bento">
              <div className="speed-explainer">
                <h3>{c.speedTitle}</h3>
                <p>{c.speedText}</p>
                <div className="speed-mini">✓ &nbsp; {c.speedMini}</div>
              </div>
              <div className="speed-timer">
                <span className="speed-check">✓</span>
                <SpeedClock label="2 horas" />
                <span className="clock-caption">{c.speedCaption}</span>
              </div>
            </div>
          </section>
        </div>

        {/* CASOS */}
        <section className="section wrap" id="casos">
          <div className="cases-head">
            <h2 style={{ marginTop: 0 }}>
              {c.casesTitle1}
              <br />
              <span className="muted">{c.casesTitle2}</span>
            </h2>
            <p className="muted" style={{ marginTop: 20 }}>
              {c.casesText}
            </p>
          </div>
          <CaseRail prevLabel="Anterior" nextLabel="Siguiente">
            {history.map((x) => (
              <article key={x.date + x.city} className="case-card">
                <img alt={x.material} src={img(x.photo)} />
                <span className="case-city">
                  {x.city} · {x.method}
                </span>
                <div className="case-content">
                  <h3>{x.material}</h3>
                  <div className="case-metadata">
                    <span>{x.weight}</span>
                    <span>{x.received}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#bbb" }}>{c.casesFromLabel.toUpperCase()}</p>
                  <div className="big-time">{x.wait}</div>
                </div>
              </article>
            ))}
            {c.futureCases.map((f) => (
              <article key={f.city + f.material} className="case-card future-case">
                <img alt={f.material} loading="lazy" src={img(f.photo)} />
                <span className="case-city">{f.city}</span>
                <div className="case-content">
                  <span className="draft-tag">{c.futureDraft}</span>
                  <h3>{f.material}</h3>
                  <p className="future-caption">{c.futureCaption}</p>
                </div>
              </article>
            ))}
          </CaseRail>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="section wrap" id="proceso">
          <div className="section-head">
            <div>
              <h2 style={{ marginTop: 0 }}>
                {c.processTitle1}
                <br />
                <span className="muted">{c.processTitle2}</span>
              </h2>
            </div>
            <p>{c.processText}</p>
          </div>
          <div className="process-grid">
            {c.steps.map((s, i) => (
              <article key={s.title} className="process-card">
                <span className="step">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* EMBALAJE */}
        <section className="section wrap pack-section">
          <div className="pack-image" style={{ height: 510 }}>
            <VideoPlayer
              src="/video/unpacking.mp4?v=34s"
              poster="/video/unpacking-poster.jpg"
              title={c.videoTitle}
              caption={c.videoCaption}
              watchLabel={t.video.watch}
              className="h-full"
            />
          </div>
          <div className="pack-copy">
            <h2 style={{ marginTop: 0 }}>
              {c.packTitle1}
              <br />
              <span className="muted">{c.packTitle2}</span>
            </h2>
            <p>{c.packText}</p>
            <div className="pack-tips">
              {c.packTips.map((tip, i) => (
                <div key={tip}>
                  <b>{i + 1}</b>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
            <Link className="btn btn-secondary" href="/guides/como-embalar-chatarra-metal-duro" style={{ marginTop: 32 }}>
              {c.packCta} <span className="arrow">↗</span>
            </Link>
          </div>
        </section>

        {/* RECICLAJE */}
        <div className="wrap">
          <section className="recycle recycle-updated" id="reciclaje">
            <div className="recycle-text">
              <h2>{c.recycleTitle}</h2>
              <p className="recycle-lead">{c.recycleLead}</p>
              <p>{c.recycleText}</p>
              <div className="recycle-facts">
                {c.facts.map((f) => (
                  <div key={f.symbol} className="recycle-fact">
                    <strong>{f.symbol}</strong>
                    <span>
                      <b>{f.name}</b>
                      <small>{f.text}</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="recycle-end">
                <p>
                  {c.recycleEnd1} <strong>{c.recycleEnd2}</strong>
                </p>
                <Link className="btn recycle-button" href="/#calculator">
                  {c.recycleCta} <span className="arrow">↗</span>
                </Link>
              </div>
            </div>
            <div className="recycle-image">
              <img alt="" src={img("inserts-2")} />
            </div>
          </section>
        </div>

        {/* GUÍAS */}
        <section className="section wrap blog-home" id="blog">
          <div className="section-head">
            <div>
              <h2>
                {c.blogTitle1} <span className="muted">{c.blogTitle2}</span>
              </h2>
            </div>
            <p>{c.blogText}</p>
          </div>
          <div className="blog-grid">
            {c.blogCards.map((b, i) => (
              <Link
                key={b.slug}
                href={`/guides/${b.slug}`}
                className={`blog-card ${i === 0 ? "blog-feature" : ""}`}
              >
                <img alt="" loading="lazy" src={img(["inserts-3", "wear-1", "inserts-2"][i])} />
                <div className="blog-card-body">
                  <h3>{b.title}</h3>
                  <span>{c.blogRead} ↗</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="section wrap faq" id="faq">
          <div>
            <h2 style={{ marginTop: 0 }}>
              {c.faqTitle1}
              <br />
              <span className="muted">{c.faqTitle2}</span>
            </h2>
          </div>
          <div>
            {c.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
