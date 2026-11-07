import type { MaterialId } from "../site";

// Структура словаря. es.ts и ru.ts обязаны заполнить все поля —
// TypeScript подсветит, если в одном из языков чего-то не хватает.
//
// В строках можно использовать разметку (см. components/Rich.tsx):
//   **жирный**, [текст](/ссылка), {legalName} и т.п. — подстановки.

export type Guide = {
  slug: string;
  kind: string;
  title: string;
  lead: string;
  photo?: string;
  sections: { h: string; p?: string[]; list?: string[] }[];
};

export type LegalDoc = {
  metaTitle: string;
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; p: string[] }[];
};

type Item = { title: string; note: string };

export type Dict = {
  htmlLang: string;
  numberLocale: string;
  meta: { title: string; template: string; description: string; ogLocale: string };

  nav: { home: string; materials: string; how: string; packing: string; faq: string; calc: string; logoAria: string };
  footer: {
    tagline: string;
    contact: string;
    warehouse: string;
    sell: string;
    links: { calc: string; materials: string; packing: string; how: string; faq: string; about: string };
    useful: string;
    copyright: string;
    legal: string;
    privacy: string;
    cookies: string;
  };

  // Данные блоков
  materials: { id: MaterialId; name: string; title: string; hint: string }[];
  buyList: (Item & { photo: string | null })[];
  noBuyList: Item[];
  packingSteps: { title: string; text: string }[];
  history: {
    date: string;
    received: string;
    city: string;
    method: string;
    material: string;
    weight: string;
    /** Сколько заработал клиент. TODO: заменить на реальные суммы. */
    earned: string;
    wait: string;
    paid: string;
    photo: string;
  }[];
  flow: { title: string; text: string; strong?: string; link?: { href: string; label: string } }[];
  faq: { q: string; a: string }[];
  ecoStats: { value: string; text: string }[];

  home: {
    h1: string;
    heroPoints: string[];
    heroNote: string;
    materialsTitle: string;
    buy: string;
    noBuy: string;
    brandsLabel: string;
    contamination: string;
    payBig: string;
    paySub: string;
    payLead: string;
    payText: string;
    payTag: string;
    historyTitle: string;
    historyLabels: { weight: string; received: string; paid: string; wait: string };
    unsure: string;
    howTitle: string;
    howText: string;
    packTitle: string;
    packText: string;
    packBefore: string;
    packBeforeText: string;
    packCta: string;
    videoTitle: string;
    videoCaption: string;
    packPhotos: [string, string, string];
    trustTitle: string;
    trustItems: [string, string][];
    trustAskTitle: string;
    trustAskText: string;
    whatsappWrite: string;
    ecoTitle: string;
    ecoP1: string;
    ecoLink: string;
    ecoTags: string[];
    ecoComposition: string;
    ecoW: string;
    ecoCo: string;
    ecoRecycling: string;
    faqTitle: string;
    faqText: string;
    faqNotFound: string;
    faqNotFoundText: string;
    faqWhatsapp: string;
    call: string;
    guideIdentify: string;
    guidePack: string;
    guideCarbide: string;
  };

  calc: {
    brand: string;
    title: string;
    months: string[];
    days: string[];
    methodNames: { send: string; pickup: string; warehouse: string };
    methods: {
      send: { t: string; d: string; tag: string };
      pickup: { t: string; d: string; dDisabled: string };
      warehouse: { t: string; d: string };
    };
    introTitle: string;
    introText: string;
    sent: string;
    earned: string;
    paidIn: string;
    prev: string;
    next: string;
    slide: string;
    introCta: string;
    matTitle: string;
    matText: string;
    weightTitle: string;
    weightText: string;
    weightAria: string;
    sliderAria: string;
    estimate: string;
    custom: string;
    over100: string;
    rateLine: string;
    placeTitle: string;
    placeText: string;
    methodLabel: string;
    contactTitleSend: string;
    contactTitleDate: string;
    contactTextSend: string;
    contactTextDate: string;
    contactLabel: string;
    workedBefore: string;
    whenLabel: string;
    whenText: string;
    payLabel: string;
    payName: string;
    iban: string;
    summary: string;
    noCity: string;
    errPhone: string;
    errWeight: string;
    errIban: string;
    errPayName: string;
    errValidation: string;
    errMaterial: string;
    errUnavailable: string;
    errCreate: string;
    errClientOnly: string;
    errIntentChanged: string;
    authRequired: string;
    authLead: string;
    authLogin: string;
    authRegister: string;
    draftRestored: string;
    draftDiscard: string;
    draftSaved: string;
    draftUnavailable: string;
    sensitiveAgain: string;
    priceChanged: string;
    errSend: string;
    sending: string;
    submit: string;
    continue: string;
    back: string;
    doneTitle: string;
    doneText: string;
    doneNext: string;
    doneSend: string;
    donePickup: string;
    doneWarehouse: string;
    urgent: string;
  };

  reviews: {
    title: string;
    text: string;
    cta: string;
    /**
     * Скриншоты переписок из WhatsApp (файлы в public/reviews/).
     * mockup: true — макет: показывается ТОЛЬКО при разработке (localhost) с пометкой,
     * на рабочем сайте скрыт. Реальные скриншоты (с согласия клиентов) — без mockup.
     */
    items: { src: string; alt: string; mockup?: boolean }[];
  };

  city: { placeholder: string; clear: string; nothing: string; other: string };
  video: { watch: string };
  photoPlaceholder: string;

  about: {
    path: string;
    metaTitle: string;
    metaDescription: string;
    crumb: string;
    kicker: string;
    h1: string;
    lead: string;
    heroAlt: string;
    contents: string;
    sections: {
      who: { h: string; p: string[] };
      buy: { h: string; intro: string; outro: string };
      how: { h: string; intro: string; facts: [string, string][] };
      recycling: { h: string; p: string[]; outro: string };
      geo: { h: string; p: string[]; citiesIntro: string };
      deals: { h: string; intro: string; payout: string };
    };
    cta: string;
    ctaOr: string;
    ctaBtn: string;
    useful: string;
  };

  guidePage: { back: string; contents: string; cta: string; ctaBtn: string; readAlso: string };
  guides: Guide[];

  legal: {
    nav: { aviso: string; privacy: string; cookies: string };
    updatedLabel: string;
    aviso: LegalDoc;
    privacy: LegalDoc;
    cookies: LegalDoc;
  };
};
