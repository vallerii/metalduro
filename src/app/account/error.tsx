"use client";

export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      <section className="rounded-3xl border border-accent/30 bg-surface p-7 md:p-10">
        <div className="label-mono text-accent">Área de cliente</div>
        <h1 className="mt-4 text-[36px] font-medium">No se han podido cargar los datos</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">
          Comprueba la conexión e inténtalo de nuevo. Ningún dato se ha modificado.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-full bg-accent px-6 py-3.5 font-semibold text-ink hover:bg-accent-deep"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
