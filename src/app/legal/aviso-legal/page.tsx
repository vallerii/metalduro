import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getT } from "@/i18n/server";
import { OG_IMAGE, metaDescription } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const doc = t.legal.aviso;
  return {
    title: doc.metaTitle,
    description: metaDescription(doc.intro ?? doc.title),
    alternates: { canonical: "/legal/aviso-legal" },
    openGraph: { title: doc.metaTitle, url: "/legal/aviso-legal", images: [OG_IMAGE] },
  };
}

export default async function Page() {
  const { t } = await getT();
  return <LegalPage doc={t.legal.aviso} t={t.legal} />;
}
