
"use client";

import { useMemo, useState } from "react";
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
  "w-full border border-paper/25 bg-transparent px-3 py-2.5 text-[15px] text-paper outline-none placeholder:text-paper/35 focus:border-accent";

const btnNext =
  "w-full bg-accent px-4 py-3 text-left text-[15px] font-medium text-ink transition-colors hover:bg-paper disabled:opacity-40";

const btnBack =
  "border border-paper/25 px-4 py-3 text-paper transition-colors hover:border-paper";

export function Calculator({
  t,
  cityT,
  materials: materialTexts,
  numberLocale,
}: {
  photos: Record<string, string | null>;
  t: Dict["calc"];
  cityT: Dict["city"];
  materials: Dict["materials"];
  history: Dict["history"];
  numberLocale: string;
}) {
  const materials = materialTexts.map((m) => ({
    ...m,
    ...materialMeta[m.id],
  }));

  const eur = (n: number) =>
    n.toLocaleString(numberLocale) + " €";

  const methodNames = t.methodNames;

  // 1 — материал и вес, 2 — город и способ передачи,
  // 3 — контакты, 4 — успешная отправка
  const [step, setStep] = useState(1);

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

  const material = materials.find((m) => m.id === mat) ?? materials[0];
  const price = weight * (material?.rate ?? 0);
  const cityValue = city || t.noCity;
  const pickupOk = weight >= 50;

  const effMethod: Method =
    method === "pickup" && !pickupOk ? "send" : method;

  const wk = useMemo(
    () => (step >= 2 ? weekends(t.months) : []),
    [step, t.months],
  );

  const vd = useMemo(
    () => (step >= 3 ? visitDays(t.months, t.days) : []),
    [step, t.months, t.days],
  );

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
      const response = await fetch("/api/lead", {
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

      if (!response.ok) throw new Error("Request failed");

      setStep(4);
    } catch {
      setError(t.errSend + contacts.phone);
    } finally {
      setSending(false);
    }
  }

  const summary = (
    <div className="mb-4 border-b border-paper/20 pb-3 text-[13px] leading-relaxed text-paper/70">
      <div className="label-mono mb-1 text-paper/60">
        {t.summary}
      </div>
      <div>
        <span className="font-mono text-paper">{weight} kg</span>
        {" · "}
        {material.name}
        {" · "}
        {cityValue}
        {" · "}
        {methodNames[effMethod]}
        {!over100 && (
          <span className="font-mono text-paper">
            {" · "}≈ {eur(price)}
          </span>
        )}
      </div>
    </div>
  );

  const methodMeta: Record<
    Method,
    { t: string; d: string; tag: string | null }
  > = {
    send: {
      t: t.methods.send.t,
      d: t.methods.send.d,
      tag: t.methods.send.tag,
    },
    pickup: {
      t: t.methods.pickup.t,
      d: pickupOk
        ? t.methods.pickup.d
        : t.methods.pickup.dDisabled,
      tag: null,
    },
    warehouse: {
      t: t.methods.warehouse.t,
      d: t.methods.warehouse.d,
      tag: null,
    },
  };

  const h2 = " lg:text-[20px] leading-tight font-medium tracking-tight";

  return (
    <div
      id="calculator"
      className="scroll-mt-20 flex min-h-[600px] max-h-[600px] flex-col overflow-y-auto bg-ink p-3 text-paper sm:p-4 lg:min-h-[430px] lg:max-h-[min(490px,calc(100svh-220px))] lg:p-5 z-10 relative"
    >
      {/* Компактная шапка */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="text-[17px] font-medium tracking-tight">
          <h2 className={h2}>{step === 1 ? t.matTitle : step === 2 ? t.placeTitle : t.contactTitleSend}</h2>
            
        </div>

        {step <= 3 && (
          <div className="font-mono text-[11px] text-paper/45 whitespace-nowrap">
            {step} / 3
          </div>
        )}
      </div>

      {step <= 3 && (
        <div className="mt-2 mb-4 grid shrink-0 grid-cols-3 gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-[3px] ${
                i <= step ? "bg-accent" : "bg-paper/15"
              }`}
            />
          ))}
        </div>
      )}

      {step === 4 ? (
        <div className="flex flex-1 flex-col justify-center py-4">
          <div className="grid size-12 place-items-center bg-accent text-2xl text-ink">
            ✓
          </div>

          <h2 className="mt-4 text-[30px] leading-tight font-medium tracking-tight">
            {t.doneTitle}
          </h2>

          <p className="mt-2 max-w-md text-[14px] text-paper/70">
            {t.doneText}
          </p>

          <div className="mt-5 border-l-2 border-accent pl-3 text-[14px] text-paper/80">
            <b className="text-paper">{t.doneNext}</b>
            <br />
            {effMethod === "send"
              ? t.doneSend
              : effMethod === "pickup"
                ? t.donePickup
                : t.doneWarehouse}
          </div>

          <div className="mt-5 text-[13px] text-paper/55">
            {t.urgent}{" "}
            <a
              href={contacts.phoneHref}
              className="font-mono text-paper"
            >
              {contacts.phone}
            </a>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-6">
          {/* Левая колонка */}
          <div className="min-w-0">
            {/* ШАГ 1 — металлы и вес */}
            {step === 1 && (
              <div>

                {/* На мобильном — две колонки.
                    На десктопе — все материалы в одной строке. */}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:flex lg:gap-2">
                  {materials.map((m) => {
                    const on = m.id === mat;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMat(m.id)}
                        aria-pressed={on}
                        className={`min-w-0 border p-2 text-left transition-colors lg:flex-1 ${
                          on
                            ? "border-accent bg-ink-2"
                            : "border-paper/15 bg-ink hover:border-paper/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className=" font-mono text-[10px] text-paper/45 sm:text-[11px]">
                            {m.code}
                          </span>

                          <span
                            className={`grid size-3.5 shrink-0 place-items-center border ${
                              on
                                ? "border-accent bg-accent"
                                : "border-paper/35"
                            }`}
                          >
                            {on && (
                              <span className="size-1.5 bg-ink" />
                            )}
                          </span>
                        </div>

                        <div className="mt-2 break-words text-[12px] leading-tight font-medium sm:text-[13px] lg:text-[12px] xl:text-[13px]">
                          {m.title}
                        </div>

                        <div className="hidden md:block mt-1 break-words text-[10px] leading-snug text-paper/50 sm:text-[11px]">
                          {m.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <div className="label-mono mt-4 mb-2 text-paper/75">
                    {t.weightTitle}
                  </div>
                  
                  <div className="flex items-baseline gap-3 border-b border-paper/25 pb-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      placeholder="0"
                      value={weightText}
                      onChange={(e) => {
                        setWeightText(
                          e.target.value
                            .replace(/\D/g, "")
                            .replace(/^0+(?=\d)/, ""),
                        );
                        setOver100Chip(false);
                      }}
                      className="w-full bg-transparent font-mono text-[36px] leading-none text-paper outline-none placeholder:text-paper/25 sm:text-[40px]"
                      aria-label={t.weightAria}
                    />

                    <span className="font-mono text-lg text-paper/50">
                      kg
                    </span>
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={Math.min(100, Math.max(5, weight))}
                    onChange={(e) => setW(+e.target.value)}
                    className="mt-3 w-full accent-[#ff5c39]"
                    aria-label={t.sliderAria}
                  />

                  <div className="mt-0.5 flex justify-between font-mono text-[10px] text-paper/45">
                    <span>5 kg</span>
                    <span>100 kg</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 hidden lg:flex">
                    {[5, 20, 50, 100].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setW(n)}
                        className={`border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                          weight === n && !over100Chip
                            ? "border-accent text-accent"
                            : "border-paper/25 hover:border-paper"
                        }`}
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
                      className={`border px-3 py-1.5 font-mono text-[12px] ${
                        over100
                          ? "border-accent text-accent"
                          : "border-paper/25 hover:border-paper"
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ШАГ 2 — город и способ передачи */}
            {step === 2 && (
              <div>
                <CityPicker
                  cities={cities}
                  value={city}
                  onChange={setCity}
                  t={cityT}
                />

                <div className="label-mono mt-4 mb-2 text-paper/75">
                  {t.methodLabel}
                </div>

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
                        onKeyDown={(e) => {
                          if (
                            (e.key === "Enter" || e.key === " ") &&
                            !disabled
                          ) {
                            e.preventDefault();
                            setMethod(m);
                          }
                        }}
                        className={`flex gap-3 border-b border-paper/20 py-2.5 ${
                          disabled
                            ? "cursor-not-allowed opacity-40"
                            : "cursor-pointer"
                        }`}
                      >
                        <span
                          className={`mt-1 grid size-4 shrink-0 place-items-center border ${
                            on ? "border-accent" : "border-paper/40"
                          }`}
                        >
                          {on && <span className="size-2 bg-accent" />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="text-[14px] font-medium">
                              {meta.t}
                            </b>

                            {meta.tag && (
                              <span className="label-mono bg-paper px-1.5 py-0.5 text-ink">
                                {meta.tag}
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 text-[12px] leading-snug text-paper/60">
                            {meta.d}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ШАГ 3 — контактные данные */}
            {step === 3 && (
              <div>
                {summary}
                <label className="label-mono mb-1.5 block text-paper/60">
                  {t.contactLabel}
                </label>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+34 600 000 000"
                  className={input}
                />

                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-paper/80">
                  <input
                    type="checkbox"
                    checked={workedBefore}
                    onChange={(e) => setWorkedBefore(e.target.checked)}
                    className="size-4 accent-[#ff5c39]"
                  />
                  {t.workedBefore}
                </label>

                {effMethod !== "send" && (
                  <div className="mt-4">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                      <label className="label-mono text-paper/60">
                        {t.whenLabel}
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {vd.map((d) => {
                        const on = visits.includes(d);

                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              setVisits((v) =>
                                on
                                  ? v.filter((x) => x !== d)
                                  : [...v, d],
                              )
                            }
                            className={`border px-2.5 py-1.5 font-mono text-[12px] ${
                              on
                                ? "border-accent bg-accent text-ink"
                                : "border-paper/25"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {effMethod === "send" && (
                  <div className="mt-4">
                    <label className="label-mono mb-1.5 block text-paper/60">
                      {t.payLabel}
                    </label>

                    <input
                      value={payName}
                      onChange={(e) => setPayName(e.target.value)}
                      placeholder={t.payName}
                      className={input}
                    />

                    <input
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder={t.iban}
                      className={`${input} mt-2 font-mono text-[14px]`}
                    />
                  </div>
                )}

                {error && (
                  <p className="mt-3 border-l-2 border-accent pl-3 text-[13px] text-accent">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Правая колонка: стоимость и отдельные кнопки под ней */}
          <aside className="min-w-0 h-full flex flex-col justify-between lg:gap-4">
            {/* Карточка стоимости — кнопки внутрь неё не входят */}
            <div className="border border-paper/15 p-4 lg:p-4">
              <div className="label-mono text-paper/55">
                {t.estimate}
              </div>

              {over100 ? (
                <>
                  <div className="mt-2 text-2xl font-medium">
                    {t.custom}
                  </div>

                  <p className="mt-2 text-[13px] leading-snug text-paper/60">
                    {t.over100}{" "}
                    <a
                      href={contacts.phoneHref}
                      className="font-mono underline"
                    >
                      {contacts.phone}
                    </a>
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-3 lg:mt-6 font-mono text-[clamp(30px,3vw,40px)] leading-none tracking-tight text-accent">
                    ≈ {eur(price)}
                  </div>

                  <div className=" hidden lg:block mt-3 lg:mt-6 border-t border-paper/15 pt-2 text-[11px] leading-relaxed text-paper/45">
                    {material.name}

                    <div className="hidden lg:block mt-1 text-[11px] leading-relaxed text-paper/45">
                      {weight} kg × {eur(material.rate)}
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Кнопки расположены снаружи блока стоимости */}
            <div className="mt-4 lg:mt-auto flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  className={btnBack}
                  onClick={() => {
                    setError(null);
                    setStep(step - 1);
                  }}
                  aria-label={t.back}
                >
                  ←
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  className={btnNext}
                  onClick={() => {
                    setError(null);
                    setStep(step + 1);
                  }}
                  disabled={step === 1 && weight < 1}
                >
                  {t.continue}
                </button>
              ) : (
                <button
                  type="button"
                  className={btnNext}
                  onClick={submit}
                  disabled={sending}
                >
                  {sending ? t.sending : t.submit}
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
