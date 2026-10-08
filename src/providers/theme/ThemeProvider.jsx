import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ThemeContext } from './ThemeContext.js';
import { STORAGE_KEYS, THEMES } from '../../constants.js';

function getSystemTheme() {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return THEMES.LIGHT;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
  } catch {
    return THEMES.LIGHT;
  }
}

function subscribeSystemTheme(callback) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === THEMES.LIGHT || stored === THEMES.DARK || stored === THEMES.SYSTEM) return stored;
  } catch {
    // localStorage недоступен — игнорируем
  }
  return null;
}

function readInitialTheme() {
  if (typeof window === 'undefined') return THEMES.SYSTEM;
  return readStoredTheme() ?? THEMES.SYSTEM;
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
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    () => THEMES.LIGHT,
  );

  const setTheme = useCallback((next) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const effective = current === THEMES.SYSTEM ? getSystemTheme() : current;
      const next = effective === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      persistTheme(next);
      return next;
    });
  }, []);

  const resolvedTheme = theme === THEMES.SYSTEM ? systemTheme : theme;

  // Синхронизируем атрибут data-theme на <html>, чтобы работали CSS-селекторы
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: resolvedTheme === THEMES.DARK }),
    [theme, setTheme, toggleTheme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
