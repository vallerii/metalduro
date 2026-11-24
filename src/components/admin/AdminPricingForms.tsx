"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateUnifiedPriceAction, type PricingActionState } from "@/app/admin/pricing/actions";
import { PublicPriceCard } from "@/components/PublicPriceCard";
import type { AdminCopy } from "@/content/admin";
import type { PublicPrice } from "@/lib/pricing-types";
import { formatRateInput } from "@/lib/pricing-management";

const idle: PricingActionState = { status: "idle" };

function SaveButton({ copy }: { copy: AdminCopy["pricing"] }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-accent-deep disabled:cursor-wait disabled:opacity-55"
    >
      {pending ? copy.saving : copy.save}
    </button>
  );
}

function ActionNotice({ state }: { state: PricingActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={`mt-3 text-sm ${state.status === "success" ? "text-emerald-300" : "text-red-300"}`}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

export function UnifiedPriceForm({
  price,
  copy,
  locale,
}: {
  price: PublicPrice;
  copy: AdminCopy["pricing"];
  locale: "es" | "ru";
}) {
  const [state, action] = useActionState(updateUnifiedPriceAction, idle);
  const [rate, setRate] = useState(formatRateInput(price.priceEurPerKg));
  const numericRate = Number(rate.replace(",", "."));
  const preview: PublicPrice = {
    ...price,
    priceEurPerKg: Number.isFinite(numericRate) && numericRate > 0 ? numericRate : price.priceEurPerKg,
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-surface p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_.85fr]">
        <div>
          <h2 className="text-3xl font-semibold">{copy.publicTitle}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{copy.publicLead}</p>
          <form
            action={action}
            className="mt-7 grid max-w-sm gap-5"
            onSubmit={(event) => {
              if (!window.confirm(copy.confirm)) event.preventDefault();
            }}
          >
            <label className="grid gap-2 text-sm font-semibold">
              {copy.publicRate}
              <input
                name="priceEurPerKg"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                inputMode="decimal"
                required
                pattern="\d+(?:[.,]\d{1,2})?"
                className="rounded-xl border border-white/15 bg-ink px-4 py-3 text-lg outline-none focus:border-accent"
              />
            </label>
            <div>
              <SaveButton copy={copy} />
              <ActionNotice state={state} />
            </div>
          </form>
        </div>
        <div>
          <div className="label-mono mb-3 text-muted">{copy.preview}</div>
          <PublicPriceCard
            price={preview}
            locale={locale}
            variant="preview"
            label={copy.publicTitle}
            note={copy.informational}
          />
        </div>
      </div>
    </section>
  );
}
