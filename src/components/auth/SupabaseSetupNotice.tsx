import type { AuthCopy } from "@/content/auth";

export function SupabaseSetupNotice({ copy }: { copy: AuthCopy }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-surface p-6 md:p-8">
      <div className="label-mono text-accent">Supabase</div>
      <h1 className="mt-4 text-[32px] font-medium tracking-tight text-paper">{copy.setup.title}</h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">{copy.setup.text}</p>
      <code className="mt-6 block overflow-x-auto rounded-xl border border-white/10 bg-ink-2 px-4 py-4 font-mono text-[13px] text-paper">
        NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      </code>
    </section>
  );
}
