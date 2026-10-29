
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

const input = "calc-text-field";

const btnNext = "btn calc-action";

const btnBack = "calc-back";

export function Calculator({
  t,
  cityT,
  materials: materialTexts,
  numberLocale,
  copy,
}: {
  photos: Record<string, string | null>;
  t: Dict["calc"];
  cityT: Dict["city"];
  materials: Dict["materials"];
  history: Dict["history"];
  numberLocale: string;
  copy: { title: string; materials: string[]; weight: string; priceLabel: string; disclaimer: string; continue: string };
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

  const x = Math.min(100, Math.max(5, weight));
  const fillPct = ((x - 5) / 95) * 100;

  return (
    <div id="calculator" className="calculator">
      <div className="calc-body">
      {/* ШАГ 1 — материал и вес */}
      {step === 1 && (
        <div id="calc-step-one">
          <div className="calc-top">
            <h3>{copy.title}</h3>
          </div>

          <div aria-label={t.matTitle} className="material-grid" role="group">
            {materials.map((m, i) => {
              const on = m.id === mat;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMat(m.id)}
                  aria-pressed={on}
                  className={`material ${on ? "selected" : ""}`}
                >
                  {copy.materials[i] ?? m.title}
                </button>
              );
            })}
          </div>

          <div className="weight-top">
            <label htmlFor="weight">{copy.weight}</label>
            <strong>
              <output id="weight-value">{weight}</output> kg
            </strong>
          </div>

          <input
            type="range"
            id="weight"
            className="range"
            min={5}
            max={100}
            step={1}
            value={x}
            onChange={(e) => setW(+e.target.value)}
            aria-label={t.sliderAria}
            style={{
              background: `linear-gradient(90deg,var(--accent) 0%,var(--accent) ${fillPct}%,#505054 ${fillPct}%,#505054 100%)`,
            }}
          />
          <div className="range-label">
            <span>5 kg</span>
            <span>100 kg</span>
          </div>

          <div className="price-box">
            <span>{copy.priceLabel}</span>
            {over100 ? (
              <>
                <div className="price-num">{t.custom}</div>
                <div className="price-disclaimer">
                  {t.over100} <a href={contacts.phoneHref}>{contacts.phone}</a>
                </div>
              </>
            ) : (
              <>
                <div className="price-num" id="price">≈ {eur(price)}</div>
                <div className="price-disclaimer">
                  {copy.disclaimer}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className={btnNext}
            onClick={() => {
              setError(null);
              setStep(2);
            }}
            disabled={weight < 1}
          >
            {copy.continue} <span className="arrow">↗</span>
          </button>
        </div>
      )}

      {/* ШАГ 2 — город и способ передачи */}
      {step === 2 && (
        <div className="calc-followup">
          <h3>{t.placeTitle}</h3>

          <CityPicker cities={cities} value={city} onChange={setCity} t={cityT} />

          <div className="calc-field-label" style={{ marginTop: 16 }}>
            {t.methodLabel}
          </div>
          <div className="calc-delivery-options" role="radiogroup">
            {(["send", "pickup", "warehouse"] as Method[]).map((m) => {
              const disabled = m === "pickup" && !pickupOk;
              const on = effMethod === m;
              const meta = methodMeta[m];

              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => setMethod(m)}
                  className={`calc-delivery ${on ? "selected" : ""}`}
                >
                  <b>{meta.t}</b>
                  {meta.tag && <span> · {meta.tag}</span>}
                  <div style={{ fontSize: 12, color: "#adadb1", marginTop: 4 }}>{meta.d}</div>
                </button>
              );
            })}
          </div>

          <div className="calc-inline-actions">
            <button type="button" className={btnBack} onClick={() => setStep(1)}>
              ← {t.back}
            </button>
            <button type="button" className="btn" onClick={() => setStep(3)}>
              {copy.continue} <span className="arrow">↗</span>
            </button>
          </div>
        </div>
      )}

      {/* ШАГ 3 — контакты */}
      {step === 3 && (
        <div className="calc-followup">
          <h3>{t.contactTitleSend}</h3>

          <div className="calc-summary">
            <div>
              <b>{t.weightTitle}</b>
              <span>{weight} kg</span>
            </div>
            <div>
              <b>{t.matTitle}</b>
              <span>{material.name}</span>
            </div>
            <div>
              <b>{t.placeTitle}</b>
              <span>{cityValue}</span>
            </div>
            <div>
              <b>{t.methodLabel}</b>
              <span>{methodNames[effMethod]}</span>
            </div>
            {!over100 && (
              <div>
                <b>{t.estimate}</b>
                <span>≈ {eur(price)}</span>
              </div>
            )}
          </div>

          <div className="calc-field-label" style={{ marginTop: 20 }}>
            {t.contactLabel}
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+34 600 000 000"
            className={input}
          />

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, fontSize: 13, color: "#ccc" }}>
            <input
              type="checkbox"
              checked={workedBefore}
              onChange={(e) => setWorkedBefore(e.target.checked)}
            />
            {t.workedBefore}
          </label>

          {effMethod !== "send" && (
            <div style={{ marginTop: 16 }}>
              <div className="calc-field-label">{t.whenLabel}</div>
              <div className="calc-delivery-options">
                {vd.map((d) => {
                  const on = visits.includes(d);

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setVisits((v) => (on ? v.filter((item) => item !== d) : [...v, d]))
                      }
                      className={`calc-delivery ${on ? "selected" : ""}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {effMethod === "send" && (
            <div style={{ marginTop: 16 }}>
              <div className="calc-field-label">{t.payLabel}</div>
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
                className={input}
                style={{ marginTop: 8 }}
              />
            </div>
          )}

          {error && (
            <p style={{ marginTop: 12, color: "#ff5c39", fontSize: 13 }}>{error}</p>
          )}

          <div className="calc-inline-actions">
            <button
              type="button"
              className={btnBack}
              onClick={() => {
                setError(null);
                setStep(2);
              }}
            >
              ← {t.back}
            </button>
            <button type="button" className="btn" onClick={submit} disabled={sending}>
              {sending ? t.sending : t.submit} <span className="arrow">↗</span>
            </button>
          </div>
        </div>
      )}

      {/* ШАГ 4 — отправлено */}
      {step === 4 && (
        <div className="calc-followup">
          <h3>{t.doneTitle}</h3>
          <p className="calc-followup-intro">{t.doneText}</p>
          <div className="calc-summary">
            <div>
              <b>{t.doneNext}</b>
              <span>
                {effMethod === "send"
                  ? t.doneSend
                  : effMethod === "pickup"
                    ? t.donePickup
                    : t.doneWarehouse}
              </span>
            </div>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "#aaa" }}>
            {t.urgent} <a href={contacts.phoneHref}>{contacts.phone}</a>
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
