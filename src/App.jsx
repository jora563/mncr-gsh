import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ThemeProvider from './providers/theme/ThemeProvider.jsx'
import ToastProvider from './providers/toast/ToastProvider.jsx'
import HomePage from './pages/HomePage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CallbackPage from './pages/CallbackPage.jsx'
import { keycloak } from './services/keycloak.js'

function ProtectedRoute({ children }) {
  if (!keycloak.isAuthenticated()) {
    return <Navigate to="/login" replace />
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
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}
