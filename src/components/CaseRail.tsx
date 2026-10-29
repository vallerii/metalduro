"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Лента карточек со стрелками и полосой прогресса — классы из референса (.case-rail, .case-controls). */
export function CaseRail({ children, prevLabel, nextLabel }: { children: ReactNode; prevLabel: string; nextLabel: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const r = rail.current;
    if (!r) return;
    const update = () => {
      const max = r.scrollWidth - r.clientWidth;
      setPct(max > 0 ? (r.scrollLeft / max) * 100 : 0);
    };
    r.addEventListener("scroll", update, { passive: true });
    update();
    return () => r.removeEventListener("scroll", update);
  }, []);

  const step = (dir: number) => rail.current?.scrollBy({ left: dir * 408, behavior: "smooth" });

  return (
    <>
      <div className="case-rail" id="case-rail" ref={rail}>
        {children}
      </div>
      <div className="case-controls">
        <div className="case-progress">
          <i style={{ transform: `translateX(${pct * 2}%)` }} />
        </div>
        <button type="button" aria-label={prevLabel} onClick={() => step(-1)}>
          ←
        </button>
        <button type="button" aria-label={nextLabel} onClick={() => step(1)}>
          →
        </button>
      </div>
    </>
  );
}
