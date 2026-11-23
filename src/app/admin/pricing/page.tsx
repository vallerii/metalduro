import type { Metadata } from "next";
import { signOutAction } from "@/app/auth/actions";
import { MaterialRateForms, PublicPricingForm } from "@/components/admin/AdminPricingForms";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { SupabaseSetupNotice } from "@/components/auth/SupabaseSetupNotice";
import { getAdminCopy } from "@/content/admin";
import { getAuthCopy } from "@/content/auth";
import { getLocale } from "@/i18n/server";
import { getAdminPricingData } from "@/lib/admin-pricing";
import { requireAdmin } from "@/lib/auth";
import { formatPricePerKg, formatPublicPriceDate } from "@/lib/pricing-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;
export const metadata: Metadata = { title: "Precios", robots: { index: false, follow: false } };

export default async function AdminPricingPage() {
  const locale = await getLocale();
  const copy = getAdminCopy(locale);
  const authCopy = getAuthCopy(locale);

  if (!isSupabaseConfigured()) {
    return <main className="wrap pb-20 pt-36 md:pt-44"><SupabaseSetupNotice copy={authCopy} /></main>;
  }

  const admin = await requireAdmin();
  const data = await getAdminPricingData();

  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="label-mono flex items-center gap-2 text-accent">
          <span className="size-2 rounded-full bg-accent" />{copy.pricing.kicker}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-72 truncate text-[13px] text-muted sm:block">{admin.profile.email}</span>
          <form action={signOutAction}>
            <button className="rounded-full border border-white/20 px-4 py-2.5 text-[13px] font-semibold hover:border-accent">{authCopy.common.signOut}</button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_.7fr] lg:items-end">
        <h1 className="display text-[clamp(44px,6vw,84px)]">{copy.pricing.title}</h1>
        <p className="text-[18px] leading-relaxed text-muted">{copy.pricing.lead}</p>
      </div>

      <AdminSectionNav active="pricing" applicationsLabel={copy.navigation.applications} pricingLabel={copy.navigation.pricing} />

      <div className="mt-10 space-y-10">
        <PublicPricingForm price={data.publicPrice} copy={copy.pricing} locale={locale} />

        <section>
          <h2 className="text-3xl font-semibold">{copy.pricing.materialsTitle}</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">{copy.pricing.materialsLead}</p>
          <div className="mt-6">
            <MaterialRateForms materials={data.materials} copy={copy.pricing} locale={locale} />
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-surface p-6 md:p-8">
          <h2 className="text-3xl font-semibold">{copy.pricing.historyTitle}</h2>
          {data.history.length === 0 ? (
            <p className="mt-5 text-muted">{copy.pricing.historyEmpty}</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted">
                  <tr className="border-b border-white/10">
                    <th className="pb-3 pr-5">UTC</th>
                    <th className="pb-3 pr-5">{copy.pricing.target}</th>
                    <th className="pb-3 pr-5">{copy.pricing.change}</th>
                    <th className="pb-3">{copy.pricing.changedBy}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((item) => (
                    <tr key={item.id} className="border-b border-white/7 align-top">
                      <td className="py-4 pr-5 font-mono text-xs text-muted">{new Date(item.createdAt).toISOString()}</td>
                      <td className="py-4 pr-5">{item.materialId ?? copy.pricing.publicTarget}</td>
                      <td className="py-4 pr-5">
                        <span className="text-muted">{formatPricePerKg(item.oldRateEur, locale)}</span>
                        <span className="px-2 text-accent">→</span>
                        <strong>{formatPricePerKg(item.newRateEur, locale)}</strong>
                        {item.newPriceDate ? <small className="mt-1 block text-muted">{formatPublicPriceDate(item.oldPriceDate ?? item.newPriceDate, locale)} → {formatPublicPriceDate(item.newPriceDate, locale)}</small> : null}
                      </td>
                      <td className="py-4 font-mono text-xs">{item.changedByLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
