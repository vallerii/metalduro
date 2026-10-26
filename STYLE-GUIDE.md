# Metalduro — гайд по стилям

Описание визуальной системы сайта metalduro.es. Цель: собрать отдельный сайт в точно такой же теме: те же цвета, шрифты, отступы, сетка и компоненты.

Исходники: `src/app/globals.css` (токены), `src/app/page.tsx`, `src/components/*`. Стек оригинала: Next.js 16 + Tailwind CSS v4. Ниже значения даны и в виде классов Tailwind, и в пикселях/CSS, чтобы их можно было перенести на любой стек.

---

## 1. Характер стиля

- **Светлый, «инженерный», точный.** Холодный серый фон, графитовый текст, один яркий оранжево-красный акцент.
- **Без закруглений.** Ни у чего нет `border-radius`: кнопки, поля, фото, плашки — строго прямоугольные.
- **Без карточек.** Не карточки с тенью, а линии-разделители (1px), колонки, полосы на всю ширину, таблицы.
- **Цифры — моноширинным шрифтом.** Вес, суммы, номера шагов, телефоны, подписи-метки.
- **Контраст блоков.** Светлые секции чередуются с темными (графит) и одной акцентной полосой.
- **Графика из таблицы Менделеева**: плитки элементов W 74 / Co 27.

**Не делать:** закругления, тени у карточек (исключение — скриншоты отзывов), градиенты как декор, эмодзи-иконки, темный «металлический» стиль, лаймовый акцент, Inter.

---

## 2. Цвета

| Токен | HEX | Назначение |
|---|---|---|
| `accent` | `#ff5c39` | Главный акцент: кнопки, плашки, подсветка, выделение текста, фокус |
| `accent-deep` | `#e8461f` | Акцент для текста на светлом фоне: номера шагов, hover ссылок, «+» в FAQ |
| `ink` | `#212123` | Основной текст, темные секции, футер, калькулятор |
| `ink-2` | `#3a3a3d` | Вторичный текст на светлом; фон вложенных элементов в темных блоках |
| `muted` | `#5f5f63` | Описания, подписи, второстепенный текст |
| `paper` | `#d9d9d9` | **Фон страницы**; текст на темном |
| `paper-lo` | `#cdcdcd` | Чуть темнее фона: секция «Экология», заглушки фото |
| `paper-hi` | `#e6e6e6` | Чуть светлее фона: секция «История» |
| `line` | `rgb(33 33 35 / 0.16)` | Все разделители и рамки на светлом фоне |

### Прозрачности (используются постоянно)

На темном фоне (`ink`) текст и линии делаются через `paper` с прозрачностью:

| Значение | Где |
|---|---|
| `paper / 0.15–0.20` | Линии-разделители на темном |
| `paper / 0.25` | Рамки полей ввода, чипов, вторичных кнопок |
| `paper / 0.45–0.55` | Мелкие подписи, счетчики (`1 / 4`), копирайт |
| `paper / 0.60–0.70` | Описательный текст на темном |
| `paper / 0.75` | Mono-метки на темном |
| `ink / 0.25–0.30` | Рамки тегов на светлом |
| `ink / 0.08` | Штриховка заглушек |
| `accent / 0.30` | Подсветка `<mark>` |

### Правила

- Текст на акценте — **всегда `ink`**, не белый.
- Выделение текста (`::selection`): фон `accent`, текст `ink`.
- Фокус: `outline: 2px solid #ff5c39; outline-offset: 2px`.
- Ссылки в тексте: подчеркивание цвета `accent`, толщина 2px, отступ 4px; на hover текст становится `accent-deep`.

---

## 3. Шрифты

| Роль | Шрифт | Подключение |
|---|---|---|
| Основной (sans) | **Onest Variable** | `@fontsource-variable/onest` или Google Fonts `Onest` |
| Моно | **JetBrains Mono** 400, 500 | `@fontsource/jetbrains-mono` или Google Fonts |

Onest выбран как бесплатный аналог Aeonik Pro с кириллицей. Fallback: `ui-sans-serif, system-ui, sans-serif` / `ui-monospace, monospace`.

Глобально для `body`: `-webkit-font-smoothing: antialiased; font-feature-settings: "ss01";`

### Типографическая шкала

