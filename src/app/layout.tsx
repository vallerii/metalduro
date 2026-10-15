import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getT } from "@/i18n/server";

// Язык берется из cookie (переключатель ES/RU только для разработки), поэтому
// страницы рендерятся на сервере при запросе. Когда русский уберут (SHOW_RU = false),
// эту строку тоже можно удалить — тогда страницы снова станут статичными.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL("https://metalduro.es"),
    title: { default: t.meta.title, template: t.meta.template },
    description: t.meta.description,
    openGraph: { locale: t.meta.ogLocale, siteName: "Metalduro", type: "website" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { t } = await getT();
  return (
    <html lang={t.htmlLang}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
