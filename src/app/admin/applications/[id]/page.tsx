/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdvanceApplicationForm } from "@/components/admin/AdvanceApplicationForm";
import { AdminStatusTimeline } from "@/components/admin/AdminStatusTimeline";
import { ApplicationStatusBadge } from "@/components/account/ApplicationStatusBadge";
import { PaymentCountdown } from "@/components/account/PaymentCountdown";
import { getAccountCopy } from "@/content/account";
import { getAdminCopy } from "@/content/admin";
import { getLocale } from "@/i18n/server";
import { getAdminApplicationDetail } from "@/lib/admin-applications";
import { formatDateTime, formatEuro, formatWeight } from "@/lib/application-presentation";

export const instant = false;
const actionableStatuses = new Set(["sent", "accepted", "verification", "payment"]);

export default async function AdminApplicationPage({ params, searchParams }: PageProps<"/admin/applications/[id]">) {
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getLocale()]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const application = await getAdminApplicationDetail(id);
  if (!application) notFound();
  const copy = getAdminCopy(locale);
  const accountCopy = getAccountCopy(locale);
  const canAdvance = application.ownedByCurrentAdmin && actionableStatuses.has(application.status);
  const preferredDates = application.preferredVisitDates
    .map((value) => new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "es-ES", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)))
    .join(", ");

  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      <Link href="/admin" className="text-[14px] text-muted underline decoration-accent decoration-2 underline-offset-4 hover:text-paper">← {copy.detail.back}</Link>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
        <div><div className="label-mono flex items-center gap-2 text-accent"><span className="size-2 rounded-full bg-accent" />{copy.detail.kicker}</div><h1 className="display mt-5 text-[clamp(42px,6vw,76px)]">#{application.referenceCode}</h1><p className="mt-2 font-mono text-[13px] text-muted">{application.id}</p></div>
        <ApplicationStatusBadge status={application.status} label={accountCopy.statuses[application.status]} />
      </div>
      {query.notice === "advanced" ? <p className="mt-7 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-emerald-200" role="status">{copy.detail.noticeAdvanced}</p> : null}
      {application.overdue ? <p className="mt-7 rounded-2xl border border-red-400/50 bg-red-500/10 px-5 py-4 font-semibold text-red-200" role="alert">{copy.list.overdue}</p> : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8"><div className="label-mono text-accent">{copy.detail.client}</div><dl className="mt-6 divide-y divide-line"><Info label={copy.detail.name} value={application.client.displayName || "—"} /><Info label={copy.detail.email} value={application.client.email} /><Info label={copy.detail.phone} value={application.contactPhone || application.client.phone || "—"} /><Info label={accountCopy.detail.repeatCustomer} value={application.repeatCustomer ? accountCopy.detail.yes : accountCopy.detail.no} /></dl></section>
        <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8"><div className="label-mono text-accent">{copy.detail.application}</div><dl className="mt-6 divide-y divide-line"><Info label={accountCopy.common.material} value={application.materialName} /><Info label={accountCopy.common.weight} value={formatWeight(application.declaredWeightKg, locale)} /><Info label={accountCopy.common.rate} value={`${formatEuro(application.rateSnapshotEur, locale)} / kg`} /><Info label={accountCopy.common.estimate} value={formatEuro(application.estimatedAmountEur, locale)} /><Info label={accountCopy.detail.city} value={application.city || "—"} /><Info label={accountCopy.detail.deliveryMethod} value={application.deliveryMethod ? accountCopy.detail.deliveryMethods[application.deliveryMethod] : "—"} />{application.paymentRecipientName ? <Info label={accountCopy.detail.paymentRecipient} value={application.paymentRecipientName} /> : null}{application.paymentIban ? <Info label={accountCopy.detail.iban} value={application.paymentIban} /> : null}{preferredDates ? <Info label={accountCopy.detail.preferredDates} value={preferredDates} /> : null}<Info label={accountCopy.common.createdAt} value={formatDateTime(application.createdAt, locale)} /><Info label={copy.list.updated} value={formatDateTime(application.updatedAt, locale)} /><Info label={copy.detail.manager} value={application.manager?.displayName || application.manager?.email || copy.list.unassigned} /><Info label={copy.detail.stage} value={accountCopy.statuses[application.status]} /></dl></section>
      </div>

      {application.status === "payment" && application.paymentDueAt ? <div className="mt-6"><div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-surface p-5 sm:grid-cols-2"><Info label={copy.detail.paymentStarted} value={application.paymentStartedAt ? formatDateTime(application.paymentStartedAt, locale) : "—"} /><Info label={copy.detail.paymentDue} value={formatDateTime(application.paymentDueAt, locale)} /></div><PaymentCountdown dueAt={application.paymentDueAt} serverNow={application.serverNow} copy={accountCopy} /></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8"><div className="label-mono text-accent">{copy.detail.receipt}</div>{application.receiptSignedUrl ? <a href={application.receiptSignedUrl} target="_blank" rel="noreferrer" className="mt-6 block overflow-hidden rounded-2xl border border-white/10 bg-ink"><img src={application.receiptSignedUrl} alt={copy.detail.receipt} className="max-h-[520px] w-full object-contain" /></a> : <p className="mt-6 text-muted">{copy.detail.receiptMissing}</p>}</section>
        <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8"><div className="label-mono text-accent">{copy.detail.history}</div><AdminStatusTimeline history={application.history} accountCopy={accountCopy} adminCopy={copy} locale={locale} /></section>
      </div>

      <div className="mt-6">
        {!application.ownedByCurrentAdmin && application.manager ? <div className="rounded-3xl border border-white/15 bg-surface p-6 md:p-8"><h2 className="text-[26px] font-medium">{copy.detail.readOnlyTitle}</h2><p className="mt-3 max-w-2xl text-muted">{copy.detail.readOnlyText}</p></div> : null}
        {application.ownedByCurrentAdmin && application.status === "in_progress" ? <div className="rounded-3xl border border-white/15 bg-surface p-6 md:p-8"><h2 className="text-[26px] font-medium">{copy.detail.waitingTitle}</h2><p className="mt-3 text-muted">{copy.detail.waitingText}</p></div> : null}
        {canAdvance ? <AdvanceApplicationForm applicationId={application.id} expectedStatus={application.status} nextStep={copy.steps[application.status]} copy={copy} /> : null}
        {application.ownedByCurrentAdmin && application.status === "paid" ? <p className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-6 text-emerald-200">{copy.detail.noAction}</p> : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[150px_1fr] sm:items-start"><dt className="label-mono text-muted">{label}</dt><dd className="break-words sm:text-right">{value}</dd></div>;
}
