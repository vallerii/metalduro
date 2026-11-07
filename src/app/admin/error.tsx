"use client";
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="wrap pb-20 pt-36 md:pt-44"><div className="rounded-3xl border border-red-400/40 bg-red-400/10 p-8"><h1 className="text-[32px] font-medium">No se ha podido cargar el panel</h1><p className="mt-3 text-muted">Comprueba la conexión e inténtalo de nuevo.</p><button onClick={reset} className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-ink">Reintentar</button></div></main>;
}
