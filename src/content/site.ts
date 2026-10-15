// Общие данные сайта, которые НЕ зависят от языка: контакты, города, бренды, ставки.
// Все тексты для посетителей — в src/content/dict/es.ts (основной язык) и ru.ts.

export const contacts = {
  brand: "Metalduro",
  phone: "+34 603 623 275",
  phoneHref: "tel:+34603623275",
  whatsapp: "https://wa.me/34603623275",
  city: "Barcelona",
  // TODO: заполнить реальными данными компании (нужны для юридических страниц)
  legalName: "[Razón social / autónomo]",
  nif: "[NIF / CIF]",
  address: "[Domicilio social], Barcelona, España",
  email: "[email@metalduro.es]",
  registry: "[si procede]",
};

export type MaterialId = "inserts" | "solid" | "scrap" | "mixed";

/** Ставка (€/кг), фото и код для калькулятора. Названия — в словарях. */
export const materialMeta: Record<MaterialId, { rate: number; photo: string; code: string }> = {
  inserts: { rate: 36, photo: "inserts-1", code: "WC-Co" },
  solid: { rate: 40, photo: "solid-1", code: "WC" },
  scrap: { rate: 34, photo: "rings-1", code: "WC" },
  mixed: { rate: 30, photo: "mixed-1", code: "W·?" },
};

export const cities = [
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia", "Palma",
  "Las Palmas de Gran Canaria", "Alicante", "Bilbao", "Córdoba", "Valladolid", "Vigo",
  "L'Hospitalet de Llobregat", "Gijón", "Vitoria-Gasteiz", "A Coruña", "Elche", "Granada",
  "Terrassa", "Badalona", "Oviedo", "Cartagena", "Sabadell", "Jerez de la Frontera", "Móstoles",
  "Santa Cruz de Tenerife", "Pamplona", "Almería", "Alcalá de Henares", "Fuenlabrada", "Leganés",
  "Donostia / San Sebastián", "Getafe", "Burgos", "Albacete", "Castellón de la Plana", "Santander",
  "Alcorcón", "San Cristóbal de La Laguna", "Logroño", "Badajoz", "Salamanca", "Huelva", "Marbella",
  "Lleida", "Tarragona", "León", "Cádiz", "Jaén", "Ourense", "Girona",
];

export const brands = ["ISCAR", "Sandvik Coromant", "Kennametal", "Korloy", "Mitsubishi Materials", "Walter", "Seco Tools", "Tungaloy", "Dormer Pramet"];
