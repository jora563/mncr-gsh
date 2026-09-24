import { keycloak } from '../services/keycloak.js';
import { HTTP_STATUS, STATUS_MESSAGES } from '../constants.js';

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function extractMessage(payload, status) {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object') {
    const candidate = payload.message ?? payload.error ?? payload.detail ?? payload.reason;
    if (candidate) return String(candidate);
  }
  return STATUS_MESSAGES[status] ?? `Ошибка запроса (HTTP ${status}).`;
}

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

// ===== Кэш GET-запросов =====
// Время жизни завершённого GET-запроса: в пределах этого окна повторный
// запрос возвращает закэшированное значение без обращения к сети.
const GET_CACHE_TTL_MS = 2000;
// Летящие GET-запросы: одинаковые параллельные вызовы возвращают один Promise.
const inflightGets = new Map();
// Завершённые GET-ответы.
const getCache = new Map();

function requestKey(method, path) {
  return `${method} ${path}`;
}

function clearGetCache() {
  getCache.clear();
}

async function executeRequest(path, { method, body, headers }) {
  const defaultHeaders = { Accept: 'application/json' };
  const token = await keycloak.getValidToken();
  if (token) defaultHeaders.Authorization = `Bearer ${token}`;

  if (body !== undefined && !(body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const finalHeaders = { ...defaultHeaders, ...headers };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined
        ? (body instanceof FormData ? body : JSON.stringify(body))
        : undefined,
    });
  } catch {
    throw new ApiError('Не удалось подключиться к серверу. Проверьте адрес API и сеть.', 0);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (response.status === HTTP_STATUS.UNAUTHORIZED) {
      keycloak.clearSession();
      window.location.href = '/';
    }
    throw new ApiError(extractMessage(payload, response.status), response.status, payload);
  }

  return payload;
}

export function http(path, { method = 'GET', body, headers = {} } = {}) {
  const isGet = method === 'GET';
  const key = requestKey(method, path);

  if (isGet) {
    const cached = getCache.get(key);
    if (cached && Date.now() - cached.time < GET_CACHE_TTL_MS) {
      return Promise.resolve(cached.value);
    }
    const inflight = inflightGets.get(key);
    if (inflight) {
      return inflight;
    }
  }

  const request = executeRequest(path, { method, body, headers });

  if (isGet) {
    inflightGets.set(key, request);
    request.then(
      (value) => {
        getCache.set(key, { time: Date.now(), value });
      },
      () => {
        // ошибки не кэшируем
      },
    );
    request.then(
      () => inflightGets.delete(key),
      () => inflightGets.delete(key),
    );
  } else {
    // Любая мутация инвалидирует кэш GET: на старте и на завершении,
    // чтобы в кэш не попали данные, снятые до применения мутации.
    clearGetCache();
    request.then(
      () => clearGetCache(),
      () => clearGetCache(),
    );
  }

  return request;
}
