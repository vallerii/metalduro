"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

/** Переключатель ES / RU — только на время разработки (см. src/i18n/config.ts). */
export function LangSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const set = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-paper/25 bg-white/5 p-1 text-[14px] font-semibold" title="Только для разработки">
      {(["es", "ru"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-3.5 py-1.5 uppercase leading-none transition-colors ${locale === l ? "bg-accent text-ink" : "text-paper/85 hover:text-paper"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
