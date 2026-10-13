import Link from "next/link";
import { Calculator } from "@/components/Calculator";
import { Element } from "@/components/Element";
import { Pic } from "@/components/Pic";
import { VideoPlayer } from "@/components/VideoPlayer";
import { photo } from "@/lib/photos";
import {
  brands,
  buyList,
  contacts,
  ecoStats,
  faq,
  flow,
  history,
  materials,
  noBuyList,
  packingSteps,
} from "@/content/site";
import { guides } from "@/content/guides";


function SectionHead({ title, text, dark, compact }: { title: React.ReactNode; text?: string; dark?: boolean; compact?: boolean }) {
  return (
    <div className={`grid gap-6 md:grid-cols-[1.25fr_0.75fr] md:items-end md:gap-16 ${compact ? "pb-10 md:pb-12" : "pb-12 md:pb-20"}`}>
      <div>
        <h2 className="display text-[clamp(32px,3.6vw,56px)]">{title}</h2>
      </div>
      {text && <p className={`max-w-xl text-[17px] leading-relaxed ${dark ? "text-paper/65" : "text-muted"}`}>{text}</p>}
    </div>
  );
}

export default function Home() {
  const calcPhotos = Object.fromEntries(materials.map((m) => [m.photo, photo(m.photo)]));

  return (
    <main>
      {/* HERO */}
      <section className="border-b border-line">
        <div className="wrap grid gap-8 py-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[1fr_minmax(0,520px)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-14 lg:gap-y-0 lg:py-6">
          <div className="lg:col-start-1 lg:row-start-2">
            <h1 className="display text-[clamp(36px,min(4.4vw,7.6vh),68px)]">
              Покупаем твердосплавный лом по всей Испании
            </h1>
          </div>

          <div className="lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center">
            <Calculator photos={calcPhotos} />
          </div>

          <div className="lg:col-start-1 lg:row-start-3">
            <ol className="border-t border-line lg:mt-10">
              {[
                ["Отправка за наш счет", "Вы отправляете материал, мы оплачиваем доставку и рассчитываемся после проверки."],
                ["Самовывоз от 50 кг", "По выходным дням, с расчетом на месте."],
                ["Можно привезти в Барселону", "Принимаем материал на нашем складе."],
              ].map(([t], i) => (
                <li key={t} className="grid grid-cols-[44px_1fr] items-baseline gap-2 border-b border-line py-[clamp(14px,2.4vh,22px)]">
                  <span className="font-mono text-sm text-accent-deep">0{i + 1}</span>
                  <div className="text-[16px] font-medium">{t}</div>
                </li>
              ))}
            </ol>

            <p className="mt-8 border-l-2 border-accent pl-4 text-[14px] text-ink-2">
              <b className="text-ink">Важно:</b> принимаем только твердосплавный лом / карбид вольфрама и чистый вольфрам. Медь, провода, HSS и обычные металлы не принимаем.
            </p>
          </div>
        </div>
      </section>

      {/* ЧТО ПОКУПАЕМ */}
      <section id="materials" className="scroll-mt-16 border-b border-line py-[clamp(48px,7vh,88px)]">
        <div className="wrap">
          <SectionHead
            compact
            title={<>Что мы покупаем — и что нет</>}
          />
          <div className="grid gap-16 lg:grid-cols-[1.25fr_1fr] lg:gap-0">
            <div className="lg:border-r lg:border-line lg:pr-16">
              <div className="mb-6 flex items-center gap-3 text-[20px] font-medium">
                <span className="grid size-7 place-items-center bg-accent text-sm text-ink">✓</span> Покупаем
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                {buyList.map((b) => (
                  <figure key={b.title}>
                    {b.photo ? (
                      <Pic src={photo(b.photo)} alt={b.title} className="h-[clamp(100px,14vh,150px)]" sizes="(min-width:1024px) 22vw, 45vw" />
                    ) : (
                      <div className="flex h-[clamp(100px,14vh,150px)] items-center justify-center bg-ink">
                        <Element tone="accent" className="h-[70%] w-auto" />
                      </div>
                    )}
                    <figcaption className="mt-4">
                      <div className="text-[16px] font-medium">{b.title}</div>
                      <div className="text-[14px] text-muted">{b.note}</div>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="mt-8 border-t border-line pt-5">
              <div className="label-mono text-ink-2">Особенно интересует новый инструмент в упаковке</div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[16px] font-medium tracking-tight text-ink-2">
                {brands.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
              </div>
            </div>
            <div className="lg:pl-16">
              <div className="mb-6 flex items-center gap-3 text-[20px] font-medium">
                <span className="grid size-7 place-items-center bg-ink text-sm text-paper">✕</span> Не покупаем
              </div>
              <ul className="border-t border-line">
                {noBuyList.map((n) => (
                  <li key={n.title} className="grid grid-cols-[36px_1fr] border-b border-line py-4">
                    <span className="font-mono text-muted">✕</span>
                    <div>
                      <div className="text-[16px] font-medium">{n.title}</div>
                      <div className="text-[14px] text-muted">{n.note}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[14px] leading-relaxed text-muted">
                Если в партии пластин найдутся посторонние детали, применяем скидку за загрязнение <b className="text-ink">3%</b> от общего веса.
              </p>
            </div>
          </div>
        </div>
      </section>
      <a
        href={contacts.whatsapp}
        className="group block bg-accent text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <div className="wrap flex items-center justify-between gap-6 py-12">
          <span className="text-[clamp(20px,2.4vw,32px)] font-medium tracking-tight">
            Не уверены? Пришлите фото в WhatsApp — скажем, подходит ли материал.
          </span>
          <span className="text-3xl transition-transform group-hover:translate-x-2">→</span>
        </div>
      </a>

      {/* УПАКОВКА */}
      <section id="packing" className="scroll-mt-16 border-b border-line py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead
            title="Как правильно упаковать материал"
            text="Твердосплавный лом тяжелый и с острыми кромками — плохая упаковка может порваться в дороге."
          />
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h3 className="text-[24px] font-medium tracking-tight">Перед отправкой</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">
                Транспортная компания не знает, что находится внутри посылки. Материал должен оставаться надежно зафиксирован даже при неаккуратной перевозке.
              </p>
              <ol className="mt-10 border-t border-line">
                {packingSteps.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[48px_1fr] border-b border-line py-6">
                    <span className="font-mono text-sm text-accent-deep">0{i + 1}</span>
                    <div>
                      <div className="text-[16px] font-medium">{s.title}</div>
                      <div className="mt-0.5 text-[14px] text-muted">{s.text}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href="#calculator" className="mt-10 inline-block bg-accent px-6 py-4 font-medium text-ink transition-colors hover:bg-ink hover:text-paper">
                Сначала оформить заявку →
              </Link>
            </div>
            <div className="flex flex-col gap-5">
              <VideoPlayer
                src="/video/unpacking.mp4?v=34s"
                poster="/video/unpacking-poster.jpg"
                title="Как упаковать твердосплавный лом"
                caption="Видеоинструкция"
                className="h-[clamp(260px,42vh,460px)]"
              />
              <div className="grid grid-cols-3 gap-5">
                {[
                  ["pack-1", "Пример упаковки"],
                  ["bucket", "Внутренняя тара"],
                  ["pack-3", "Готовая посылка"],
                ].map(([k, l]) => (
                  <figure key={k}>
                    <Pic src={photo(k)} alt={l} label="" className="h-[clamp(100px,15vh,170px)]" sizes="(min-width:1024px) 16vw, 33vw" />
                    <figcaption className="label-mono mt-1.5 text-ink-2">{l}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* КАК МЫ ПЛАТИМ */}
      <section className="bg-ink py-[clamp(88px,14vh,160px)] text-paper">
        <div className="wrap grid items-center gap-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-24">
          <div>
            <div className="display text-[clamp(64px,7.5vw,120px)] leading-[0.8] tracking-[-0.055em] text-accent">2 часа</div>
            <div className="mt-4 text-[clamp(22px,2.4vw,32px)] tracking-tight">в среднем до выплаты</div>
          </div>
          <div className="text-[19px] leading-relaxed text-paper/65">
            <p>
              <b className="text-paper">Оплата в день получения материала.</b>
            </p>
            <p className="mt-4">
              В среднем переводим деньги в течение двух часов с момента, когда материал поступил на наш склад и прошел приемку. Если вы привозите материал сами — проверяем и оплачиваем на месте.
            </p>
            <div className="label-mono mt-8 inline-block border border-paper/25 px-3 py-2 text-paper/75">
              Банковский перевод · физические лица и компании
            </div>
          </div>
        </div>
      </section>

      {/* ИСТОРИЯ */}
      <section className="border-b border-line bg-paper-hi py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead
            title={"Нам регулярно отправляют материал"}
            text="Показываем реальные поступления: откуда пришла отправка, что было внутри, когда мы ее получили и через сколько времени произвели оплату."
          />
          <div className="flex flex-col gap-[clamp(40px,6vh,72px)]">
            {history.map((h) => (
              <article key={h.date} className="grid gap-6 border-t border-ink pt-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12">
                <Pic src={photo(h.photo)} alt={h.material} className="aspect-[4/3] md:aspect-auto md:min-h-[360px]" sizes="(min-width:768px) 50vw, 100vw" />
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="label-mono text-ink-2">{h.date}</span>
                    <span className="label-mono border border-ink/30 px-2.5 py-1 text-ink-2">{h.method}</span>
                  </div>
                  <div className="mt-4 text-[clamp(30px,3vw,44px)] leading-none font-medium tracking-tight">{h.city}</div>
                  <div className="mt-3 text-[18px] text-ink-2">{h.material}</div>

                  <div className="mt-8 grid grid-cols-3 border-t border-line">
                    {[
                      ["Вес", h.weight],
                      ["Получено", h.received],
                      ["Оплачено", h.paid.split("· ")[1] ?? h.paid],
                    ].map(([l, v], i) => (
                      <div key={l} className={`py-4 ${i > 0 ? "border-l border-line pl-4" : ""}`}>
                        <div className="label-mono text-ink-2">{l}</div>
                        <div className="mt-1.5 font-mono text-[22px] tracking-tight">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto bg-ink px-6 py-6 text-paper">
                    <div className="label-mono text-paper/75">От получения до выплаты</div>
                    <div className="mt-3 flex items-baseline justify-between gap-4">
                      <span className="display text-[clamp(44px,4.6vw,68px)] text-accent">{h.wait}</span>
                      <span className="grid size-10 shrink-0 place-items-center bg-accent text-lg text-ink">✓</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* КАК ВСЁ ПРОИСХОДИТ */}
      <section id="how" className="scroll-mt-16 border-b border-line py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead title="Как всё происходит" text="От заявки до денег — пять понятных шагов. На каждом этапе вы знаете, что делать дальше." />
          <ol className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-5">
            {flow.map((f, i) => (
              <li key={f.title} className={`flex min-h-[300px] flex-col border-b border-line py-10 sm:pr-8 lg:border-b-0 ${i < 4 ? "lg:border-r lg:border-line" : ""} ${i > 0 ? "lg:pl-8" : ""}`}>
                <span className="font-mono text-[40px] leading-none text-accent-deep">0{i + 1}</span>
                <h3 className="mt-10 text-[21px] font-medium tracking-tight">{f.title}</h3>
                <p className="mt-4 text-[16px] leading-relaxed text-muted">{f.text}</p>
                {f.strong && <p className="mt-3 text-[16px] font-medium text-ink">{f.strong}</p>}
                {i === 4 && (
                  <Link href="#calculator" className="mt-auto self-start bg-accent px-5 py-3.5 text-[15px] font-medium whitespace-nowrap text-ink transition-colors hover:bg-ink hover:text-paper">
                    Оформить заявку →
                  </Link>
                )}
                {f.link && (
                  <Link href={f.link.href} className="mt-auto pt-6 text-[15px] font-medium whitespace-nowrap underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
                    {f.link.label} →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ДОВЕРИЕ */}
      <section className="border-b border-line py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead title="Простой способ превратить лом в деньги" />
          <div className="grid grid-cols-2 border-t border-ink lg:grid-cols-4">
            {[
              ["Физическим лицам", "и компаниям"],
              ["По всей Испании", "отправка за наш счет"],
              ["Без предоплаты", "платим после приемки"],
              ["2 часа", "в среднем до выплаты"],
            ].map(([t, d], i) => (
              <div key={t} className={`border-b border-line py-8 lg:border-b-0 ${i % 2 ? "pl-6" : "pr-6"} ${i > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""} lg:pr-8`}>
                <div className="text-[clamp(20px,1.8vw,26px)] font-medium tracking-tight">{t}</div>
                <div className="mt-1 text-[15px] text-muted">{d}</div>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col gap-8 bg-ink p-8 text-paper md:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[clamp(24px,2.4vw,32px)] font-medium tracking-tight">Можно сначала спросить</div>
              <div className="mt-2 text-[16px] text-paper/70">Пришлите фото материала — скажем, подходит ли он и сколько стоит.</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <a href={contacts.phoneHref} className="font-mono text-[clamp(22px,2vw,28px)] tracking-tight hover:text-accent">{contacts.phone}</a>
              <a href={contacts.whatsapp} className="bg-accent px-6 py-4 font-medium text-ink transition-colors hover:bg-paper">Написать в WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* ЭКОЛОГИЯ */}
      <section id="recycling" className="scroll-mt-16 bg-paper-lo py-[clamp(80px,12vh,144px)]">
        <div className="wrap grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
          <div>
            <h2 className="display text-[clamp(32px,3.6vw,56px)]">Этот лом может снова стать ценным материалом</h2>
            <p className="mt-10 max-w-2xl text-[17px] leading-relaxed text-ink-2">
              Твердосплавный лом содержит вольфрам — металл, для которого уже существует развитая индустрия вторичной переработки. По данным International Tungsten Industry Association, около <b>35% входящего сырья</b> в глобальном производственном цикле вольфрама приходилось на лом; оценка переработки в конце жизненного цикла составляла около <b>30%</b>. Для Европы в исследованиях приводились еще более высокие показатели.
            </p>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">
              Передавая вольфрамсодержащий лом в переработку, вы возвращаете ценный металл в производственный цикл и снижаете потребность в первичном сырье.
            </p>
            <div className="label-mono mt-10 flex flex-wrap gap-3 text-ink-2">
              {["Circular economy", "Повторное использование", "Ресурсосбережение", "Sustainability"].map((t) => (
                <span key={t} className="border border-ink/30 px-2.5 py-1.5">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="label-mono mb-4 text-ink-2">Из чего состоит твердый сплав</div>
            <div className="grid grid-cols-2 gap-6 border-t border-ink pt-6">
              {[
                { el: <Element className="w-20 shrink-0" />, v: "70–90%", t: "вольфрам (в виде карбида WC) — то, ради чего лом перерабатывают" },
                { el: <Element symbol="Co" number="27" name="Cobalt" mass="58.93" tone="line" className="w-20 shrink-0" />, v: "6–15%", t: "кобальт — металлическая связка, тоже возвращается в цикл" },
              ].map((x) => (
                <div key={x.v} className="flex gap-4">
                  {x.el}
                  <div>
                    <div className="font-mono text-[30px] leading-none tracking-tight">{x.v}</div>
                    <div className="mt-2 text-[14px] leading-snug text-muted">{x.t}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="label-mono mt-14 mb-4 text-ink-2">Переработка вольфрама</div>
            <div className="border-t border-ink">
              {ecoStats.map((s) => (
                <div key={s.value} className="grid grid-cols-[150px_1fr] items-baseline gap-6 border-b border-line py-7">
                  <div className="font-mono text-[34px] leading-none tracking-tight">{s.value}</div>
                  <div className="text-[14px] text-muted">{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-b border-line py-[clamp(80px,12vh,144px)]">
        <div className="wrap grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <h2 className="display text-[clamp(32px,3.6vw,56px)]">Частые вопросы</h2>
            <p className="mt-6 text-[17px] text-muted">То, что обычно нужно знать перед первой продажей.</p>
            <div className="mt-12 border-t border-ink pt-6 lg:sticky lg:top-24">
              <div className="text-[20px] font-medium tracking-tight">Не нашли ответ?</div>
              <p className="mt-2 text-[15px] text-muted">Спросите нас напрямую — ответим в WhatsApp или по телефону.</p>
              <a href={contacts.phoneHref} className="mt-6 block font-mono text-[clamp(24px,2.2vw,32px)] tracking-tight hover:text-accent-deep">
                {contacts.phone}
              </a>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={contacts.whatsapp} className="bg-accent px-5 py-3.5 font-medium text-ink transition-colors hover:bg-ink hover:text-paper">Задать вопрос в WhatsApp</a>
                <a href={contacts.phoneHref} className="border border-ink px-5 py-3.5 transition-colors hover:bg-ink hover:text-paper">Позвонить</a>
              </div>
            </div>
          </div>
          <div className="border-t border-ink">
            {faq.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-7 text-[18px] font-medium">
                  {f.q}
                  <span className="font-mono text-2xl text-accent-deep transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pb-8 text-[16px] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ГАЙДЫ */}
      <section id="guides" className="scroll-mt-16 py-[clamp(80px,12vh,144px)]">
        <div className="wrap">
          <SectionHead title="Материалы о твердом сплаве" text="Как определить твердый сплав, как упаковать посылку и от чего зависит стоимость." />
          <div className="border-t border-ink">
            {guides.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="group grid items-baseline gap-2 border-b border-line py-9 md:grid-cols-[180px_1fr_auto] md:gap-10">
                <span className="label-mono text-ink-2">{g.kind}</span>
                <span className="text-[clamp(20px,2.2vw,30px)] leading-tight font-medium tracking-tight group-hover:text-accent-deep">{g.title}</span>
                <span className="hidden text-2xl transition-transform group-hover:translate-x-2 md:block">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
