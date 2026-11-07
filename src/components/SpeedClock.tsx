"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_MIN = 120; // 2 часа
const DURATION_MS = 2200;

// 0 → 120 минут, формат «H : MM» (как в референсе: «1 : 15», «2 : 00»)
const fmt = (m: number) => `${Math.floor(m / 60)} : ${String(m % 60).padStart(2, "0")}`;

/** Счётчик «0 : 00 → 2 : 00»: плавный ease-out по requestAnimationFrame, запускается при появлении в экране. */
export function SpeedClock({ label }: { label: string }) {
  const [m, setM] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionRaf = requestAnimationFrame(() => setM(TOTAL_MIN));
      return () => cancelAnimationFrame(reducedMotionRaf);
    }
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - Math.pow(1 - p, 3);
        setM(Math.round(eased * TOTAL_MIN));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    // Счёт идёт, пока блок в зоне видимости; когда уходит — сбрасывается и начнётся заново при повторном входе.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
        } else {
          cancelAnimationFrame(raf);
          setM(0);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} aria-label={label} className="clock">
      {fmt(m)}
    </div>
  );
}
