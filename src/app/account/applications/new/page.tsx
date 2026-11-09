import Link from "next/link";
import { redirect } from "next/navigation";
import { Calculator } from "@/components/Calculator";
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
    <div className="ref-home">
      <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
        <Link
          href="/account"
          className="text-[14px] text-muted underline decoration-accent decoration-2 underline-offset-4 hover:text-paper"
        >
          ← {copy.common.backToAccount}
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="label-mono flex items-center gap-2 text-accent">
              <span className="size-2 rounded-full bg-accent" />
              {copy.create.kicker}
            </div>
            <h1 className="display mt-5 text-[clamp(42px,5.5vw,72px)]">
              {copy.create.title}
            </h1>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted">
              {copy.create.lead}
            </p>
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
