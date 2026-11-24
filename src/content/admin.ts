import type { Locale } from "@/i18n/config";
import type { ApplicationStatus } from "@/content/account";

export type AdminView = "new" | "mine" | "other";
export type AdminSort = "created_desc" | "created_asc" | "updated_desc";

export type AdminCopy = {
  navigation: { applications: string; pricing: string };
  dashboard: {
    kicker: string;
    title: string;
    lead: string;
    signedInAs: string;
    noticeClaimed: string;
  };
  tabs: Record<AdminView, string>;
  filters: {
    search: string;
    searchPlaceholder: string;
    status: string;
    allStatuses: string;
    sort: string;
    newest: string;
    oldest: string;
    recentlyUpdated: string;
    apply: string;
    clear: string;
  };
  list: {
    application: string;
    client: string;
    material: string;
    weight: string;
    estimate: string;
    status: string;
    created: string;
    updated: string;
    manager: string;
    nextStep: string;
    actions: string;
    take: string;
    taking: string;
    view: string;
    readOnly: string;
    unassigned: string;
    waitingClient: string;
    finished: string;
    overdue: string;
    emptyTitle: string;
    emptyText: string;
    previous: string;
    next: string;
    page: string;
  };
  detail: {
    kicker: string;
    title: string;
    back: string;
    client: string;
    application: string;
    history: string;
    receipt: string;
    receiptMissing: string;
    manager: string;
    phone: string;
    email: string;
    name: string;
    role: string;
    stage: string;
    paymentStarted: string;
    paymentDue: string;
    readOnlyTitle: string;
    readOnlyText: string;
    waitingTitle: string;
    waitingText: string;
    noAction: string;
    transition: string;
    noticeAdvanced: string;
  };
  actions: {
    advance: string;
    advancing: string;
    confirm: string;
    claimConflict: string;
    changedElsewhere: string;
    forbidden: string;
    generic: string;
  };
  pricing: {
    kicker: string;
    title: string;
    lead: string;
    publicTitle: string;
    publicLead: string;
    publicRate: string;
    publicDate: string;
    preview: string;
    informational: string;
    materialsTitle: string;
    materialsLead: string;
    materialId: string;
    rate: string;
    status: string;
    active: string;
    inactive: string;
    updated: string;
    save: string;
    saving: string;
    confirm: string;
    saved: string;
    validationError: string;
    saveError: string;
    forbidden: string;
    historyTitle: string;
    historyEmpty: string;
    changedBy: string;
    target: string;
    change: string;
    publicTarget: string;
  };
  roles: { client: string; admin: string };
  steps: Record<ApplicationStatus, string>;
};

