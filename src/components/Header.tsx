import Link from "next/link";
import { Logo } from "./Element";
import { contacts } from "@/content/site";

const nav = [
  { href: "/#materials", label: "Что покупаем" },
  { href: "/#how", label: "Как это работает" },
  { href: "/#packing", label: "Упаковка" },
  { href: "/#faq", label: "Вопросы" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="Metalduro — на главную">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-accent-deep">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <a href={contacts.phoneHref} className="hidden font-mono text-sm md:block">
            {contacts.phone}
          </a>
          <Link
            href="/#calculator"
            className="bg-ink px-4 py-2.5 text-[15px] font-medium text-paper transition-colors hover:bg-accent hover:text-ink"
          >
            Рассчитать
          </Link>
        </div>
      </div>
    </header>
  );
}
