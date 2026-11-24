import { contacts } from "@/content/site";

export const SITE_URL = "https://metalduro.es";

/** Default social preview (1200×630) used when a page has no own image. */
export const OG_IMAGE = { url: "/og.jpg", width: 1200, height: 630, alt: "Metalduro" };

/** Same @id everywhere so search engines merge the organization data. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationJsonLd(description: string) {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: contacts.brand,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-mark.png`,
    image: `${SITE_URL}${OG_IMAGE.url}`,
    telephone: contacts.phone,
    address: { "@type": "PostalAddress", addressLocality: contacts.city, addressCountry: "ES" },
    areaServed: { "@type": "Country", name: "España" },
    sameAs: [contacts.whatsapp],
    description,
  };
}

/** Cuts a text to a meta-description length on a word boundary. */
export function metaDescription(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Safe JSON for <script type="application/ld+json">. */
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
