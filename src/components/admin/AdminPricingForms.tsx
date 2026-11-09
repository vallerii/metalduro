"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateMaterialRateAction,
  updatePublicPricingAction,
  type PricingActionState,
} from "@/app/admin/pricing/actions";
import { PublicPriceCard } from "@/components/PublicPriceCard";
import type { AdminCopy } from "@/content/admin";
import type { MaterialPricing, PublicPrice } from "@/lib/pricing-types";
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

export function PublicPricingForm({
  price,
  copy,
  locale,
}: {
  price: PublicPrice;
  copy: AdminCopy["pricing"];
  locale: "es" | "ru";
}) {
  const [state, action] = useActionState(updatePublicPricingAction, idle);
  const [rate, setRate] = useState(formatRateInput(price.priceEurPerKg));
  const [date, setDate] = useState(price.priceDate);
  const numericRate = Number(rate.replace(",", "."));
  const preview: PublicPrice = {
    priceEurPerKg: Number.isFinite(numericRate) && numericRate > 0 ? numericRate : price.priceEurPerKg,
    priceDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : price.priceDate,
    updatedAt: price.updatedAt,
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-surface p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_.85fr]">
        <div>
          <h2 className="text-3xl font-semibold">{copy.publicTitle}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{copy.publicLead}</p>
          <form
            action={action}
            className="mt-7 grid gap-5 sm:grid-cols-2"
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
                className="rounded-xl border border-white/15 bg-ink px-4 py-3 outline-none focus:border-accent"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {copy.publicDate}
              <input
                name="priceDate"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                min="2000-01-01"
                max="2100-12-31"
                className="rounded-xl border border-white/15 bg-ink px-4 py-3 outline-none focus:border-accent"
              />
            </label>
            <div className="sm:col-span-2">
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

function MaterialRateForm({ material, copy, locale }: {
  material: MaterialPricing;
  copy: AdminCopy["pricing"];
  locale: "es" | "ru";
}) {
  const [state, action] = useActionState(updateMaterialRateAction, idle);
  const updated = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(material.updatedAt));

  return (
    <article className="rounded-2xl border border-white/10 bg-ink/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{material.name}</h3>
          <p className="mt-1 font-mono text-xs text-muted">{copy.materialId}: {material.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${material.active ? "bg-emerald-300/10 text-emerald-200" : "bg-white/10 text-muted"}`}>
          {material.active ? copy.active : copy.inactive}
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">{copy.updated}: {updated}</p>
      <form
        action={action}
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          if (!window.confirm(copy.confirm)) event.preventDefault();
        }}
      >
        <input type="hidden" name="materialId" value={material.id} />
        <label className="grid min-w-44 flex-1 gap-2 text-sm font-semibold">
          {copy.rate}
          <input
            name="rateEur"
            defaultValue={formatRateInput(material.rateEur)}
            inputMode="decimal"
            required
            pattern="\d+(?:[.,]\d{1,2})?"
            className="rounded-xl border border-white/15 bg-surface px-4 py-3 outline-none focus:border-accent"
          />
        </label>
        <SaveButton copy={copy} />
      </form>
      <ActionNotice state={state} />
    </article>
  );
}

export function MaterialRateForms({ materials, copy, locale }: {
  materials: MaterialPricing[];
  copy: AdminCopy["pricing"];
  locale: "es" | "ru";
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {materials.map((material) => (
        <MaterialRateForm key={material.id} material={material} copy={copy} locale={locale} />
      ))}
    </div>
  );
}
