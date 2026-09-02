import { keycloak } from '../services/keycloak.js'

export default function LoginPage() {
  const handleLogin = () => {
    keycloak.login('/admin')
  }
  
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="logo-mark">A</div>
        <div>
          <h1>AIOMNI Admin</h1>
          <p className="auth-subtitle">Войдите для доступа к системе</p>
        </div>
        <button onClick={handleLogin} className="btn btn-primary">
          Войти через Keycloak
        </button>
      </div>
    </div>
  )
}
