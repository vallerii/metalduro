import Link from "next/link";
import type { ApplicationStatus } from "@/content/account";
import { applicationStatuses, type AccountCopy } from "@/content/account";
import type { AdminCopy, AdminSort, AdminView } from "@/content/admin";

export function AdminFilters({ view, status, sort, query, copy, accountCopy }: { view: AdminView; status: ApplicationStatus | null; sort: AdminSort; query: string; copy: AdminCopy; accountCopy: AccountCopy }) {
  const fieldClass = "w-full rounded-xl border border-white/15 bg-ink-2 px-4 py-3 text-paper outline-none focus:border-accent";
  return (
    <form action="/admin" method="get" className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-surface p-5 lg:grid-cols-[1.3fr_0.8fr_0.9fr_auto] lg:items-end">
      <input type="hidden" name="view" value={view} />
      <label>
        <span className="label-mono mb-2 block text-muted">{copy.filters.search}</span>
        <input className={fieldClass} name="q" defaultValue={query} placeholder={copy.filters.searchPlaceholder} maxLength={36} />
      </label>
      {view !== "new" ? (
        <label>
          <span className="label-mono mb-2 block text-muted">{copy.filters.status}</span>
          <select className={fieldClass} name="status" defaultValue={status ?? ""}>
            <option value="">{copy.filters.allStatuses}</option>
            {applicationStatuses.filter((item) => item !== "new").map((item) => <option key={item} value={item}>{accountCopy.statuses[item]}</option>)}
          </select>
        </label>
      ) : <input type="hidden" name="status" value="" />}
      <label>
        <span className="label-mono mb-2 block text-muted">{copy.filters.sort}</span>
        <select className={fieldClass} name="sort" defaultValue={sort}>
          <option value="created_desc">{copy.filters.newest}</option>
          <option value="created_asc">{copy.filters.oldest}</option>
          <option value="updated_desc">{copy.filters.recentlyUpdated}</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button className="rounded-full bg-accent px-5 py-3 font-semibold text-ink hover:bg-accent-deep">{copy.filters.apply}</button>
        <Link href={`/admin?view=${view}`} className="rounded-full border border-white/20 px-5 py-3 font-semibold hover:border-accent">{copy.filters.clear}</Link>
      </div>
    </form>
  );
}
