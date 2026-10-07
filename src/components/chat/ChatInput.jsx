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
   * Автофокус при монтировании компонента
   */
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  /**
   * Глобальный обработчик клавиатурных событий
   * Перехватывает нажатия клавиш и устанавливает фокус на поле ввода
   */
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Игнорируем если компонент отключен
      if (disabled) return;

      // Игнорируем если фокус уже на input/textarea/select/button
      const activeElement = document.activeElement;
      const isInputFocused = 
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.tagName === 'SELECT' ||
        activeElement?.tagName === 'BUTTON';

      if (isInputFocused) return;

      // Игнорируем модификаторы (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Игнорируем функциональные и специальные клавиши
      const ignoredKeys = [
        'Escape', 'Tab', 'Enter', 'Backspace', 'Delete',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Home', 'End', 'PageUp', 'PageDown',
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
        'CapsLock', 'NumLock', 'ScrollLock', 'Shift'
      ];

      if (ignoredKeys.includes(e.key)) return;

      // Проверяем, что это печатаемая клавиша (одиночный символ)
      if (e.key.length !== 1) return;

      // Устанавливаем фокус на textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [disabled]);

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
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение..."
          className="chat-textarea"
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="send-button"
          title="Отправить сообщение"
        >
          <SendIcon width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
