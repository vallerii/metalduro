import Link from "next/link";
export default function AdminApplicationNotFound() {
  return <main className="wrap pb-20 pt-36 md:pt-44"><div className="rounded-3xl border border-white/10 bg-surface p-8"><h1 className="text-[36px] font-medium">Solicitud no encontrada</h1><p className="mt-3 text-muted">La solicitud no existe o no está disponible.</p><Link href="/admin" className="mt-7 inline-flex rounded-full bg-accent px-6 py-3.5 font-semibold text-ink">Volver al panel</Link></div></main>;
}
