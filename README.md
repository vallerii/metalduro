# Metalduro — сайт

Next.js 16 (App Router) + Tailwind CSS 4. Русская версия.

## Запуск

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # продакшен
```

## Фото

1. Скачайте фото из папки Google Drive в `_photos_src/` (имена файлов не меняйте, HEIC можно оставить как есть).
2. Выполните `npm run photos` — скрипт сконвертирует HEIC, уменьшит до 2000 px и положит файлы в `public/photos/` под нужными именами.

Соответствие «место на сайте → файл на Drive» — в `scripts/prepare-photos.mjs`.
Пока какого-то фото нет, на его месте показывается заштрихованная заглушка с подписью.
Можно и просто положить свой файл в `public/photos/<ключ>.jpg` (например `pack-1.jpg` — «Пример упаковки»).

## Где что править

| Что | Файл |
| --- | --- |
| Все тексты главной, контакты, ставки €/кг, города, история отправок, FAQ | `src/content/site.ts` |
| Гайды | `src/content/guides.ts` |
| Юридические страницы | `src/app/legal/*/page.tsx` (данные компании берутся из `contacts` в `site.ts`) |
| Цвета, шрифты, без скруглений | `src/app/globals.css` (`@theme`) |
| Калькулятор | `src/components/Calculator.tsx` |
| Прием заявок | `src/app/api/lead/route.ts` — сейчас заглушка, пишет заявку в лог сервера |

## Стиль

- Акцент `#ff5c39`, текст `#212123`, фон `#d9d9d9`
- Без закруглений (все `rounded-*` обнулены в `@theme`) и без карточек — линии, колонки, полосы на всю ширину
- Шрифты: Onest (близкий бесплатный аналог Aeonik Pro с telkom-ot.si, есть кириллица) + JetBrains Mono для подписей и цифр (аналог SF Mono). Если купите Aeonik Pro — замените `--font-sans` в `globals.css`.
- Знаки элементов W 74 / Co 27 — компонент `src/components/Element.tsx`

## TODO

- Заполнить данные компании в `contacts` (`legalName`, `nif`, `address`, `email`) — они подсвечены на юридических страницах
- Подключить отправку заявок (Telegram / email / CRM) в `src/app/api/lead/route.ts`
- Видео по упаковке (сейчас обложка с кнопкой ▶)
- Фото `pack-1` (пример упаковки) и `pack-3` (готовая посылка)
