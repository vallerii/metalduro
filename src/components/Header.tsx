import Link from "next/link";
import { Logo } from "./Element";
import { LangSwitch } from "./LangSwitch";
import { contacts } from "@/content/site";
import { SHOW_RU } from "@/i18n/config";
import { getT } from "@/i18n/server";

export async function Header() {
  const { locale, t } = await getT();
  const nav = [
    { href: "/#materials", label: t.nav.materials },
    { href: "/#how", label: t.nav.how },
    { href: "/#packing", label: t.nav.packing },
    { href: "/#faq", label: t.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label={t.nav.logoAria}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-accent-deep">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          {SHOW_RU && <LangSwitch locale={locale} />}
          <a href={contacts.phoneHref} className="hidden font-mono text-sm md:block">
            {contacts.phone}
          </a>
          <Link
            href="/#calculator"
            className="bg-accent px-4 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
          >
            {t.nav.calc}
          </Link>
        </div>
      </div>
    </header>
  );
}
