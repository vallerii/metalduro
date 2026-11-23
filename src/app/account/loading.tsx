export default function AccountLoading() {
  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44" aria-busy="true">
      <div className="h-3 w-36 animate-pulse rounded-full bg-white/10" />
      <div className="mt-7 h-20 max-w-3xl animate-pulse rounded-3xl bg-white/10" />
      <div className="mt-12 grid gap-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-3xl border border-white/10 bg-surface" />
        ))}
      </div>
    </main>
  );
}
