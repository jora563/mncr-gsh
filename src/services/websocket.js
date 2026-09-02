import { keycloak } from './keycloak.js';

/**
 * Базовый URL для WebSocket - берём из текущего origin или из переменной окружения
 */
function getWebSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const baseUrl = apiUrl || window.location.origin;
  return `${baseUrl.replace(/^http/, 'ws')}/v1/operator_api/chat`;
}

/**
 * Типы запросов к серверу
 */
export const WS_REQUEST_TYPES = {
  MESSAGE_SEND: 'MessageSend',
  MESSAGE_HISTORY_GET: 'MessageHistoryGet',
  FILE_GET: 'FileGet',
  GET_QUEUED_CHAT: 'GetQueuedChat',
  CONNECTION_STATUS_CHANGE: 'ConnectionStatusChange',
  CHAT_STATUS_CHANGE: 'ChatStatusChange',
  CHAT_RESTORE: 'ChatRestore',
  CHAT_BY_ID_JOIN: 'ChatByIdJoin',
  IFRAME_GET: 'IFrameGet',
};

/**
 * Типы событий от сервера
 */
export const WS_EVENT_TYPES = {
  MESSAGE_SENT: 'MessageSent',
  MESSAGE_HISTORY_GOT: 'MessageHistoryGot',
  INCOMING_MESSAGE: 'IncomingMessage',
  QUEUED_CHAT_GOT: 'QueuedChatGot',
  CONNECTION_STATUS_CHANGED: 'ConnectionStatusChanged',
  CHAT_STATUS_CHANGED: 'ChatStatusChanged',
  CHAT_RESTORED: 'ChatRestored',
  CHAT_BY_ID_JOINED: 'ChatByIdJoined',
  IFRAME_GOT: 'IFrameGot',
  ERROR: 'Error',
};

/**
 * Статусы подключения
 */
export const WS_CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

/**
 * WebSocket клиент для работы с операторским API.
 *
 * Формат сообщений бэкенда (core/src/http_server/operator_api/ws_protocol):
 *   внешний конверт: { "kind": "Request" | "Event", "data": <внутреннее> }
 *   внутреннее:      { "id": <u128 число>, "request_id"?: <u128>, "type": <имя>, "data": <payload> }
 */
class OperatorWebSocket {
  constructor() {
    this.ws = null;
    this.connectionStatus = WS_CONNECTION_STATUS.DISCONNECTED;
    this.listeners = new Map();
    this.pendingRequests = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.shouldReconnect = true;
    // Счётчик id запросов: число, чтобы serde парсил его как u128,
    // и чтобы JS не терял точность
    this.idSeq = 0;
  }

  /**
   * Подключение к WebSocket серверу
   */
  async connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Явный сброс флага: после disconnect() он мог остаться false
    this.shouldReconnect = true;
    this.connectionStatus = WS_CONNECTION_STATUS.CONNECTING;
    this.emit('connectionStatusChanged', this.connectionStatus);

