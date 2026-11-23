import Link from "next/link";
import type { AccountCopy } from "@/content/account";
import type { AdminCopy, AdminView } from "@/content/admin";
import type { Locale } from "@/i18n/config";
import type { AdminApplicationListItem } from "@/lib/admin-application-types";
import { formatDateTime, formatEuro, formatWeight } from "@/lib/application-presentation";
import { ApplicationStatusBadge } from "@/components/account/ApplicationStatusBadge";
import { ClaimApplicationButton } from "@/components/admin/ClaimApplicationButton";

export function AdminApplicationsList({ applications, view, copy, accountCopy, locale }: { applications: AdminApplicationListItem[]; view: AdminView; copy: AdminCopy; accountCopy: AccountCopy; locale: Locale }) {
  if (!applications.length) {
    return <div className="mt-6 rounded-3xl border border-white/10 bg-surface p-8"><h2 className="text-[26px] font-medium">{copy.list.emptyTitle}</h2><p className="mt-3 text-muted">{copy.list.emptyText}</p></div>;
  }
  return (
    <>
      <div className="mt-6 hidden overflow-hidden rounded-3xl border border-white/10 bg-surface xl:block">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead className="border-b border-line text-[10px] uppercase tracking-[0.12em] text-muted"><tr>
            <th className="px-5 py-4">{copy.list.application}</th><th className="px-4 py-4">{copy.list.client}</th><th className="px-4 py-4">{copy.list.material}</th><th className="px-4 py-4">{copy.list.weight}</th><th className="px-4 py-4">{copy.list.estimate}</th><th className="px-4 py-4">{copy.list.status}</th><th className="px-4 py-4">{copy.list.nextStep}</th><th className="px-5 py-4 text-right">{copy.list.actions}</th>
          </tr></thead>
          <tbody>{applications.map((application) => (
            <tr key={application.id} className={`border-b border-line last:border-0 ${application.overdue ? "bg-red-500/10" : ""}`}>
              <td className="px-5 py-5"><Link prefetch href={`/admin/applications/${application.id}`} className="font-mono font-semibold hover:text-accent">#{application.referenceCode}</Link><time className="mt-1 block text-[12px] text-muted">{formatDateTime(application.createdAt, locale)}</time></td>
              <td className="px-4 py-5"><div className="font-medium">{application.client.displayName || application.client.email}</div><div className="mt-1 max-w-48 truncate text-[12px] text-muted">{application.client.email}</div></td>
              <td className="px-4 py-5">{application.materialName}</td>
              <td className="px-4 py-5 font-mono">{formatWeight(application.declaredWeightKg, locale)}</td>
              <td className="px-4 py-5 font-mono text-accent-deep">{formatEuro(application.estimatedAmountEur, locale)}</td>
              <td className="px-4 py-5"><ApplicationStatusBadge status={application.status} label={accountCopy.statuses[application.status]} />{application.overdue ? <span className="mt-2 block text-[11px] font-semibold uppercase text-red-300">{copy.list.overdue}</span> : null}</td>
              <td className="px-4 py-5"><div>{nextStepLabel(application, copy)}</div>{view === "other" ? <div className="mt-1 text-[11px] text-muted">{copy.list.readOnly}</div> : null}</td>
              <td className="px-5 py-5 text-right"><div className="flex justify-end gap-2">{view === "new" ? <ClaimApplicationButton applicationId={application.id} copy={copy} /> : null}<Link href={`/admin/applications/${application.id}`} prefetch className="rounded-full border border-white/20 px-4 py-2.5 text-[13px] font-semibold hover:border-accent">{copy.list.view}</Link></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 xl:hidden">{applications.map((application) => (
        <article key={application.id} className={`rounded-3xl border p-5 ${application.overdue ? "border-red-400/50 bg-red-500/10" : "border-white/10 bg-surface"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/admin/applications/${application.id}`} prefetch className="font-mono text-[18px] font-semibold">#{application.referenceCode}</Link><time className="mt-1 block text-[12px] text-muted">{formatDateTime(application.createdAt, locale)}</time></div><ApplicationStatusBadge status={application.status} label={accountCopy.statuses[application.status]} /></div>
          {application.overdue ? <p className="mt-4 font-semibold text-red-300">{copy.list.overdue}</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4"><div><div className="label-mono text-muted">{copy.list.client}</div><div className="mt-2">{application.client.displayName || application.client.email}</div></div><div><div className="label-mono text-muted">{copy.list.manager}</div><div className="mt-2">{application.manager?.displayName || application.manager?.email || copy.list.unassigned}</div></div><div><div className="label-mono text-muted">{copy.list.material}</div><div className="mt-2">{application.materialName}</div></div><div><div className="label-mono text-muted">{copy.list.estimate}</div><div className="mt-2 font-mono text-accent-deep">{formatEuro(application.estimatedAmountEur, locale)}</div></div></div>
          <p className="mt-4 text-[13px] text-muted">{nextStepLabel(application, copy)}</p>
          {view === "other" ? <p className="mt-2 text-[12px] text-muted">{copy.list.readOnly}</p> : null}
          <div className="mt-5 flex gap-2">{view === "new" ? <ClaimApplicationButton applicationId={application.id} copy={copy} /> : null}<Link href={`/admin/applications/${application.id}`} prefetch className="flex-1 rounded-full border border-white/20 px-4 py-2.5 text-center text-[13px] font-semibold hover:border-accent">{copy.list.view}</Link></div>
        </article>
      ))}</div>
    </>
  );
}

function nextStepLabel(application: AdminApplicationListItem, copy: AdminCopy) {
  if (application.status === "in_progress") return copy.list.waitingClient;
  if (application.status === "paid") return copy.list.finished;
  return copy.steps[application.status];
}
