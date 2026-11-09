import Link from "next/link";

export function AdminSectionNav({
  active,
  applicationsLabel,
  pricingLabel,
}: {
  active: "applications" | "pricing";
  applicationsLabel: string;
  pricingLabel: string;
}) {
  return (
    <nav className="mt-8 flex flex-wrap gap-3" aria-label="Admin">
      <Link
        href="/admin"
        aria-current={active === "applications" ? "page" : undefined}
        className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${active === "applications" ? "border-accent bg-accent text-ink" : "border-white/15 bg-surface hover:border-accent"}`}
      >
        {applicationsLabel}
      </Link>
      <Link
        href="/admin/pricing"
        aria-current={active === "pricing" ? "page" : undefined}
        className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${active === "pricing" ? "border-accent bg-accent text-ink" : "border-white/15 bg-surface hover:border-accent"}`}
      >
        {pricingLabel}
      </Link>
    </nav>
  );
}
