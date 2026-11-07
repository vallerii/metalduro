// Тексты главной страницы: испанский — из примера (index.html), русский — перевод.
// Калькулятор, шапка и подвал берут тексты из словарей (src/content/dict).

const es = {
  heroTitle1: "Tu metal duro.",
  heroTitle2: "Su valor real.",
  heroSub: "Compramos chatarra de metal duro en toda España.",
  heroPoints: [
    "Envío a nuestro cargo",
    "Recogida desde 50 kg",
    "Puedes traerlo a Barcelona, con cita previa",
  ],
  proof: "5,0 / 5 en Google · 34 reseñas",

  manifesto: ["De piezas que ya no utilizas", " a un material que todavía tiene mucho valor. ", "Nosotros nos ocupamos del resto."],

  materialsTitle1: "Qué compramos.",
  materialsText: "Trabajamos con metal duro y wolframio. Sin listados interminables: identifica tu material de un vistazo.",
  materialCards: [
    { title: "Plaquitas de metal duro", tag: "Compramos ↗" },
    { title: "Brocas y fresas enterizas", tag: "Compramos ↗" },
    { title: "Chatarra de metal duro", tag: "Compramos ↗" },
    { title: "Wolframio puro", tag: "Consultar composición" },
  ],
  noBuyLabel: "No compramos",
  noBuyChips: ["HSS / acero rápido", "Cobre y cables", "Acero común", "Metal duro soldado", "Cermet y cerámica", "Chatarra mezclada / sucia"],

  speedWords: ["RECIBIMOS.", "REVISAMOS.", "PAGAMOS."],
  speedTitle: "De media hasta el pago",
  speedText: "Transferencia bancaria el mismo día, tras recibir y revisar tu material. También puedes entregarlo personalmente con cita previa.",
  speedMini: "Particulares y empresas",
  speedCaption: "HORAS · DE MEDIA",

  casesTitle1: "No son promesas.",
  casesTitle2: "Así trabajamos.",
  casesText: "Ejemplos de recepción y pago publicados en Metalduro.",
  casesFromLabel: "De la recepción al pago",
  futureCases: [
    { city: "Madrid · Envío", material: "Plaquitas de metal duro", photo: "inserts-2" },
    { city: "Bilbao · Envío", material: "Brocas y fresas", photo: "solid-2" },
    { city: "Sevilla · Envío", material: "Piezas de metal duro", photo: "wear-1" },
    { city: "Málaga · Envío", material: "Wolframio y carburo", photo: "rings-2" },
  ],
  futureDraft: "ESPACIO PARA UN CASO REAL",
  futureCaption: "Pendiente de fotografías y datos verificados de recepción y pago.",

  processTitle1: "Fácil de empezar.",
  processTitle2: "Fácil de cobrar.",
  processText: "Un proceso claro desde tu primera solicitud hasta la transferencia.",
  steps: [
    { title: "Haz tu solicitud.", text: "Indica el material, el peso aproximado y tu ciudad." },
    { title: "Embálalo.", text: "Te explicamos cómo preparar el material para transportarlo con seguridad." },
    { title: "Envíalo.", text: "Organizamos el envío o la recogida según el caso." },
    { title: "Lo revisamos.", text: "Registramos la recepción, pesamos y verificamos el contenido." },
    { title: "Te pagamos.", text: "Transferencia bancaria tras la revisión." },
  ],

  packTitle1: "Bien embalado.",
  packTitle2: "Bien recibido.",
  packText: "El metal duro es pesado y tiene bordes cortantes. Protegerlo adecuadamente ayuda a que llegue seguro y sin pérdidas.",
  packTips: [
    "Introduce el material en un envase interior de plástico resistente.",
    "Coloca ese envase en una caja de transporte y fíjalo bien.",
    "Fotografía el peso neto del material antes de cerrar.",
    "Fotografía el paquete terminado antes de enviarlo.",
  ],
  packCta: "Ver instrucciones completas",
  videoTitle: "Cómo embalar chatarra de metal duro",
  videoCaption: "Vídeo explicativo",

  recycleTitle: "El valor no termina aquí.",
  recycleLead: "El metal duro usado no es simplemente chatarra. Es una fuente de materias primas valiosas que pueden volver a utilizarse.",
  recycleText: "Las plaquitas, fresas y brocas desgastadas contienen principalmente carburo de tungsteno y cobalto. Mediante procesos especializados, estos materiales pueden recuperarse para fabricar nuevas herramientas y componentes industriales.",
  facts: [
    { symbol: "W", name: "Wolframio", text: "Proporciona dureza y resistencia al desgaste. Su recuperación reduce la necesidad de extraer materias primas nuevas." },
    { symbol: "Co", name: "Cobalto", text: "Es el aglutinante metálico que mantiene unidos los granos de carburo. También puede recuperarse." },
  ],
  recycleEnd1: "Menos residuos.",
  recycleEnd2: "Más recursos aprovechados.",
  recycleCta: "Calcula tu material",

  blogTitle1: "El metal duro,",
  blogTitle2: "sin complicaciones.",
  blogText: "Guías prácticas para identificar, preparar y aprovechar tu material.",
  blogCards: [
    { title: "Cómo identificar el metal duro", slug: "como-identificar-metal-duro" },
    { title: "Cómo embalar chatarra de metal duro", slug: "como-embalar-chatarra-metal-duro" },
    { title: "Por qué el tungsteno se recicla", slug: "que-es-el-carburo-de-tungsteno" },
  ],
  blogRead: "Leer artículo",

  faqTitle1: "Todo claro.",
  faqTitle2: "Antes de enviar.",
  faqText: "Preguntas frecuentes sobre materiales, precios y pagos.",
  faq: [
    { q: "¿Qué materiales compráis?", a: "Plaquitas, brocas y fresas enterizas, chatarra de metal duro y determinadas formas de wolframio. La composición se verifica durante la revisión." },
    { q: "¿Cómo se calcula el precio?", a: "Depende del tipo de material, el peso y su composición. El cálculo inicial es orientativo; el importe definitivo se confirma después de revisarlo." },
    { q: "¿Podéis recoger mi material?", a: "La recogida está disponible a partir de 50 kg. También puedes enviarlo o traerlo a Barcelona con cita previa." },
    { q: "¿Cuándo recibo el pago?", a: "El pago se realiza por transferencia tras recibir y revisar el material. Según la información publicada, la media habitual es inferior a dos horas." },
  ],
  navItems: [
    { label: "Materiales", href: "/#materiales" },
    { label: "Pagos reales", href: "/#casos" },
    { label: "Cómo funciona", href: "/#proceso" },
    { label: "Preguntas frecuentes", href: "/#faq" },
    { label: "Guías", href: "/#blog" },
  ],
  navCalc: "Calcular",
  navAuth: {
    menu: "Cuenta",
    login: "Iniciar sesión",
    register: "Registrarse",
    account: "Mi cuenta",
    admin: "Panel de administración",
    signOut: "Cerrar sesión",
  },
  footer: {
    cols: [
      { title: "MATERIALES", links: [
        { label: "Compra de plaquitas de metal duro", href: "/#materiales" },
        { label: "Compra de fresas de carburo", href: "/#materiales" },
        { label: "Compra de chatarra de tungsteno", href: "/#materiales" },
        { label: "Compra de wolframio", href: "/#materiales" },
      ] },
      { title: "CIUDADES", links: [
        { label: "Compra de metal duro en Barcelona", href: "/#calculator" },
        { label: "Compra de metal duro en Madrid", href: "/#calculator" },
        { label: "Compra de metal duro en Valencia", href: "/#calculator" },
        { label: "Compra de metal duro en Zaragoza", href: "/#calculator" },
        { label: "Compra de metal duro en Bilbao", href: "/#calculator" },
        { label: "Compra de metal duro en Sevilla", href: "/#calculator" },
      ] },
      { title: "INFORMACIÓN", links: [
        { label: "Cómo funciona", href: "/#proceso" },
        { label: "Cómo enviar el material", href: "/#proceso" },
        { label: "Cómo identificar metal duro", href: "/#materiales" },
        { label: "Preguntas frecuentes", href: "/#faq" },
      ] },
      { title: "METALDURO", links: [
        { label: "Sobre nosotros", href: "/#blog" },
        { label: "Contactar", href: "/#calculator" },
        { label: "Aviso legal", href: "/legal/aviso-legal" },
        { label: "Política de privacidad", href: "/legal/privacidad" },
      ] },
    ],
    copy: "© 2026 Metalduro.",
    country: "España",
  },
  scrollNote: "Descubre Metalduro",
  calc: {
    title: "¿Qué material tienes?",
    materials: ["Plaquitas de metal duro", "Brocas / fresas", "Chatarra de metal duro", "Todo mezclado / otro"],
    weight: "Peso aproximado",
    priceLabel: "Precio orientativo de tu material",
    disclaimer: "Estimación visual para este prototipo; el precio final depende del material y su revisión.",
    continue: "Continuar",
  },
};

