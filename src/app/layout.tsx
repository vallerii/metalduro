import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://metalduro.es"),
  title: {
    default: "Metalduro — покупаем твердосплавный лом по всей Испании",
    template: "%s · Metalduro",
  },
  description:
    "Покупаем твердосплавный лом (карбид вольфрама) и чистый вольфрам по всей Испании. Расчет стоимости онлайн, доставка за наш счет, оплата в среднем за 2 часа после приемки.",
  openGraph: { locale: "ru_RU", siteName: "Metalduro", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
