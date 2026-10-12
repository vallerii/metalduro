// Все тексты и данные сайта в одном месте — правьте здесь.

export const contacts = {
  brand: "Metalduro",
  phone: "+34 603 623 275",
  phoneHref: "tel:+34603623275",
  whatsapp: "https://wa.me/34603623275",
  city: "Barcelona",
  // TODO: заполнить реальными данными компании (нужны для юридических страниц)
  legalName: "[Название компании / ИП]",
  nif: "[NIF / CIF]",
  address: "[Юридический адрес], Barcelona, España",
  email: "[email@metalduro.es]",
};

export type MaterialId = "inserts" | "solid" | "scrap" | "mixed";

export const materials: {
  id: MaterialId;
  name: string;
  title: string;
  hint: string;
  rate: number;
  photo: string;
  code: string;
}[] = [
  { id: "inserts", name: "Твердосплавные пластины", title: "Твердосплавные пластины", hint: "сменные режущие пластины", rate: 36, photo: "inserts-1", code: "WC-Co" },
  { id: "solid", name: "Монолитный инструмент", title: "Монолитные сверла / фрезы", hint: "цельный твердый сплав", rate: 40, photo: "solid-1", code: "WC" },
  { id: "scrap", name: "Твердосплавный лом", title: "Твердосплавный лом", hint: "обломки и изношенный инструмент", rate: 34, photo: "rings-1", code: "WC" },
  { id: "mixed", name: "Смешанный материал", title: "Все вперемешку / другое", hint: "если не уверены — выберите это", rate: 30, photo: "mixed-1", code: "W·?" },
];

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

export const buyList = [
  { title: "Твердосплавные пластины", note: "новые и б/у, токарные и фрезерные", photo: "inserts-2" },
  { title: "Монолитные сверла и фрезы", note: "цельный твердый сплав, развертки, метчики", photo: "solid-4" },
  { title: "Твердосплавный лом", note: "матрицы, пуансоны, износостойкие детали", photo: "wear-1" },
  { title: "Чистый вольфрам", note: "прутки, электроды, проволока", photo: null },
];

export const noBuyList = [
  { title: "HSS / быстрорежущая сталь", note: "сверла и фрезы из быстрореза" },
  { title: "Медь и провода", note: "а также алюминий и латунь" },
  { title: "Обычная сталь", note: "нержавейка, чугун, любой черный металл" },
  { title: "Напайной твердый сплав", note: "пластины, припаянные к стальному корпусу или хвостовику" },
  { title: "Кермет и керамика", note: "например Sandvik GC1525, Kyocera TN60, Korloy PC9030" },
  { title: "Смешанный / загрязненный лом", note: "винты, стружка, посторонние детали" },
];

export const brands = ["ISCAR", "Sandvik Coromant", "Kennametal", "Korloy", "Mitsubishi Materials", "Walter", "Seco Tools", "Tungaloy", "Dormer Pramet"];

export const packingSteps = [
  { title: "Поместите лом во внутреннюю пластиковую тару", text: "Прочная канистра, пластиковая емкость или другая тара, которую материал не сможет легко прорезать." },
  { title: "Только затем упакуйте в транспортную коробку", text: "Зафиксируйте внутреннюю тару, чтобы она не перемещалась внутри коробки." },
  { title: "Зафиксируйте чистый вес", text: "Сфотографируйте материал на весах до упаковки." },
  { title: "Сфотографируйте готовую посылку", text: "Фото помогает зафиксировать состояние упаковки до передачи перевозчику." },
];

export const history = [
  { date: "18 сентября 2026", received: "10:42", city: "Valencia", method: "Отправили нам", material: "Твердосплавные пластины", weight: "32 кг", wait: "1 ч 18 мин", paid: "18 сентября · 12:00", photo: "inserts-3" },
  { date: "13 сентября 2026", received: "11:15", city: "Zaragoza", method: "Забрали сами", material: "Монолитные фрезы и сверла", weight: "68 кг", wait: "42 мин", paid: "13 сентября · 11:57", photo: "solid-2" },
  { date: "9 сентября 2026", received: "16:06", city: "Barcelona", method: "Привезли на склад", material: "Смешанный твердосплавный лом", weight: "21 кг", wait: "36 мин", paid: "9 сентября · 16:42", photo: "rings-2" },
];

export const flow = [
  { title: "Оформите заявку", text: "Укажите материал, примерный вес, город и удобный способ передачи.", link: { href: "#calculator", label: "Оформить заявку" } },
  { title: "Упакуйте", text: "Мы покажем, как безопасно упаковать тяжелый твердосплавный лом для перевозки.", link: { href: "#packing", label: "Как упаковать" } },
  { title: "Отправьте", text: "Предпочтительный вариант — отправка на наш склад. Привоз лично только по предварительному согласованию.", link: { href: "/guides/kak-upakovat-lom", label: "Как отправить" } },
  { title: "Получаем и проверяем", text: "Фиксируем получение, взвешиваем и проверяем материал. Вскрытие посылки снимаем на видео." },
  { title: "Оплачиваем", text: "После приемки переводим деньги банковским переводом.", strong: "В среднем — в течение 2 часов." },
];

export const faq = [
  { q: "Как понять, что это твердый сплав?", a: "Сравните материал с примерами или отправьте нам фото в WhatsApp. Твердый сплав заметно тяжелее стали и не притягивается или слабо притягивается магнитом." },
  { q: "Что если вес неточный?", a: "Для расчета достаточно примерного веса. Финальный вес фиксируем после получения." },
  { q: "Кто оплачивает отправку?", a: "Стоимость отправки компенсируем мы." },
  { q: "Когда я получу деньги?", a: "После получения и проверки материала — в среднем в течение двух часов." },
  { q: "Можно продать как частное лицо?", a: "Да." },
  { q: "Что если в партии окажется посторонний материал?", a: "Кермет, керамику, HSS или крепежные винты мы отделяем. Если таких деталей много, применяем скидку за загрязнение 3% от общего веса партии. Непринятый материал можем вернуть." },
  { q: "Что делать с объемом больше 100 кг?", a: "Свяжитесь с нами — рассчитаем условия индивидуально." },
];

export const ecoStats = [
  { value: "35%", text: "recycling input rate — доля лома во входящем сырье по глобальной оценке ITIA" },
  { value: "30%", text: "оценка end-of-life recycling rate в глобальном потоке вольфрама" },
  { value: "45–50%", text: "оценки уровня переработки вольфрама в ЕС, приведенные JRC" },
];