    try {
      const token = await keycloak.getValidToken();
      if (!token) {
        throw new Error('Нет валидного токена');
      }

      // Браузер не может слать Authorization заголовок при WS handshake,
      // поэтому токен передаётся в query-параметре, а прокси перекладывает
      // его в заголовок (см. vite.config.js)
      const url = `${getWebSocketUrl()}?token=${encodeURIComponent(token)}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = () => this.handleError();
      this.ws.onclose = (event) => this.handleClose(event);

    } catch (error) {
      this.connectionStatus = WS_CONNECTION_STATUS.ERROR;
      this.emit('connectionStatusChanged', this.connectionStatus);
      this.emit('error', { error_text: error.message });
      this.scheduleReconnect();
    }
  }

  /**
   * Обработка успешного подключения
   */
  handleOpen() {
    this.connectionStatus = WS_CONNECTION_STATUS.CONNECTED;
    this.reconnectAttempts = 0;
    this.emit('connectionStatusChanged', this.connectionStatus);
  }

  /**
   * Обработка входящих сообщений.
   * Сервер шлёт конверт { kind: "Event", data: { id, request_id?, type, data } }.
   */
  handleMessage(event) {
    try {
      const envelope = JSON.parse(event.data);
      const inner = envelope.kind ? envelope.data : envelope;
      if (!inner) {
        return;
      }

      const { type, data: payload, request_id } = inner;

      // Ответ на наш запрос: гасим pending. Error-событие reject-им,
      // чтобы вызывающий код сразу увидел настоящую причину.
      if (request_id != null && this.pendingRequests.has(request_id)) {
        const { resolve, reject } = this.pendingRequests.get(request_id);
        this.pendingRequests.delete(request_id);
        if (type === WS_EVENT_TYPES.ERROR) {
          reject(new Error(payload?.error_text || 'Ошибка сервера'));
        } else {
          resolve({ type, data: payload, id: inner.id });
        }
        this.emit(type, payload, { id: inner.id, request_id });
        return;
      }

      // Error без request_id: сервер мог упасть на запросе целиком —
      // гасим все висящие запросы с настоящей причиной, вместо слепого таймаута
      if (type === WS_EVENT_TYPES.ERROR && this.pendingRequests.size > 0) {
        const text = payload?.error_text || 'Ошибка сервера';
        const pendings = [...this.pendingRequests.values()];
        this.pendingRequests.clear();
        pendings.forEach(({ reject }) => reject(new Error(text)));
      }

      // Эмитим событие для всех слушателей
      this.emit(type, payload, { id: inner.id, request_id });

    } catch {
      this.emit('error', { error_text: 'Ошибка парсинга сообщения' });
    }
  }

  /**
   * Обработка ошибок
   */
  handleError() {
    this.connectionStatus = WS_CONNECTION_STATUS.ERROR;
    this.emit('connectionStatusChanged', this.connectionStatus);
    this.emit('error', { error_text: 'Ошибка WebSocket соединения' });
  }

  /**
   * Обработка закрытия соединения.
   * Если сервер уронил соединение (код != 1000) пока висели запросы —
   * отклоняем их с причиной из close-фрейма, чтобы не ждать таймаут вслепую.
   */
  handleClose(event) {
    this.connectionStatus = WS_CONNECTION_STATUS.DISCONNECTED;
    this.emit('connectionStatusChanged', this.connectionStatus);

    if (event.code !== 1000 && this.pendingRequests.size > 0) {
      const text = event.reason || `Соединение закрыто сервером (код ${event.code})`;
      const pendings = [...this.pendingRequests.values()];
      this.pendingRequests.clear();
      pendings.forEach(({ reject }) => reject(new Error(text)));
    }

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Планирование переподключения
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Отправка запроса и ожидание ответа.
   * Конверт: { kind: "Request", data: { id, type, data } }
   */
  async sendRequest(type, data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket не подключен');
    }

    this.idSeq += 1;
    const id = this.idSeq;

    const envelope = {
      kind: 'Request',
      data: {
        id,
        type,
        data,
      },
    };

    this.ws.send(JSON.stringify(envelope));

    return new Promise((resolve, reject) => {
      // Таймаут на ответ
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Таймаут ответа от сервера'));
        }
      }, 10000);

      this.pendingRequests.set(id, {
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  /**
   * Отправка сообщения в чат
   */
  sendMessage(chatId, message) {
    return this.sendRequest(WS_REQUEST_TYPES.MESSAGE_SEND, {
      chatId,
      message,
    });
  }

  /**
   * Получение истории сообщений.
   *
   * afterMessageId — «id последнего уже показанного сообщения», сервер вернёт
   * сообщения СТРОГО ПОСЛЕ него (id > afterMessageId). Поэтому:
   *   - по умолчанию 0 — вся история с самого начала;
   *   - для подгрузки «дальше» передавать id последнего показанного.
   * Шлём его всегда и никогда не null: при None бэкенд падает с
   * «bind message supplies 2 parameters, but requires 3».
   */
  getMessageHistory(chatId, afterMessageId = 0, size = 50) {
    return this.sendRequest(WS_REQUEST_TYPES.MESSAGE_HISTORY_GET, {
      chatId,
      messageId: afterMessageId ?? 0,
      size,
    });
  }

  /**
   * Получение следующего чата из очереди
   */
  getQueuedChat(tags = []) {
    return this.sendRequest(WS_REQUEST_TYPES.GET_QUEUED_CHAT, { tags });
  }

  /**
   * Изменение статуса подключения оператора
   */
  changeConnectionStatus(status) {
    return this.sendRequest(WS_REQUEST_TYPES.CONNECTION_STATUS_CHANGE, { status });
  }

  /**
   * Изменение статуса чата (тикета)
   */
  changeChatStatus(chatId, status) {
    return this.sendRequest(WS_REQUEST_TYPES.CHAT_STATUS_CHANGE, { chatId, status });
  }

  /**
   * Восстановление предыдущего активного чата
   */
  restoreChat() {
    return this.sendRequest(WS_REQUEST_TYPES.CHAT_RESTORE, {});
  }

  /**
   * Присоединение к конкретному чату по ID
   */
  joinChatById(chatId) {
    return this.sendRequest(WS_REQUEST_TYPES.CHAT_BY_ID_JOIN, { chatId });
  }

  /**
   * Получение файла
   */
  getFile(messageId) {
    return this.sendRequest(WS_REQUEST_TYPES.FILE_GET, { messageId });
  }

  /**
   * Получение IFrame кода
   */
  getIFrame() {
    return this.sendRequest(WS_REQUEST_TYPES.IFRAME_GET, {});
  }

  /**
   * Отключение от сервера
   */
  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatus = WS_CONNECTION_STATUS.DISCONNECTED;
    this.emit('connectionStatusChanged', this.connectionStatus);
  }

  /**
   * Подписка на события
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Отписка от событий
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Эмит события всем подписчикам
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(...args);
        } catch {
          // ошибка в обработчике подписчика не должна рвать цикл оповещения
        }
      });
    }
  }

  /**
   * Получить текущий статус подключения
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }
}

// Создаём и экспортируем единственный экземпляр
export const operatorWS = new OperatorWebSocket();
