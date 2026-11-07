import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { ApplicationsList } from "@/components/account/ApplicationsList";
import { SupabaseSetupNotice } from "@/components/auth/SupabaseSetupNotice";
import { getAccountCopy } from "@/content/account";
import { getAuthCopy } from "@/content/auth";
import { getLocale } from "@/i18n/server";
import { getClientApplications } from "@/lib/applications";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getLocale();
  const copy = getAccountCopy(locale);
  const authCopy = getAuthCopy(locale);

  if (!isSupabaseConfigured()) {
    return (
      <main className="wrap pb-20 pt-36 md:pt-44">
        <SupabaseSetupNotice copy={authCopy} />
      </main>
    );
  }

  const [{ profile, applications }, params] = await Promise.all([
    getClientApplications(),
    searchParams,
  ]);

  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="label-mono flex items-center gap-2 text-accent">
          <span className="size-2 rounded-full bg-accent" />
          {copy.overview.kicker}
        </div>
        <form action={signOutAction}>
          <button className="rounded-full border border-white/20 px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-accent hover:text-accent">
            {authCopy.common.signOut}
          </button>
        </form>
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-end">
        <div>
          <h1 className="display max-w-4xl text-[clamp(44px,6vw,84px)]">
            {copy.overview.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-muted">
            {copy.overview.lead}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-surface p-6">
          <div className="label-mono text-muted">{copy.overview.countLabel}</div>
          <div className="mt-3 font-mono text-[52px] leading-none text-accent">
            {applications.length}
          </div>
          <div className="mt-4 truncate text-[14px] text-muted">{profile.email}</div>
        </div>
      </div>

      {params.error === "admin_required" ? (
        <p className="mt-8 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-accent-deep">
          {copy.overview.adminRequired}
        </p>
      ) : null}
      {params.error === "client_required" ? (
        <p className="mt-8 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-accent-deep">
          {copy.overview.clientRequired}
        </p>
      ) : null}

      <div className="mt-12 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="label-mono text-muted">{copy.common.applications}</div>
          <h2 className="mt-2 text-[30px] font-medium">
            {profile.display_name || profile.email}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {profile.role === "admin" ? (
            <Link
              href="/admin"
              className="rounded-full border border-white/20 px-5 py-3.5 font-semibold transition-colors hover:border-accent hover:text-accent"
            >
              {authCopy.account.adminLink}
            </Link>
          ) : null}
          {profile.role === "client" ? (
            <Link
              href="/account/applications/new"
              className="flex items-center gap-8 rounded-full bg-accent px-6 py-3.5 font-semibold text-ink transition-colors hover:bg-accent-deep"
            >
              {copy.common.createApplication}
              <span aria-hidden>↗</span>
            </Link>
          ) : null}
        </div>
      </div>

      <section className="mt-7">
        {applications.length ? (
          <ApplicationsList applications={applications} copy={copy} locale={locale} />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-surface p-7 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-[28px] font-medium">{copy.overview.emptyTitle}</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                  {copy.overview.emptyText}
                </p>
              </div>
              {profile.role === "client" ? (
                <Link
                  href="/account/applications/new"
                  className="rounded-full bg-accent px-6 py-4 text-center font-semibold text-ink transition-colors hover:bg-accent-deep"
                >
                  {copy.common.createApplication}
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
