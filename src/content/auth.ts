import type { Locale } from "@/i18n/config";

export type AuthCopy = {
  common: {
    email: string;
    password: string;
    confirmPassword: string;
    displayName: string;
    pending: string;
    backHome: string;
    signOut: string;
  };
  login: {
    kicker: string;
    title: string;
    lead: string;
    submit: string;
    register: string;
    forgot: string;
  };
  register: {
    kicker: string;
    title: string;
    lead: string;
    submit: string;
    pending: string;
    login: string;
    success: {
      title: string;
      sentTo: string;
      instruction: string;
      spamHint: string;
      login: string;
    };
  };
  forgot: {
    kicker: string;
    title: string;
    lead: string;
    submit: string;
    pending: string;
    login: string;
    success: {
      title: string;
      instruction: string;
      spamHint: string;
      login: string;
    };
  };
  update: {
    kicker: string;
    title: string;
    lead: string;
    submit: string;
  };
  account: {
    kicker: string;
    title: string;
    lead: string;
    role: string;
    email: string;
    stageNotice: string;
    adminLink: string;
    adminRequired: string;
  };
  admin: {
    kicker: string;
    title: string;
    lead: string;
    role: string;
    stageNotice: string;
    accountLink: string;
  };
  setup: {
    title: string;
    text: string;
  };
  messages: {
    invalidEmail: string;
    passwordLength: string;
    passwordMismatch: string;
    displayNameLength: string;
    invalidCredentials: string;
    signupSuccess: string;
    recoverySent: string;
    genericError: string;
    missingSession: string;
    configMissing: string;
  };
};

const es: AuthCopy = {
  common: {
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Repite la contraseña",
    displayName: "Nombre",
    pending: "Procesando…",
    backHome: "Volver al inicio",
    signOut: "Cerrar sesión",
  },
  login: {
    kicker: "Acceso",
    title: "Entrar en Metalduro",
    lead: "Accede con el correo y la contraseña de tu cuenta.",
    submit: "Entrar",
    register: "Crear una cuenta de cliente",
    forgot: "He olvidado la contraseña",
  },
  register: {
    kicker: "Cuenta de cliente",
    title: "Crear una cuenta",
    lead: "Te enviaremos un enlace para confirmar tu correo electrónico.",
    submit: "Registrarme",
    pending: "Creando cuenta...",
    login: "Ya tengo una cuenta",
    success: {
      title: "¡Revisa tu correo!",
      sentTo: "Hemos enviado el enlace de confirmación a:",
      instruction: "Abre el mensaje y confirma tu cuenta para acceder al área de cliente.",
      spamHint: "¿No lo encuentras? Revisa también la carpeta de Spam o correo no deseado.",
      login: "Volver a iniciar sesión",
    },
  },
  forgot: {
    kicker: "Recuperación",
    title: "Restablecer contraseña",
    lead: "Si existe una cuenta, enviaremos un enlace seguro al correo indicado.",
    submit: "Enviar enlace",
    pending: "Enviando enlace...",
    login: "Volver al acceso",
    success: {
      title: "¡Revisa tu correo!",
      instruction:
        "Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña.",
      spamHint: "¿No lo encuentras? Revisa también la carpeta de Spam o correo no deseado.",
      login: "Volver a iniciar sesión",
    },
  },
  update: {
    kicker: "Nueva contraseña",
    title: "Actualizar contraseña",
    lead: "Introduce una nueva contraseña para tu cuenta.",
    submit: "Guardar contraseña",
  },
  account: {
    kicker: "Área de cliente",
    title: "Tu cuenta",
    lead: "La autenticación y el perfil protegido ya están conectados.",
    role: "Rol",
    email: "Correo",
    stageNotice: "La lista y creación de solicitudes se añadirán en la siguiente etapa.",
    adminLink: "Ir al área de administración",
    adminRequired: "Tu cuenta no tiene permisos de administrador.",
  },
  admin: {
    kicker: "Administración",
    title: "Área de empleados",
    lead: "Acceso protegido mediante el rol almacenado en la base de datos.",
    role: "Rol",
    stageNotice: "La cola y la gestión de solicitudes se añadirán en la siguiente etapa.",
    accountLink: "Ir al área de cliente",
  },
  setup: {
    title: "Supabase todavía no está conectado",
    text: "Añade las variables de .env.example a .env.local después de crear el proyecto Supabase.",
  },
  messages: {
    invalidEmail: "Introduce un correo válido.",
    passwordLength: "La contraseña debe tener entre 8 y 72 caracteres.",
    passwordMismatch: "Las contraseñas no coinciden.",
    displayNameLength: "El nombre debe tener entre 2 y 120 caracteres.",
    invalidCredentials: "Correo o contraseña incorrectos.",
    signupSuccess: "Revisa tu correo y confirma la cuenta antes de entrar.",
    recoverySent: "Si la cuenta existe, recibirás un enlace de recuperación.",
    genericError: "No se ha podido completar la operación. Inténtalo de nuevo.",
    missingSession: "El enlace ha caducado o la sesión no es válida.",
    configMissing: "Supabase no está configurado en este entorno.",
  },
};