const es: AdminCopy = {
  navigation: { applications: "Solicitudes", pricing: "Precios" },
  dashboard: {
    kicker: "Panel de empleados",
    title: "Solicitudes",
    lead: "Coge las solicitudes nuevas, lleva las tuyas y echa un vistazo a las del resto del equipo.",
    signedInAs: "Has entrado como",
    noticeClaimed: "La solicitud es tuya. Ya la tienes en «Mis solicitudes».",
  },
  tabs: { new: "Nuevas", mine: "Mis solicitudes", other: "Del resto del equipo" },
  filters: {
    search: "Buscar",
    searchPlaceholder: "Número, p. ej. #A1B2C3D4",
    status: "Estado",
    allStatuses: "Todos los estados",
    sort: "Ordenar por",
    newest: "Más recientes",
    oldest: "Más antiguas",
    recentlyUpdated: "Últimos cambios",
    apply: "Filtrar",
    clear: "Quitar filtros",
  },
  list: {
    application: "Solicitud",
    client: "Cliente",
    material: "Material",
    weight: "Peso",
    estimate: "Importe",
    status: "Estado",
    created: "Creada",
    updated: "Actualizada",
    manager: "Responsable",
    nextStep: "Siguiente paso",
    actions: "Acciones",
    take: "Me la quedo",
    taking: "Un momento…",
    view: "Abrir",
    readOnly: "La lleva otra persona · solo lectura",
    unassigned: "Sin asignar",
    waitingClient: "Esperando el justificante del cliente",
    finished: "Terminada",
    overdue: "Pago con retraso",
    emptyTitle: "No hay solicitudes aquí",
    emptyText: "Prueba con otro estado u otro número de solicitud.",
    previous: "Anterior",
    next: "Siguiente",
    page: "Página",
  },
  detail: {
    kicker: "Solicitud",
    title: "Operación",
    back: "Volver al panel",
    client: "Cliente",
    application: "Solicitud",
    history: "Historial de estados",
    receipt: "Justificante de envío",
    receiptMissing: "El cliente todavía no ha subido el justificante.",
    manager: "Responsable",
    phone: "Teléfono",
    email: "Correo electrónico",
    name: "Nombre",
    role: "Rol del autor",
    stage: "Estado actual",
    paymentStarted: "Pago iniciado",
    paymentDue: "Pagar antes de",
    readOnlyTitle: "Esta solicitud la lleva otra persona",
    readOnlyText: "Puedes ver todos los datos, pero solo el responsable puede hacer cambios.",
    waitingTitle: "Esperando al cliente",
    waitingText: "Para seguir, el cliente tiene que subir el justificante de envío.",
    noAction: "En este estado no hay nada que hacer.",
    transition: "Siguiente paso",
    noticeAdvanced: "Estado actualizado.",
  },
  actions: {
    advance: "Pasar al siguiente estado",
    advancing: "Actualizando…",
    confirm: "¿Pasamos la solicitud al siguiente estado? Quedará anotado en el historial.",
    claimConflict: "Otra persona del equipo se ha quedado esta solicitud antes que tú. Hemos actualizado la lista.",
    changedElsewhere: "Alguien ha cambiado el estado mientras tanto. Revisa los datos actualizados.",
    forbidden: "No puedes hacer cambios en esta solicitud.",
    generic: "No se ha podido completar la operación. Inténtalo de nuevo.",
  },
  pricing: {
    kicker: "Configuración comercial",
    title: "Precio",
    lead: "El mismo precio por kilo para todo el metal duro. Cada cambio queda anotado en el historial.",
    publicTitle: "Precio por kg",
    publicLead: "Es el precio que se ve en la web y en la calculadora, y se aplica a todo el material de las solicitudes nuevas. Las solicitudes que ya existen mantienen su precio.",
    publicRate: "Precio €/kg",
    publicDate: "Fecha de referencia",
    preview: "Así se verá",
    informational: "El mismo precio para plaquitas, herramienta enteriza, chatarra y material mezclado.",
    materialsTitle: "Tarifas de materiales",
    materialsLead: "Estas tarifas son la fuente de verdad del calculador y solo se aplican a nuevas solicitudes.",
    materialId: "ID",
    rate: "Tarifa €/kg",
    status: "Estado",
    active: "Activo",
    inactive: "Inactivo",
    updated: "Última actualización",
    save: "Guardar",
    saving: "Guardando…",
    confirm: "¿Cambiamos el precio? Quedará anotado en el historial.",
    saved: "Precio guardado.",
    validationError: "Escribe un número mayor que 0, con dos decimales como mucho.",
    saveError: "No se ha podido guardar. Sigue vigente el precio anterior.",
    forbidden: "Solo un administrador puede cambiar el precio.",
    historyTitle: "Historial de cambios",
    historyEmpty: "Todavía no hay cambios.",
    changedBy: "Quién",
    target: "Qué",
    change: "Cambio",
    publicTarget: "Precio por kg",
  },
  roles: { client: "Cliente", admin: "Empleado" },
  steps: {
    new: "Asignar responsable",
    in_progress: "Justificante del cliente",
    sent: "Confirmar recepción",
    accepted: "Empezar la revisión",
    verification: "Pasar a pago",
    payment: "Marcar como pagada",
    paid: "Terminada",
  },
};

