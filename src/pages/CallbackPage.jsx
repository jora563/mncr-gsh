import { useEffect, useState } from 'react'
import { keycloak } from '../services/keycloak.js'

let exchangeStarted = false

export default function CallbackPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    if (exchangeStarted) return
    exchangeStarted = true

    keycloak
      .handleCallback()
      .then((redirectTo) => {
        // Полная перезагрузка страницы: все хуки инициализируются заново
        // с валидным токеном, API-запросы и WS-соединение заработают
        window.location.href = redirectTo || '/admin'
      })
      .catch((err) => {
        console.error('OAuth callback failed:', err)
        setError(err?.message ?? String(err))
      })
  }, [])

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {error ? (
          <>
            <h1>Не удалось войти</h1>
            <p className="auth-subtitle">{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => keycloak.login()}>
              Войти снова
            </button>
          </>
        ) : (
          <>
            <div className="logo-mark">A</div>
            <p className="auth-subtitle">Завершение входа...</p>
          </>
        )}
      </div>
    </div>
  )
}
