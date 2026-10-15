"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CityPicker } from "./CityPicker";
import { cities, contacts, materialMeta, type MaterialId } from "@/content/site";
import type { Dict } from "@/content/dict";

type Method = "send" | "pickup" | "warehouse";

function nextDays(weekday: number, count: number) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 2);
  while (out.length < count) {
    if (d.getDay() === weekday) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
function weekends(months: string[]) {
  const fmt = (d: Date) => `${d.getDate()} ${months[d.getMonth()]}`;
  return nextDays(6, 3).map((sat) => {
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    return sat.getMonth() === sun.getMonth()
      ? `${sat.getDate()}–${sun.getDate()} ${months[sat.getMonth()]}`
      : `${fmt(sat)} – ${fmt(sun)}`;
  });
}
function visitDays(months: string[], days: string[]) {
  const fmt = (d: Date) => `${d.getDate()} ${months[d.getMonth()]}`;
  const fr = nextDays(5, 3);
  return fr.flatMap((f) => {
    const s = new Date(f);
    s.setDate(f.getDate() + 1);
    return [f, s].map((x) => `${days[x.getDay()]}, ${fmt(x)}`);
  });
}


const input =
  "w-full border border-paper/25 bg-transparent px-4 py-3.5 text-[17px] text-paper outline-none placeholder:text-paper/35 focus:border-accent";
const btnNext =
  "flex-1 bg-accent px-5 py-3.5 text-left text-[16px] font-medium text-ink transition-colors hover:bg-paper disabled:opacity-40";
const btnBack =
  "border border-paper/25 px-5 py-3.5 text-paper transition-colors hover:border-paper";

export function Calculator({
  photos,
  t,
  cityT,
  materials: materialTexts,
  history,
  numberLocale,
}: {
  photos: Record<string, string | null>;
  t: Dict["calc"];
  cityT: Dict["city"];
  materials: Dict["materials"];
  history: Dict["history"];
  numberLocale: string;
}) {
  const materials = materialTexts.map((m) => ({ ...m, ...materialMeta[m.id] }));
  const eur = (n: number) => n.toLocaleString(numberLocale) + " €";
  const methodNames = t.methodNames;
  // 0 — «С нами зарабатывают», 1 материал, 2 вес + стоимость, 3 город + способ передачи, 4 контакты, 5 готово
  const [step, setStep] = useState(0);
  const [slide, setSlide] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [mat, setMat] = useState<MaterialId>("solid");
  const [weightText, setWeightText] = useState("20");
  const [over100Chip, setOver100Chip] = useState(false);
  const weight = parseInt(weightText, 10) || 0;
  const over100 = over100Chip || weight > 100;
  const [city, setCity] = useState("");
  const [method, setMethod] = useState<Method>("send");
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [visits, setVisits] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [workedBefore, setWorkedBefore] = useState(false);
  const [payName, setPayName] = useState("");
  const [iban, setIban] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const material = materials.find((m) => m.id === mat)!;
  const price = weight * material.rate;
  const cityValue = city || t.noCity;
  const pickupOk = weight >= 50;
  const effMethod: Method = method === "pickup" && !pickupOk ? "send" : method;

  // даты считаются только на клиенте, когда пользователь дошел до шагов 4–5
  const wk = useMemo(() => (step >= 3 ? weekends(t.months) : []), [step, t.months]);
  const vd = useMemo(() => (step >= 4 ? visitDays(t.months, t.days) : []), [step, t.months, t.days]);

  // галерея сделок листается сама, пока пользователь не нажал стрелку
  useEffect(() => {
    if (step !== 0 || !autoplay || history.length < 2) return;
    const timer = setInterval(() => setSlide((i) => (i + 1) % history.length), 4500);
    return () => clearInterval(timer);
  }, [step, autoplay, history.length]);
  const go = (d: number) => {
    setAutoplay(false);
    setSlide((i) => (i + d + history.length) % history.length);
  };

  const setW = (n: number) => {
    setWeightText(String(n));
    setOver100Chip(false);
  };

  async function submit() {
    if (phone.trim().length < 6) {
      setError(t.errPhone);
      return;
    }
    setError(null);
    setSending(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          material: material.name,
          rate: material.rate,
          weight,
          estimate: price,
          city: cityValue,
          method: methodNames[effMethod],
          pickupDate,
          visits,
          phone,
          workedBefore,
          payName: effMethod === "send" ? payName : undefined,
          iban: effMethod === "send" ? iban : undefined,
        }),
      });
      setStep(5);
    } catch {
      setError(t.errSend + contacts.phone);
    } finally {
      setSending(false);
    }
  }

  const summary = (
    <div className="mt-5 border-t border-paper/20 pt-4 text-[14px] leading-relaxed text-paper/70">
      <div className="label-mono mb-1 text-paper/60">{t.summary}</div>
      <div>
        <span className="font-mono text-paper">{weight} kg</span> · {material.name} · {cityValue} · {methodNames[effMethod]}
        {!over100 && <span className="font-mono text-paper"> · ≈ {eur(price)}</span>}
      </div>
    </div>
  );

  const methodMeta: Record<Method, { t: string; d: string; tag: string | null }> = {
    send: { t: t.methods.send.t, d: t.methods.send.d, tag: t.methods.send.tag },
    pickup: { t: t.methods.pickup.t, d: pickupOk ? t.methods.pickup.d : t.methods.pickup.dDisabled, tag: null },
    warehouse: { t: t.methods.warehouse.t, d: t.methods.warehouse.d, tag: null },
  };

  const h2 = "text-[24px] leading-tight font-medium tracking-tight";
  const sub = "mt-1.5 mb-4 text-[14px] text-paper/60";
  const h = history[slide];

  return (
    <div
      id="calculator"
      className="flex h-[640px] scroll-mt-20 flex-col bg-ink p-5 text-paper sm:p-6 lg:h-[clamp(600px,calc(100svh-112px),700px)] xl:p-7"
    >
      {/* ШАПКА — одинаковой высоты на всех шагах */}
      <div className="shrink-0">
        <div className="flex items-baseline justify-between">
          <div className="text-[19px] font-medium tracking-tight">{step === 0 ? t.brand : t.title}</div>
          {step >= 1 && step <= 4 && <div className="font-mono text-[12px] text-paper/45">{step} / 4</div>}
        </div>
        <div className={`mt-3 mb-5 grid grid-cols-4 gap-1 ${step === 0 ? "invisible" : ""}`}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-[3px] ${i <= step ? "bg-accent" : "bg-paper/15"}`} />
          ))}
        </div>
      </div>

      {/* ТЕЛО — занимает все свободное место, при нехватке прокручивается внутри */}
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 [scrollbar-color:#5f5f63_transparent] [scrollbar-width:thin]">
        {step === 0 && (
          <div className="flex h-full flex-col">
            <h2 className={h2}>{t.introTitle}</h2>
            <p className={sub}>{t.introText}</p>
            <div className="relative min-h-[220px] flex-1 overflow-hidden bg-ink-2">
              {history.map((x, i) => {
                const src = photos[x.photo];
                return (
                  <div key={x.date} className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== slide}>
                    {src && <Image src={src} alt={x.material} fill sizes="(min-width:1024px) 520px, 100vw" className="object-cover" />}
                  </div>
                );
              })}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent px-4 pt-16 pb-4">
                <div className="label-mono text-paper/70">{h.date} · {h.method}</div>
                <div className="mt-1 text-[22px] leading-tight font-medium tracking-tight">{h.city}</div>
                <div className="text-[14px] text-paper/70">{h.material}</div>
              </div>
              <div className="absolute top-3 right-3 flex gap-1">
                <button type="button" onClick={() => go(-1)} aria-label={t.prev} className="grid size-9 place-items-center bg-ink/80 text-paper transition-colors hover:bg-accent hover:text-ink">←</button>
                <button type="button" onClick={() => go(1)} aria-label={t.next} className="grid size-9 place-items-center bg-ink/80 text-paper transition-colors hover:bg-accent hover:text-ink">→</button>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-3 border-b border-paper/20">
              {[
                [t.sent, h.weight],
                [t.earned, h.earned],
                [t.paidIn, h.wait],
              ].map(([l, v], i) => (
                <div key={l} className={`py-3 ${i > 0 ? "border-l border-paper/20 pl-3" : ""}`}>
                  <div className="label-mono text-paper/55">{l}</div>
                  <div className={`mt-1 font-mono text-[clamp(18px,2vw,22px)] tracking-tight ${i === 1 ? "text-accent" : ""}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex shrink-0 justify-center gap-1.5">
              {history.map((x, i) => (
                <button
                  key={x.date}
                  type="button"
                  onClick={() => {
                    setAutoplay(false);
                    setSlide(i);
                  }}
                  aria-label={`${t.slide} ${i + 1}`}
                  className={`h-1.5 transition-all ${i === slide ? "w-6 bg-accent" : "w-1.5 bg-paper/30 hover:bg-paper/60"}`}
                />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className={h2}>{t.matTitle}</h2>
            <p className={sub}>{t.matText}</p>
            <div className="grid grid-cols-2 gap-px bg-paper/15 p-px">
              {materials.map((m) => {
                const on = m.id === mat;
                const src = photos[m.photo];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMat(m.id)}
                    aria-pressed={on}
                    className={`group relative bg-ink p-2.5 text-left transition-colors ${on ? "bg-ink-2" : "hover:bg-ink-2"}`}
                  >
                    <div className="relative h-[clamp(64px,11vh,130px)] overflow-hidden bg-ink-2">
                      {src ? (
                        <Image src={src} alt={m.title} fill sizes="(min-width:1024px) 260px, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center font-mono text-2xl text-paper/30">{m.code}</div>
                      )}
                      <span className="absolute top-0 left-0 bg-ink/80 px-1.5 py-0.5 font-mono text-[11px] text-paper/80">{m.code}</span>
                      {on && <span className="absolute inset-0 ring-2 ring-accent ring-inset" />}
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[14px] leading-snug font-medium sm:text-[15px]">{m.title}</div>
                        <div className="mt-0.5 text-[12px] text-paper/50 sm:text-[13px]">{m.hint}</div>
                      </div>
                      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center border ${on ? "border-accent bg-accent" : "border-paper/40"}`}>
                        {on && <span className="size-1.5 bg-ink" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className={h2}>{t.weightTitle}</h2>
            <p className={sub}>{t.weightText}</p>
            <div className="flex items-baseline gap-3 border-b border-paper/25 pb-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="0"
                value={weightText}
                onChange={(e) => {
                  setWeightText(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""));
                  setOver100Chip(false);
                }}
                className="w-full bg-transparent font-mono text-[48px] leading-none text-paper outline-none placeholder:text-paper/25"
                aria-label={t.weightAria}
              />
              <span className="font-mono text-xl text-paper/50">kg</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={Math.min(100, Math.max(5, weight))}
              onChange={(e) => setW(+e.target.value)}
              className="mt-5 w-full accent-[#ff5c39]"
              aria-label={t.sliderAria}
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-paper/45">
              <span>5 kg</span>
              <span>100 kg</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[5, 20, 50, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setW(n)}
                  className={`border px-3.5 py-2 font-mono text-sm transition-colors ${weight === n && !over100Chip ? "border-accent text-accent" : "border-paper/25 hover:border-paper"}`}
                >
                  {n} kg
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setWeightText("100");
                  setOver100Chip(true);
                }}
                className={`border px-3.5 py-2 font-mono text-sm ${over100 ? "border-accent text-accent" : "border-paper/25 hover:border-paper"}`}
              >
                100+ kg
              </button>
            </div>

            <div className="mt-5 bg-accent p-4 text-ink" aria-live="polite">
              <div className="text-[14px]">{t.estimate}</div>
              {over100 ? (
                <>
                  <div className="mt-1 font-mono text-[30px] leading-none tracking-tight">{t.custom}</div>
                  <div className="mt-2 text-[13px]">
                    {t.over100}{" "}
                    <a href={contacts.phoneHref} className="font-mono underline">{contacts.phone}</a>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-1 font-mono text-[40px] leading-none tracking-tight">≈ {eur(price)}</div>
                  <div className="mt-2 font-mono text-[12px] opacity-75">
                    {t.rateLine.replace("{material}", material.name).replace("{weight}", String(weight)).replace("{rate}", String(material.rate))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className={h2}>{t.placeTitle}</h2>
            <p className={sub}>{t.placeText}</p>
            <CityPicker cities={cities} value={city} onChange={setCity} t={cityT} />
            <div className="label-mono mt-5 mb-1 text-paper/75">{t.methodLabel}</div>
            <div className="border-t border-paper/20">
              {(["send", "pickup", "warehouse"] as Method[]).map((m) => {
                const disabled = m === "pickup" && !pickupOk;
                const on = effMethod === m;
                const meta = methodMeta[m];
                return (
                  <div
                    key={m}
                    role="radio"
                    aria-checked={on}
                    aria-disabled={disabled}
                    tabIndex={disabled ? -1 : 0}
                    onClick={() => !disabled && setMethod(m)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && setMethod(m)}
                    className={`flex gap-3 border-b border-paper/20 py-2.5 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                  >
                    <span className={`mt-1 grid size-4 shrink-0 place-items-center border ${on ? "border-accent" : "border-paper/40"}`}>
                      {on && <span className="size-2 bg-accent" />}
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-[15px] font-medium">{meta.t}</b>
                        {meta.tag && <span className="label-mono bg-paper px-1.5 py-0.5 text-ink">{meta.tag}</span>}
                      </div>
                      <div className="mt-0.5 text-[13px] text-paper/60">{meta.d}</div>
                      {m === "pickup" && pickupOk && on && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {wk.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPickupDate(d);
                              }}
                              className={`border px-2.5 py-1 font-mono text-[12px] ${pickupDate === d ? "border-accent bg-accent text-ink" : "border-paper/25"}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className={h2}>{effMethod === "send" ? t.contactTitleSend : t.contactTitleDate}</h2>
            <p className={sub}>
              {effMethod === "send" ? t.contactTextSend : t.contactTextDate}
            </p>
            <label className="label-mono mb-2 block text-paper/75">{t.contactLabel}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+34 600 000 000" className={input} />
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-[14px] text-paper/80">
              <input type="checkbox" checked={workedBefore} onChange={(e) => setWorkedBefore(e.target.checked)} className="size-4 accent-[#ff5c39]" />
              {t.workedBefore}
            </label>

            {effMethod !== "send" && (
              <div className="mt-5">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                  <label className="label-mono text-paper/75">{t.whenLabel}</label>
                  <span className="text-[13px] text-paper/55">{t.whenText}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {vd.map((d) => {
                    const on = visits.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setVisits((v) => (on ? v.filter((x) => x !== d) : [...v, d]))}
                        className={`border px-3 py-2 font-mono text-[13px] ${on ? "border-accent bg-accent text-ink" : "border-paper/25"}`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {effMethod === "send" && (
              <div className="mt-5">
                <label className="label-mono mb-2 block text-paper/75">{t.payLabel}</label>
                <input value={payName} onChange={(e) => setPayName(e.target.value)} placeholder={t.payName} className={input} />
                <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder={t.iban} className={`${input} mt-2 font-mono text-[15px]`} />
              </div>
            )}

            {summary}
            {error && <p className="mt-4 border-l-2 border-accent pl-3 text-[14px] text-accent">{error}</p>}
          </div>
        )}

        {step === 5 && (
          <div className="flex h-full flex-col justify-center">
            <div className="grid size-14 place-items-center bg-accent text-2xl text-ink">✓</div>
            <h2 className="mt-6 text-[34px] leading-tight font-medium tracking-tight">{t.doneTitle}</h2>
            <p className="mt-3 max-w-md text-[16px] text-paper/70">
              {t.doneText}
            </p>
            <div className="mt-6 border-l-2 border-accent pl-4 text-[15px] text-paper/80">
              <b className="text-paper">{t.doneNext}</b>
              <br />
              {effMethod === "send" ? t.doneSend : effMethod === "pickup" ? t.donePickup : t.doneWarehouse}
            </div>
            <div className="mt-8 text-[14px] text-paper/55">
              {t.urgent} <a href={contacts.phoneHref} className="font-mono text-paper">{contacts.phone}</a>
            </div>
          </div>
        )}
      </div>

      {/* КНОПКИ — всегда прижаты к низу */}
      {step < 5 && (
        <div className="mt-4 flex shrink-0 gap-2">
          {step === 0 && (
            <button className={btnNext} onClick={() => setStep(1)}>{t.introCta}</button>
          )}
          {step >= 1 && (
            <button className={btnBack} onClick={() => setStep(step - 1)} aria-label={t.back}>←</button>
          )}
          {step === 1 && <button className={btnNext} onClick={() => setStep(2)}>{t.continue}</button>}
          {step === 2 && (
            <button className={btnNext} onClick={() => setStep(3)} disabled={weight < 1}>{t.continue}</button>
          )}
          {step === 3 && <button className={btnNext} onClick={() => setStep(4)}>{t.continue}</button>}
          {step === 4 && (
            <button className={btnNext} onClick={submit} disabled={sending}>
              {sending ? t.sending : t.submit}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
