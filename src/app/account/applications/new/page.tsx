import Link from "next/link";
import { redirect } from "next/navigation";
import { Calculator } from "@/components/Calculator";
import { PublicPriceCard } from "@/components/PublicPriceCard";
import { SupabaseSetupNotice } from "@/components/auth/SupabaseSetupNotice";
import { getAccountCopy } from "@/content/account";
import { getAuthCopy } from "@/content/auth";
import { homeCopy } from "@/content/home-copy";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublicPricingSnapshot } from "@/lib/pricing";

export const instant = false;

export default async function NewApplicationPage() {
  const { locale, t } = await getT();
  const copy = getAccountCopy(locale);

  if (!isSupabaseConfigured()) {
    return (
      <main className="wrap pb-20 pt-36 md:pt-44">
        <SupabaseSetupNotice copy={getAuthCopy(locale)} />
      </main>
    );
  }

  const auth = await requireUser("/account/applications/new");
  if (auth.profile.role !== "client") {
    redirect("/account?error=client_required");
  }
  const pricing = await getPublicPricingSnapshot();

  return (
    <div className="ref-home relative overflow-hidden">
      {/* Same photo background as the home hero. */}
      <div className="hero-photo" aria-hidden="true" />
      <main className="wrap relative pb-20 pt-36 md:pb-28 md:pt-44">
        <Link
          href="/account"
          className="text-[14px] text-muted underline decoration-accent decoration-2 underline-offset-4 hover:text-paper"
        >
          ← {copy.common.backToAccount}
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.04fr_0.86fr] lg:gap-16">
          {/* Column stretches to the calculator height; the price card sits at its bottom. */}
          <div className="hero-copy flex flex-col">
            <h1>
              {copy.create.title}
              <br />
              <span className="accent-text">{copy.create.titleAccent}</span>
            </h1>
            <div className="hero-bullets">
              {homeCopy[locale].heroPoints.map((point) => (
                <div key={point}>
                  <span className="check">✓</span>
                  {point}
                </div>
              ))}
            </div>
            {pricing.publicPrice ? (
              <div className="pt-10 lg:mt-auto">
                <PublicPriceCard
                  price={pricing.publicPrice}
                  locale={locale}
                  variant="hero"
                  label={homeCopy[locale].publicPrice.label}
                  note={homeCopy[locale].publicPrice.note}
                />
              </div>
            ) : null}
          </div>

          <Calculator
            t={t.calc}
            cityT={t.city}
            materials={t.materials}
            numberLocale={t.numberLocale}
            copy={homeCopy[locale].calc}
            materialRates={pricing.materialRates}
            viewerRole={auth.profile.role}
          />
        </div>
      </main>
    </div>
  );
}
