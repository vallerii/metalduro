import Link from "next/link";
import type { Metadata } from "next";
import { signOutAction } from "@/app/auth/actions";
import { AdminApplicationsList } from "@/components/admin/AdminApplicationsList";
import { AdminDashboardNav } from "@/components/admin/AdminDashboardNav";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { SupabaseSetupNotice } from "@/components/auth/SupabaseSetupNotice";
import { applicationStatuses, getAccountCopy, type ApplicationStatus } from "@/content/account";
import { getAdminCopy, type AdminSort, type AdminView } from "@/content/admin";
import { getAuthCopy } from "@/content/auth";
import { getLocale } from "@/i18n/server";
import { getAdminDashboard } from "@/lib/admin-applications";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;
export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };
type RawSearchParams = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function AdminPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const locale = await getLocale();
  const copy = getAdminCopy(locale);
  const accountCopy = getAccountCopy(locale);
  const authCopy = getAuthCopy(locale);
  if (!isSupabaseConfigured()) return <main className="wrap pb-20 pt-36 md:pt-44"><SupabaseSetupNotice copy={authCopy} /></main>;

  const raw = await searchParams;
  const rawView = first(raw.view);
  const view: AdminView = rawView === "mine" || rawView === "other" ? rawView : "new";
  const rawSort = first(raw.sort);
  const sort: AdminSort = rawSort === "created_asc" || rawSort === "updated_desc" ? rawSort : "created_desc";
  const rawStatus = first(raw.status);
  const status: ApplicationStatus | null = rawStatus && applicationStatuses.includes(rawStatus as ApplicationStatus) ? rawStatus as ApplicationStatus : null;
  const parsedPage = Number.parseInt(first(raw.page) ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.min(Math.max(parsedPage, 1), 10000) : 1;
  const query = (first(raw.q) ?? "").trim().slice(0, 36);
  const notice = first(raw.notice);
  const dashboard = await getAdminDashboard({ view, status, sort, query, page });

  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="label-mono flex items-center gap-2 text-accent"><span className="size-2 rounded-full bg-accent" />{copy.dashboard.kicker}</div>
        <div className="flex items-center gap-3"><span className="hidden max-w-72 truncate text-[13px] text-muted sm:block">{copy.dashboard.signedInAs}: {dashboard.profile.email}</span><form action={signOutAction}><button className="rounded-full border border-white/20 px-4 py-2.5 text-[13px] font-semibold hover:border-accent">{authCopy.common.signOut}</button></form></div>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end"><h1 className="display text-[clamp(44px,6vw,84px)]">{copy.dashboard.title}</h1><p className="text-[18px] leading-relaxed text-muted">{copy.dashboard.lead}</p></div>
      <AdminSectionNav active="applications" applicationsLabel={copy.navigation.applications} pricingLabel={copy.navigation.pricing} />
      {notice === "claimed" ? <p className="mt-8 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-emerald-200" role="status">{copy.dashboard.noticeClaimed}</p> : null}
      <AdminDashboardNav active={view} counts={dashboard.counts} copy={copy} />
      <AdminFilters view={view} status={status} sort={sort} query={query} copy={copy} accountCopy={accountCopy} />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><div className="label-mono text-muted">{copy.tabs[view]}</div><div className="mt-2 font-mono text-[34px] text-accent">{dashboard.total}</div></div><Link href="/account" className="text-[14px] text-muted underline decoration-accent decoration-2 underline-offset-4 hover:text-paper">{authCopy.admin.accountLink}</Link></div>
      <AdminApplicationsList applications={dashboard.applications} view={view} copy={copy} accountCopy={accountCopy} locale={locale} />
      <AdminPagination page={dashboard.page} totalPages={dashboard.totalPages} view={view} status={status} sort={sort} query={query} copy={copy} />
    </main>
  );
}
