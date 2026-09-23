import { http } from './http.js';
import { API_ROUTES } from '../constants.js';

export const health = () => http(API_ROUTES.health);

/* ---------- Проектные группы ---------- */

export const getProjectGroups = () => http(API_ROUTES.projectGroups);
export const createProjectGroup = (data) => http(API_ROUTES.projectGroup, { method: 'POST', body: data });
export const updateProjectGroup = (data) => http(API_ROUTES.projectGroup, { method: 'PUT', body: data });
export const deleteProjectGroup = (groupId) => http(`${API_ROUTES.projectGroup}/${groupId}`, { method: 'DELETE' });

/* ---------- Проекты ---------- */

export const getAllProjects = () => http(API_ROUTES.projects);

export const getProjectsOfGroup = (groupId) => http(API_ROUTES.projectsOfGroup(groupId));
export const createProject = (data) => http(API_ROUTES.project, { method: 'POST', body: data });
export const updateProject = (data) => http(API_ROUTES.project, { method: 'PUT', body: data });
export const deleteProject = (projectId) => http(`${API_ROUTES.project}/${projectId}`, { method: 'DELETE' });

/**
 * Список платформ для select в форме бота и бейджей.
 */
export const getPlatforms = () => http(API_ROUTES.platforms);

/* ---------- Боты ---------- */

export const getBot = (botId) => http(`${API_ROUTES.bot}/${botId}`);
export const getBotsOfProject = (projectId) => http(API_ROUTES.botsOfProject(projectId));
export const createBotAccount = (data) => http(API_ROUTES.bot, { method: 'POST', body: data });
export const updateBotAccount = (data) => http(API_ROUTES.bot, { method: 'PUT', body: data });
export const deleteBotAccount = (botId) => http(`${API_ROUTES.bot}/${botId}`, { method: 'DELETE' });

/**
 * Единого списка ботов в API нет: собираем по всем проектам параллельно.
 * Promise.allSettled гарантирует, что падение одного проекта не сломает остальные.
 */
export async function getAllBots(projects = null) {
  const projectList = projects ?? (await getAllProjects());
  if (!projectList.length) return [];

  const responses = await Promise.allSettled(projectList.map((p) => getBotsOfProject(p.id)));
  return responses.flatMap((result) =>
    result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [],
  );
}

/* ---------- LLM API ---------- */

export const getLlmProjects = () => http(API_ROUTES.llmProjects);
export const getLlmProject = (projectId) => http(API_ROUTES.llmProject(projectId));
export const createLlmProject = (data) => http(API_ROUTES.llmProjects, { method: 'POST', body: data });
export const deleteLlmProject = (projectId) => http(API_ROUTES.llmProject(projectId), { method: 'DELETE' });

/**
 * Универсальная функция загрузки файлов в LLM API
 */
function uploadLlmFile(route, formData) {
  return http(route, {
    method: 'POST',
    body: formData,
  });
}

export const uploadLlmKnowledge = (formData) => uploadLlmFile(API_ROUTES.llmKnowledge, formData);
export const uploadLlmDataset = (formData) => uploadLlmFile(API_ROUTES.llmDataset, formData);
export const uploadLlmQuestions = (formData) => uploadLlmFile(API_ROUTES.llmQuestions, formData);

export const startLlmTraining = (data) => http(API_ROUTES.llmTrain, { method: 'POST', body: data });
export const reloadLlmProject = (data) => http(API_ROUTES.llmReload, { method: 'POST', body: data });

export const resumeLlmTraining = (jobUuid) => http(API_ROUTES.llmTrainingResume(jobUuid), { method: 'POST' });
export const getLlmTrainingJob = (jobUuid) => http(API_ROUTES.llmTrainingJob(jobUuid));
export const getLlmTrainingJobsByProject = (projectId) => http(API_ROUTES.llmTrainingJobsByProject(projectId));