export type HomeCopy = typeof es;

const ru: HomeCopy = {
  heroTitle1: "Ваш твёрдый сплав.",
  heroTitle2: "Его реальная ценность.",
  heroSub: "Скупаем лом твёрдого сплава по всей Испании.",
  heroPoints: [
    "Доставка за наш счёт",
    "Самовывоз от 50 кг",
    "Можно привезти в Барселону, по предварительной записи",
  ],
  proof: "5,0 / 5 в Google · 34 отзыва",

  manifesto: ["От ненужных деталей", " к материалу, который всё ещё многого стоит. ", "Остальное берём на себя."],

  materialsTitle1: "Что покупаем.",
  materialsText: "Работаем с твёрдым сплавом и вольфрамом. Без бесконечных списков: узнайте свой материал с первого взгляда.",
  materialCards: [
    { title: "Пластины из твёрдого сплава", tag: "Покупаем ↗" },
    { title: "Сверла и цельные фрезы", tag: "Покупаем ↗" },
    { title: "Лом твёрдого сплава", tag: "Покупаем ↗" },
    { title: "Чистый вольфрам", tag: "Уточняем состав" },
  ],
  noBuyLabel: "Не покупаем",
  noBuyChips: ["HSS / быстрорежущая сталь", "Медь и кабели", "Обычная сталь", "Твёрдый сплав с пайкой", "Керметы и керамика", "Смешанный или грязный лом"],

  speedWords: ["ПРИНИМАЕМ.", "ПРОВЕРЯЕМ.", "ПЛАТИМ."],
  speedTitle: "В среднем до оплаты",
  speedText: "Банковский перевод в тот же день, после получения и проверки материала. Также можно передать его лично по предварительной записи.",
  speedMini: "Частные лица и компании",
  speedCaption: "ЧАСОВ · В СРЕДНЕМ",

  casesTitle1: "Не обещания.",
  casesTitle2: "Так мы работаем.",
  casesText: "Примеры приёма и оплаты, опубликованные на Metalduro.",
  casesFromLabel: "От получения до оплаты",
  futureCases: [
    { city: "Мадрид · Отправка", material: "Пластины из твёрдого сплава", photo: "inserts-2" },
    { city: "Бильбао · Отправка", material: "Сверла и фрезы", photo: "solid-2" },
    { city: "Севилья · Отправка", material: "Детали из твёрдого сплава", photo: "wear-1" },
    { city: "Малага · Отправка", material: "Вольфрам и карбид", photo: "rings-2" },
  ],
  futureDraft: "МЕСТО ДЛЯ РЕАЛЬНОГО КЕЙСА",
  futureCaption: "Ждём фотографии и проверенные данные о приёме и оплате.",

  processTitle1: "Легко начать.",
  processTitle2: "Легко получить деньги.",
  processText: "Понятный процесс от первой заявки до перевода.",
  steps: [
    { title: "Оставьте заявку.", text: "Укажите материал, примерный вес и город." },
    { title: "Упакуйте.", text: "Расскажем, как подготовить материал к безопасной перевозке." },
    { title: "Отправьте.", text: "Организуем отправку или самовывоз в зависимости от случая." },
    { title: "Мы проверяем.", text: "Регистрируем получение, взвешиваем и проверяем содержимое." },
    { title: "Вы получаете оплату.", text: "Банковский перевод после проверки." },
  ],

  packTitle1: "Правильно упаковано.",
  packTitle2: "Правильно принято.",
  packText: "Твёрдый сплав тяжёлый и с острыми кромками. Надёжная упаковка помогает доставить его без повреждений и потерь.",
  packTips: [
    "Поместите материал во внутреннюю прочную пластиковую тару.",
    "Положите тару в транспортную коробку и хорошо зафиксируйте.",
    "Сфотографируйте чистый вес материала до закрытия.",
    "Сфотографируйте готовую упаковку перед отправкой.",
  ],
  packCta: "Все инструкции",
  videoTitle: "Как упаковать лом твёрдого сплава",
  videoCaption: "Обучающее видео",

  recycleTitle: "Ценность не заканчивается здесь.",
  recycleLead: "Отработанный твёрдый сплав — не просто лом. Это источник ценного сырья, которое можно использовать повторно.",
  recycleText: "Изношенные пластины, фрезы и сверла содержат в основном карбид вольфрама и кобальт. Специальными процессами эти материалы можно извлечь и использовать для новых инструментов и промышленных компонентов.",
  facts: [
    { symbol: "W", name: "Вольфрам", text: "Придаёт твёрдость и износостойкость. Его переработка снижает потребность в добыче нового сырья." },
    { symbol: "Co", name: "Кобальт", text: "Металлическая связка, которая удерживает зёрна карбида. Его также можно извлечь." },
  ],
  recycleEnd1: "Меньше отходов.",
  recycleEnd2: "Больше использованных ресурсов.",
  recycleCta: "Рассчитать материал",

  blogTitle1: "Твёрдый сплав",
  blogTitle2: "без сложностей.",
  blogText: "Практические руководства по определению, подготовке и использованию вашего материала.",
  blogCards: [
    { title: "Как определить твёрдый сплав", slug: "como-identificar-metal-duro" },
    { title: "Как упаковать лом твёрдого сплава", slug: "como-embalar-chatarra-metal-duro" },
    { title: "Почему вольфрам перерабатывают", slug: "que-es-el-carburo-de-tungsteno" },
  ],
  blogRead: "Читать статью",

  faqTitle1: "Всё понятно.",
  faqTitle2: "Перед отправкой.",
  faqText: "Частые вопросы о материалах, ценах и оплате.",
  faq: [
    { q: "Какие материалы вы покупаете?", a: "Пластины, сверла и цельные фрезы, лом твёрдого сплава и отдельные формы вольфрама. Состав проверяется при осмотре." },
    { q: "Как рассчитывается цена?", a: "Зависит от типа материала, веса и состава. Первоначальный расчёт ориентировочный; окончательную сумму подтверждаем после проверки." },
    { q: "Вы можете забрать мой материал?", a: "Самовывоз доступен от 50 кг. Также можно отправить или привезти в Барселону по предварительной записи." },
    { q: "Когда я получу оплату?", a: "Оплата производится переводом после получения и проверки материала. По опубликованной информации, обычно это меньше двух часов." },
  ],
  navItems: [
    { label: "Материалы", href: "/#materiales" },
    { label: "Реальные выплаты", href: "/#casos" },
    { label: "Как это работает", href: "/#proceso" },
    { label: "Вопросы", href: "/#faq" },
    { label: "Гайды", href: "/#blog" },
  ],
  navCalc: "Рассчитать",
  navAuth: {
    menu: "Аккаунт",
    login: "Войти",
    register: "Регистрация",
    account: "Мой кабинет",
    admin: "Админ-панель",
    signOut: "Выйти",
  },
  footer: {
    cols: [
      { title: "МАТЕРИАЛЫ", links: [
        { label: "Скупка пластин твёрдого сплава", href: "/#materiales" },
        { label: "Скупка твердосплавных фрез", href: "/#materiales" },
        { label: "Скупка лома вольфрама", href: "/#materiales" },
        { label: "Скупка вольфрама", href: "/#materiales" },
      ] },
      { title: "ГОРОДА", links: [
        { label: "Скупка твёрдого сплава в Барселоне", href: "/#calculator" },
        { label: "Скупка твёрдого сплава в Мадриде", href: "/#calculator" },
        { label: "Скупка твёрдого сплава в Валенсии", href: "/#calculator" },
        { label: "Скупка твёрдого сплава в Сарагосе", href: "/#calculator" },
        { label: "Скупка твёрдого сплава в Бильбао", href: "/#calculator" },
        { label: "Скупка твёрдого сплава в Севилье", href: "/#calculator" },
      ] },
      { title: "ИНФОРМАЦИЯ", links: [
        { label: "Как это работает", href: "/#proceso" },
        { label: "Как отправить материал", href: "/#proceso" },
        { label: "Как определить твёрдый сплав", href: "/#materiales" },
        { label: "Вопросы", href: "/#faq" },
      ] },
      { title: "METALDURO", links: [
        { label: "О нас", href: "/#blog" },
        { label: "Связаться", href: "/#calculator" },
        { label: "Правовая информация", href: "/legal/aviso-legal" },
        { label: "Политика конфиденциальности", href: "/legal/privacidad" },
      ] },
    ],
    copy: "© 2026 Metalduro.",
    country: "Испания",
  },
  scrollNote: "Узнайте больше о Metalduro",
  calc: {
    title: "Какой у вас материал?",
    materials: ["Пластины из твёрдого сплава", "Сверла / фрезы", "Лом твёрдого сплава", "Всё смешано / другое"],
    weight: "Примерный вес",
    priceLabel: "Ориентировочная цена вашего материала",
    disclaimer: "Визуальная оценка для этого прототипа; окончательная цена зависит от материала и его проверки.",
    continue: "Продолжить",
  },
};

export const homeCopy: Record<"es" | "ru", HomeCopy> = { es, ru };
