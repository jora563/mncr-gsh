import { useCallback, useEffect, useRef, useState } from 'react';
import { OperatorWebSocket, operatorWS, WS_EVENT_TYPES, WS_CONNECTION_STATUS } from '../services/websocket.js';
import { useToast } from '../providers/toast/useToast.js';
import { CHAT_STATUSES } from '../constants.js';

/**
 * Входящее ли сообщение (от клиента).
 * Бэкенд шлёт senderType ('user'/'bot'); если его нет — fallback по bot_account_id.
 */
function isIncoming(msg) {
  if (msg.senderType) return msg.senderType !== 'bot';
  if (msg.bot_account_id) return false;
  return true;
}

/**
 * Хук для управления операторским чатом через WebSocket
 */
export function useOperatorChat() {
  const [mainConnectionStatus, setMainConnectionStatus] = useState(WS_CONNECTION_STATUS.DISCONNECTED);
  const [chats, setChats] = useState({});
  const [activeChats, setActiveChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [operatorStatus, setOperatorStatus] = useState(1); // 1 = online, 0 = offline
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toast = useToast();
  const messagesEndRef = useRef(null);
  const chatWsMap = useRef({});
  const activeChatsRef = useRef([]);
  const currentChatIdRef = useRef(null);

  /**
   * Автоочистка ошибки через 10 секунд
   */
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 10000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  useEffect(() => {
    activeChatsRef.current = activeChats;
  }, [activeChats]);

  /**
   * Прокрутка к последнему сообщению
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Обработка входящего сообщения
   */
  const handleIncomingMessage = useCallback((targetChatId, message) => {
    setChats((prev) => {
      const chatData = prev[targetChatId];
      if (!chatData) return prev;

      const normalized = { ...message, incoming: isIncoming(message) };
      const byId = new Map(chatData.messages.map((m) => [m.id, m]));
      byId.set(normalized.id, normalized);
      const newMessages = [...byId.values()].sort((a, b) => a.id - b.id);

      return {
        ...prev,
        [targetChatId]: { ...chatData, messages: newMessages },
      };
    });
    if (targetChatId === currentChatIdRef.current) {
      setTimeout(scrollToBottom, 100);
    }
  }, [scrollToBottom]);

  /**
   * Обработка получения истории сообщений
   */
  const handleMessageHistory = useCallback((targetChatId, history) => {
    setChats((prev) => {
      const chatData = prev[targetChatId];
      if (!chatData) return prev;

      const normalized = history.map((msg) => ({ ...msg, incoming: isIncoming(msg) }));
      return {
        ...prev,
        [targetChatId]: { ...chatData, messages: normalized.sort((a, b) => a.id - b.id) },
      };
    });
    if (targetChatId === currentChatIdRef.current) {
      setTimeout(scrollToBottom, 100);
    }
  }, [scrollToBottom]);

  /**
   * Обработка подтверждения отправки сообщения
   */
  const handleMessageSent = useCallback((targetChatId, payload) => {
    if (payload && payload.id) {
      setChats((prev) => {
        const chatData = prev[targetChatId];
        if (!chatData) return prev;
        return {
          ...prev,
          [targetChatId]: {
            ...chatData,
            messages: chatData.messages.map((msg) =>
              msg.sending ? { ...msg, sending: false, incoming: false, ...payload } : msg
            ),
          },
        };
      });
    }
  }, []);

  const setupChatWsState = useCallback((ws, chatId) => {
    ws.chatId = chatId;
    chatWsMap.current[chatId] = ws;
    setActiveChats((prev) => (prev.includes(chatId) ? prev : [...prev, chatId]));
    setChats((prev) => ({ ...prev, [chatId]: { messages: [] } }));
    setCurrentChatId(chatId);
    toast.success(`Назначена заявка №${chatId}`);
    ws.getMessageHistory(chatId, 0, 50).catch(() => toast.error('Не удалось загрузить историю'));
  }, [toast]);

  /**
   * Подключение главного WebSocket (только для статусов)
   */
  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await operatorWS.connect();
    } catch (err) {
      setError(err.message);
      toast.error('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Отключение от всех WebSocket
   */
  const disconnect = useCallback(() => {
    Object.values(chatWsMap.current).forEach((ws) => ws.disconnect());
    chatWsMap.current = {};
    setActiveChats([]);
    setChats({});
    setCurrentChatId(null);
    operatorWS.disconnect();
  }, []);

  /**
   * Запрос следующего чата из очереди через НОВОЕ соединение
   */
  const getNextChat = useCallback(async (tags = []) => {
    if (mainConnectionStatus !== WS_CONNECTION_STATUS.CONNECTED) {
      toast.error('Нет подключения к серверу');
      return;
    }
    let tempWs = null;
    try {
      setLoading(true);
      tempWs = new OperatorWebSocket();

      tempWs.on(WS_EVENT_TYPES.INCOMING_MESSAGE, (payload) => {
        if (tempWs.chatId) {
          const { chatId: msgChatId, ...message } = payload;
          handleIncomingMessage(msgChatId || tempWs.chatId, message);
        }
      });
      tempWs.on(WS_EVENT_TYPES.MESSAGE_HISTORY_GOT, (payload) => {
        if (tempWs.chatId) {
          const { chatId: msgChatId, messages: history } = payload;
          handleMessageHistory(msgChatId || tempWs.chatId, history);
        }
      });
      tempWs.on(WS_EVENT_TYPES.MESSAGE_SENT, (payload) => {
        if (tempWs.chatId) {
          handleMessageSent(tempWs.chatId, payload);
        }
      });

      await tempWs.connect();
      await tempWs.waitForOpen();

      const response = await tempWs.getQueuedChat(tags);
      const chatId = response.data?.chatId;

      if (chatId !== null && chatId !== undefined) {
        setupChatWsState(tempWs, chatId);
      } else {
        toast.info('В очереди пока нет заявок');
        tempWs.disconnect();
      }
    } catch (err) {
      toast.error(`Ошибка получения заявки: ${err.message}`);
      if (tempWs) tempWs.disconnect();
    } finally {
      setLoading(false);
    }
  }, [toast, setupChatWsState, mainConnectionStatus, handleIncomingMessage, handleMessageHistory, handleMessageSent]);

  /**
   * Восстановление предыдущего чата через НОВОЕ соединение
   */
  const restoreChat = useCallback(async () => {
    if (mainConnectionStatus !== WS_CONNECTION_STATUS.CONNECTED) {
      toast.error('Нет подключения к серверу');
      return;
    }
    let tempWs = null;
    try {
      setLoading(true);
      tempWs = new OperatorWebSocket();

      tempWs.on(WS_EVENT_TYPES.INCOMING_MESSAGE, (payload) => {
        if (tempWs.chatId) {
          const { chatId: msgChatId, ...message } = payload;
          handleIncomingMessage(msgChatId || tempWs.chatId, message);
        }
      });
      tempWs.on(WS_EVENT_TYPES.MESSAGE_HISTORY_GOT, (payload) => {
        if (tempWs.chatId) {
          const { chatId: msgChatId, messages: history } = payload;
          handleMessageHistory(msgChatId || tempWs.chatId, history);
        }
      });
      tempWs.on(WS_EVENT_TYPES.MESSAGE_SENT, (payload) => {
        if (tempWs.chatId) {
          handleMessageSent(tempWs.chatId, payload);
        }
      });

      await tempWs.connect();
      await tempWs.waitForOpen();

      const response = await tempWs.restoreChat();
      const chatId = response.data?.chatId;

      if (chatId !== null && chatId !== undefined) {
        setupChatWsState(tempWs, chatId);
      } else {
        toast.info('Нет активной заявки для восстановления');
        tempWs.disconnect();
      }
    } catch (err) {
      toast.error(`Ошибка восстановления заявки: ${err.message}`);
      if (tempWs) tempWs.disconnect();
    } finally {
      setLoading(false);
    }
  }, [toast, setupChatWsState, mainConnectionStatus, handleIncomingMessage, handleMessageHistory, handleMessageSent]);

  /**
   * Отправка сообщения
   */
  const sendMessage = useCallback(async (text) => {
    const chatId = currentChatIdRef.current;
    if (!chatId || !chatWsMap.current[chatId]) {
      toast.error('Нет активной заявки');
      return;
    }
    if (!text.trim()) {
      return;
    }

    const ws = chatWsMap.current[chatId];
    const tempId = crypto.randomUUID();

    try {
      setLoading(true);
      setChats((prev) => {
        const chatData = prev[chatId];
        if (!chatData) return prev;
        return {
          ...prev,
          [chatId]: {
            ...chatData,
            messages: [
              ...chatData.messages,
              { id: tempId, message: text, dateTime: new Date().toISOString(), sending: true, incoming: false },
            ],
          },
        };
      });

      await ws.sendMessage(chatId, text);
    } catch {
      toast.error('Не удалось отправить сообщение');
      setChats((prev) => {
        const chatData = prev[chatId];
        if (!chatData) return prev;
        return {
          ...prev,
          [chatId]: {
            ...chatData,
            messages: chatData.messages.filter((msg) => msg.id !== tempId),
          },
        };
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Завершение работы с текущим чатом
   */
  const closeChat = useCallback(async () => {
    const chatId = currentChatIdRef.current;
    if (!chatId || !chatWsMap.current[chatId]) return;

    const ws = chatWsMap.current[chatId];

    try {
      setLoading(true);
      await ws.changeChatStatus(chatId, CHAT_STATUSES.CLOSED);
      ws.disconnect();
      delete chatWsMap.current[chatId];
      setActiveChats((prev) => prev.filter((id) => id !== chatId));
      setChats((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      setCurrentChatId((prev) => (prev === chatId ? (activeChatsRef.current.find((id) => id !== chatId) || null) : prev));
      toast.success('Заявка закрыта');
    } catch {
      toast.error('Не удалось закрыть заявку');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Изменение статуса оператора (через главное соединение)
   */
  const changeStatus = useCallback(async (status) => {
    try {
      await operatorWS.changeConnectionStatus(status);
      setOperatorStatus(status);
    } catch {
      toast.error('Не удалось изменить статус');
    }
  }, [toast]);

  /**
   * Загрузка истории сообщений
   */
  const loadHistory = useCallback((chatId = currentChatIdRef.current, afterMessageId = 0, size = 50) => {
    if (!chatId || !chatWsMap.current[chatId]) return;
    const ws = chatWsMap.current[chatId];
    ws.getMessageHistory(chatId, afterMessageId, size).catch(() => {
      toast.error('Не удалось загрузить историю');
    });
  }, [toast]);

  /**
   * Автопрокрутка при новых сообщениях
   */
  useEffect(() => {
    if (currentChatId && chats[currentChatId]?.messages) {
      scrollToBottom();
    }
  }, [chats, currentChatId, scrollToBottom]);

  /**
   * Подписка на статус главного соединения и глобальные ошибки
   */
  useEffect(() => {
    const unsub = operatorWS.on('connectionStatusChanged', setMainConnectionStatus);
    const unsubErr = operatorWS.on(WS_EVENT_TYPES.ERROR, (payload) => {
      setError(payload.error_text);
      toast.error(payload.error_text);
    });
    return () => { unsub(); unsubErr(); };
  }, [toast]);

  const currentChatData = chats[currentChatId] || { messages: [] };

  return {
    // Состояние
    connectionStatus: mainConnectionStatus,
    currentChatId,
    activeChats,
    messages: currentChatData.messages,
    operatorStatus,
    loading,
    error,
    messagesEndRef,

    // Действия
    connect,
    disconnect,
    sendMessage,
    getNextChat,
    restoreChat,
    loadHistory: () => loadHistory(currentChatIdRef.current),
    closeChat,
    changeStatus,
    setCurrentChatId,
  };
}