const ru: AuthCopy = {
  common: {
    email: "Email",
    password: "Пароль",
    confirmPassword: "Повторите пароль",
    displayName: "Имя",
    pending: "Обработка…",
    backHome: "На главную",
    signOut: "Выйти",
  },
  login: {
    kicker: "Вход",
    title: "Войти в Metalduro",
    lead: "Используйте email и пароль вашей учётной записи.",
    submit: "Войти",
    register: "Создать аккаунт клиента",
    forgot: "Забыли пароль?",
  },
  register: {
    kicker: "Аккаунт клиента",
    title: "Создать аккаунт",
    lead: "Мы отправим ссылку для подтверждения email.",
    submit: "Зарегистрироваться",
    pending: "Создаём аккаунт...",
    login: "У меня уже есть аккаунт",
    success: {
      title: "Проверьте почту!",
      sentTo: "Ссылка для подтверждения отправлена на:",
      instruction: "Откройте письмо и подтвердите аккаунт, чтобы войти в личный кабинет.",
      spamHint: "Если письма нет во входящих, проверьте папку «Спам».",
      login: "Вернуться ко входу",
    },
  },
  forgot: {
    kicker: "Восстановление",
    title: "Восстановить пароль",
    lead: "Если аккаунт существует, мы отправим защищённую ссылку на указанный email.",
    submit: "Отправить ссылку",
    pending: "Отправляем ссылку...",
    login: "Вернуться ко входу",
    success: {
      title: "Проверьте почту!",
      instruction:
        "Если аккаунт связан с этим email, вы получите ссылку для восстановления пароля.",
      spamHint: "Если письма нет во входящих, проверьте папку «Спам».",
      login: "Вернуться ко входу",
    },
  },
  update: {
    kicker: "Новый пароль",
    title: "Обновить пароль",
    lead: "Введите новый пароль для учётной записи.",
    submit: "Сохранить пароль",
  },
  account: {
    kicker: "Кабинет клиента",
    title: "Ваш аккаунт",
    lead: "Авторизация и защищённый профиль уже подключены.",
    role: "Роль",
    email: "Email",
    stageNotice: "Список и создание заявок будут добавлены на следующем этапе.",
    adminLink: "Перейти в кабинет сотрудника",
    adminRequired: "У аккаунта нет прав администратора.",
  },
  admin: {
    kicker: "Администрирование",
    title: "Кабинет сотрудника",
    lead: "Доступ защищён ролью, хранящейся в базе данных.",
    role: "Роль",
    stageNotice: "Очередь и управление заявками будут добавлены на следующем этапе.",
    accountLink: "Перейти в кабинет клиента",
  },
  setup: {
    title: "Supabase пока не подключён",
    text: "После создания Supabase-проекта перенесите переменные из .env.example в .env.local.",
  },
  messages: {
    invalidEmail: "Введите корректный email.",
    passwordLength: "Пароль должен содержать от 8 до 72 символов.",
    passwordMismatch: "Пароли не совпадают.",
    displayNameLength: "Имя должно содержать от 2 до 120 символов.",
    invalidCredentials: "Неверный email или пароль.",
    signupSuccess: "Проверьте почту и подтвердите аккаунт перед входом.",
    recoverySent: "Если аккаунт существует, на почту придёт ссылка для восстановления.",
    genericError: "Не удалось выполнить операцию. Попробуйте ещё раз.",
    missingSession: "Ссылка истекла или сессия недействительна.",
    configMissing: "Supabase не настроен в этом окружении.",
  },
};

export function getAuthCopy(locale: Locale) {
  return locale === "ru" ? ru : es;
}
