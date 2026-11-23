import Link from "next/link";
import type { AdminCopy, AdminSort, AdminView } from "@/content/admin";
import type { ApplicationStatus } from "@/content/account";

export function AdminPagination({ page, totalPages, view, status, sort, query, copy }: { page: number; totalPages: number; view: AdminView; status: ApplicationStatus | null; sort: AdminSort; query: string; copy: AdminCopy }) {
  if (totalPages <= 1) return null;
  const href = (nextPage: number) => {
    const params = new URLSearchParams({ view, sort, page: String(nextPage) });
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    return `/admin?${params.toString()}`;
  };
  return <nav className="mt-7 flex items-center justify-between gap-4" aria-label={copy.list.page}>{page > 1 ? <Link className="rounded-full border border-white/20 px-5 py-3 font-semibold hover:border-accent" href={href(page - 1)}>{copy.list.previous}</Link> : <span />}<span className="text-[14px] text-muted">{copy.list.page} {page} / {totalPages}</span>{page < totalPages ? <Link className="rounded-full border border-white/20 px-5 py-3 font-semibold hover:border-accent" href={href(page + 1)}>{copy.list.next}</Link> : <span />}</nav>;
}
