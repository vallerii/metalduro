import type { AccountCopy } from "@/content/account";
import type { Locale } from "@/i18n/config";
import type { ApplicationHistoryEntry } from "@/lib/application-types";
import { formatDateTime } from "@/lib/application-presentation";
import { ApplicationStatusBadge } from "@/components/account/ApplicationStatusBadge";

export function StatusTimeline({
  history,
  copy,
  locale,
}: {
  history: ApplicationHistoryEntry[];
  copy: AccountCopy;
  locale: Locale;
}) {
  return (
    <ol className="mt-7">
      {history.map((entry, index) => (
        <li key={entry.id} className="relative grid grid-cols-[24px_1fr] gap-4 pb-7 last:pb-0">
          {index < history.length - 1 ? (
            <span className="absolute left-[11px] top-5 h-full w-px bg-line" aria-hidden />
          ) : null}
          <span className="relative z-10 mt-1.5 size-6 rounded-full border border-accent/50 bg-ink">
            <span className="absolute inset-[7px] rounded-full bg-accent" />
          </span>
          <div className="rounded-2xl border border-white/10 bg-ink-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ApplicationStatusBadge
                status={entry.toStatus}
                label={copy.statuses[entry.toStatus]}
              />
              <time className="text-[13px] text-muted">
                {formatDateTime(entry.createdAt, locale)}
              </time>
            </div>
            <p className="mt-3 text-[14px] text-muted">{entry.authorName}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
