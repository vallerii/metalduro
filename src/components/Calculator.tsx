"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { cities, contacts, materials, type MaterialId } from "@/content/site";

type Method = "send" | "pickup" | "warehouse";
const methodNames: Record<Method, string> = {
  send: "Отправка",
  pickup: "Самовывоз",
  warehouse: "Склад Barcelona",
};

const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

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
const fmt = (d: Date) => `${d.getDate()} ${months[d.getMonth()]}`;

function weekends() {
  return nextDays(6, 3).map((sat) => {
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    return sat.getMonth() === sun.getMonth()
      ? `${sat.getDate()}–${sun.getDate()} ${months[sat.getMonth()]}`
      : `${fmt(sat)} – ${fmt(sun)}`;
  });
}
function visitDays() {
  const fr = nextDays(5, 3);
  return fr.flatMap((f) => {
    const s = new Date(f);
    s.setDate(f.getDate() + 1);
    return [f, s].map((x) => `${days[x.getDay()]}, ${fmt(x)}`);
  });
}

const eur = (n: number) => n.toLocaleString("ru-RU") + " €";

const input =
  "w-full border border-paper/25 bg-transparent px-4 py-3.5 text-[17px] text-paper outline-none placeholder:text-paper/35 focus:border-accent";
const btnNext =
  "flex-1 bg-accent px-5 py-3.5 text-left text-[16px] font-medium text-ink transition-colors hover:bg-paper disabled:opacity-40";
const btnBack =
  "border border-paper/25 px-5 py-3.5 text-paper transition-colors hover:border-paper";

