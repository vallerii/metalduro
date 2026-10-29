import Link from "next/link";
import { homeCopy } from "@/content/home-copy";
import { getT } from "@/i18n/server";

// Подвал из index.html (.footer): большой логотип и четыре колонки ссылок.
export async function Footer() {
  const { locale } = await getT();
  const f = homeCopy[locale].footer;
  return (
    <div className="ref-home">
      <footer className="footer wrap">
        <div className="footer-brand">
          metalduro<span>.</span>
        </div>
        <div className="footer-columns">
          {f.cols.map((col) => (
            <div key={col.title} className="footer-col">
              <h4>{col.title}</h4>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>{f.copy}</span>
          <span>{f.country}</span>
        </div>
      </footer>
    </div>
  );
}
