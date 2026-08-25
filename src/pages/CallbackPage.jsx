import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keycloak } from '../services/keycloak.js';

// В dev React StrictMode монтирует компоненты дважды — без защиты
// обмен code выполнялся бы два раза, и второй заход падал по state.
let exchangeStarted = false;

export default function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (exchangeStarted) return;
    exchangeStarted = true;

    keycloak
      .handleCallback()
      .then(() => navigate('/admin', { replace: true }))
      .catch((err) => {
        console.error('OAuth callback failed:', err);
        setError(err?.message ?? String(err));
      });
  }, [navigate]);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {error ? (
          <>
            <h1>Ошибка входа</h1>
            <p className="auth-subtitle">{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
              К странице входа
            </button>
          </>
        ) : (
          <>
            <div className="logo-mark">A</div>
            <p className="auth-subtitle">Обработка входа…</p>
          </>
        )}
      </div>
    </div>
  );
}
