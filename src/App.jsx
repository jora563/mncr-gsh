import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ThemeProvider from './providers/theme/ThemeProvider.jsx';
import ToastProvider from './providers/toast/ToastProvider.jsx';
import HomePage from './pages/HomePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import OperatorPage from './pages/OperatorPage.jsx';
import CallbackPage from './pages/CallbackPage.jsx';
import { keycloak } from './services/keycloak.js';
import { STORAGE_KEYS } from './constants.js';

/**
 * Отказ в доступе по роли: полный logout (сбрасывает SSO-сессию Keycloak).
 * После logout Keycloak редиректит на главную, где можно войти другим пользователем.
 */
function ForbiddenRedirect({ message }) {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    // Сохраняем сообщение для отображения после возврата
    sessionStorage.setItem(STORAGE_KEYS.FORBIDDEN_MESSAGE, message);
    // Полный logout: сбрасывает SSO-сессию Keycloak, редиректит на главную
    keycloak.logout();
  }, [message]);

  return null;
}

/**
 * Админ-панель: только роль admin
 */
function ProtectedRoute({ children }) {
  if (!keycloak.isAuthenticated()) {
    keycloak.login();
    return null;
  }
  if (!keycloak.hasRole('admin')) {
    return <ForbiddenRedirect message="Доступ запрещён: требуется роль администратора" />;
  }
  return children;
}

/**
 * Панель оператора: только роль operator
 */
function OperatorRoute({ children }) {
  if (!keycloak.isAuthenticated()) {
    keycloak.login();
    return null;
  }
  if (!keycloak.hasRole('operator')) {
    return <ForbiddenRedirect message="Доступ запрещён: требуется роль оператора" />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/callback" element={<CallbackPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operator"
              element={
                <OperatorRoute>
                  <OperatorPage />
                </OperatorRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
