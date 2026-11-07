import type { Locale } from "@/i18n/config";
import type { ApplicationStatus } from "@/content/account";

export type AdminView = "new" | "mine" | "other";
export type AdminSort = "created_desc" | "created_asc" | "updated_desc";

export type AdminCopy = {
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
  roles: { client: string; admin: string };
  steps: Record<ApplicationStatus, string>;
};

const es: AdminCopy = {
  dashboard: {
    kicker: "Panel de empleados",
    title: "Gestión de solicitudes",
    lead: "Recoge nuevas operaciones, sigue tus expedientes y consulta el trabajo asignado al equipo.",
    signedInAs: "Sesión de empleado",
    noticeClaimed: "La solicitud se ha asignado correctamente y ya aparece en tus operaciones.",
  },
  tabs: { new: "Nuevas", mine: "Mis solicitudes", other: "Otras solicitudes" },
  filters: {
    search: "Buscar",
    searchPlaceholder: "Número #A1B2C3D4 o UUID",
    status: "Estado",
    allStatuses: "Todos los estados",
    sort: "Orden",
    newest: "Más recientes",
    oldest: "Más antiguas",
    recentlyUpdated: "Última actualización",
    apply: "Aplicar filtros",
    clear: "Limpiar",
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
    take: "Tomar",
    taking: "Asignando…",
    view: "Abrir",
    readOnly: "Solo lectura · otro responsable",
    unassigned: "Sin asignar",
    waitingClient: "Esperando comprobante del cliente",
    finished: "Proceso finalizado",
    overdue: "Pago fuera de plazo",
    emptyTitle: "No hay solicitudes en esta vista",
    emptyText: "Prueba con otro estado, orden o número de solicitud.",
    previous: "Anterior",
    next: "Siguiente",
    page: "Página",
  },
  detail: {
    kicker: "Expediente de solicitud",
    title: "Operación",
    back: "Volver al panel",
    client: "Datos del cliente",
    application: "Datos de la solicitud",
    history: "Historial de estados",
    receipt: "Comprobante de envío",
    receiptMissing: "El cliente todavía no ha adjuntado un comprobante.",
    manager: "Responsable",
    phone: "Teléfono",
    email: "Correo electrónico",
    name: "Nombre",
    role: "Rol del autor",
    stage: "Etapa actual",
    paymentStarted: "Pago iniciado",
    paymentDue: "Límite de pago",
    readOnlyTitle: "Solicitud asignada a otro empleado",
    readOnlyText: "Puedes consultar todos los datos, pero las acciones están reservadas al responsable asignado.",
    waitingTitle: "Esperando al cliente",
    waitingText: "El siguiente cambio requiere que el cliente adjunte el comprobante de envío.",
    noAction: "No hay acciones disponibles para este estado.",
    transition: "Transición",
    noticeAdvanced: "El estado se ha actualizado correctamente.",
  },
  actions: {
    advance: "Confirmar siguiente etapa",
    advancing: "Actualizando…",
    confirm: "¿Confirmas el cambio a la siguiente etapa? Esta acción quedará registrada en el historial.",
    claimConflict: "Otro empleado ya ha tomado esta solicitud. La vista se ha actualizado.",
    changedElsewhere: "El estado cambió en otra sesión. Revisa los datos actualizados.",
    forbidden: "No tienes permiso para modificar esta solicitud.",
    generic: "No se ha podido completar la operación. Inténtalo de nuevo.",
  },
  roles: { client: "Cliente", admin: "Empleado" },
  steps: {
    new: "Asignar responsable",
    in_progress: "Comprobante del cliente",
    sent: "Confirmar recepción",
    accepted: "Iniciar verificación",
    verification: "Iniciar plazo de pago",
    payment: "Confirmar pago enviado",
    paid: "Finalizada",
  },
};

const ru: AdminCopy = {
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
