import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="logo-mark">A</div>
        <div>
          <h1>AIOMNI</h1>
          <p className="auth-subtitle">Выберите раздел</p>
        </div>
        <Link to="/chat" className="btn btn-primary">Чаты</Link>
        <Link to="/admin" className="btn btn-primary">Админ-панель</Link>
      </div>
    </div>
  );
}
