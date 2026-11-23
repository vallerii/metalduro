"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/i18n/config";

/** Переключатель ES / RU — только на время разработки (см. src/i18n/config.ts). */
export function LangSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const set = (locale: Locale) =>
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  return (
    <div className="lang-switch flex items-center gap-0.5 rounded-full border border-paper/25 bg-white/5 p-1 text-[14px] font-semibold" title="Только для разработки">
      {(["es", "ru"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          disabled={pending}
          aria-pressed={locale === l}
          className={`rounded-full px-3.5 py-1.5 uppercase leading-none transition-colors disabled:cursor-wait disabled:opacity-60 ${locale === l ? "bg-accent text-ink" : "text-paper/85 hover:text-paper"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
