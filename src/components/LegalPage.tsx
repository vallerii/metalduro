import Link from "next/link";
import { Rich } from "./Rich";
import { contacts } from "@/content/site";
import type { Dict, LegalDoc } from "@/content/dict";

/** Подсветка данных, которые нужно заполнить. */
export function Fill({ children }: { children: React.ReactNode }) {
  return <mark className="bg-accent/30 px-1 text-ink">{children}</mark>;
}

// Подстановки для текстов юридических страниц: {legalName}, {nif} и т.д.
const vars = {
  legalName: <Fill>{contacts.legalName}</Fill>,
  nif: <Fill>{contacts.nif}</Fill>,
  address: <Fill>{contacts.address}</Fill>,
  email: <Fill>{contacts.email}</Fill>,
  registry: <Fill>{contacts.registry}</Fill>,
  phone: contacts.phone,
};

export function LegalPage({ doc, t }: { doc: LegalDoc; t: Dict["legal"] }) {
  return (
    <main className="wrap py-12 md:py-20">
      <div className="label-mono flex flex-wrap gap-x-6 gap-y-2 text-ink-2">
        <Link href="/legal/aviso-legal" className="hover:text-accent-deep">{t.nav.aviso}</Link>
        <Link href="/legal/privacidad" className="hover:text-accent-deep">{t.nav.privacy}</Link>
        <Link href="/legal/cookies" className="hover:text-accent-deep">{t.nav.cookies}</Link>
      </div>
      <h1 className="display mt-10 max-w-4xl text-[clamp(38px,5vw,72px)]">{doc.title}</h1>
      <div className="label-mono mt-4 text-ink-2">{t.updatedLabel}: {doc.updated}</div>
      {doc.intro && <p className="mt-8 max-w-3xl text-[18px] leading-relaxed text-ink-2">{doc.intro}</p>}
      <div className="mt-12 max-w-3xl border-t border-line">
        {doc.sections.map((s, i) => (
          <section key={s.h} className="grid gap-3 border-b border-line py-7 md:grid-cols-[48px_1fr]">
            <span className="font-mono text-sm text-accent-deep">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-[22px] font-medium tracking-tight">{s.h}</h2>
              {s.p.map((p, j) => (
                <p key={j} className="mt-3 text-[16px] leading-relaxed text-ink-2">
                  <Rich text={p} vars={vars} />
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
