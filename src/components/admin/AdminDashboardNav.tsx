import Link from "next/link";
import type { AdminCopy, AdminView } from "@/content/admin";

export function AdminDashboardNav({ active, counts, copy }: { active: AdminView; counts: Record<AdminView, number>; copy: AdminCopy }) {
  return (
    <nav className="mt-10 grid gap-3 sm:grid-cols-3" aria-label={copy.dashboard.title}>
      {(["new", "mine", "other"] as const).map((view) => (
        <Link
          key={view}
          href={`/admin?view=${view}`}
          prefetch
          aria-current={active === view ? "page" : undefined}
          className={`rounded-2xl border p-5 transition-colors ${active === view ? "border-accent bg-accent/10" : "border-white/10 bg-surface hover:border-white/25"}`}
        >
          <span className="label-mono text-muted">{copy.tabs[view]}</span>
          <span className="mt-3 block font-mono text-[36px] leading-none text-accent">{counts[view]}</span>
        </Link>
      ))}
    </nav>
  );
}
