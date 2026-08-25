// ===== Хранилище (ключи sessionStorage/localStorage) =====
export const STORAGE_KEYS = {
  TOKEN: 'aiomni.admin.token',
  THEME: 'aiomni.theme',
};

// ===== Темы =====
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// ===== Тосты =====
export const TOAST_TTL_MS = 4000;

// ===== Статусы API-индикатора в сайдбаре =====
export const API_STATUS = {
  CHECKING: 'checking',
  OK: 'ok',
  DOWN: 'down',
};

// ===== HTTP =====
export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  SERVER_ERROR: 500,
};

export const STATUS_MESSAGES = {
  [HTTP_STATUS.BAD_REQUEST]: 'Некорректный запрос: проверьте введённые данные.',
  [HTTP_STATUS.UNAUTHORIZED]: 'Токен не принят сервером. Войдите заново.',
  [HTTP_STATUS.NOT_FOUND]: 'Ресурс не найден.',
  [HTTP_STATUS.CONFLICT]: 'Конфликт: ресурс уже существует.',
  [HTTP_STATUS.UNPROCESSABLE]: 'Сервер отклонил переданные данные.',
  [HTTP_STATUS.SERVER_ERROR]: 'Внутренняя ошибка сервера.',
};

// ===== Маршруты API =====
export const API_ROUTES = {
  health: '/health',
  projectGroups: '/v1/admin_api/project_groups',
  projectGroup: '/v1/admin_api/project_group',
  projectsOfGroup: (groupId) => `/v1/admin_api/project_group/${groupId}/projects`,
  projects: '/v1/admin_api/projects',
  project: '/v1/admin_api/project',
  platforms: '/v1/admin_api/platforms',
  botsOfProject: (projectId) => `/v1/admin_api/project/${projectId}/bots`,
  bot: '/v1/admin_api/bot',
};

// ===== UI: градиенты аватаров =====
export const GRADIENTS = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

// ===== UI: известные платформы для бейджей =====
export const KNOWN_PLATFORMS = [
  { match: 'telegram', className: 'badge--telegram' },
  { match: 'vk', className: 'badge--vk' },
  { match: 'max', className: 'badge--max' },
];
