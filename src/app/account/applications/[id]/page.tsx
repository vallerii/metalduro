import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ApplicationStatusBadge } from "@/components/account/ApplicationStatusBadge";
import { ReceiptUpload } from "@/components/account/ReceiptUpload";
import { PaymentCountdown } from "@/components/account/PaymentCountdown";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { SupabaseSetupNotice } from "@/components/auth/SupabaseSetupNotice";
import { getAccountCopy } from "@/content/account";
import { getAuthCopy } from "@/content/auth";
import { getLocale } from "@/i18n/server";
import { getClientApplicationDetail } from "@/lib/applications";
import {
  applicationNumber,
  formatDateTime,
  formatEuro,
  formatWeight,
} from "@/lib/application-presentation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: PageProps<"/account/applications/[id]">) {
  const locale = await getLocale();
  const copy = getAccountCopy(locale);

  if (!isSupabaseConfigured()) {
    return (
      <main className="wrap pb-20 pt-36 md:pt-44">
        <SupabaseSetupNotice copy={getAuthCopy(locale)} />
      </main>
    );
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const result = await getClientApplicationDetail(id);
  if (!result) notFound();

  const { profile, application } = result;
  const preferredDates = application.preferredVisitDates
    .map((value) =>
      new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "es-ES", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`)),
    )
    .join(", ");
  // The client filled in their own contact/payment details, so the summary only
  // shows what matters for tracking the order (city, phone, IBAN etc. are hidden).
  const intakeRows: [string, string][] = [];
  if (application.deliveryMethod) {
    intakeRows.push([
      copy.detail.deliveryMethod,
      copy.detail.deliveryMethods[application.deliveryMethod],
    ]);
  }
  if (preferredDates) {
    intakeRows.push([copy.detail.preferredDates, preferredDates]);
  }

  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      <Link
        href="/account"
        className="text-[14px] text-muted underline decoration-accent decoration-2 underline-offset-4 hover:text-paper"
      >
        ← {copy.common.backToAccount}
      </Link>

      {query.created === "1" ? (
        <p className="mt-7 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-emerald-200" role="status">
          {copy.detail.createdSuccess}
        </p>
      ) : null}

      <div className="mt-8">
        <h1 className="display text-[clamp(42px,6vw,82px)]">
          {applicationNumber(application.id)}
        </h1>
      </div>

      <div className="mt-10 flex flex-col gap-6">
        <section className="rounded-3xl border border-accent/35 bg-surface p-6 md:p-8">
          <div className={application.status === "in_progress" ? "grid gap-8 lg:grid-cols-[0.8fr_1.2fr]" : ""}>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h2 className="text-[clamp(24px,3vw,34px)] font-semibold leading-tight">
                  {copy.detail.nextSteps[application.status].title}
                </h2>
                <ApplicationStatusBadge
                  status={application.status}
                  label={copy.statuses[application.status]}
                />
              </div>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                {copy.detail.nextSteps[application.status].text}
              </p>
              {application.status === "in_progress" ? (
                <p className="mt-4 max-w-md text-[13px] leading-relaxed text-muted">
                  {copy.detail.receiptLead}
                </p>
              ) : null}
              {application.status !== "in_progress" && application.receiptSignedUrl ? (
                <a
                  href={application.receiptSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block text-[14px] text-paper underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
                >
                  {copy.detail.openReceipt}
                </a>
              ) : null}
            </div>
            {application.status === "in_progress" ? (
              <ReceiptUpload
                applicationId={application.id}
                userId={profile.user_id}
                signedUrl={application.receiptSignedUrl}
                recoveryStoragePath={application.recoveryStoragePath}
                copy={copy}
              />
            ) : null}
          </div>
        </section>

        {application.status === "payment" && application.paymentDueAt ? (
          <PaymentCountdown
            dueAt={application.paymentDueAt}
            serverNow={application.serverNow}
            copy={copy}
          />
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8">
          <div className="label-mono text-muted">{copy.detail.summary}</div>
          <dl className="mt-5 divide-y divide-line">
            {[
              [copy.common.material, application.materialName],
              [copy.common.weight, formatWeight(application.declaredWeightKg, locale)],
              [copy.common.rate, `${formatEuro(application.rateSnapshotEur, locale)} / kg`],
              [copy.common.estimate, formatEuro(application.estimatedAmountEur, locale)],
              [copy.common.createdAt, formatDateTime(application.createdAt, locale)],
              ...intakeRows,
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]">
                <dt className="label-mono text-muted">{label}</dt>
                <dd className="sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8">
          <div className="label-mono text-muted">{copy.detail.history}</div>
          <StatusTimeline history={application.history} copy={copy} locale={locale} />
        </section>
      </div>
    </main>
  );
}
