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

export async function http(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  // Если access_token протух — keycloak молча продлит его через refresh_token.
  const token = await keycloak.getValidToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
      keycloak.logout();
    }
    throw new ApiError(extractMessage(payload, response.status), response.status, payload);
  }

  return payload;
}
