import Link from "next/link";
import { Calculator } from "@/components/Calculator";
import { Element } from "@/components/Element";
import { Pic } from "@/components/Pic";
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

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`label-mono flex items-center gap-2 ${dark ? "text-paper/60" : "text-muted"}`}>
      <span className="size-2 bg-accent" />
      {children}
    </div>
  );
}

function SectionHead({ eyebrow, title, text, dark }: { eyebrow: string; title: React.ReactNode; text?: string; dark?: boolean }) {
  return (
    <div className="grid gap-4 pb-7 md:grid-cols-[1.25fr_0.75fr] md:items-end md:gap-10 md:pb-8">
      <div>
        <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
        <h2 className="display mt-4 text-[clamp(30px,min(3.4vw,6vh),52px)]">{title}</h2>
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
        <div className="wrap grid gap-10 py-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[1fr_minmax(0,520px)] lg:items-center lg:gap-14 lg:py-6">
          <div className="flex flex-col">
            <Eyebrow>Покупаем по всей Испании</Eyebrow>
            <h1 className="display mt-4 text-[clamp(36px,min(4.4vw,7.6vh),68px)]">
              Покупаем твердосплавный лом по всей Испании<span className="text-accent">.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-2">
              Покупаем твердосплавный лом в любом виде и чистый вольфрам. Рассчитываем стоимость и принимаем материал со всей Испании.
            </p>

            <ol className="mt-6 border-t border-line">
              {[
                ["Отправка за наш счет", "Вы отправляете материал, мы оплачиваем доставку и рассчитываемся после проверки."],
                ["Самовывоз от 50 кг", "По выходным дням, с расчетом на месте."],
                ["Можно привезти в Барселону", "Принимаем материал на нашем складе."],
              ].map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[44px_1fr] gap-2 border-b border-line py-[min(12px,1.4vh)]">
                  <span className="font-mono text-sm text-accent-deep">0{i + 1}</span>
                  <div>
                    <div className="text-[16px] font-medium">{t}</div>
                    <div className="text-[14px] text-muted">{d}</div>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-5 border-l-2 border-accent pl-4 text-[14px] text-ink-2">
              <b className="text-ink">Важно:</b> принимаем только твердосплавный лом / карбид вольфрама и чистый вольфрам. Медь, провода, HSS и обычные металлы не принимаем.
            </p>

          </div>
          <Calculator photos={calcPhotos} />
        </div>
      </section>

      {/* ЧТО ПОКУПАЕМ */}
      <section id="materials" className="scroll-mt-16 border-b border-line py-[clamp(40px,6vh,72px)]">
        <div className="wrap">
          <SectionHead
            eyebrow="Материал"
            title={<>Что мы покупаем — и что нет.</>}
            text="Сравните свой материал с примерами. Если сомневаетесь, просто пришлите нам фотографию."
          />
          <div className="grid gap-14 lg:grid-cols-[1.25fr_1fr] lg:gap-0">
            <div className="lg:border-r lg:border-line lg:pr-12">
              <div className="mb-4 flex items-center gap-3 text-[20px] font-medium">
                <span className="grid size-7 place-items-center bg-accent text-sm text-ink">✓</span> Покупаем
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                {buyList.map((b) => (
                  <figure key={b.title}>
                    {b.photo ? (
                      <Pic src={photo(b.photo)} alt={b.title} className="h-[clamp(90px,15vh,180px)]" sizes="(min-width:1024px) 22vw, 45vw" />
                    ) : (
                      <div className="flex h-[clamp(90px,15vh,180px)] items-center justify-center bg-ink">
                        <Element tone="accent" className="h-[70%] w-auto" />
                      </div>
                    )}
                    <figcaption className="mt-2">
                      <div className="text-[16px] font-medium">{b.title}</div>
                      <div className="text-[14px] text-muted">{b.note}</div>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="mt-6 border-t border-line pt-4">
              <div className="label-mono text-muted">Особенно интересует новый инструмент в упаковке</div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[16px] font-medium tracking-tight text-ink-2">
                {brands.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
              </div>
            </div>
            <div className="lg:pl-12">
              <div className="mb-4 flex items-center gap-3 text-[20px] font-medium">
                <span className="grid size-7 place-items-center bg-ink text-sm text-paper">✕</span> Не покупаем
              </div>
              <ul className="border-t border-line">
                {noBuyList.map((n) => (
                  <li key={n.title} className="grid grid-cols-[32px_1fr] border-b border-line py-2">
                    <span className="font-mono text-muted">✕</span>
                    <div>
                      <div className="text-[16px] font-medium">{n.title}</div>
                      <div className="text-[14px] text-muted">{n.note}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[14px] leading-relaxed text-muted">
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
        <div className="wrap flex items-center justify-between gap-6 py-7">
          <span className="text-[clamp(20px,2.4vw,32px)] font-medium tracking-tight">
            Не уверены? Пришлите фото в WhatsApp — скажем, подходит ли материал.
          </span>
          <span className="text-3xl transition-transform group-hover:translate-x-2">→</span>
        </div>
      </a>

      {/* КАК МЫ ПЛАТИМ */}
      <section className="bg-ink py-16 text-paper md:py-24">
        <div className="wrap grid items-end gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Eyebrow dark>Как мы платим</Eyebrow>
            <div className="display mt-6 text-[clamp(80px,min(13vw,24vh),200px)] leading-[0.8] tracking-[-0.055em] text-accent">2 часа</div>
            <div className="mt-6 text-[clamp(26px,3.4vw,44px)] tracking-tight">в среднем до выплаты</div>
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

      {/* УПАКОВКА */}
      <section id="packing" className="scroll-mt-16 border-b border-line py-[clamp(40px,6vh,72px)]">
        <div className="wrap">
          <SectionHead
            eyebrow="Упаковка"
            title="Как правильно упаковать материал."
            text="Твердосплавный лом тяжелый и с острыми кромками — плохая упаковка может порваться в дороге."
          />
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="relative h-[clamp(200px,36vh,400px)] bg-ink">
                <Pic src={photo("bucket")} alt="Пластины во внутренней пластиковой таре" className="absolute inset-0 opacity-60" sizes="(min-width:1024px) 50vw, 100vw" />
                <div className="absolute inset-0 flex flex-col justify-end p-5 text-paper">
                  <span className="grid size-14 place-items-center bg-accent text-xl text-ink">▶</span>
                  <div className="mt-4 text-[22px] font-medium tracking-tight">Как упаковать твердосплавный лом</div>
                  <div className="label-mono mt-1 text-paper/70">Видеоинструкция</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["pack-1", "Пример упаковки"],
                  ["bucket", "Внутренняя тара"],
                  ["pack-3", "Готовая посылка"],
                ].map(([k, l]) => (
                  <figure key={k}>
                    <Pic src={photo(k)} alt={l} label="" className="h-[clamp(70px,11vh,130px)]" sizes="(min-width:1024px) 16vw, 33vw" />
                    <figcaption className="label-mono mt-1.5 text-[11px] text-muted">{l}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[24px] font-medium tracking-tight">Перед отправкой</h3>
              <p className="mt-2 text-[15px] text-muted">
                Транспортная компания не знает, что находится внутри посылки. Материал должен оставаться надежно зафиксирован даже при неаккуратной перевозке.
              </p>
              <ol className="mt-5 border-t border-line">
                {packingSteps.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[48px_1fr] border-b border-line py-[min(14px,1.5vh)]">
                    <span className="font-mono text-sm text-accent-deep">0{i + 1}</span>
                    <div>
                      <div className="text-[16px] font-medium">{s.title}</div>
                      <div className="mt-0.5 text-[14px] text-muted">{s.text}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href="#calculator" className="mt-5 inline-block bg-ink px-5 py-3.5 text-paper transition-colors hover:bg-accent hover:text-ink">
                Сначала оформить заявку →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ИСТОРИЯ */}
      <section className="border-b border-line bg-paper-hi py-[clamp(40px,6vh,72px)]">
        <div className="wrap">
          <SectionHead
            eyebrow="История полученных отправок"
            title={"Нам регулярно отправляют материал."}
            text="Показываем реальные поступления: откуда пришла отправка, что было внутри, когда мы ее получили и через сколько времени произвели оплату."
          />
          <div className="border-t border-ink">
            <div className="label-mono hidden grid-cols-[200px_1.1fr_1.2fr_100px_1fr] gap-6 border-b border-line py-3 text-muted md:grid">
              <span>Фото</span><span>Получено</span><span>Материал</span><span>Вес</span><span>Выплата</span>
            </div>
            {history.map((h) => (
              <article key={h.date} className="grid gap-4 border-b border-line py-4 md:grid-cols-[150px_1.1fr_1.2fr_100px_1fr] md:items-center md:gap-6">
                <Pic src={photo(h.photo)} alt={h.material} className="aspect-[16/10]" sizes="(min-width:768px) 150px, 100vw" />
                <div>
                  <div className="font-mono text-[13px] text-muted">{h.date} · {h.received}</div>
                  <div className="mt-1 text-[26px] leading-none font-medium tracking-tight">{h.city}</div>
                  <div className="label-mono mt-3 text-ink-2">{h.method}</div>
                </div>
                <div className="text-[18px] font-medium">{h.material}</div>
                <div className="font-mono text-[22px]">
                  <span className="label-mono mr-2 text-muted md:hidden">Вес</span>
                  {h.weight}
                </div>
                <div>
                  <div className="font-mono text-[28px] leading-none text-accent-deep">{h.wait}</div>
                  <div className="mt-2 text-[14px] text-muted">Оплачено {h.paid} ✓</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* КАК ВСЁ ПРОИСХОДИТ */}
      <section id="how" className="scroll-mt-16 border-b border-line py-[clamp(40px,6vh,72px)]">
        <div className="wrap">
          <SectionHead eyebrow="Процесс" title="Как всё происходит." text="От заявки до денег — пять понятных шагов. На каждом этапе вы знаете, что делать дальше." />
          <ol className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-5">
            {flow.map((f, i) => (
              <li key={f.title} className={`flex min-h-[220px] flex-col border-b border-line py-5 sm:pr-6 lg:border-b-0 ${i < 4 ? "lg:border-r lg:border-line" : ""} ${i > 0 ? "lg:pl-6" : ""}`}>
                <span className={`font-mono text-[40px] leading-none ${i === 4 ? "text-accent-deep" : "text-ink/25"}`}>0{i + 1}</span>
                <h3 className="mt-6 text-[20px] font-medium tracking-tight">{f.title}</h3>
                <p className="mt-2 text-[15px] text-muted">{f.text}</p>
                {f.strong && <p className="mt-3 text-[16px] font-medium text-accent-deep">{f.strong}</p>}
                {f.link && (
                  <Link href={f.link.href} className="mt-auto pt-6 text-[15px] font-medium underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
                    {f.link.label} →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ДОВЕРИЕ */}
      <section className="border-b border-line py-[clamp(40px,6vh,72px)]">
        <div className="wrap">
          <SectionHead
            eyebrow="Почему мы"
            title="Простой способ превратить лом в деньги."
            text="Мы много лет работаем с вольфрамсодержащим сырьем в Европе и строим процесс так, чтобы продать материал было понятно и частному человеку, и компании."
          />
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h3 className="text-[clamp(26px,2.6vw,36px)] leading-tight font-medium tracking-tight">От заявки до выплаты — без сложной процедуры.</h3>
              <p className="mt-4 max-w-2xl text-[17px] text-muted">
                Вы заранее видите ориентировочную стоимость, выбираете способ передачи, получаете инструкции и после приемки материала — оплату.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-x-8">
                {[
                  ["Физические лица", "Работаем без проблем"],
                  ["Компании", "Регулярные и разовые поставки"],
                  ["Вся Испания", "Основной способ — отправка"],
                  ["Быстрая оплата", "В среднем в течение 2 часов после приемки"],
                ].map(([t, d]) => (
                  <div key={t} className="border-t border-line py-4">
                    <div className="text-[18px] font-medium">{t}</div>
                    <div className="mt-1 text-[14px] text-muted">{d}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t-4 border-accent pt-6 lg:border-t-0 lg:border-l lg:border-line lg:pt-0 lg:pl-12">
              <h3 className="text-[26px] font-medium tracking-tight">Можно сначала спросить.</h3>
              <p className="mt-3 text-[16px] text-muted">
                Не уверены в материале, весе или способе отправки? Пришлите фото или свяжитесь с нами до оформления.
              </p>
              <a href={contacts.phoneHref} className="mt-6 block font-mono text-[clamp(26px,2.6vw,36px)] tracking-tight hover:text-accent-deep">
                {contacts.phone}
              </a>
              <div className="label-mono mt-2 text-muted">Телефон / WhatsApp</div>
              <div className="mt-8 flex flex-wrap gap-2">
                <a href={contacts.whatsapp} className="bg-ink px-5 py-4 text-paper transition-colors hover:bg-accent hover:text-ink">Написать в WhatsApp</a>
                <Link href="#calculator" className="border border-ink px-5 py-4 transition-colors hover:bg-ink hover:text-paper">Рассчитать стоимость →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ЭКОЛОГИЯ */}
      <section id="recycling" className="scroll-mt-16 bg-paper-lo py-[clamp(40px,6vh,72px)]">
        <div className="wrap grid gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Eyebrow>Возвращаем вольфрам в цикл</Eyebrow>
            <h2 className="display mt-4 text-[clamp(30px,min(3.4vw,6vh),52px)]">Этот лом может снова стать ценным материалом.</h2>
            <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-2">
              Твердосплавный лом содержит вольфрам — металл, для которого уже существует развитая индустрия вторичной переработки. По данным International Tungsten Industry Association, около <b>35% входящего сырья</b> в глобальном производственном цикле вольфрама приходилось на лом; оценка переработки в конце жизненного цикла составляла около <b>30%</b>. Для Европы в исследованиях приводились еще более высокие показатели.
            </p>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-2">
              Передавая вольфрамсодержащий лом в переработку, вы возвращаете ценный металл в производственный цикл и снижаете потребность в первичном сырье.
            </p>
            <div className="label-mono mt-8 flex flex-wrap gap-2 text-ink-2">
              {["Circular economy", "Повторное использование", "Ресурсосбережение", "Sustainability"].map((t) => (
                <span key={t} className="border border-ink/30 px-2.5 py-1.5">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex gap-3">
              <Element className="w-[26%]" />
              <Element symbol="Co" number="27" name="Cobalt" mass="58.93" tone="line" className="w-[26%]" />
            </div>
            <div className="mt-6 border-t border-ink">
              {ecoStats.map((s) => (
                <div key={s.value} className="grid grid-cols-[150px_1fr] items-baseline gap-4 border-b border-line py-4">
                  <div className="font-mono text-[34px] leading-none tracking-tight">{s.value}</div>
                  <div className="text-[14px] text-muted">{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-b border-line py-[clamp(40px,6vh,72px)]">
        <div className="wrap grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="display mt-4 text-[clamp(30px,min(3.4vw,6vh),52px)]">Частые вопросы.</h2>
            <p className="mt-4 text-[17px] text-muted">То, что обычно нужно знать перед первой продажей.</p>
          </div>
          <div className="border-t border-ink">
            {faq.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-4 text-[17px] font-medium">
                  {f.q}
                  <span className="font-mono text-2xl text-accent-deep transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pb-6 text-[16px] text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ГАЙДЫ */}
      <section id="guides" className="scroll-mt-16 py-[clamp(40px,6vh,72px)]">
        <div className="wrap">
          <SectionHead eyebrow="Полезно знать" title="Материалы о твердом сплаве." text="Как определить твердый сплав, как упаковать посылку и от чего зависит стоимость." />
          <div className="border-t border-ink">
            {guides.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="group grid items-baseline gap-2 border-b border-line py-5 md:grid-cols-[160px_1fr_auto] md:gap-8">
                <span className="label-mono text-muted">{g.kind}</span>
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
