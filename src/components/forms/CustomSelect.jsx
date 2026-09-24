import { useState, useRef, useEffect } from 'react';
import { ChevronRightIcon } from '../icons.jsx';

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  disabled = false,
  className = '',
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Закрытие при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Фокус на первый элемент при открытии
  useEffect(() => {
    if (isOpen && listRef.current) {
      const firstItem = listRef.current.querySelector('[role="option"]');
      firstItem?.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const items = listRef.current?.querySelectorAll('[role="option"]');
    if (!items) return;

    const currentIndex = Array.from(items).findIndex((item) => item === document.activeElement);

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex]?.focus();
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const focusedItem = document.activeElement;
        const optionValue = focusedItem?.getAttribute('data-value');
        if (optionValue !== null) {
          handleSelect(optionValue);
        }
        break;
      }
      case 'Tab': {
        setIsOpen(false);
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
    >
      <button
        type="button"
        className="custom-select__trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="custom-select__value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronRightIcon width={16} height={16} className="custom-select__arrow" />
      </button>

      {isOpen && (
        <div className="custom-select__dropdown" role="listbox">
          <ul ref={listRef}>
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                tabIndex={0}
                data-value={option.value}
                aria-selected={option.value === value}
                className={`custom-select__option ${option.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(option.value);
                  }
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
