import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ThemeProvider from './providers/theme/ThemeProvider.jsx'
import ToastProvider from './providers/toast/ToastProvider.jsx'
import HomePage from './pages/HomePage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import OperatorPage from './pages/OperatorPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'
import { keycloak } from './services/keycloak.js'

function ProtectedRoute({ children }) {
  if (!keycloak.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function OperatorRoute({ children }) {
  if (!keycloak.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  if (!keycloak.isOperator()) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
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
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
