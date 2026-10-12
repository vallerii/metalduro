/** Плитка химического элемента в стиле таблицы Менделеева. */
export function Element({
  symbol = "W",
  number = "74",
  name = "Tungsten",
  mass = "183.84",
  className = "",
  tone = "ink",
}: {
  symbol?: string;
  number?: string;
  name?: string;
  mass?: string;
  className?: string;
  tone?: "ink" | "accent" | "line";
}) {
  const tones = {
    ink: "bg-ink text-paper",
    accent: "bg-accent text-ink",
    line: "border border-ink text-ink",
  };
  return (
    <div className={`@container relative aspect-square ${tones[tone]} ${className}`}>
      <div className="absolute inset-0 flex flex-col justify-between p-[9cqw]">
        <div className="flex justify-between font-mono text-[10cqw] leading-none">
          <span>{number}</span>
          <span className="opacity-70">{mass}</span>
        </div>
        <div className="text-[44cqw] leading-[0.8] font-medium tracking-tight">{symbol}</div>
        <div className="font-mono text-[9cqw] leading-none uppercase opacity-80">{name}</div>
      </div>
    </div>
  );
}

/** Логотип: знак переработки с профилями + название. */
export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png?v=3" alt="" width={48} height={48} className="size-12" />
      <span className={`text-[19px] font-semibold tracking-tight ${dark ? "text-paper" : ""}`}>Metalduro</span>
    </span>
  );
}
