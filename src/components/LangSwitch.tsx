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
    <div className="flex border border-ink/25 font-mono text-[12px]" title="Только для разработки">
      {(["es", "ru"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={locale === l}
          className={`px-2 py-1 uppercase ${locale === l ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
