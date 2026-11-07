export default function AdminLoading() {
  return <main className="wrap animate-pulse pb-20 pt-36 md:pt-44" aria-busy="true"><div className="h-4 w-40 rounded-full bg-white/10" /><div className="mt-8 h-20 max-w-4xl rounded-3xl bg-white/10" /><div className="mt-12 grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-2xl bg-white/10" />)}</div><div className="mt-8 h-24 rounded-3xl bg-white/10" /><div className="mt-6 h-80 rounded-3xl bg-white/10" /></main>;
}
