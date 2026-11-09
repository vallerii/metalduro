import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { homeCopy } from "@/content/home-copy";
import { contacts } from "@/content/site";
import { getT } from "@/i18n/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getPublicPricingSnapshot } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HeaderSignOutButton } from "./HeaderSignOutButton";
import { PublicPriceCard } from "./PublicPriceCard";

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export async function Header() {
  const [{ locale }, auth, pricing] = await Promise.all([
    getT(),
    isSupabaseConfigured()
      ? getAuthenticatedUser().catch(() => null)
      : Promise.resolve(null),
    getPublicPricingSnapshot(),
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
          <Link className="brand" href="/" aria-label="Metalduro">
            metalduro<span className="accent-text">.</span>
          </Link>

          <nav className="nav" aria-label="Principal">
            {c.navItems.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </nav>

          <div className="header-actions">
            {pricing.publicPrice ? (
              <PublicPriceCard
                price={pricing.publicPrice}
                locale={locale}
                variant="header"
                label={c.publicPrice.label}
              />
            ) : null}

            <a className="header-phone" href={contacts.phoneHref}>
              <span aria-hidden="true">☎</span>
              <span className="header-phone-number">{contacts.phone}</span>
            </a>

            <details className="header-nav-menu">
              <summary aria-label={locale === "ru" ? "Открыть меню" : "Abrir menú"}><MenuIcon /></summary>
              <div className="header-popover header-nav-popover">
                {c.navItems.map((item) => (
                  <Link key={item.href} href={item.href}>{item.label}</Link>
                ))}
                <a href={contacts.phoneHref}>{contacts.phone}</a>
              </div>
            </details>

            <Link className="btn header-calc-link" href="/#calculator">
              {c.navCalc} <span className="arrow">↗</span>
            </Link>

            <details className="header-user-menu">
              <summary aria-label={destination?.label ?? c.navAuth.menu} title={destination?.label ?? c.navAuth.menu}>
                <UserIcon />
              </summary>
              <div className="header-popover header-auth-menu">{authLinks}</div>
            </details>
          </div>
        </div>
      </header>
    </div>
  );
}
