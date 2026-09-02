import { formatDateParts } from '../../utils/format.js';
import { LoaderIcon } from '../icons.jsx';

export default function ChatMessages({ messages, messagesEndRef, loading }) {
  /**
   * Дата сообщения: сервер шлёт date_time, локальные исходящие — dateTime
   */
  const rawDate = (message) => message.date_time ?? message.dateTime;

  /**
   * Форматирование времени сообщения
   */
  const formatTime = (message) => {
    const parts = formatDateParts(rawDate(message));
    if (!parts) return '';
    return parts.time;
  };

  /**
   * Форматирование даты сообщения
   */
  const formatDate = (message) => {
    const parts = formatDateParts(rawDate(message));
    if (!parts) return '';
    return parts.date;
  };

  /**
   * Группировка сообщений по дате
   */
  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;

    messages.forEach((message) => {
      const date = formatDate(message);

      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [] });
      }

      groups[groups.length - 1].messages.push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="chat-messages">
      {messages.length === 0 ? (
        <div className="messages-empty">
          <p>Нет сообщений в этом чате</p>
        </div>
      ) : (
        <>
          {messageGroups.map((group) => (
            <div key={group.date} className="message-group">
              <div className="date-separator">
                <span>{group.date}</span>
              </div>

              {group.messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.incoming ? 'message-incoming' : 'message-outgoing'} ${message.sending ? 'message-sending' : ''}`}
                >
                  <div className="message-bubble">
                    <div className="message-text">{message.message}</div>
                    <div className="message-meta">
                      <span className="message-time">{formatTime(message)}</span>
                      {message.sending && <span className="message-status">Отправка...</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {loading && (
        <div className="messages-loading">
          <LoaderIcon width={24} height={24} className="spin" />
          <span>Загрузка...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
