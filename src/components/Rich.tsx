import Link from "next/link";
import { Fragment } from "react";

/**
 * Простая разметка для текстов из словарей:
 *   **жирный**, [текст ссылки](/адрес), {ключ} — подставляется из `vars`.
 */
export function Rich({
  text,
  vars,
  boldClass = "font-semibold text-paper",
  linkClass = "underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep",
}: {
  text: string;
  vars?: Record<string, React.ReactNode>;
  boldClass?: string;
  linkClass?: string;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\{[a-zA-Z]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <b key={i} className={boldClass}>{p.slice(2, -2)}</b>;
        const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const [, label, href] = link;
          return href.startsWith("/") ? (
            <Link key={i} href={href} className={linkClass}>{label}</Link>
          ) : (
            <a key={i} href={href} className={linkClass}>{label}</a>
          );
        }
        const v = p.match(/^\{([a-zA-Z]+)\}$/);
        if (v && vars && v[1] in vars) return <Fragment key={i}>{vars[v[1]]}</Fragment>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
