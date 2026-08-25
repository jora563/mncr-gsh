const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL;
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
const KEYCLOAK_CLIENT_SECRET = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET;
const KEYCLOAK_REDIRECT_URI = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI;

const authUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`;
const tokenUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
const logoutUrl = () => `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;

/** Декодирует payload JWT без проверки подписи — нам нужны только claims (exp). */
function parseJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** True, если токен протух или протухнет в ближайшие bufferSec секунд. */
function isExpiringSoon(token, bufferSec = 60) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now() + bufferSec * 1000;
}

export const keycloak = {
  /** Старт OAuth2 Authorization Code Flow: редирект на страницу логина Keycloak. */
  login() {
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

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
};
