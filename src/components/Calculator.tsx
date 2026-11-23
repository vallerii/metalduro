"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { createCalculatorApplicationAction } from "@/app/actions/calculator";
import {
  clearCalculatorDraft,
  readCalculatorDraft,
  writeCalculatorDraft,
  type CalculatorDeliveryMethod,
} from "@/lib/calculator-draft";
import { CityPicker } from "./CityPicker";
import { cities, materialMeta, type MaterialId } from "@/content/site";
import type { Dict } from "@/content/dict";

type Method = CalculatorDeliveryMethod;
type ViewerRole = "client" | "admin";
const legacyDraftKey = "metalduro:calculator-draft:v1";
const input = "calc-text-field";
const btnNext = "btn calc-action";
const btnBack = "calc-back";

function nextDays(weekday: number, count: number) {
  const out: Date[] = [];
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 2);
  while (out.length < count) {
    if (date.getDay() === weekday) out.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return out;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function visitDays(months: string[], days: string[]) {
  const format = (date: Date) =>
    `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  return nextDays(5, 3).flatMap((friday) => {
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);
    return [friday, saturday].map((date) => ({
      date: dateKey(date),
      label: format(date),
    }));
  });
}

function subscribeToHydration() {
  return () => {};
}

export function Calculator({
  t,
  cityT,
  materials: materialTexts,
  numberLocale,
  copy,
  materialRates,
  viewerRole = null,
}: {
  t: Dict["calc"];
  cityT: Dict["city"];
  materials: Dict["materials"];
  numberLocale: string;
  materialRates: Partial<Record<MaterialId, number>>;
  copy: {
    title: string;
    materials: string[];
    weight: string;
    priceLabel: string;
    disclaimer: string;
    continue: string;
  };
  viewerRole?: ViewerRole | null;
}) {
  const router = useRouter();
  const materials = materialTexts.map((material) => ({
    ...material,
    ...materialMeta[material.id],
    rate: materialRates[material.id] ?? null,
  }));
  const [step, setStep] = useState(1);
  const [mat, setMat] = useState<MaterialId>("solid");
  const [weightText, setWeightText] = useState("20");
  const [city, setCity] = useState("");
  const [method, setMethod] = useState<Method>("send");
  const [visits, setVisits] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [workedBefore, setWorkedBefore] = useState(false);
  const [payName, setPayName] = useState("");
  const [iban, setIban] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [rateOverrides, setRateOverrides] = useState<Partial<Record<MaterialId, number>>>({});
  const [sending, setSending] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      try {
        window.sessionStorage.removeItem(legacyDraftKey);
      } catch {}
      const draft = readCalculatorDraft(window.localStorage);
      if (!draft) return;
      setMat(draft.materialId);
      setWeightText(draft.weightText);
      setCity(draft.city);
      setMethod(draft.deliveryMethod);
      setStep(viewerRole === "client" ? 3 : 2);
      setAuthRequired(viewerRole === null);
      setNotice(
        params.get("checkout") === "1" || viewerRole === "client"
          ? t.draftRestored
          : t.draftSaved,
      );
      document.getElementById("calculator")?.scrollIntoView({ block: "center" });
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [t.draftRestored, t.draftSaved, viewerRole]);

  const weight = Number(weightText);
  const safeWeight = Number.isFinite(weight) ? weight : 0;
  const pickupOk = safeWeight >= 50;
  const effectiveMethod: Method =
    method === "pickup" && !pickupOk ? "send" : method;
  const material = materials.find((item) => item.id === mat) ?? materials[0];
  const rate = rateOverrides[mat] ?? material?.rate ?? null;
  const pricingAvailable = rate !== null && Number.isFinite(rate) && rate > 0;
  const price = safeWeight * (rate ?? 0);
  const cityValue = city.trim() || t.noCity;
  const visitOptions = useMemo(
    () => (hydrated ? visitDays(t.months, t.days) : []),
    [hydrated, t.months, t.days],
  );
  const euro = (value: number) =>
    `${value.toLocaleString(numberLocale, { maximumFractionDigits: 2 })} €`;

  const invalidateIntent = () => {
    setIdempotencyKey(null);
    setAuthRequired(false);
    setError(null);
  };

  const setWeight = (value: number) => {
    invalidateIntent();
    setWeightText(String(value));
  };

  const persistDraft = () =>
    writeCalculatorDraft(window.localStorage, {
      materialId: mat,
      weightText,
      city: city.trim(),
      deliveryMethod: effectiveMethod,
    });

  const discardDraft = () => {
    clearCalculatorDraft(window.localStorage);
    setMat("solid");
    setWeightText("20");
    setCity("");
    setMethod("send");
    setVisits([]);
    setWorkedBefore(false);
    setPhone("");
    setPayName("");
    setIban("");
    setIdempotencyKey(null);
    setNotice(null);
    setError(null);
    setAuthRequired(false);
    setStep(1);
  };

  const continueAfterDelivery = () => {
    const draftSaved = persistDraft();
    setError(null);
    if (viewerRole === "client") {
      setAuthRequired(false);
      setStep(3);
      return;
    }
    if (viewerRole === "admin") {
      setAuthRequired(false);
      setError(t.errClientOnly);
      return;
    }
    setNotice(draftSaved ? t.draftSaved : t.draftUnavailable);
    setAuthRequired(true);
  };

  async function submit() {
    if (submitLock.current) return;
    if (!pricingAvailable) {
      setError(t.errUnavailable);
      return;
    }
    if (!Number.isFinite(safeWeight) || safeWeight < 5 || safeWeight > 100000) {
      setError(t.errWeight);
      return;
    }
    if (phone.trim().length < 6) {
      setError(t.errPhone);
      return;
    }
    if (effectiveMethod === "send" && payName.trim().length < 2) {
      setError(t.errPayName);
      return;
    }
    const normalizedIban = iban.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (effectiveMethod === "send" && !/^ES[0-9]{22}$/.test(normalizedIban)) {
      setError(t.errIban);
      return;
    }

    const requestKey = idempotencyKey ?? crypto.randomUUID();
    submitLock.current = true;
    setIdempotencyKey(requestKey);
    setError(null);
    setNotice(null);
    setAuthRequired(false);
    setSending(true);

    try {
      const result = await createCalculatorApplicationAction({
        materialId: mat,
        weightKg: safeWeight,
        city: city.trim(),
        deliveryMethod: effectiveMethod,
        phone: phone.trim(),
        repeatCustomer: workedBefore,
        paymentRecipientName: effectiveMethod === "send" ? payName.trim() : "",
        paymentIban: effectiveMethod === "send" ? normalizedIban : "",
        preferredVisitDates: effectiveMethod === "send" ? [] : visits,
        idempotencyKey: requestKey,
        previewRateEur: rate ?? 0,
      });

      if (result.status === "success") {
        clearCalculatorDraft(window.localStorage);
        setStep(4);
        router.push(`/account/applications/${result.applicationId}?created=1`);
        return;
      }
      if (result.status === "auth_required") {
        setAuthRequired(true);
        setError(result.message);
        return;
      }
      if (result.status === "price_changed") {
        setRateOverrides((current) => ({
          ...current,
          [mat]: result.currentRateEur,
        }));
        setNotice(result.message);
        return;
      }
      setError(result.message);
    } catch {
      setError(t.errCreate);
    } finally {
      submitLock.current = false;
      setSending(false);
    }
  }

  const methodMeta: Record<Method, { title: string; detail: string; tag: string | null }> = {
    send: { title: t.methods.send.t, detail: t.methods.send.d, tag: t.methods.send.tag },
    pickup: {
      title: t.methods.pickup.t,
      detail: pickupOk ? t.methods.pickup.d : t.methods.pickup.dDisabled,
      tag: null,
    },
    warehouse: { title: t.methods.warehouse.t, detail: t.methods.warehouse.d, tag: null },
  };
  const rangeWeight = Math.min(100, Math.max(5, safeWeight || 5));
  const fillPct = ((rangeWeight - 5) / 95) * 100;
  const authQuery = encodeURIComponent("/?checkout=1");

  return (
    <div id="calculator" className="calculator">
      <div className="calc-body">
        {step === 1 && (
          <div id="calc-step-one">
            <div className="calc-top"><h3>{copy.title}</h3></div>
            <div aria-label={t.matTitle} className="material-grid" role="group">
              {materials.map((item, index) => {
                const selected = item.id === mat;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      invalidateIntent();
                      setMat(item.id);
                    }}
                    aria-pressed={selected}
                    className={`material ${selected ? "selected" : ""}`}
                  >
                    {copy.materials[index] ?? item.title}
                  </button>
                );
              })}
            </div>
            <div className="weight-top">
              <label htmlFor="weight">{copy.weight}</label>
              <strong><output id="weight-value">{safeWeight}</output> kg</strong>
            </div>
            <input
              type="range"
              id="weight"
              className="range"
              min={5}
              max={100}
              step={1}
              value={rangeWeight}
              onChange={(event) => setWeight(Number(event.target.value))}
              aria-label={t.sliderAria}
              style={{ "--range-fill": `${fillPct}%` } as CSSProperties}
            />
            <div className="range-label"><span>5 kg</span><span>100 kg</span></div>
            <div className="price-box">
              <span>{copy.priceLabel}</span>
              <div className="price-num" id="price">
                {pricingAvailable ? `≈ ${euro(price)}` : "—"}
              </div>
              <div className="price-disclaimer">{copy.disclaimer}</div>
              {!pricingAvailable ? <p className="calc-error" role="alert">{t.errUnavailable}</p> : null}
            </div>
            <button
              type="button"
              className={btnNext}
              onClick={() => {
                setError(null);
                setStep(2);
              }}
              disabled={safeWeight < 5 || !pricingAvailable}
            >
              {copy.continue} <span className="arrow">↗</span>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="calc-followup">
            <h3>{t.placeTitle}</h3>
            <CityPicker
              cities={cities}
              value={city}
              onChange={(value) => {
                invalidateIntent();
                setCity(value);
              }}
              t={cityT}
            />
            <div className="calc-field-label" style={{ marginTop: 16 }}>{t.methodLabel}</div>
            <div className="calc-delivery-options" role="radiogroup">
              {(["send", "pickup", "warehouse"] as Method[]).map((item) => {
                const disabled = item === "pickup" && !pickupOk;
                const selected = effectiveMethod === item;
                const meta = methodMeta[item];
                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => {
                      invalidateIntent();
                      setMethod(item);
                    }}
                    className={`calc-delivery ${selected ? "selected" : ""}`}
                  >
                    <b>{meta.title}</b>
                    {meta.tag && <span> · {meta.tag}</span>}
                    <div style={{ fontSize: 12, color: "#adadb1", marginTop: 4 }}>{meta.detail}</div>
                  </button>
                );
              })}
            </div>
            <div className="calc-inline-actions">
              <button type="button" className={btnBack} onClick={() => setStep(1)}>← {t.back}</button>
              <button type="button" className="btn" onClick={continueAfterDelivery}>
                {copy.continue} <span className="arrow">↗</span>
              </button>
            </div>
            {notice && (
              <div className="calc-draft-notice">
                <p className="calc-notice" role="status">{notice}</p>
                <button type="button" className="calc-draft-discard" onClick={discardDraft}>
                  {t.draftDiscard}
                </button>
              </div>
            )}
            {error && <p className="calc-error" role="alert">{error}</p>}
            {authRequired && (
              <div className="calc-auth-callout" aria-labelledby="calculator-auth-title">
                <p id="calculator-auth-title">{t.authLead}</p>
                <div>
                  <Link href={`/auth/login?next=${authQuery}`} className="btn">
                    {t.authLogin}
                  </Link>
                  <Link href={`/auth/register?next=${authQuery}`} className="calc-auth-link">
                    {t.authRegister}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="calc-followup">
            <h3>{effectiveMethod === "send" ? t.contactTitleSend : t.contactTitleDate}</h3>
            {notice && (
              <div className="calc-draft-notice">
                <p className="calc-notice" role="status">{notice}</p>
                <button type="button" className="calc-draft-discard" onClick={discardDraft}>
                  {t.draftDiscard}
                </button>
              </div>
            )}
            <div className="calc-summary">
              <div><b>{t.weightTitle}</b><span>{safeWeight} kg</span></div>
              <div><b>{t.matTitle}</b><span>{material.name}</span></div>
              <div><b>{t.placeTitle}</b><span>{cityValue}</span></div>
              <div><b>{t.methodLabel}</b><span>{t.methodNames[effectiveMethod]}</span></div>
              <div><b>{t.estimate}</b><span>{pricingAvailable ? `≈ ${euro(price)}` : "—"}</span></div>
            </div>
            <div className="calc-field-label" style={{ marginTop: 20 }}>{t.contactLabel}</div>
            <input
              value={phone}
              onChange={(event) => {
                invalidateIntent();
                setPhone(event.target.value);
              }}
              type="tel"
              autoComplete="tel"
              placeholder="+34 600 000 000"
              className={input}
              maxLength={32}
            />
            <label className="calc-checkbox">
              <input
                type="checkbox"
                checked={workedBefore}
                onChange={(event) => {
                  invalidateIntent();
                  setWorkedBefore(event.target.checked);
                }}
              />
              {t.workedBefore}
            </label>

            {effectiveMethod !== "send" && (
              <div style={{ marginTop: 16 }}>
                <div className="calc-field-label">{t.whenLabel}</div>
                <div className="calc-delivery-options">
                  {visitOptions.map((option) => {
                    const selected = visits.includes(option.date);
                    return (
                      <button
                        key={option.date}
                        type="button"
                        onClick={() => {
                          invalidateIntent();
                          setVisits((current) =>
                            selected
                              ? current.filter((date) => date !== option.date)
                              : [...current, option.date],
                          );
                        }}
                        className={`calc-delivery ${selected ? "selected" : ""}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {effectiveMethod === "send" && (
              <div style={{ marginTop: 16 }}>
                <div className="calc-field-label">{t.payLabel}</div>
                <input
                  value={payName}
                  onChange={(event) => {
                    invalidateIntent();
                    setPayName(event.target.value);
                  }}
                  placeholder={t.payName}
                  autoComplete="name"
                  className={input}
                  maxLength={120}
                />
                <input
                  value={iban}
                  onChange={(event) => {
                    invalidateIntent();
                    setIban(event.target.value);
                  }}
                  placeholder={t.iban}
                  autoComplete="off"
                  className={input}
                  maxLength={64}
                  style={{ marginTop: 8 }}
                />
              </div>
            )}

            {error && <p className="calc-error" role="alert">{error}</p>}
            <p className="calc-privacy-note">{t.sensitiveAgain}</p>

            <div className="calc-inline-actions">
              <button
                type="button"
                className={btnBack}
                onClick={() => {
                  setError(null);
                  setAuthRequired(false);
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

        {step === 4 && (
          <div className="calc-followup">
            <h3>{t.doneTitle}</h3>
            <p className="calc-followup-intro">{t.doneText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
