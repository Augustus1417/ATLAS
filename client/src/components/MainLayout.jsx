import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MainLayout.css';

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="main-layout">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <h2>ATLAS</h2>
          </div>

          <div className="navbar-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              Builder
            </Link>
            <Link to="/chat" className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}>
              Chat
            </Link>
          </div>

          <div className="navbar-user">
            <span className="username">{user?.username}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="main-content">{children}</div>
    </div>
  );
}
