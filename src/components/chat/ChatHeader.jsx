import { XIcon, UserIcon, RefreshIcon } from '../icons.jsx';

export default function ChatHeader({ chatId, onClose, onRefresh, loading }) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="chat-avatar">
          <UserIcon width={20} height={20} />
        </div>
        <div className="chat-info">
          <h3>Заявка №{chatId}</h3>
        </div>
      </div>

      <div className="chat-header-right">
        <button
          type="button"
          className="btn"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshIcon width={16} height={16} />
          <span>Обновить</span>
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={onClose}
        >
          <XIcon width={16} height={16} />
          <span>Закрыть заявку</span>
        </button>
      </div>
    </div>
  );
}
