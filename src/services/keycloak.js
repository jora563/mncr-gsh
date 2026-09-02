const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL;
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
const KEYCLOAK_CLIENT_SECRET = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET;
const KEYCLOAK_REDIRECT_URI = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI;

const authUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`;
const tokenUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
const logoutUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;

/**
 * Декодирование JWT токена для извлечения payload
 */
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error('Ошибка декодирования JWT:', error);
    return null;
  }
}

/**
 * Проверка истечения срока действия токена (с запасом 30 секунд)
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

  // Кастомное поле role (строка или массив) — используется в этой конфигурации Keycloak
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
  /** Старт OAuth2 Authorization Code Flow: редирект на страницу логина Keycloak. */
  login(redirectTo) {
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    if (redirectTo) {
      sessionStorage.setItem('login_redirect_to', redirectTo);
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

  /** Обработка возврата с Keycloak: обмен authorization code на токены. */
  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('oauth_state');

    if (!code) throw new Error('Keycloak не вернул authorization code.');
    if (state !== savedState) {
      throw new Error('Не совпадает state: возможно, страница callback открылась повторно.');
    }
    sessionStorage.removeItem('oauth_state');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEYCLOAK_CLIENT_ID,
      code,
      redirect_uri: KEYCLOAK_REDIRECT_URI,
    });
    // Confidential-клиенты Keycloak требуют секрет при обмене code на токен.
    if (KEYCLOAK_CLIENT_SECRET) body.set('client_secret', KEYCLOAK_CLIENT_SECRET);

    const response = await fetch(tokenUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Обмен code на токен отклонён: HTTP ${response.status} — ${text}`);
    }

    const tokens = JSON.parse(text);
    sessionStorage.setItem('access_token', tokens.access_token);
    if (tokens.refresh_token) sessionStorage.setItem('refresh_token', tokens.refresh_token);
    // id_token нужен для корректного RP-initiated logout
    if (tokens.id_token) sessionStorage.setItem('id_token', tokens.id_token);

    const redirectTo = sessionStorage.getItem('login_redirect_to');
    sessionStorage.removeItem('login_redirect_to');
    return redirectTo;
  },

  getToken() {
    return sessionStorage.getItem('access_token');
  },

  /** Продление сессии: обмен refresh_token на новую пару токенов. */
  async refresh() {
    const refreshToken = sessionStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT_ID,
      refresh_token: refreshToken,
    });
    // Confidential-клиенты требуют секрет и при refresh.
    if (KEYCLOAK_CLIENT_SECRET) body.set('client_secret', KEYCLOAK_CLIENT_SECRET);

    try {
      const response = await fetch(tokenUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!response.ok) return false;

      const tokens = await response.json();
      sessionStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) sessionStorage.setItem('refresh_token', tokens.refresh_token);
      if (tokens.id_token) sessionStorage.setItem('id_token', tokens.id_token);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Актуальный access_token для запросов: если текущий протух или вот-вот
   * протухнёт — молча продлеваем через refresh_token.
   */
  async getValidToken() {
    const token = this.getToken();
    if (token && !isExpiringSoon(token)) return token;
    if (await this.refresh()) return this.getToken();
    // Refresh тоже не удался (протух и он) — вернём как есть:
    // бэк отдаст 401, и http.js сделает logout.
    return token;
  },

  /** Полный logout: чистим свои токены и убиваем SSO-сессию в Keycloak. */
  logout() {
    const idToken = sessionStorage.getItem('id_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('id_token');

    const params = new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID });
    if (idToken) params.set('id_token_hint', idToken);
    params.set('post_logout_redirect_uri', `${window.location.origin}/login`);

    window.location.href = `${logoutUrl()}?${params}`;
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  /**
   * Получение ролей текущего пользователя из токена
   */
  getRoles() {
    const token = this.getToken();
    if (!token) return [];
    return extractRoles(token);
  },

  /**
   * Проверка наличия конкретной роли у пользователя
   */
  hasRole(role) {
    return this.getRoles().includes(role);
  },

  /**
   * Проверка, является ли пользователем оператором
   */
  isOperator() {
    return this.hasRole('operator');
  },
};
