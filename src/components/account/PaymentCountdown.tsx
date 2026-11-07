"use client";

import { useEffect, useMemo, useState } from "react";
import type { AccountCopy } from "@/content/account";

function splitTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}

export function PaymentCountdown({
  dueAt,
  serverNow,
  copy,
}: {
  dueAt: string;
  serverNow: string;
  copy: AccountCopy;
}) {
  const initialSeconds = useMemo(
    () => Math.max(0, Math.ceil((Date.parse(dueAt) - Date.parse(serverNow)) / 1000)),
    [dueAt, serverNow],
  );
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((performance.now() - startedAt) / 1000);
      setRemaining(Math.max(0, initialSeconds - elapsedSeconds));
    }, 250);

    return () => window.clearInterval(timer);
  }, [initialSeconds]);

  const value = splitTime(remaining);
  const overdue = remaining <= 0;

  return (
    <section
      className={`rounded-3xl border p-6 md:p-8 ${
        overdue
          ? "border-red-400/40 bg-red-400/10"
          : "border-accent/30 bg-accent/10"
      }`}
    >
      <div className="label-mono text-muted">{copy.payment.title}</div>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">{copy.payment.lead}</p>
      {overdue ? (
        <p className="mt-6 text-[24px] font-medium text-red-300" role="status">
          {copy.payment.overdue}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4" role="timer" aria-live="polite">
          {[
            [value.hours, copy.payment.hours],
            [value.minutes, copy.payment.minutes],
            [value.seconds, copy.payment.seconds],
          ].map(([number, label]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-ink/60 p-3 text-center sm:p-5">
              <div className="font-mono text-[clamp(28px,6vw,54px)] leading-none text-accent">
                {String(number).padStart(2, "0")}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted">{label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
