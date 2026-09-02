import { XIcon, UserIcon, RefreshIcon } from '../icons.jsx';

export default function ChatHeader({ chatId, onClose, onRefresh, loading }) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="chat-avatar">
          <UserIcon width={20} height={20} />
        </div>
        <div className="chat-info">
          <h3>Чат #{chatId}</h3>
          <p>Активный диалог</p>
        </div>
      </div>

      <div className="chat-header-right">
        <button
          type="button"
          className="icon-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Обновить историю"
        >
          <RefreshIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={onClose}
          title="Закрыть чат"
        >
          <XIcon width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
