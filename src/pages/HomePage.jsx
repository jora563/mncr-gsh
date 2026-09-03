import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { keycloak } from '../services/keycloak.js'
import { useToast } from '../providers/toast/useToast.js'
import { ShieldCheckIcon, MessageSquareIcon } from '../components/icons.jsx'

export default function HomePage() {
  const navigate = useNavigate()
  const toast = useToast()

  const isAuthenticated = keycloak.isAuthenticated()

  /**
   * Показываем ошибку после возврата с logout при отказе в доступе
   */
  useEffect(() => {
    const message = sessionStorage.getItem('forbidden_message')
    if (message) {
      sessionStorage.removeItem('forbidden_message')
      toast.error(message)
    }
  }, [toast])

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
        </div>
      </div>
    </div>
  )
}
