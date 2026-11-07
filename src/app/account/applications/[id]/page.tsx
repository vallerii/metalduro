import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ApplicationStatusBadge } from "@/components/account/ApplicationStatusBadge";
import { AttachedReceipt, ReceiptUpload } from "@/components/account/ReceiptUpload";
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
  const intakeRows: [string, string][] = [
    [copy.detail.city, application.city || "—"],
    [
      copy.detail.deliveryMethod,
      application.deliveryMethod
        ? copy.detail.deliveryMethods[application.deliveryMethod]
        : "—",
    ],
    [copy.detail.phone, application.contactPhone || "—"],
    [
      copy.detail.repeatCustomer,
      application.repeatCustomer ? copy.detail.yes : copy.detail.no,
    ],
  ];
  if (application.paymentRecipientName) {
    intakeRows.push([copy.detail.paymentRecipient, application.paymentRecipientName]);
  }
  if (application.paymentIban) {
    intakeRows.push([copy.detail.iban, application.paymentIban]);
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="label-mono flex items-center gap-2 text-accent">
            <span className="size-2 rounded-full bg-accent" />
            {copy.detail.kicker}
          </div>
          <h1 className="display mt-5 text-[clamp(42px,6vw,82px)]">
            {applicationNumber(application.id)}
          </h1>
          <p className="mt-4 break-all font-mono text-[12px] text-muted">{application.id}</p>
        </div>
        <ApplicationStatusBadge
          status={application.status}
          label={copy.statuses[application.status]}
        />
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8">
          <div className="label-mono text-muted">{copy.detail.summary}</div>
          <dl className="mt-5 divide-y divide-line">
            {[
              [copy.common.material, application.materialName],
              [copy.common.weight, formatWeight(application.declaredWeightKg, locale)],
              [copy.common.rate, `${formatEuro(application.rateSnapshotEur, locale)} / kg`],
              [copy.common.estimate, formatEuro(application.estimatedAmountEur, locale)],
              [copy.common.createdAt, formatDateTime(application.createdAt, locale)],
              [
                copy.common.manager,
                application.managerName || copy.common.unassignedManager,
              ],
              ...intakeRows,
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]">
                <dt className="label-mono text-muted">{label}</dt>
                <dd className="sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {application.status === "payment" && application.paymentDueAt ? (
          <PaymentCountdown
            dueAt={application.paymentDueAt}
            serverNow={application.serverNow}
            copy={copy}
          />
        ) : (
          <section className="rounded-3xl border border-white/10 bg-ink-2 p-6 md:p-8">
            <div className="label-mono text-muted">{copy.common.status}</div>
            <div className="mt-5">
              <ApplicationStatusBadge
                status={application.status}
                label={copy.statuses[application.status]}
              />
            </div>
            <p className="mt-5 text-[14px] leading-relaxed text-muted">
              {copy.detail.historyLead}
            </p>
          </section>
        )}
      </div>

      {application.status === "in_progress" || application.receiptSignedUrl ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-surface p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <div className="label-mono text-accent">{copy.detail.receipt}</div>
              <p className="mt-4 max-w-md leading-relaxed text-muted">
                {copy.detail.receiptLead}
              </p>
            </div>
            {application.status === "in_progress" ? (
              <ReceiptUpload
                applicationId={application.id}
                userId={profile.user_id}
                signedUrl={application.receiptSignedUrl}
                recoveryStoragePath={application.recoveryStoragePath}
                copy={copy}
              />
            ) : application.receiptSignedUrl ? (
              <AttachedReceipt signedUrl={application.receiptSignedUrl} copy={copy} />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-3xl border border-white/10 bg-surface p-6 md:p-8">
        <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <div className="label-mono text-accent">{copy.detail.history}</div>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              {copy.detail.historyLead}
            </p>
          </div>
          <StatusTimeline history={application.history} copy={copy} locale={locale} />
        </div>
      </section>
    </main>
  );
}
