import Link from "next/link";
import { getAccountCopy } from "@/content/account";
import { getLocale } from "@/i18n/server";

export default async function ApplicationNotFound() {
  const locale = await getLocale();
  const copy = getAccountCopy(locale);

  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      <section className="rounded-3xl border border-white/10 bg-surface p-7 md:p-10">
        <div className="label-mono text-accent">{copy.common.account}</div>
        <h1 className="mt-4 text-[clamp(36px,5vw,64px)] font-medium tracking-tight">
          {copy.detail.notFoundTitle}
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
          {copy.detail.notFoundText}
        </p>
        <Link
          href="/account"
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3.5 font-semibold text-ink hover:bg-accent-deep"
        >
          {copy.common.backToAccount}
        </Link>
      </section>
    </main>
  );
}
