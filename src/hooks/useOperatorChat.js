import { useCallback, useEffect, useRef, useState } from 'react';
import { operatorWS, WS_EVENT_TYPES, WS_CONNECTION_STATUS } from '../services/websocket.js';
import { useToast } from '../providers/toast/useToast.js';

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
  const [connectionStatus, setConnectionStatus] = useState(WS_CONNECTION_STATUS.DISCONNECTED);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [operatorStatus, setOperatorStatus] = useState(1); // 1 = online, 0 = offline
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toast = useToast();
  const messagesEndRef = useRef(null);
  // Синхронный дубль currentChatId: WS-обработчики не должны читать устаревший
  // state (гонка между setState и приходом ответа по WS)
  const currentChatIdRef = useRef(null);

  /**
   * Прокрутка к последнему сообщению
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Назначить активный чат: ref синхронно, state для React
   */
  const setActiveChat = useCallback((chatId) => {
    currentChatIdRef.current = chatId;
    setCurrentChatId(chatId);
    setMessages([]);
  }, []);

  /**
   * Загрузка истории сообщений
   */
  const loadHistory = useCallback(async (chatId, beforeMessageId = null, size = 50) => {
    if (!chatId) return;

    try {
      setLoading(true);
      await operatorWS.getMessageHistory(chatId, beforeMessageId, size);
    } catch {
      toast.error('Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Upsert сообщений по id.
   * replace=true — полная замена (история), иначе — дозапись без дубликатов.
   * Защита от того, что бэкенд при сообщении клиента пересылает всю историю
   * как IncomingMessage.
   */
  const upsertMessages = useCallback((incoming, replace) => {
    setMessages((prev) => {
      const normalized = incoming.map((msg) => ({ ...msg, incoming: isIncoming(msg) }));
      if (replace) {
        return normalized.sort((a, b) => a.id - b.id);
      }
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const msg of normalized) byId.set(msg.id, msg);
      return [...byId.values()].sort((a, b) => a.id - b.id);
    });
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  /**
   * Обработка входящего сообщения
   */
  const handleIncomingMessage = useCallback((payload) => {
    const { chatId, ...message } = payload;

    if (chatId === currentChatIdRef.current) {
      upsertMessages([message], false);
    }
  }, [upsertMessages]);

  /**
   * Обработка получения истории сообщений
   */
  const handleMessageHistory = useCallback((payload) => {
    const { chatId, messages: history } = payload;

    if (chatId === currentChatIdRef.current) {
      upsertMessages(history, true);
    }
  }, [upsertMessages]);

  /**
   * Обработка подтверждения отправки сообщения
   */
  const handleMessageSent = useCallback((payload) => {
    // Сервер подтвердил получение нашего сообщения
    if (payload && payload.id) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sending ? { ...msg, sending: false, incoming: false, ...payload } : msg,
        ),
      );
    }
  }, []);

  /**
   * Обработка получения чата из очереди
   */
  const handleQueuedChat = useCallback((payload) => {
    const { chatId } = payload;

    if (chatId !== null && chatId !== undefined) {
      setActiveChat(chatId);
      toast.info(`Назначен чат #${chatId}`);
      // Загружаем историю для нового чата
      loadHistory(chatId);
    } else {
      toast.info('В очереди пока нет чатов');
    }
  }, [toast, loadHistory, setActiveChat]);

  /**
   * Обработка восстановления чата
   */
  const handleChatRestored = useCallback((payload) => {
    const { chatId } = payload;

    if (chatId !== null && chatId !== undefined) {
      setActiveChat(chatId);
      toast.info(`Восстановлен чат #${chatId}`);
      loadHistory(chatId);
    } else {
      toast.info('Нет активного чата для восстановления');
    }
  }, [toast, loadHistory, setActiveChat]);

  /**
   * Обработка присоединения к чату по ID
   */
  const handleChatJoined = useCallback((payload) => {
    const { chatId } = payload;

    setActiveChat(chatId);
    toast.success(`Присоединились к чату #${chatId}`);
    loadHistory(chatId);
  }, [toast, loadHistory, setActiveChat]);

  /**
   * Обработка ошибок
   */
  const handleError = useCallback((payload) => {
    const { error_text } = payload;
    setError(error_text);
    toast.error(error_text);
  }, [toast]);

  /**
   * Подписка на события WebSocket
   */
  useEffect(() => {
    const unsubscribers = [
      operatorWS.on('connectionStatusChanged', setConnectionStatus),
      operatorWS.on(WS_EVENT_TYPES.INCOMING_MESSAGE, handleIncomingMessage),
      operatorWS.on(WS_EVENT_TYPES.MESSAGE_HISTORY_GOT, handleMessageHistory),
      operatorWS.on(WS_EVENT_TYPES.MESSAGE_SENT, handleMessageSent),
      operatorWS.on(WS_EVENT_TYPES.QUEUED_CHAT_GOT, handleQueuedChat),
      operatorWS.on(WS_EVENT_TYPES.CHAT_RESTORED, handleChatRestored),
      operatorWS.on(WS_EVENT_TYPES.CHAT_BY_ID_JOINED, handleChatJoined),
      operatorWS.on(WS_EVENT_TYPES.ERROR, handleError),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [handleIncomingMessage, handleMessageHistory, handleMessageSent, handleQueuedChat, handleChatRestored, handleChatJoined, handleError]);

  /**
   * Подключение к WebSocket
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
   * Отключение от WebSocket
   */
  const disconnect = useCallback(() => {
    operatorWS.disconnect();
  }, []);

  /**
   * Отправка сообщения
   */
  const sendMessage = useCallback(async (text) => {
    const chatId = currentChatIdRef.current;
    if (!chatId) {
      toast.error('Нет активного чата');
      return;
    }

    if (!text.trim()) {
      return;
    }

    const tempId = Date.now();

    try {
      setLoading(true);

      // Добавляем сообщение в локальный список с пометкой "отправляется"
      setMessages((prev) => [
        ...prev,
        { id: tempId, message: text, dateTime: new Date().toISOString(), sending: true, incoming: false },
      ]);

      const response = await operatorWS.sendMessage(chatId, text);

      // Обновляем сообщение после успешной отправки
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, sending: false, incoming: false, ...response.data } : msg,
        ),
      );

      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error('Не удалось отправить сообщение');
      // Удаляем сообщение из списка
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setLoading(false);
    }
  }, [scrollToBottom, toast]);

  /**
   * Запрос следующего чата из очереди
   */
  const getNextChat = useCallback(async (tags = []) => {
    try {
      setLoading(true);
      await operatorWS.getQueuedChat(tags);
    } catch (err) {
      toast.error(`Ошибка получения чата: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Восстановление предыдущего чата
   */
  const restoreChat = useCallback(async () => {
    try {
      setLoading(true);
      await operatorWS.restoreChat();
    } catch {
      toast.error('Не удалось восстановить чат');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Присоединение к чату по ID
   */
  const joinChat = useCallback(async (chatId) => {
    try {
      setLoading(true);
      await operatorWS.joinChatById(chatId);
    } catch {
      toast.error('Не удалось присоединиться к чату');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Завершение работы с текущим чатом
   */
  const closeChat = useCallback(async () => {
    const chatId = currentChatIdRef.current;
    if (!chatId) return;

    try {
      setLoading(true);
      await operatorWS.changeChatStatus(chatId, 2); // 2 = closed
      currentChatIdRef.current = null;
      setCurrentChatId(null);
      setMessages([]);
      toast.success('Чат закрыт');
    } catch {
      toast.error('Не удалось закрыть чат');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Изменение статуса оператора
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
   * Автопрокрутка при новых сообщениях
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return {
    // Состояние
    connectionStatus,
    currentChatId,
    messages,
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
    joinChat,
    loadHistory: () => loadHistory(currentChatIdRef.current),
    closeChat,
    changeStatus,
  };
}
