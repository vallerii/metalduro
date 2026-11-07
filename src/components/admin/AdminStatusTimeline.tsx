import type { AccountCopy } from "@/content/account";
import type { AdminCopy } from "@/content/admin";
import type { Locale } from "@/i18n/config";
import type { AdminHistoryEntry } from "@/lib/admin-application-types";
import { formatDateTime } from "@/lib/application-presentation";
import { ApplicationStatusBadge } from "@/components/account/ApplicationStatusBadge";

export function AdminStatusTimeline({ history, accountCopy, adminCopy, locale }: { history: AdminHistoryEntry[]; accountCopy: AccountCopy; adminCopy: AdminCopy; locale: Locale }) {
  return (
    <ol className="mt-7">
      {history.map((entry, index) => (
        <li key={entry.id} className="relative grid grid-cols-[24px_1fr] gap-4 pb-7 last:pb-0">
          {index < history.length - 1 ? <span className="absolute left-[11px] top-5 h-full w-px bg-line" aria-hidden /> : null}
          <span className="relative z-10 mt-1.5 size-6 rounded-full border border-accent/50 bg-ink"><span className="absolute inset-[7px] rounded-full bg-accent" /></span>
          <div className="rounded-2xl border border-white/10 bg-ink-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {entry.fromStatus ? (
                  <>
                    <ApplicationStatusBadge status={entry.fromStatus} label={accountCopy.statuses[entry.fromStatus]} />
                    <span className="text-muted" aria-hidden>→</span>
                  </>
                ) : null}
                <ApplicationStatusBadge status={entry.toStatus} label={accountCopy.statuses[entry.toStatus]} />
              </div>
              <time className="text-[13px] text-muted">{formatDateTime(entry.createdAt, locale)}</time>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-muted">
              <span>{entry.authorName}</span>
              <span>{adminCopy.detail.role}: {adminCopy.roles[entry.authorRole]}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
