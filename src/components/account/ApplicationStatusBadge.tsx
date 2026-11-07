import type { ApplicationStatus } from "@/content/account";

const statusClasses: Record<ApplicationStatus, string> = {
  new: "border-white/15 bg-white/5 text-paper",
  in_progress: "border-accent/40 bg-accent/10 text-accent-deep",
  sent: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  accepted: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  verification: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  payment: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200",
  paid: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
};

export function ApplicationStatusBadge({
  status,
  label,
}: {
  status: ApplicationStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold ${statusClasses[status]}`}
    >
      <span className="mr-2 size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
