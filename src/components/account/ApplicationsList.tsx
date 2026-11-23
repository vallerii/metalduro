import Link from "next/link";
import type { AccountCopy } from "@/content/account";
import type { Locale } from "@/i18n/config";
import type { ClientApplicationListItem } from "@/lib/application-types";
import {
  applicationNumber,
  formatDateTime,
  formatEuro,
  formatWeight,
} from "@/lib/application-presentation";
import { ApplicationStatusBadge } from "@/components/account/ApplicationStatusBadge";

export function ApplicationsList({
  applications,
  copy,
  locale,
}: {
  applications: ClientApplicationListItem[];
  copy: AccountCopy;
  locale: Locale;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-surface md:block">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-line text-[11px] uppercase tracking-[0.13em] text-muted">
            <tr>
              <th className="px-6 py-4 font-semibold">{copy.common.application}</th>
              <th className="px-4 py-4 font-semibold">{copy.common.material}</th>
              <th className="px-4 py-4 font-semibold">{copy.common.weight}</th>
              <th className="px-4 py-4 font-semibold">{copy.common.estimate}</th>
              <th className="px-4 py-4 font-semibold">{copy.common.status}</th>
              <th className="px-6 py-4 text-right font-semibold">{copy.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id} className="border-b border-line last:border-0">
                <td className="px-6 py-5">
                  <div className="font-semibold">{applicationNumber(application.id)}</div>
                  <div className="mt-1 text-[13px] text-muted">
                    {formatDateTime(application.createdAt, locale)}
                  </div>
                </td>
                <td className="px-4 py-5">{application.materialName}</td>
                <td className="px-4 py-5 font-mono">
                  {formatWeight(application.declaredWeightKg, locale)}
                </td>
                <td className="px-4 py-5 font-mono text-accent-deep">
                  {formatEuro(application.estimatedAmountEur, locale)}
                </td>
                <td className="px-4 py-5">
                  <ApplicationStatusBadge
                    status={application.status}
                    label={copy.statuses[application.status]}
                  />
                </td>
                <td className="px-6 py-5 text-right">
                  <Link
                    href={`/account/applications/${application.id}`}
                    prefetch
                    className="inline-flex rounded-full border border-white/20 px-4 py-2 text-[13px] font-semibold transition-colors hover:border-accent hover:text-accent"
                  >
                    {copy.common.view}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {applications.map((application) => (
          <Link
            key={application.id}
            href={`/account/applications/${application.id}`}
            prefetch
            className="rounded-3xl border border-white/10 bg-surface p-5 transition-colors hover:border-accent/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{applicationNumber(application.id)}</div>
                <div className="mt-1 text-[13px] text-muted">
                  {formatDateTime(application.createdAt, locale)}
                </div>
              </div>
              <ApplicationStatusBadge
                status={application.status}
                label={copy.statuses[application.status]}
              />
            </div>
            <div className="mt-6 text-[18px] font-medium">{application.materialName}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div>
                <div className="label-mono text-muted">{copy.common.weight}</div>
                <div className="mt-2 font-mono">
                  {formatWeight(application.declaredWeightKg, locale)}
                </div>
              </div>
              <div>
                <div className="label-mono text-muted">{copy.common.estimate}</div>
                <div className="mt-2 font-mono text-accent-deep">
                  {formatEuro(application.estimatedAmountEur, locale)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
