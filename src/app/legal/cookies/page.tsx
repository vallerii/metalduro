import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Политика cookies" };

export default function Page() {
  return (
    <LegalPage
      title="Политика cookies"
      updated="12 октября 2026"
      intro="Cookies — небольшие файлы, которые сайт сохраняет в браузере. Ниже описано, какие из них использует metalduro.es."
      sections={[
        {
          h: "Какие cookies мы используем",
          p: ["Сейчас сайт использует только технически необходимые cookies, без которых он не может работать корректно. Такие cookies не требуют согласия (ст. 22.2 LSSI-CE)."],
        },
        {
          h: "Аналитика и реклама",
          p: ["Аналитические и рекламные cookies сейчас не используются. Если мы их подключим, на сайте появится запрос согласия, а эта страница будет обновлена."],
        },
        {
          h: "Как управлять cookies",
          p: ["Вы можете удалить или заблокировать cookies в настройках браузера. Обратите внимание: блокировка технических cookies может нарушить работу сайта."],
        },
      ]}
    />
  );
}
