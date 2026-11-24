import type { Locale } from "@/i18n/config";

export const applicationStatuses = [
  "new",
  "in_progress",
  "sent",
  "accepted",
  "verification",
  "payment",
  "paid",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export type AccountCopy = {
  common: {
    account: string;
    backToAccount: string;
    createApplication: string;
    applications: string;
    application: string;
    material: string;
    weight: string;
    estimate: string;
    createdAt: string;
    status: string;
    manager: string;
    unassignedManager: string;
    assignedManager: string;
    rate: string;
    actions: string;
    view: string;
    retry: string;
  };
  overview: {
    kicker: string;
    title: string;
    lead: string;
    countLabel: string;
    emptyTitle: string;
    emptyText: string;
    adminRequired: string;
    clientRequired: string;
  };
  create: {
    kicker: string;
    title: string;
    titleAccent: string;
    lead: string;
    materialLabel: string;
    materialHelp: string;
    weightLabel: string;
    weightHelp: string;
    currentRate: string;
    estimateLabel: string;
    trustedCalculation: string;
    submit: string;
    submitting: string;
    success: string;
  };
  detail: {
    kicker: string;
    now: string;
    openReceipt: string;
    nextSteps: Record<ApplicationStatus, { title: string; text: string }>;
    title: string;
    createdSuccess: string;
    summary: string;
    history: string;
    historyLead: string;
    receipt: string;
    receiptLead: string;
    notFoundTitle: string;
    notFoundText: string;
    city: string;
    deliveryMethod: string;
    phone: string;
    repeatCustomer: string;
    yes: string;
    no: string;
    paymentRecipient: string;
    iban: string;
    preferredDates: string;
    deliveryMethods: Record<"send" | "pickup" | "warehouse", string>;
  };
  receipt: {
    choose: string;
    replace: string;
    upload: string;
    uploading: string;
    retryFinalization: string;
    pendingFinalization: string;
    attached: string;
    allowed: string;
    invalidType: string;
    tooLarge: string;
    uploadError: string;
    finalizeError: string;
    success: string;
    previewAlt: string;
  };
  payment: {
    title: string;
    lead: string;
    overdue: string;
    complete: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
  errors: {
    load: string;
    generic: string;
    invalidMaterial: string;
    invalidWeight: string;
    duplicateConflict: string;
    auth: string;
  };
  statuses: Record<ApplicationStatus, string>;
};

const es: AccountCopy = {
  common: {
    account: "Área de cliente",
    backToAccount: "Volver al área de cliente",
    createApplication: "Crear solicitud",
    applications: "Solicitudes",
    application: "Solicitud",
    material: "Material",
    weight: "Peso declarado",
    estimate: "Importe estimado",
    createdAt: "Creada",
    status: "Estado",
    manager: "Responsable",
    unassignedManager: "Pendiente de asignación",
    assignedManager: "Asignado",
    rate: "Precio por kilo",
    actions: "Acciones",
    view: "Ver detalle",
    retry: "Reintentar",
  },
  overview: {
    kicker: "Área de cliente",
    title: "Tus solicitudes",
    lead: "Aquí puedes seguir el estado, el importe y el historial de cada solicitud.",
    countLabel: "Total de solicitudes",
    emptyTitle: "Todavía no tienes solicitudes",
    emptyText: "Crea tu primera solicitud: elige el material, indica el peso aproximado y verás al momento cuánto vale.",
    adminRequired: "Tu cuenta no tiene permisos de administrador.",
    clientRequired: "Solo las cuentas de cliente pueden crear solicitudes.",
  },
  create: {
    kicker: "Nueva solicitud",
    title: "Calcula tu metal duro.",
    titleAccent: "Su valor real.",
    lead: "Elige el tipo de material e indica el peso aproximado y verás al momento cuánto vale.",
    materialLabel: "Tipo de material",
    materialHelp: "Elige la opción que más se parezca a tu material.",
    weightLabel: "Peso aproximado",
    weightHelp: "Introduce un valor mayor que 0 kg.",
    currentRate: "Precio por kilo",
    estimateLabel: "Estimación",
    trustedCalculation: "El importe es orientativo. Al guardar la solicitud lo recalculamos con el precio vigente.",
    submit: "Crear solicitud",
    submitting: "Guardando…",
    success: "¡Listo! Hemos recibido tu solicitud.",
  },
  detail: {
    kicker: "Detalle de solicitud",
    now: "Ahora",
    openReceipt: "Ver comprobante de envío",
    nextSteps: {
      new: { title: "Solicitud recibida", text: "En breve alguien de nuestro equipo la revisará y se pondrá en contacto contigo." },
      in_progress: { title: "Envía el material y sube el justificante", text: "Envíanos el material como lo hayamos acordado y sube una foto del justificante o del albarán de la agencia. Así sabremos que va de camino." },
      sent: { title: "Material de camino", text: "Ya tenemos tu justificante. Te avisaremos en cuanto llegue el material." },
      accepted: { title: "Material recibido", text: "Ya está en nuestro almacén. En breve lo pesamos y lo revisamos." },
      verification: { title: "En revisión", text: "Estamos pesando el material y comprobando su composición. Después te confirmamos el importe final." },
      payment: { title: "Preparando el pago", text: "La revisión ha terminado y ya estamos haciendo la transferencia." },
      paid: { title: "Pagado", text: "Te hemos hecho la transferencia. ¡Gracias por confiar en nosotros!" },
    },
    title: "Seguimiento de la operación",
    createdSuccess: "¡Listo! Hemos recibido tu solicitud.",
    summary: "Resumen",
    history: "Historial de estados",
    historyLead: "Cada cambio se registra en la base de datos con su fecha y responsable.",
    receipt: "Justificante de envío",
    receiptLead: "El justificante se guarda de forma privada: solo lo vemos tú y nuestro equipo.",
    notFoundTitle: "Solicitud no encontrada",
    notFoundText: "Esta solicitud no existe o no tienes acceso a ella.",
    city: "Ciudad",
    deliveryMethod: "Forma de entrega",
    phone: "Teléfono de contacto",
    repeatCustomer: "Cliente anterior",
    yes: "Sí",
    no: "No",
    paymentRecipient: "Titular del pago",
    iban: "IBAN",
    preferredDates: "Fechas propuestas",
    deliveryMethods: {
      send: "Envío",
      pickup: "Recogida",
      warehouse: "Entrega en almacén",
    },
  },
  receipt: {
    choose: "Seleccionar imagen",
    replace: "Elegir otra imagen",
    upload: "Subir justificante",
    uploading: "Procesando…",
    retryFinalization: "Reintentar confirmación",
    pendingFinalization: "La imagen ya se ha subido, pero falta confirmar el envío.",
    attached: "Justificante adjunto",
    allowed: "JPEG, PNG o WebP · máximo 10 MB",
    invalidType: "Selecciona una imagen JPEG, PNG o WebP.",
    tooLarge: "La imagen no puede superar 10 MB.",
    uploadError: "No se ha podido subir la imagen. Inténtalo de nuevo.",
    finalizeError: "La imagen se ha subido, pero no hemos podido confirmar el envío. Vuelve a intentarlo: no hace falta subirla otra vez.",
    success: "Justificante recibido. Hemos marcado la solicitud como enviada.",
    previewAlt: "Vista previa del justificante de envío",
  },
  payment: {
    title: "Tiempo estimado hasta el pago",
    lead: "Cuenta atrás hasta la hora prevista de la transferencia.",
    overdue: "Ya ha pasado el plazo previsto",
    complete: "Pago completado",
    hours: "horas",
    minutes: "minutos",
    seconds: "segundos",
  },
  errors: {
    load: "No se han podido cargar las solicitudes.",
    generic: "No se ha podido completar la operación. Inténtalo de nuevo.",
    invalidMaterial: "Selecciona un material disponible.",
    invalidWeight: "Introduce un peso válido mayor que 0 kg.",
    duplicateConflict: "Esta solicitud ya se envió con otros datos. Recarga la página y vuelve a intentarlo.",
    auth: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  },
  statuses: {
    new: "Nueva",
    in_progress: "En proceso",
    sent: "Enviado",
    accepted: "Recibido",
    verification: "Verificación",
    payment: "Pago",
    paid: "Pagado",
  },
};

const ru: AccountCopy = {
  common: {
    account: "Кабинет клиента",
    backToAccount: "Вернуться в кабинет",
    createApplication: "Создать заявку",
    applications: "Заявки",
    application: "Заявка",
    material: "Материал",
    weight: "Заявленный вес",
    estimate: "Предварительная сумма",
    createdAt: "Создана",
    status: "Статус",
    manager: "Ответственный",
    unassignedManager: "Сотрудник ещё не назначен",
    assignedManager: "Назначен",
    rate: "Действующая ставка",
    actions: "Действия",
    view: "Открыть",
    retry: "Повторить",
  },
  overview: {
    kicker: "Кабинет клиента",
    title: "Ваши заявки",
    lead: "Следите за этапами, суммами и историей каждой операции.",
    countLabel: "Всего заявок",
    emptyTitle: "У вас пока нет заявок",
    emptyText: "Создайте первую заявку, указав материал и примерный вес. Сумма будет рассчитана по действующей ставке.",
    adminRequired: "У аккаунта нет прав администратора.",
    clientRequired: "Создание заявок доступно только аккаунтам клиентов.",
  },
  create: {
    kicker: "Новая заявка",
    title: "Посчитайте свой сплав.",
    titleAccent: "Его реальная ценность.",
    lead: "Выберите тип материала и укажите примерный вес — сразу увидите предварительную сумму. Точную подтвердим после взвешивания и проверки и переведём деньги на ваш счёт.",
    materialLabel: "Тип материала",
    materialHelp: "Выберите вариант, который больше всего похож на ваш материал.",
    weightLabel: "Примерный вес",
    weightHelp: "Введите значение больше 0 кг.",
    currentRate: "Текущая ставка",
    estimateLabel: "Предварительная сумма",
    trustedCalculation: "Сумма ориентировочная. При сохранении заявки мы пересчитаем её по текущей цене.",
    submit: "Создать заявку",
    submitting: "Сохранение…",
    success: "Заявка успешно создана.",
  },
  detail: {
    kicker: "Детали заявки",
    now: "Сейчас",
    openReceipt: "Чек загружен · открыть",
    nextSteps: {
      new: { title: "Заявка получена", text: "Скоро её возьмёт в работу сотрудник и свяжется с вами." },
      in_progress: { title: "Отправьте материал и загрузите чек", text: "Отправьте материал удобным способом и загрузите фото чека или накладной об отправке — так мы узнаем, что груз в пути." },
      sent: { title: "Материал в пути", text: "Мы получили ваш чек. Как только материал прибудет, подтвердим получение." },
      accepted: { title: "Материал получен", text: "Скоро начнём взвешивание и проверку." },
      verification: { title: "Идёт проверка", text: "Взвешиваем материал и проверяем состав. После этого подтвердим итоговую сумму." },
      payment: { title: "Готовим оплату", text: "Проверка завершена, перевод уже в процессе." },
      paid: { title: "Оплачено", text: "Деньги отправлены. Спасибо, что работаете с нами!" },
    },
    title: "Ход операции",
    createdSuccess: "Заявка успешно сохранена.",
    summary: "Сводка",
    history: "История статусов",
    historyLead: "Каждое изменение сохраняется в базе с датой и автором.",
    receipt: "Чек об отправке",
    receiptLead: "Чек хранится приватно и доступен только авторизованным участникам операции.",
    notFoundTitle: "Заявка не найдена",
    notFoundText: "Заявка не существует или у вас нет прав на её просмотр.",
    city: "Город",
    deliveryMethod: "Способ передачи",
    phone: "Контактный телефон",
    repeatCustomer: "Обращался ранее",
    yes: "Да",
    no: "Нет",
    paymentRecipient: "Получатель выплаты",
    iban: "IBAN",
    preferredDates: "Предпочтительные даты",
    deliveryMethods: {
      send: "Отправка",
      pickup: "Самовывоз",
      warehouse: "Передача на складе",
    },
  },
  receipt: {
    choose: "Выбрать изображение",
    replace: "Выбрать другое",
    upload: "Загрузить и подтвердить отправку",
    uploading: "Обработка…",
    retryFinalization: "Повторить подтверждение",
    pendingFinalization: "Изображение уже загружено, осталось подтвердить отправку.",
    attached: "Чек прикреплён",
    allowed: "JPEG, PNG или WebP · максимум 10 МБ",
    invalidType: "Выберите изображение JPEG, PNG или WebP.",
    tooLarge: "Размер изображения не должен превышать 10 МБ.",
    uploadError: "Не удалось загрузить изображение. Попробуйте ещё раз.",
    finalizeError: "Изображение сохранено, но статус не подтверждён. Можно повторить без новой загрузки.",
    success: "Чек подтверждён. Заявка отмечена как отправленная.",
    previewAlt: "Предпросмотр чека об отправке",
  },
  payment: {
    title: "Расчётное время до оплаты",
    lead: "Обратный отсчёт до расчётного времени перевода.",
    overdue: "Расчётный срок истёк",
    complete: "Оплата завершена",
    hours: "часов",
    minutes: "минут",
    seconds: "секунд",
  },
  errors: {
    load: "Не удалось загрузить заявки.",
    generic: "Не удалось выполнить операцию. Попробуйте ещё раз.",
    invalidMaterial: "Выберите доступный материал.",
    invalidWeight: "Введите корректный вес больше 0 кг.",
    duplicateConflict: "Этот запрос уже использован с другими данными. Обновите страницу и повторите.",
    auth: "Сессия истекла. Войдите снова.",
  },
  statuses: {
    new: "Новая",
    in_progress: "В работе",
    sent: "Отправлено",
    accepted: "Принято",
    verification: "Проверка",
    payment: "Оплата",
    paid: "Оплачено",
  },
};

export function getAccountCopy(locale: Locale) {
  return locale === "ru" ? ru : es;
}