export function Calculator({ photos }: { photos: Record<string, string | null> }) {
  const [step, setStep] = useState(1);
  const [mat, setMat] = useState<MaterialId>("solid");
  const [weight, setWeight] = useState(20);
  const [over100, setOver100] = useState(false);
  const [city, setCity] = useState("");
  const [otherCity, setOtherCity] = useState("");
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
  const cityValue = city === "other" ? otherCity || "Другой город" : city || "Город не указан";
  const pickupOk = weight >= 50;
  const effMethod: Method = method === "pickup" && !pickupOk ? "send" : method;

  // даты считаются только на клиенте, когда пользователь дошел до шагов 4–5
  const wk = useMemo(() => (step >= 4 ? weekends() : []), [step]);
  const vd = useMemo(() => (step >= 5 ? visitDays() : []), [step]);

  const setW = (n: number) => {
    setWeight(Math.max(5, Math.min(100, n)));
    setOver100(false);
  };

  async function submit() {
    if (phone.trim().length < 6) {
      setError("Укажите телефон, чтобы мы могли связаться с вами.");
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
      setStep(6);
    } catch {
      setError("Не удалось отправить. Позвоните нам: " + contacts.phone);
    } finally {
      setSending(false);
    }
  }

  const summary = (
    <div className="mt-6 border-t border-paper/20 pt-5 text-[15px] leading-relaxed text-paper/75">
      <div className="label-mono mb-2 text-paper/45">Ваша заявка</div>
      <div className="font-mono text-3xl text-paper">{weight} кг</div>
      <div>{material.name}</div>
      <div>{cityValue}</div>
      <div className="mt-1">
        Способ передачи: <span className="text-paper">{methodNames[effMethod]}</span>
      </div>
    </div>
  );

  return (
    <div id="calculator" className="scroll-mt-20 bg-ink p-5 text-paper sm:p-6 xl:p-7">
      <div className="flex items-baseline justify-between">
        <div className="text-[19px] font-medium tracking-tight">Расчет стоимости</div>
        <div className="label-mono text-paper/50">{step <= 5 ? `Шаг ${step} из 5` : "Заявка отправлена"}</div>
      </div>
      <div className="mt-3 mb-5 grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-[3px] ${i <= step ? "bg-accent" : "bg-paper/15"}`} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-[24px] leading-tight font-medium tracking-tight">Что у вас за материал?</h2>
          <p className="mt-1.5 mb-4 text-[14px] text-paper/60">
            Выберите наиболее похожий вариант. Точный состав мы проверим после получения.
          </p>
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
                  <div className="relative h-[clamp(64px,11vh,140px)] overflow-hidden bg-ink-2">
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
          <div className="mt-5 flex gap-2">
            <button className={btnNext} onClick={() => setStep(2)}>Продолжить →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-[24px] leading-tight font-medium tracking-tight">Укажите вес</h2>
          <p className="mt-1.5 mb-4 text-[14px] text-paper/60">
            Выберите вес материала. До 100 кг стоимость рассчитывается сразу.
          </p>
          <div className="flex items-baseline gap-3 border-b border-paper/25 pb-2">
            <input
              type="number"
              min={5}
              max={100}
              step={5}
              value={weight}
              onChange={(e) => setW(+e.target.value || 5)}
              className="w-full bg-transparent font-mono text-[56px] leading-none text-paper outline-none"
              aria-label="Вес, кг"
            />
            <span className="font-mono text-xl text-paper/50">кг</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={weight}
            onChange={(e) => setW(+e.target.value)}
            className="mt-6 w-full accent-[#ff5c39]"
            aria-label="Вес, ползунок"
          />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-paper/45">
            <span>5 кг</span>
            <span>100 кг</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[5, 20, 50, 100].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setW(n)}
                className={`border px-3.5 py-2 font-mono text-sm transition-colors ${weight === n && !over100 ? "border-accent text-accent" : "border-paper/25 hover:border-paper"}`}
              >
                {n} кг
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setWeight(100);
                setOver100(true);
              }}
              className={`border px-3.5 py-2 font-mono text-sm ${over100 ? "border-accent text-accent" : "border-paper/25 hover:border-paper"}`}
            >
              100+ кг
            </button>
          </div>
          {over100 && (
            <div className="mt-5 border-l-2 border-accent pl-4 text-[15px] text-paper/80">
              <b className="text-paper">Более 100 кг?</b> Для больших объемов рассчитаем условия индивидуально. Позвоните нам:{" "}
              <a href={contacts.phoneHref} className="font-mono text-paper underline">{contacts.phone}</a>.
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button className={btnBack} onClick={() => setStep(1)} aria-label="Назад">←</button>
            <button className={btnNext} onClick={() => setStep(3)}>Продолжить →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-[24px] leading-tight font-medium tracking-tight">Где находится материал?</h2>
          <p className="mt-1.5 mb-4 text-[14px] text-paper/60">
            Выберите ближайший к вам крупный город. Если его нет в списке — укажите свой.
          </p>
          <div className="relative">
          <svg aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" width="12" height="8"><path d="M1 1l5 5 5-5" stroke="currentColor" fill="none" /></svg>
          <select value={city} onChange={(e) => setCity(e.target.value)} className={`${input} appearance-none pr-10`}>
            <option value="" className="bg-ink">Выберите город</option>
            {cities.map((c) => (
              <option key={c} className="bg-ink">{c}</option>
            ))}
            <option value="other" className="bg-ink">Другой город</option>
          </select>
          </div>
          {city === "other" && (
            <input value={otherCity} onChange={(e) => setOtherCity(e.target.value)} placeholder="Введите ваш город" className={`${input} mt-2`} />
          )}
          <div className="mt-5 flex gap-2">
            <button className={btnBack} onClick={() => setStep(2)} aria-label="Назад">←</button>
            <button className={btnNext} onClick={() => setStep(4)}>Показать стоимость →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="bg-accent p-5 text-ink">
            <div className="text-[14px]">Ориентировочная стоимость вашего материала</div>
            <div className="mt-1 font-mono text-[44px] leading-none tracking-tight">≈ {eur(price)}</div>
            <div className="mt-3 font-mono text-[12px] opacity-75">
              {material.name} · {weight} кг · ориентир {material.rate} €/кг
            </div>
          </div>
          <h3 className="mt-5 mb-2 text-lg font-medium">Как хотите передать материал?</h3>
          <div className="border-t border-paper/20">
            {(["send", "pickup", "warehouse"] as Method[]).map((m) => {
              const disabled = m === "pickup" && !pickupOk;
              const on = effMethod === m;
              const meta = {
                send: { t: "Отправить нам", d: "Без предоплаты. Доставку оплачиваем мы. После получения проверяем материал и переводим деньги.", tag: "Рекомендуем" },
                pickup: { t: "Самовывоз от 50 кг", d: pickupOk ? "Мы приезжаем в выходной день и рассчитываемся на месте." : "Самовывоз доступен от 50 кг. Увеличьте вес, чтобы выбрать этот вариант.", tag: null },
                warehouse: { t: "Привезти на склад в Barcelona", d: "Выберите этот вариант, а на следующем шаге отметьте несколько удобных дат.", tag: null },
              }[m];
              return (
                <div
                  key={m}
                  role="radio"
                  aria-checked={on}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : 0}
                  onClick={() => !disabled && setMethod(m)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && setMethod(m)}
                  className={`flex gap-4 border-b border-paper/20 py-3 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                >
                  <span className={`mt-1 grid size-4 shrink-0 place-items-center border ${on ? "border-accent" : "border-paper/40"}`}>
                    {on && <span className="size-2 bg-accent" />}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="font-medium">{meta.t}</b>
                      {meta.tag && <span className="label-mono bg-paper px-1.5 py-0.5 text-[10px] text-ink">{meta.tag}</span>}
                    </div>
                    <div className="mt-1 text-[14px] text-paper/60">{meta.d}</div>
                    {m === "pickup" && pickupOk && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {wk.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMethod("pickup");
                              setPickupDate(d);
                            }}
                            className={`border px-3 py-1.5 font-mono text-[13px] ${pickupDate === d ? "border-accent bg-accent text-ink" : "border-paper/25"}`}
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
          {effMethod === "send" && (
            <p className="mt-4 text-[14px] text-paper/65">
              <b className="text-paper">После подтверждения заявки</b> мы покажем короткую видеоинструкцию по упаковке и дадим данные для отправки. Для выплаты запросим имя получателя и IBAN.
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button className={btnBack} onClick={() => setStep(3)} aria-label="Назад">←</button>
            <button className={btnNext} onClick={() => setStep(5)}>Продолжить →</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-[24px] leading-tight font-medium tracking-tight">
            {effMethod === "send" ? "Контактные данные и выплата" : "Контактные данные и дата"}
          </h2>
          <p className="mt-1.5 mb-4 text-[14px] text-paper/60">
            {effMethod === "send"
              ? "Оставьте телефон и данные для выплаты после проверки материала."
              : "Выберите несколько удобных дат и оставьте телефон. Мы свяжемся с вами для подтверждения."}
          </p>
          <label className="label-mono mb-2 block text-paper/50">Контактные данные</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+34 600 000 000" className={input} />
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-[14px] text-paper/80">
            <input type="checkbox" checked={workedBefore} onChange={(e) => setWorkedBefore(e.target.checked)} className="size-4 accent-[#ff5c39]" />
            Я уже работал с вами ранее
          </label>

          {effMethod !== "send" && (
            <div className="mt-6">
              <label className="label-mono mb-1 block text-paper/50">Когда вам удобно?</label>
              <p className="mb-3 text-[14px] text-paper/55">Можно выбрать несколько вариантов. Мы свяжемся с вами по телефону и подтвердим дату.</p>
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
            <div className="mt-6">
              <label className="label-mono mb-2 block text-paper/50">Данные для выплаты</label>
              <input value={payName} onChange={(e) => setPayName(e.target.value)} placeholder="Имя и фамилия получателя" className={input} />
              <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN · ES00 0000 0000 0000 0000 0000" className={`${input} mt-2 font-mono text-[15px]`} />
            </div>
          )}

          {summary}
          {error && <p className="mt-4 border-l-2 border-accent pl-3 text-[14px] text-accent">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button className={btnBack} onClick={() => setStep(4)} aria-label="Назад">←</button>
            <button className={btnNext} onClick={submit} disabled={sending}>
              {sending ? "Отправляем…" : "Отправить заявку"}
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="py-6">
          <div className="grid size-14 place-items-center bg-accent text-2xl text-ink">✓</div>
          <h2 className="mt-6 text-[34px] leading-tight font-medium tracking-tight">Спасибо за вашу заявку!</h2>
          <p className="mt-3 max-w-md text-[16px] text-paper/70">
            Мы получили ваши данные и свяжемся с вами по указанному номеру телефона, чтобы подтвердить следующие шаги.
          </p>
          <div className="mt-6 border-l-2 border-accent pl-4 text-[15px] text-paper/80">
            <b className="text-paper">Что дальше?</b>
            <br />
            {effMethod === "send"
              ? "Мы подтвердим заявку и отправим инструкции по упаковке и отправке материала. После получения и проверки произведем выплату."
              : effMethod === "pickup"
                ? "Мы свяжемся с вами, согласуем удобную дату самовывоза и подтвердим детали."
                : "Мы свяжемся с вами и подтвердим дату и время, когда можно привезти материал на склад в Barcelona."}
          </div>
          <div className="mt-8 text-[14px] text-paper/55">
            Если вопрос срочный: <a href={contacts.phoneHref} className="font-mono text-paper">{contacts.phone}</a>
          </div>
        </div>
      )}
    </div>
  );
}
