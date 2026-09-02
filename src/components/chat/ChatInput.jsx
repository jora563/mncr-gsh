import { useState, useRef, useEffect } from 'react';
import { SendIcon } from '../icons.jsx';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  /**
   * Автоматическое изменение высоты textarea
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  /**
   * Обработка отправки
   */
  const handleSend = () => {
    if (!text.trim() || disabled) return;
    
    onSend(text.trim());
    setText('');
    
    // Сброс высоты после отправки
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  /**
   * Обработка нажатия клавиш
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Введите сообщение... (Enter - отправить, Shift+Enter - новая строка)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        
        <button
          type="button"
          className="send-button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="Отправить сообщение"
        >
          <SendIcon width={20} height={20} />
        </button>
      </div>
    </div>
  );
}
