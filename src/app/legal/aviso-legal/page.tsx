import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.legal.aviso.metaTitle };
}

export default async function Page() {
  const { t } = await getT();
  return <LegalPage doc={t.legal.aviso} t={t.legal} />;
}
