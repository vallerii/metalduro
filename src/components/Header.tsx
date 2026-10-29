import Link from "next/link";
import { LangSwitch } from "./LangSwitch";
import { SHOW_RU } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { homeCopy } from "@/content/home-copy";

// Шапка из index.html (.header / .header-inner); тексты — из home-copy.ts.
export async function Header() {
  const { locale } = await getT();
  const c = homeCopy[locale];
  return (
    <div className="ref-home">
      <header className="header">
        <div className="header-inner">
          <Link className="brand" href="/">
            metalduro<span className="accent-text">.</span>
          </Link>
          <nav className="nav">
            {c.navItems.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {SHOW_RU && <LangSwitch locale={locale} />}
            <Link className="btn" href="/#calculator">
              {c.navCalc} <span className="arrow">↗</span>
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
