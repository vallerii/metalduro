# Подключение Supabase к Metalduro

Эта инструкция выполняется владельцем проекта после ревью миграций. Текущий этап
не создаёт облачный проект и не применяет SQL к удалённой базе автоматически.

## 1. Создание проекта

1. Откройте Supabase Dashboard и выберите **New project**.
2. Название: `Metalduro`.
3. Создайте уникальный пароль базы данных и сохраните его в менеджере паролей.
4. Выберите регион Европейского союза с минимальной задержкой для пользователей в
   Испании. Если доступен регион в Испании, используйте его; иначе обычно подходит
   ближайший EU-регион, предлагаемый Dashboard. Не выбирайте регион вне ЕС без
   отдельного решения по хранению персональных данных.
5. Дождитесь завершения создания проекта.

## 2. Переменные Next.js

В Dashboard откройте **Project Settings → API** и возьмите:

- Project URL;
- Publishable key.

Создайте локальный `.env.local` на основе `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Publishable key разрешено использовать в браузере: доступ ограничивают grants и RLS.
`service_role` текущему приложению не требуется и добавлять его в Next.js не нужно.

Для production значение `NEXT_PUBLIC_SITE_URL` должно быть точным HTTPS-origin сайта,
без завершающего `/`.

## 3. Локальная проверка миграции

Рекомендуемый путь при работающих Docker и Supabase CLI:

```bash
npx supabase start
npx supabase db reset
npm run test:supabase:db
```

Команда `db reset` допустима только для локальной изолированной базы. Не выполняйте её
с production connection string.

## 4. Применение миграции в облаке

Файлы миграций (применяются по имени, в указанном порядке):

```text
supabase/migrations/20261027000100_initial_auth_and_applications.sql
supabase/migrations/20261102000100_client_account_safety.sql
supabase/migrations/20261102000200_admin_dashboard_support.sql
supabase/migrations/20261102000300_public_calculator_intake.sql
supabase/migrations/20261102000400_email_notification_outbox.sql
```

После успешных локальных тестов миграцию можно применить одним из способов.

### Вариант A — Supabase CLI

```bash
supabase login
supabase link --project-ref PROJECT_REF
supabase db push --dry-run
supabase db push
```

Сначала внимательно проверьте вывод `--dry-run`. `db push` изменяет облачную базу и
должен выполняться только после отдельного одобрения.

### Вариант B — SQL Editor

Откройте SQL Editor, вставьте полный файл миграции и выполните его один раз. После
выполнения проверьте, что созданы таблицы, функции, политики и приватный bucket
`receipts`.

## 5. Настройка Auth

В **Authentication → Providers → Email**:

1. Включите Email + Password.
2. Оставьте обязательное подтверждение email включённым.
3. Запретите anonymous sign-ins, если они включены.
4. Установите разумную password policy и rate limits.

В **Authentication → URL Configuration**:

- локальный Site URL: `http://localhost:3000`;
- production Site URL: фактический HTTPS-origin;
- Redirect URLs:
  - `http://localhost:3000/auth/confirm`;
  - `http://127.0.0.1:3000/auth/confirm`;
  - `https://YOUR_DOMAIN/auth/confirm`.

Не добавляйте wildcard redirect для чужих доменов.

## 6. Email templates

Для SSR-flow ссылки должны приходить в callback Next.js.

Для сохранения безопасного внутреннего маршрута возврата (включая восстановление
черновика калькулятора) шаблон не должен жёстко фиксировать `next=/account`.
Используйте стандартную ссылку подтверждения Supabase:

```text
{{ .ConfirmationURL }}
```

Она сохраняет переданный сервером `redirectTo` и после проверки возвращает пользователя
в `/auth/confirm`. Для reset password применяется тот же принцип:

```text
{{ .ConfirmationURL }}
```

До настройки Brevo можно использовать тестовую почту Supabase только в пределах её
ограничений. Реальные массовые или production-письма на этом этапе не отправляются.

