import { useEffect } from 'react';
import { useOperatorChat } from '../hooks/useOperatorChat.js';
import { keycloak } from '../services/keycloak.js';
import { WS_CONNECTION_STATUS } from '../services/websocket.js';
import ChatHeader from '../components/chat/ChatHeader.jsx';
import ChatMessages from '../components/chat/ChatMessages.jsx';
import ChatInput from '../components/chat/ChatInput.jsx';
import {
  LogOutIcon,
  MessageSquareIcon,
  ClockIcon,
  PowerIcon,
  PowerOffIcon
} from '../components/icons.jsx';
import { OPERATOR_STATUSES } from '../constants.js';

export default function OperatorPage() {
  const {
    connectionStatus,
    currentChatId,
    messages,
    operatorStatus,
    loading,
    error,
    messagesEndRef,
    connect,
    disconnect,
    sendMessage,
    getNextChat,
    restoreChat,
    loadHistory,
    closeChat,
    changeStatus,
  } = useOperatorChat();

  /**
   * Автоматическое подключение при загрузке
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  /**
   * Обработка выхода
   */
  const handleLogout = () => {
    disconnect();
    keycloak.logout();
  };

  /**
   * Обработка отправки сообщения
   */
  const handleSendMessage = (text) => {
    sendMessage(text);
  };

  /**
   * Переключение статуса оператора
   */
  const handleToggleStatus = () => {
    const newStatus = operatorStatus === OPERATOR_STATUSES.ONLINE
      ? OPERATOR_STATUSES.OFFLINE
      : OPERATOR_STATUSES.ONLINE;
    changeStatus(newStatus);
  };

  /**
   * Рендер статуса подключения
   */
  const renderConnectionStatus = () => {
    const statusConfig = {
      [WS_CONNECTION_STATUS.CONNECTED]: {
        label: 'Подключено',
        className: 'status-badge--success',
      },
      [WS_CONNECTION_STATUS.CONNECTING]: {
        label: 'Подключение...',
        className: 'status-badge--warning',
      },
      [WS_CONNECTION_STATUS.DISCONNECTED]: {
        label: 'Отключено',
        className: 'status-badge--error',
      },
      [WS_CONNECTION_STATUS.ERROR]: {
        label: 'Ошибка',
        className: 'status-badge--error',
      },
    };

    const config = statusConfig[connectionStatus] || statusConfig[WS_CONNECTION_STATUS.DISCONNECTED];

    return (
      <div className={`status-badge ${config.className}`}>
        <div className="status-dot"></div>
        <span>{config.label}</span>
      </div>
    );
  };

  return (
    <div className="operator-app">
      {/* Боковая панель управления */}
      <aside className="operator-sidebar">
        <div className="operator-logo">
          <div className="logo-mark">A</div>
          <div className="logo-text">
            AI-Omni
            <span>Operator Panel</span>
          </div>
        </div>

        <div className="operator-controls">
          <div className="control-section">
            <h3>Управление</h3>

            <div className="control-group">
              <label className="control-label">Статус оператора</label>
              <button
                type="button"
                className={`btn ${operatorStatus === OPERATOR_STATUSES.ONLINE ? 'btn-success' : 'btn-danger'}`}
                onClick={handleToggleStatus}
                disabled={connectionStatus !== WS_CONNECTION_STATUS.CONNECTED}
              >
                {operatorStatus === OPERATOR_STATUSES.ONLINE ? (
                  <>
                    <PowerIcon width={16} height={16} />
                    <span>Онлайн</span>
                  </>
                ) : (
                  <>
                    <PowerOffIcon width={16} height={16} />
                    <span>Оффлайн</span>
                  </>
                )}
              </button>
            </div>

            <div className="control-group">
              <label className="control-label">Очередь чатов</label>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => getNextChat()}
                disabled={loading || connectionStatus !== WS_CONNECTION_STATUS.CONNECTED || currentChatId !== null}
              >
                <MessageSquareIcon width={16} height={16} />
                <span>Получить чат</span>
              </button>
            </div>

            {!currentChatId && (
              <div className="control-group">
                <button
                  type="button"
                  className="btn"
                  onClick={restoreChat}
                  disabled={loading || connectionStatus !== WS_CONNECTION_STATUS.CONNECTED}
                >
                  <ClockIcon width={16} height={16} />
                  <span>Восстановить чат</span>
                </button>
              </div>
            )}
          </div>

          {currentChatId && (
            <div className="control-section">
              <h3>Текущий чат</h3>
              <div className="chat-info">
                <div className="chat-id">#{currentChatId}</div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={closeChat}
                  disabled={loading}
                >
                  Закрыть чат
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="control-section">
              <div className="banner banner--error">
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        <div className="operator-footer">
          <div className="connection-status">
            {renderConnectionStatus()}
          </div>

          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            <LogOutIcon width={16} height={16} />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Основная область чата */}
      <main className="operator-main">
        {currentChatId ? (
          <div className="chat-container">
            <ChatHeader
              chatId={currentChatId}
              onClose={closeChat}
              onRefresh={loadHistory}
              loading={loading}
            />
            <ChatMessages
              messages={messages}
              messagesEndRef={messagesEndRef}
              loading={loading}
            />
            <ChatInput
              onSend={handleSendMessage}
              disabled={loading || connectionStatus !== WS_CONNECTION_STATUS.CONNECTED}
            />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <MessageSquareIcon width={64} height={64} />
            </div>
            <h2>Нет активного чата</h2>
            <p>Нажмите "Получить чат", чтобы начать работу с очередью</p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => getNextChat()}
              disabled={loading || connectionStatus !== WS_CONNECTION_STATUS.CONNECTED}
            >
              <MessageSquareIcon width={20} height={20} />
              <span>Получить чат из очереди</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
