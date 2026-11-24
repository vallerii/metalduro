import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getT } from "@/i18n/server";
import { OG_IMAGE, metaDescription } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const doc = t.legal.cookies;
  return {
    title: doc.metaTitle,
    description: metaDescription(doc.intro ?? doc.title),
    alternates: { canonical: "/legal/cookies" },
    openGraph: { title: doc.metaTitle, url: "/legal/cookies", images: [OG_IMAGE] },
  };
}

export default async function Page() {
  const { t } = await getT();
  return <LegalPage doc={t.legal.cookies} t={t.legal} />;
}