const ru: AdminCopy = {
  navigation: { applications: "Заявки", pricing: "Цены" },
  dashboard: {
    kicker: "Панель сотрудника",
    title: "Управление заявками",
    lead: "Берите новые заявки, ведите свои операции и просматривайте работу остальных сотрудников.",
    signedInAs: "Аккаунт сотрудника",
    noticeClaimed: "Заявка успешно закреплена и появилась в списке ваших операций.",
  },
  tabs: { new: "Новые", mine: "Мои заявки", other: "Остальные заявки" },
  filters: {
    search: "Поиск",
    searchPlaceholder: "Номер #A1B2C3D4 или UUID",
    status: "Статус",
    allStatuses: "Все статусы",
    sort: "Сортировка",
    newest: "Сначала новые",
    oldest: "Сначала старые",
    recentlyUpdated: "Недавно обновлённые",
    apply: "Применить",
    clear: "Сбросить",
  },
  list: {
    application: "Заявка",
    client: "Клиент",
    material: "Материал",
    weight: "Вес",
    estimate: "Сумма",
    status: "Статус",
    created: "Создана",
    updated: "Обновлена",
    manager: "Ответственный",
    nextStep: "Следующий шаг",
    actions: "Действия",
    take: "Взять",
    taking: "Назначение…",
    view: "Открыть",
    readOnly: "Только просмотр · другой ответственный",
    unassigned: "Не назначен",
    waitingClient: "Ожидание чека от клиента",
    finished: "Процесс завершён",
    overdue: "Срок оплаты истёк",
    emptyTitle: "В этом разделе нет заявок",
    emptyText: "Попробуйте изменить статус, сортировку или номер заявки.",
    previous: "Назад",
    next: "Далее",
    page: "Страница",
  },
  detail: {
    kicker: "Карточка заявки",
    title: "Операция",
    back: "Вернуться в панель",
    client: "Данные клиента",
    application: "Данные заявки",
    history: "История статусов",
    receipt: "Чек об отправке",
    receiptMissing: "Клиент ещё не прикрепил чек.",
    manager: "Ответственный",
    phone: "Телефон",
    email: "Email",
    name: "Имя",
    role: "Роль автора",
    stage: "Текущий этап",
    paymentStarted: "Оплата начата",
    paymentDue: "Срок оплаты",
    readOnlyTitle: "Заявка закреплена за другим сотрудником",
    readOnlyText: "Вы можете просматривать данные, но действия доступны только назначенному сотруднику.",
    waitingTitle: "Ожидание клиента",
    waitingText: "Следующий переход выполнит клиент после загрузки чека.",
    noAction: "Для этого статуса нет доступных действий.",
    transition: "Переход",
    noticeAdvanced: "Статус успешно обновлён.",
  },
  actions: {
    advance: "Подтвердить следующий этап",
    advancing: "Обновление…",
    confirm: "Подтвердить переход на следующий этап? Действие будет сохранено в истории.",
    claimConflict: "Заявку уже взял другой сотрудник. Данные обновлены.",
    changedElsewhere: "Статус изменился в другой сессии. Проверьте обновлённые данные.",
    forbidden: "У вас нет прав изменять эту заявку.",
    generic: "Не удалось выполнить операцию. Попробуйте ещё раз.",
  },
  pricing: {
    kicker: "Коммерческие настройки",
    title: "Цена",
    lead: "Одна цена за килограмм для всего твёрдого сплава. Каждое изменение записывается в историю.",
    publicTitle: "Цена за кг",
    publicLead: "Показывается на сайте и в калькуляторе и применяется ко всем видам материала в новых заявках. Уже созданные заявки сохраняют свою цену.",
    publicRate: "Цена €/кг",
    publicDate: "Дата цены",
    preview: "Предпросмотр",
    informational: "Одна цена для пластин, цельного инструмента, лома и смешанного материала.",
    materialsTitle: "Тарифы материалов",
    materialsLead: "Это единый источник тарифов калькулятора. Новые значения применяются только к новым заявкам.",
    materialId: "ID",
    rate: "Тариф €/кг",
    status: "Статус",
    active: "Активен",
    inactive: "Неактивен",
    updated: "Последнее изменение",
    save: "Сохранить",
    saving: "Сохранение…",
    confirm: "Подтвердить изменение цены? Оно будет записано в историю.",
    saved: "Цена успешно сохранена.",
    validationError: "Введите положительное значение максимум с двумя знаками после запятой.",
    saveError: "Не удалось сохранить. Предыдущие данные остаются действующими.",
    forbidden: "Изменять цены может только активный администратор.",
    historyTitle: "История изменений",
    historyEmpty: "Изменений пока нет.",
    changedBy: "Кто изменил",
    target: "Объект",
    change: "Изменение",
    publicTarget: "Цена за кг",
  },
  roles: { client: "Клиент", admin: "Сотрудник" },
  steps: {
    new: "Назначить ответственного",
    in_progress: "Чек от клиента",
    sent: "Подтвердить получение",
    accepted: "Начать проверку",
    verification: "Запустить срок оплаты",
    payment: "Подтвердить отправку денег",
    paid: "Завершена",
  },
};

export function getAdminCopy(locale: Locale) {
  return locale === "ru" ? ru : es;
}
