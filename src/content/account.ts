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
    rate: "Tarifa vigente",
    actions: "Acciones",
    view: "Ver detalle",
    retry: "Reintentar",
  },
  overview: {
    kicker: "Área de cliente",
    title: "Tus solicitudes",
    lead: "Consulta el progreso, los importes y el historial de cada operación.",
    countLabel: "Total de solicitudes",
    emptyTitle: "Todavía no tienes solicitudes",
    emptyText: "Crea la primera solicitud con el material y el peso aproximado. El importe se calculará con la tarifa vigente.",
    adminRequired: "Tu cuenta no tiene permisos de administrador.",
    clientRequired: "La creación de solicitudes está disponible únicamente para cuentas de cliente.",
  },
  create: {
    kicker: "Nueva solicitud",
    title: "Calcula y guarda tu material",
    lead: "Selecciona un material e indica el peso aproximado. La tarifa y el importe definitivo de la solicitud se calculan en el servidor.",
    materialLabel: "Tipo de material",
    materialHelp: "Las opciones y tarifas proceden de la tabla segura de materiales.",
    weightLabel: "Peso aproximado",
    weightHelp: "Introduce un valor mayor que 0 kg.",
    currentRate: "Tarifa actual",
    estimateLabel: "Estimación",
    trustedCalculation: "El importe mostrado es orientativo. Al guardar, PostgreSQL vuelve a calcularlo con datos de confianza.",
    submit: "Crear solicitud",
    submitting: "Guardando…",
    success: "La solicitud se ha creado correctamente.",
  },
  detail: {
    kicker: "Detalle de solicitud",
    title: "Seguimiento de la operación",
    createdSuccess: "Solicitud guardada correctamente.",
    summary: "Resumen",
    history: "Historial de estados",
    historyLead: "Cada cambio se registra en la base de datos con su fecha y responsable.",
    receipt: "Comprobante de envío",
    receiptLead: "El comprobante se almacena de forma privada y solo está disponible para las personas autorizadas.",
    notFoundTitle: "Solicitud no encontrada",
    notFoundText: "La solicitud no existe o no tienes permiso para verla.",
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
    upload: "Subir y confirmar envío",
    uploading: "Procesando…",
    retryFinalization: "Reintentar confirmación",
    pendingFinalization: "La imagen ya está almacenada. Falta confirmar la operación en la base de datos.",
    attached: "Comprobante adjunto",
    allowed: "JPEG, PNG o WebP · máximo 10 MB",
    invalidType: "Selecciona una imagen JPEG, PNG o WebP.",
    tooLarge: "La imagen no puede superar 10 MB.",
    uploadError: "No se ha podido subir la imagen. Inténtalo de nuevo.",
    finalizeError: "La imagen está guardada, pero falta confirmar el estado. Puedes reintentarlo sin volver a subirla.",
    success: "Comprobante confirmado. La solicitud está marcada como enviada.",
    previewAlt: "Vista previa del comprobante de envío",
  },
  payment: {
    title: "Tiempo estimado para el pago",
    lead: "El plazo se calcula desde la fecha límite guardada en la base de datos.",
    overdue: "El plazo estimado ha finalizado",
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
    duplicateConflict: "Esta solicitud ya se utilizó con otros datos. Recarga la página e inténtalo de nuevo.",
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
    title: "Рассчитайте и сохраните материал",
    lead: "Выберите материал и укажите примерный вес. Ставка и итоговая сумма заявки будут рассчитаны на сервере.",
    materialLabel: "Тип материала",
    materialHelp: "Материалы и ставки загружаются из защищённой таблицы.",
    weightLabel: "Примерный вес",
    weightHelp: "Введите значение больше 0 кг.",
    currentRate: "Текущая ставка",
    estimateLabel: "Предварительная сумма",
    trustedCalculation: "Показанная сумма ориентировочная. При сохранении PostgreSQL повторно рассчитывает её из доверенных данных.",
    submit: "Создать заявку",
    submitting: "Сохранение…",
    success: "Заявка успешно создана.",
  },
  detail: {
    kicker: "Детали заявки",
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
    pendingFinalization: "Изображение уже сохранено. Осталось подтвердить операцию в базе данных.",
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
    lead: "Отсчёт основан на сроке, сохранённом в базе данных.",
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
