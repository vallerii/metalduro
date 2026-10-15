"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const popular = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Bilbao"];

// без учета регистра и акцентов: «malaga» найдет «Málaga»
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function CityPicker({
  cities,
  value,
  onChange,
  t,
}: {
  cities: string[];
  value: string;
  onChange: (city: string) => void;
  t: { placeholder: string; clear: string; nothing: string; other: string };
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const q = norm(query);
  const matches = useMemo(
    () => (q ? cities.filter((c) => norm(c).includes(q)) : cities),
    [cities, q],
  );
  const exact = matches.some((c) => norm(c) === q);
  const showCustom = q.length > 1 && !exact;
  const options = showCustom ? [...matches, query.trim()] : matches;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (c: string) => {
    setQuery(c);
    onChange(c);
    setOpen(false);
  };

  return (
    <div ref={root}>
      <div className="relative">
        <svg aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-paper/45" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder={t.placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value.trim());
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && options[active]) {
              e.preventDefault();
              pick(options[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`w-full border bg-transparent py-3.5 pr-11 pl-11 text-[17px] text-paper outline-none placeholder:text-paper/35 ${open ? "border-accent" : "border-paper/25 hover:border-paper/50"}`}
        />
        {query && (
          <button
            type="button"
            aria-label={t.clear}
            onClick={() => {
              setQuery("");
              onChange("");
              setOpen(true);
            }}
            className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center text-paper/50 hover:text-paper"
          >
            ✕
          </button>
        )}

        {open && (
          <ul
            id={listId}
            ref={list}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-[264px] overflow-y-auto border border-paper/20 bg-ink-2 py-1 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.6)] [scrollbar-color:#5f5f63_transparent] [scrollbar-width:thin]"
          >
            {options.length === 0 && <li className="px-4 py-3 text-[15px] text-paper/50">{t.nothing}</li>}
            {options.map((c, i) => {
              const custom = showCustom && i === options.length - 1;
              const selected = !custom && c === value;
              return (
                <li
                  key={custom ? "__custom" : c}
                  data-i={i}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-[15px] ${i === active ? "bg-paper/10 text-paper" : "text-paper/80"} ${custom ? "border-t border-paper/15" : ""}`}
                >
                  <span>
                    {custom ? (
                      <>
                        <span className="text-paper/50">{t.other}</span>
                        {c}
                      </>
                    ) : (
                      c
                    )}
                  </span>
                  {selected && <span className="size-2 bg-accent" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {popular.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pick(c)}
            className={`border px-2.5 py-1.5 text-[13px] transition-colors ${value === c ? "border-accent bg-accent text-ink" : "border-paper/20 text-paper/75 hover:border-paper/60 hover:text-paper"}`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