Полная настройка транзакционного worker и Brevo Custom SMTP описана в
`docs/EMAIL_NOTIFICATIONS.md` и `docs/BREVO_SETUP.md`. Не включайте Brevo provider
и облачный cron до отдельной staging-проверки.

Безопасный порядок идентификации staging-проекта, read-only проверки истории
миграций и `db push --dry-run` описан в `docs/STAGING_PREFLIGHT.md`. До отдельного
разрешения не выполняйте обычный `db push`.

## 7. Создание первого администратора

Публичной функции повышения роли нет.

1. В Dashboard откройте **Authentication → Users → Add user**.
2. Создайте сотрудника вручную по email и задайте временный пароль.
3. Убедитесь, что trigger создал запись в `public.profiles` с ролью `client`.
4. В SQL Editor выполните, подставив email сотрудника:

```sql
update public.profiles
set role = 'admin',
    active = true
where user_id = (
  select id
  from auth.users
  where lower(email) = lower('EMPLOYEE_EMAIL')
);
```

5. Проверьте результат без вывода других персональных данных:

```sql
select p.user_id, p.email, p.display_name, p.role, p.active
from public.profiles p
where lower(p.email) = lower('EMPLOYEE_EMAIL');
```

Обычным пользователям и browser role `authenticated` не выданы права `UPDATE` на
`profiles`, поэтому повторить эту операцию из сайта нельзя.

## 8. Проверка клиента

1. Запустите `npm run dev`.
2. Откройте `/auth/register`.
3. Зарегистрируйте отдельный тестовый email.
4. До подтверждения email вход должен быть недоступен.
5. Перейдите по confirmation link.
6. Проверьте `/account`.
7. Проверьте, что `/admin` перенаправляет клиента обратно в `/account`.
8. Выполните выход и убедитесь, что `/account` снова требует вход.

### Проверка публичного калькулятора

1. В режиме гостя заполните калькулятор на главной странице.
2. Убедитесь, что до входа заявка не создаётся, а предлагаются регистрация и вход.
3. После подтверждения email вернитесь к калькулятору: материал, вес, город и способ
   передачи должны восстановиться в текущей вкладке.
4. Телефон, имя получателя и IBAN необходимо ввести повторно — эти значения намеренно
   не сохраняются в browser storage.
5. После сохранения проверьте переход в `/account/applications/[id]` и появление
   заявки в `/admin` → «Nuevas».

Расширенная заявка хранит `contact_phone`, `repeat_customer`,
`payment_recipient_name`, нормализованный `payment_iban` и
`preferred_visit_dates`. Эти поля защищены теми же RLS-политиками, что и заявка,
и становятся неизменяемыми после создания. Фактические ставка и сумма по-прежнему
вычисляются PostgreSQL из `materials`.

Маршрут `POST /api/lead` выведен из эксплуатации и отвечает `410 Gone`; рабочий
публичный сценарий использует аутентифицированное Server Action и
`create_application`.

## 9. Проверка сотрудника

1. Войдите вручную созданным admin-аккаунтом через `/auth/login?next=/admin`.
2. Проверьте открытие `/admin`.
3. Убедитесь, что роль отображается как `admin`.
4. Выполните выход и повторно откройте `/admin`.

## 10. Проверка RLS и Storage

Создайте минимум четыре тестовых аккаунта: два клиента и два администратора. Затем:

- клиент A не видит заявки клиента B;
- оба admin видят заявки;
- только один admin может выполнить `claim_application`;
- другой admin не может выполнить `advance_application`;
- `sent` невозможен без объекта в приватном bucket;
- путь чека имеет детерминированный формат `client_id/application_id/receipt`;
- клиент B не может прочитать или загрузить файл клиента A;
- постоянный публичный URL для bucket отсутствует;
- прямой `UPDATE profiles SET role = 'admin'` через browser session отклоняется.

Автоматические SQL-проверки находятся в `supabase/tests/database`.

## 11. После подключения

После применения миграций рекомендуется сгенерировать типы из фактической схемы:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Это действие следует выполнять только после `supabase link` к проверенному проекту и
не выводить ключи или пароли в терминальный лог задачи.
