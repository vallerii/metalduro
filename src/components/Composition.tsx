import { Element } from "./Element";

/** Подблок «Из чего состоит твердый сплав» — используется на главной и на странице «О нас». */
export function Composition({
  label,
  w,
  co,
  stacked = false,
  className = "",
}: {
  label: string;
  w: string;
  co: string;
  /** true — элементы друг под другом (как на главной), false — в две колонки */
  stacked?: boolean;
  className?: string;
}) {
  const items = [
    { el: <Element className="w-16 shrink-0 sm:w-20" />, v: "70–90%", t: w },
    { el: <Element symbol="Co" number="27" name="Cobalt" mass="58.93" tone="line" className="w-16 shrink-0 sm:w-20" />, v: "6–15%", t: co },
  ];
  return (
    <div className={className}>
      <div className="label-mono mb-4 text-muted">{label}</div>
      <div className={`grid grid-cols-1 border-t border-line pt-6 ${stacked ? "gap-8" : "gap-6 sm:grid-cols-2"}`}>
        {items.map((x) => (
          <div key={x.v} className="flex min-w-0 gap-4">
            {x.el}
            <div className="min-w-0">
              <div className="font-mono text-[30px] leading-none tracking-tight">{x.v}</div>
              <div className={`mt-2 leading-snug text-muted ${stacked ? "max-w-sm text-[15px]" : "text-[14px]"}`}>{x.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
