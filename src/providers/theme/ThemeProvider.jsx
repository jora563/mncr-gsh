import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext.js';
import { STORAGE_KEYS, THEMES } from '../../constants.js';

function readSystemTheme() {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return THEMES.LIGHT;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
  } catch {
    return THEMES.LIGHT;
  }
}

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === THEMES.LIGHT || stored === THEMES.DARK) return stored;
  } catch {
    // localStorage недоступен — игнорируем
  }
  return null;
}

function readInitialTheme() {
  if (typeof window === 'undefined') return THEMES.LIGHT;
  return readStoredTheme() ?? readSystemTheme();
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // игнорируем
  }
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      persistTheme(next);
      return next;
    });
  }, []);

  // Синхронизируем атрибут data-theme на <html>, чтобы работали CSS-селекторы
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Реагируем на смену системной темы, если пользователь ещё не выбирал вручную
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => {
      if (!readStoredTheme()) {
        setThemeState(event.matches ? THEMES.DARK : THEMES.LIGHT);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === THEMES.DARK }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