| Элемент | Размер | Вес / межбуквенный / интерлиньяж |
|---|---|---|
| H1 главной (херо) | `clamp(36px, min(4.4vw, 7.6vh), 68px)` | стиль **display** |
| H1 внутренних страниц (гайды, «О нас») | `clamp(40px, 5.6vw, 80px)` | display |
| H1 юридических страниц | `clamp(38px, 5vw, 72px)` | display |
| H2 секции | `clamp(32px, 3.6vw, 56px)` | display |
| Гигантская цифра («24 h») | `clamp(64px, 7.5vw, 120px)` | 450 / `-0.055em` / `0.8`, цвет accent |
| Логотип в футере | `clamp(40px, 4.6vw, 72px)` | display |
| H2 в статье | `28px` | 500, `tracking-tight` (-0.025em) |
| H2 «О нас» | `clamp(26px, 2.6vw, 36px)` | 500, tight |
| Город в истории | `clamp(30px, 3vw, 44px)` | 500, tight, lh 1 |
| H3 / заголовок шага | `21–24px` | 500, tight |
| Подзаголовок-строка | `20px` | 500 |
| Лид страницы | `19px` | lh relaxed (1.625), `ink-2` |
| Текст абзаца секции | `17px` | lh 1.625, `muted` |
| Основной текст / пункты | `16px` | 400–500 |
| Навигация | `15px` | 400 |
| Подписи к пунктам | `14px` | `muted` |
| Mono-цифры крупные | `22–48px` | JetBrains Mono, tight, lh 1 |
| Метка **label-mono** | `13px` | Mono, uppercase, `letter-spacing: 0.06em` |
| Копирайт, мелкое | `12px` | Mono |

### Утилитарные стили текста

