import { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ value = [], onChange, options = [], placeholder = 'Выберите...', disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const removeTag = (optionValue, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  return (
    <div ref={containerRef} className={`multi-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        className="multi-select__trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="multi-select__tags">
          {selectedOptions.length === 0 ? (
            <span className="multi-select__placeholder">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span key={opt.value} className="multi-select__tag">
                {opt.label}
                <button
                  type="button"
                  className="multi-select__tag-remove"
                  onClick={(e) => removeTag(opt.value, e)}
                  disabled={disabled}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </button>

      {isOpen && (
        <div className="multi-select__dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`multi-select__option ${value.includes(option.value) ? 'selected' : ''}`}
              onClick={() => toggleOption(option.value)}
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => {}}
                className="multi-select__checkbox"
              />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
