import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './ToastContext.js';
import { TOAST_TTL_MS } from '../../constants.js';

// TOAST_ICONS содержит JSX, поэтому оставляем здесь — в constants.js должен быть чистый JS
const TOAST_ICONS = {
  success: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  ),
  error: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  info: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((current) => [...current, { id, type, message }]);
      window.setTimeout(() => dismiss(id), TOAST_TTL_MS);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <div className="toast-icon">{TOAST_ICONS[toast.type]}</div>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
