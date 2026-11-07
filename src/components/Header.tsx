import Link from "next/link";
import { LangSwitch } from "./LangSwitch";
import { SHOW_RU } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { homeCopy } from "@/content/home-copy";
import { signOutAction } from "@/app/auth/actions";
import { getAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HeaderSignOutButton } from "./HeaderSignOutButton";

// Шапка из index.html (.header / .header-inner); тексты — из home-copy.ts.
export async function Header() {
  const [{ locale }, auth] = await Promise.all([
    getT(),
    isSupabaseConfigured()
      ? getAuthenticatedUser().catch(() => null)
      : Promise.resolve(null),
  ]);
  const c = homeCopy[locale];
  const destination =
    auth?.profile.role === "admin"
      ? { href: "/admin", label: c.navAuth.admin }
      : auth?.profile.role === "client"
        ? { href: "/account", label: c.navAuth.account }
        : null;

  const authLinks = destination ? (
    <>
      <Link href={destination.href}>{destination.label}</Link>
      <form action={signOutAction}>
        <HeaderSignOutButton label={c.navAuth.signOut} />
      </form>
    </>
  ) : (
    <>
      <Link href="/auth/login">{c.navAuth.login}</Link>
      <Link href="/auth/register">{c.navAuth.register}</Link>
    </>
  );
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
          <div className="header-actions">
            <div className="header-auth-desktop">{authLinks}</div>
            <details className="header-auth-mobile">
              <summary>{destination?.label ?? c.navAuth.menu}</summary>
              <div className="header-auth-menu">{authLinks}</div>
            </details>
            {SHOW_RU && <LangSwitch locale={locale} />}
            <Link className="btn header-calc-link" href="/#calculator">
              {c.navCalc} <span className="arrow">↗</span>
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
