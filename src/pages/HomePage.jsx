import { useNavigate } from 'react-router-dom'
import { keycloak } from '../services/keycloak.js'
import { ShieldCheckIcon, MessageSquareIcon } from '../components/icons.jsx'

export default function HomePage() {
  const navigate = useNavigate()

  const isAuthenticated = keycloak.isAuthenticated()

  const handleAdminClick = () => {
    if (isAuthenticated) {
      navigate('/admin')
    } else {
      keycloak.login('/admin')
    }
  }

  const handleOperatorClick = () => {
    if (isAuthenticated) {
      navigate('/operator')
    } else {
      keycloak.login('/operator')
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card home-card">
        <div className="logo-mark">A</div>
        <div>
          <h1>AIOMNI</h1>
          <p className="auth-subtitle">Платформа для управления чатами и ботами</p>
        </div>
        
        <div className="home-actions">
          <button onClick={handleAdminClick} className="btn btn-primary btn-block">
            <ShieldCheckIcon width={18} height={18} />
            <span>Админ-панель</span>
          </button>

          <button onClick={handleOperatorClick} className="btn btn-primary btn-block">
            <MessageSquareIcon width={18} height={18} />
            <span>Панель оператора</span>
          </button>

          {!isAuthenticated && (
            <p className="auth-hint">
              Войдите в систему, чтобы получить доступ к панелям
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
