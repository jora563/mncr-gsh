// ===== Хранилище (ключи sessionStorage/localStorage) =====
export const STORAGE_KEYS = {
  THEME: 'aiomni.theme',
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  ID_TOKEN: 'id_token',
  OAUTH_STATE: 'oauth_state',
  LOGIN_REDIRECT_TO: 'login_redirect_to',
  FORBIDDEN_MESSAGE: 'forbidden_message',
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
  // LLM API
  llmProjects: '/v1/admin_api/llm/projects',
  llmProject: (projectId) => `/v1/admin_api/llm/project/${projectId}`,
  llmKnowledge: '/v1/admin_api/llm/projects/knowledge',
  llmDataset: '/v1/admin_api/llm/projects/dataset',
  llmQuestions: '/v1/admin_api/llm/projects/questions',
  llmTrain: '/v1/admin_api/llm/projects/train',
  llmReload: '/v1/admin_api/llm/projects/reload',
  llmTrainingResume: (jobUuid) => `/v1/admin_api/llm/training/resume/${jobUuid}`,
  llmTrainingJob: (jobUuid) => `/v1/admin_api/llm/training/job/${jobUuid}`,
  llmTrainingJobsByProject: (projectId) => `/v1/admin_api/llm/training/jobs_by_project/${projectId}`,
};

// ===== UI: градиенты аватаров =====
export const GRADIENTS = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

// ===== UI: известные платформы для бейджей =====
export const KNOWN_PLATFORMS = [
  { match: 'telegram', className: 'badge--telegram' },
  { match: 'vk', className: 'badge--vk' },
  { match: 'max', className: 'badge--max' },
];

// ===== Статусы оператора =====
export const OPERATOR_STATUSES = {
  ONLINE: 1,
  OFFLINE: 0,
};

// ===== Статусы чатов =====
export const CHAT_STATUSES = {
  CLOSED: 2,
};
