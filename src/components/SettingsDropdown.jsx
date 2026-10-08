import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../providers/theme/useTheme.js';
import { THEMES } from '../constants.js';
import { SettingsIcon, SunIcon, MoonIcon, MonitorIcon } from './icons.jsx';

const THEME_OPTIONS = [
  { value: THEMES.LIGHT, label: 'Светлая', icon: SunIcon },
  { value: THEMES.DARK, label: 'Тёмная', icon: MoonIcon },
  { value: THEMES.SYSTEM, label: 'Как в системе', icon: MonitorIcon },
];

export default function SettingsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="settings-dropdown" ref={ref}>
      <button
        type="button"
        className="logo-mark settings-trigger"
        aria-label="Настройки"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <SettingsIcon width={18} height={18} />
      </button>

      {open && (
        <div className="settings-menu">
          <div className="settings-menu-header">Настройки</div>
          <div className="settings-item">
            <span className="settings-item-label">Тема</span>
            <div className="settings-theme-options">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-theme-option ${theme === option.value ? 'active' : ''}`}
                    title={option.label}
                    aria-label={option.label}
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon width={15} height={15} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