```css
/* Крупные заголовки */
.display {
  font-weight: 450;           /* вариативный Onest */
  letter-spacing: -0.035em;
  line-height: 0.98;
}

/* Метки-надзаголовки, подписи полей, теги */
.label-mono {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

Веса Onest в проекте: 400 (текст), 450 (display), 500 (`font-medium` — почти все подзаголовки и кнопки), 600 (только слово «Metalduro» в логотипе). Жирный 700 почти не используется.

---

## 4. Сетка и контейнер

```css
.wrap {
  width: 100%;
  max-width: 1320px;
  margin-inline: auto;
  padding-inline: 16px;            /* мобильные */
}
@media (min-width: 768px) {
  .wrap { padding-inline: 32px; }
}
```

Брейкпоинты (Tailwind по умолчанию): `sm 640`, `md 768`, `lg 1024`, `xl 1280`.

### Типовые раскладки колонок

| Где | Колонки |
|---|---|
| Шапка секции (заголовок + текст справа) | `1.25fr 0.75fr`, gap 64px, выравнивание по низу |
| Херо | `1fr minmax(0, 520px)`, gap-x 56px; высота `calc(100svh - 64px)` |
| «Что покупаем / не покупаем» | `1.25fr 1fr`, между колонками вертикальная линия, отступы 64px |
| Темная полоса «Как платим» | `1.2fr 0.8fr`, gap 96px |
| FAQ | `0.8fr 1.2fr`, gap 96px; левая колонка sticky `top: 96px` |
| Статья / гайд | шапка `1fr 0.8fr`; тело `260px 1fr` (оглавление sticky + текст `max-width: 768px`) |
| Шаги «Как всё происходит» | 5 колонок на `lg`, 2 на `sm`, вертикальные линии между |
| Футер | `1.6fr 1fr 1fr 1fr` |
| Список «Читайте также» | `160px 1fr auto` |

---

## 5. Отступы

### Вертикальные отступы секций (резиновые по высоте экрана)

| Тип секции | padding-block |
|---|---|
| Обычная | `clamp(80px, 12vh, 144px)` |
| Компактная («Что покупаем») | `clamp(48px, 7vh, 88px)` |
| Темная акцентная («Как платим») | `clamp(88px, 14vh, 160px)` |
| Полоса-CTA (акцентная) | `48px` |
| Внутренние страницы | `48px` моб. / `80px` десктоп |
| Блок «Читайте также» | `64px` |
| Футер | `80px` сверху, `32px` снизу |

### Шапка секции → контент

`padding-bottom: 48px` моб. / `80px` десктоп (компактная: 40 / 48px).

### Ритм внутри

- Пункты списков с линиями: `padding-block: 16–28px` (обычно 16, 24 или 28px).
- Шаги в 5 колонках: `40px` сверху/снизу, номер → заголовок 40px, заголовок → текст 16px, min-height 300px.
- Между абзацами статьи: 16px. Секция статьи: линия сверху + `padding-block: 32px`.
- Между фото в сетке: 20–24px.
- Гэпы колонок: 48 / 64 / 96px.
- Шкала Tailwind: 1 = 4px. Используются в основном 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px.

---

## 6. Линии, формы, тени

- `border-radius: 0` везде, принудительно:
  ```css
  *, *::before, *::after { border-radius: 0 !important; }
  ```
- Разделители — 1px `line` (на светлом) или `paper/0.15–0.20` (на темном).
- Списки оформляются как таблица: линия сверху у списка (`border-top`) + линия снизу у каждого пункта (`border-bottom`).
- Колонки внутри строки разделяются `border-left: 1px solid line` + `padding-left: 16px`.
- Выделенная заметка: `border-left: 2px solid accent; padding-left: 16px`.
- Тени не используются. Исключения: скриншоты отзывов `0 24px 48px -24px rgb(33 33 35 / 0.5)` и выпадающий список на темном `0 24px 48px -12px rgb(0 0 0 / 0.6)`.

### Штриховка (заглушка фото)

```css
.hatch {
  background-color: #cdcdcd;
  background-image: repeating-linear-gradient(135deg, rgb(33 33 35 / 0.08) 0 1px, transparent 1px 10px);
}
```

---

## 7. Компоненты

### Шапка
- `position: sticky; top: 0; z-index: 40`, высота **64px**.
- Фон `paper` 90% + `backdrop-filter: blur`, линия снизу `line`.
- Слева логотип (знак 48×48 + «Metalduro» 19px, 600, tight), по центру навигация 15px с gap 28px (hover → `accent-deep`), справа телефон моно 14px + главная кнопка.
- `scroll-padding-top: 80px` для якорей.

### Кнопки

| Вариант | Стили |
|---|---|
| **Главная** | фон `accent`, текст `ink`, 500, `padding: 16px 24px` (в шапке `10px 16px`, 15px). Hover: фон `ink`, текст `paper`. `transition: colors` |
| **Главная на темном** | то же, hover: фон `paper`, текст `ink` |
| **Вторичная (контур)** | `border: 1px solid ink`, `padding: 14px 20px`. Hover: фон `ink`, текст `paper` |
| **Вторичная на темном** | `border: 1px solid paper/0.25`, hover: рамка `paper` |
| **Текстовая ссылка-CTA** | 16px, 500, подчеркивание accent 2px / offset 4px, часто со стрелкой `→` |
| **Иконка-кнопка** | квадрат 36px, фон `ink/0.8`, hover фон `accent` |
| disabled | `opacity: 0.4` |

### Поля ввода (в темном калькуляторе)
`width: 100%; border: 1px solid paper/0.25; background: transparent; padding: 14px 16px; font-size: 17px; color: paper;` placeholder `paper/0.35`, на фокусе рамка `accent`. Подпись над полем — `label-mono`, `paper/0.75`, отступ 8px. Крупное числовое поле — моно 48px, только нижняя линия.

### Чипы / варианты выбора
`border: 1px solid paper/0.25; padding: 8px 14px;` моно 14px. Выбранный: рамка и текст `accent` или фон `accent` + текст `ink`.
Чекбокс/радио — квадрат 16px с рамкой, выбранный заполняется квадратиком `accent`.

### Теги
`label-mono` + `border: 1px solid ink/0.30; padding: 6px 10px`. На темном: рамка `paper/0.25`.

### Нумерованный список
Сетка `44–48px 1fr`, номер `01, 02…` моно 14px `accent-deep`, текст 16px 500, описание 14px `muted`, линии между пунктами.

### Буллет
Квадрат 8×8 `accent` вместо точки (сетка `28px 1fr`).

### Метка-надзаголовок страницы
`label-mono` `ink-2` с квадратом 8×8 `accent` слева, gap 8px.

### FAQ (аккордеон)
`<details>`: вопрос 18px 500, `padding-block: 28px`, справа `+` моно 24px `accent-deep`, при открытии поворот на 45°. Ответ 16px, lh relaxed, `muted`, `max-width: 672px`.

### Темная панель (калькулятор)
Фон `ink`, текст `paper`, `padding: 20–28px`, высота ~640–700px. Прогресс шагов: 4 полоски по 3px, gap 4px, заполненные `accent`, пустые `paper/0.15`. Заголовок шага 24px 500 tight, подзаголовок 14px `paper/0.6`. Блок с результатом — плашка `accent` с текстом `ink`, сумма моно 40px.

### Блок «итоги» (акт приемки)
3 колонки: `label-mono` + значение моно 22px, колонки через `border-left`. Ниже темная плашка `ink` с крупной цифрой display `accent` и квадратом 40px `accent` с «✓».

### Полоса-CTA на всю ширину
Фон `accent`, текст `ink`, 20–32px 500, справа `→` 30px. Hover: фон `ink`, текст `paper`, стрелка сдвигается на 8px.

### CTA-плашка в конце статьи
Фон `ink`, `padding: 32px`, текст 22px 500, справа главная кнопка (hover → `paper`).

### Плитка химического элемента
Квадрат (`aspect-ratio: 1`), внутренний отступ 9% ширины. Сверху моно: номер слева, масса справа (opacity .7); по центру символ 44% ширины, 500, lh .8; снизу название моно uppercase (opacity .8). Варианты: `ink` фон + `paper` текст; `accent` фон + `ink`; контур `1px ink`.

### Фото
Прямоугольные, `object-fit: cover`, фон-подложка `paper-lo`. Пропорции: 4/3, 21/9 (обложка статьи), 9/14 (скриншоты). Подпись под фото — `label-mono` `ink-2`, отступ 6px.

### Видео-превью
Фон `ink`, постер с opacity .6, внизу слева квадрат 56px `accent` с «▶» (hover scale 1.1), заголовок 22px 500 `paper`.

### Футер
Фон `ink`, текст `paper`. Заголовки колонок `label-mono` `paper/0.75`, ссылки `paper/0.7` (hover `accent`), телефон моно 18px. Нижняя строка: линия `paper/0.15`, моно 12px `paper/0.45`.

---

## 8. Порядок фонов секций (главная)

1. Херо — `paper`, линия снизу
2. Что покупаем — `paper`
3. Как платим — **`ink`**
4. История — `paper-hi`
5. Полоса-CTA — **`accent`**
6. Как всё происходит — `paper`, линия снизу
7. Упаковка — `paper`
8. Экология — `paper-lo`
9. Отзывы — `paper`, линия снизу
10. FAQ — `paper`
11. Футер — **`ink`**

Принцип: оттенки серого (`paper` / `paper-hi` / `paper-lo`) задают ритм, темные и акцентные блоки — смысловые паузы. Две темные секции подряд не ставить.

---

## 9. Анимации

Сдержанные, только по необходимости:
- `transition: color, background-color` (Tailwind `transition-colors`, ~150ms) для кнопок и ссылок.
- Стрелки `→` сдвигаются на 8px при hover.
- Фото в выборе материала: `scale(1.05)` за 500ms на hover.
- Смена слайдов: `opacity` за 700ms.
- `html { scroll-behavior: smooth; }`
- Без появления секций при скролле, без параллакса.

---

## 10. Иконки

Иконочных наборов нет. Используются текстовые символы: `✓ ✕ → ← + ▶`, обычно внутри квадрата 28–56px с фоном `accent` (текст `ink`) или `ink` (текст `paper`). Единичные SVG — линейные, `stroke` 1.5, цвет `currentColor`.

---

## 11. Готовые токены для нового проекта

### Tailwind CSS v4 (`globals.css`)

```css
@import "tailwindcss";
@import "@fontsource-variable/onest";
@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/500.css";

