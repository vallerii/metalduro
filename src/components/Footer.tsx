import Link from "next/link";
import { contacts } from "@/content/site";
import { guides } from "@/content/guides";

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="wrap pt-20 pb-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr] md:grid-cols-2">
          <div>
            <div className="flex items-center gap-[0.18em] text-[clamp(40px,4.6vw,72px)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png?v=3" alt="" className="size-[1em]" />
              <span className="display text-paper">Metalduro</span>
            </div>
            <p className="mt-6 max-w-sm text-paper/60">
              Покупка твердосплавного и вольфрамсодержащего лома по всей Испании.
            </p>
          </div>
          <div>
            <div className="label-mono mb-4 text-paper/75">Связаться</div>
            <a href={contacts.phoneHref} className="block font-mono text-lg hover:text-accent">
              {contacts.phone}
            </a>
            <a href={contacts.whatsapp} className="mt-2 block text-paper/70 hover:text-accent">
              WhatsApp
            </a>
            <div className="mt-2 text-paper/70">Склад: {contacts.city}</div>
          </div>
          <div>
            <div className="label-mono mb-4 text-paper/75">Продать материал</div>
            {[
              ["/#calculator", "Рассчитать стоимость"],
              ["/#materials", "Что покупаем"],
              ["/#packing", "Как упаковать"],
              ["/#how", "Как это работает"],
              ["/#faq", "FAQ"],
              ["/o-nas", "О компании"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="block py-1 text-paper/70 hover:text-accent">
                {label}
              </Link>
            ))}
          </div>
          <div>
            <div className="label-mono mb-4 text-paper/75">Полезно знать</div>
            {guides.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="block py-1 text-paper/70 hover:text-accent">
                {g.title}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-wrap justify-between gap-4 border-t border-paper/15 pt-6 font-mono text-xs text-paper/45">
          <span>© 2026 Metalduro · Испания</span>
          <span className="flex flex-wrap gap-5">
            <Link href="/legal/aviso-legal" className="hover:text-paper">Юридическая информация</Link>
            <Link href="/legal/privacidad" className="hover:text-paper">Политика конфиденциальности</Link>
            <Link href="/legal/cookies" className="hover:text-paper">Cookies</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
