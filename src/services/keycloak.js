import { STORAGE_KEYS } from '../constants.js';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL;
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
const KEYCLOAK_CLIENT_SECRET = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET;
const KEYCLOAK_REDIRECT_URI = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI;

const authUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`;
const tokenUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
const logoutUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;

/**
 * Декодирование JWT токена, возвращает payload.
 * Использует стандартный atob + JSON.parse для корректной работы с UTF-8.
 */
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(decodeURIComponent(
      jsonPayload.split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
    ));
  } catch (error) {
    console.error('Ошибка декодирования JWT:', error);
    return null;
  }
}

/**
 * Проверяет, что токен истекает через 30 секунд или меньше
 */
function isExpiringSoon(token) {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now < 30;
}

/**
 * Извлечение ролей из JWT токена
 */
function extractRoles(token) {
  const payload = decodeJWT(token);
  if (!payload) return [];

  const roles = [];

  // Realm roles
  if (payload.realm_access?.roles) {
    roles.push(...payload.realm_access.roles);
  }

  // Client roles
  if (payload.resource_access) {
    Object.values(payload.resource_access).forEach((client) => {
      if (client.roles) {
        roles.push(...client.roles);
      }
    });
  }

  // Проверяем также кастомную роль (если настроена в Keycloak): «role» (одна роль вместо списка) в пользовательском маппинге Keycloak
  if (payload.role) {
    if (Array.isArray(payload.role)) {
      roles.push(...payload.role);
    } else {
      roles.push(payload.role);
    }
  }

  return [...new Set(roles)];
}

export const keycloak = {
  /** Инициация OAuth2 Authorization Code Flow: редирект на Keycloak. */
  login(redirectTo) {
    const state = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state);
    if (redirectTo) {
      sessionStorage.setItem(STORAGE_KEYS.LOGIN_REDIRECT_TO, redirectTo);
    }

    const params = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: KEYCLOAK_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid',
      state,
    });

    window.location.href = `${authUrl()}?${params}`;
  },

  /** Обработка callback от Keycloak: обмен authorization code на токены. */
  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const savedState = sessionStorage.getItem(STORAGE_KEYS.OAUTH_STATE);

    if (!code) throw new Error('Keycloak не вернул authorization code.');
    if (state !== savedState) {
      throw new Error('Несовпадение state: возможен перехват и подмена callback.');
    }
    sessionStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEYCLOAK_CLIENT_ID,
      code,
      redirect_uri: KEYCLOAK_REDIRECT_URI,
    });
    // Confidential-клиент Keycloak ожидает от нас client_secret при обмене code на токены.
    if (KEYCLOAK_CLIENT_SECRET) body.set('client_secret', KEYCLOAK_CLIENT_SECRET);

    const response = await fetch(tokenUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Ошибка обмена code на токены: HTTP ${response.status} — ${text}`);
    }

    const tokens = JSON.parse(text);
    sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    if (tokens.refresh_token) sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    // id_token нужен будет для RP-initiated logout
    if (tokens.id_token) sessionStorage.setItem(STORAGE_KEYS.ID_TOKEN, tokens.id_token);

    const redirectTo = sessionStorage.getItem(STORAGE_KEYS.LOGIN_REDIRECT_TO);
    sessionStorage.removeItem(STORAGE_KEYS.LOGIN_REDIRECT_TO);
    return redirectTo;
  },

  getToken() {
    return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /** Обновление токена: обмен refresh_token на новую пару токенов. */
  async refresh() {
    const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return false;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT_ID,
      refresh_token: refreshToken,
    });
    // Confidential-клиент ожидает client_secret при refresh.
    if (KEYCLOAK_CLIENT_SECRET) body.set('client_secret', KEYCLOAK_CLIENT_SECRET);

    try {
      const response = await fetch(tokenUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!response.ok) return false;

      const tokens = await response.json();
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
      if (tokens.refresh_token) sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
      if (tokens.id_token) sessionStorage.setItem(STORAGE_KEYS.ID_TOKEN, tokens.id_token);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Получение валидного access_token при каждом запросе: если текущий истекает —
   * автоматически делает refresh_token, а если refresh не удался — возвращает
   * текущий токен (тогда вызывающий код, например http.js, получит 401 и сделает logout).
   */
  async getValidToken() {
    const token = this.getToken();
    if (token && !isExpiringSoon(token)) return token;
    if (await this.refresh()) return this.getToken();
    // Refresh не удался (например, истёк) — возвращаем старый токен:
    // придёт 401, и http.js сделает logout.
    return token;
  },

  /**
   * Очистка локальной сессии БЕЗ редиректа на Keycloak.
   * Используется при отказе в доступе по роли: текущие токены выбрасываются,
   * следующий заход на защищённый маршрут отправит на вход другим пользователем.
   */
  clearSession() {
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
  },

  /** Полный logout: очистка локальной сессии и редирект на end_session в Keycloak. */
  logout() {
    const idToken = sessionStorage.getItem(STORAGE_KEYS.ID_TOKEN);
    this.clearSession();

    const params = new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID });
    if (idToken) params.set('id_token_hint', idToken);
    params.set('post_logout_redirect_uri', `${window.location.origin}/`);

    window.location.href = `${logoutUrl()}?${params}`;
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  /**
   * Получение данных пользователя из id_token.
   * Возвращает объект с firstName, lastName, email, username или null.
   */
  getUser() {
    const idToken = sessionStorage.getItem(STORAGE_KEYS.ID_TOKEN);
    if (!idToken) return null;

    const payload = decodeJWT(idToken);
    if (!payload) return null;

    return {
      firstName: payload.given_name || '',
      lastName: payload.family_name || '',
      email: payload.email || '',
      username: payload.preferred_username || '',
    };
  },

  /**
   * Извлечение ролей пользователя из access_token.
   */
  getRoles() {
    const token = this.getToken();
    if (!token) return [];
    return extractRoles(token);
  },

  /**
   * Проверка наличия конкретной роли у пользователя.
   */
  hasRole(role) {
    return this.getRoles().includes(role);
  },

  /**
   * Проверка, является ли пользователь оператором: есть ли у него роль 'operator'.
   */
  isOperator() {
    return this.hasRole('operator');
  },
};