@theme {
  --color-accent: #ff5c39;
  --color-accent-deep: #e8461f;
  --color-ink: #212123;
  --color-ink-2: #3a3a3d;
  --color-muted: #5f5f63;
  --color-paper: #d9d9d9;
  --color-paper-lo: #cdcdcd;
  --color-paper-hi: #e6e6e6;
  --color-line: rgb(33 33 35 / 0.16);

  --font-sans: "Onest Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-*: initial;
  --radius: 0px;
}

@layer base {
  *, *::before, *::after { border-radius: 0 !important; }
  html { scroll-behavior: smooth; scroll-padding-top: 80px; }
  body {
    background: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "ss01";
  }
  ::selection { background: var(--color-accent); color: var(--color-ink); }
  input, select, button, textarea { font: inherit; color: inherit; }
  :focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
  summary { list-style: none; cursor: pointer; }
  summary::-webkit-details-marker { display: none; }
}

@utility wrap {
  width: 100%;
  max-width: 1320px;
  margin-inline: auto;
  padding-inline: 16px;
  @media (width >= 48rem) { padding-inline: 32px; }
}

@utility label-mono {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@utility display {
  font-weight: 450;
  letter-spacing: -0.035em;
  line-height: 0.98;
}

@utility hatch {
  background-color: var(--color-paper-lo);
  background-image: repeating-linear-gradient(135deg, rgb(33 33 35 / 0.08) 0 1px, transparent 1px 10px);
}
```

### Чистый CSS (без Tailwind)

```css
@import url("https://fonts.googleapis.com/css2?family=Onest:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap");

:root {
  --accent: #ff5c39;
  --accent-deep: #e8461f;
  --ink: #212123;
  --ink-2: #3a3a3d;
  --muted: #5f5f63;
  --paper: #d9d9d9;
  --paper-lo: #cdcdcd;
  --paper-hi: #e6e6e6;
  --line: rgb(33 33 35 / 0.16);
  --line-dark: rgb(217 217 217 / 0.2);

  --font-sans: "Onest", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --container: 1320px;
  --gutter: 16px;
  --header-h: 64px;
  --section-y: clamp(80px, 12vh, 144px);
  --section-y-compact: clamp(48px, 7vh, 88px);
  --section-y-dark: clamp(88px, 14vh, 160px);

  --fs-h1: clamp(40px, 5.6vw, 80px);
  --fs-h1-hero: clamp(36px, min(4.4vw, 7.6vh), 68px);
  --fs-h2: clamp(32px, 3.6vw, 56px);
  --fs-lead: 19px;
  --fs-body-lg: 17px;
  --fs-body: 16px;
  --fs-small: 14px;
  --fs-label: 13px;
}
@media (min-width: 768px) { :root { --gutter: 32px; } }

*, *::before, *::after { box-sizing: border-box; border-radius: 0 !important; }
html { scroll-behavior: smooth; scroll-padding-top: 80px; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "ss01";
}
::selection { background: var(--accent); color: var(--ink); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.wrap { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: var(--gutter); }
.section { padding-block: var(--section-y); }
.display { font-weight: 450; letter-spacing: -0.035em; line-height: 0.98; }
.label-mono { font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: 0.06em; text-transform: uppercase; }
.mono { font-family: var(--font-mono); }

.btn { display: inline-block; padding: 16px 24px; font-weight: 500; text-decoration: none; transition: background-color .15s, color .15s; }
.btn-primary { background: var(--accent); color: var(--ink); }
.btn-primary:hover { background: var(--ink); color: var(--paper); }
.btn-outline { border: 1px solid var(--ink); padding: 14px 20px; color: var(--ink); }
.btn-outline:hover { background: var(--ink); color: var(--paper); }

.link { color: inherit; font-weight: 500; text-decoration: underline; text-decoration-color: var(--accent); text-decoration-thickness: 2px; text-underline-offset: 4px; }
.link:hover { color: var(--accent-deep); }

.rows { border-top: 1px solid var(--line); }
.rows > * { border-bottom: 1px solid var(--line); }

.note { border-left: 2px solid var(--accent); padding-left: 16px; }
.tag { font-family: var(--font-mono); font-size: 13px; letter-spacing: .06em; text-transform: uppercase; border: 1px solid rgb(33 33 35 / .3); padding: 6px 10px; }

.dark { background: var(--ink); color: var(--paper); }
```

---

## 12. Чек-лист перед запуском нового сайта

- [ ] Фон страницы `#d9d9d9`, текст `#212123`, акцент `#ff5c39`
- [ ] Onest + JetBrains Mono подключены, `ss01` включен
- [ ] Нигде нет закруглений и теней у блоков
- [ ] Контейнер 1320px, поля 16 / 32px
- [ ] Заголовки секций — `display` с `clamp(32px, 3.6vw, 56px)`
- [ ] Все цифры, телефоны, метки — моно
- [ ] Списки разделены линиями 1px, а не карточками
- [ ] Текст на акцентных кнопках — темный `ink`
- [ ] Шапка sticky 64px с блюром, футер темный
- [ ] Чередование `paper` / `paper-hi` / `paper-lo` + 1–2 темные и одна акцентная полоса
