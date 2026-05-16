import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="home-container">
      <header className="home-hero">
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
          {isAuthenticated ? (
            <>
              <span style={{ alignSelf: 'center', color: '#ccc' }}>Logged in as: {user?.username}</span>
              <button 
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  background: '#cc3333',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => navigate('/auth?mode=login')}
                className="btn-secondary"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/auth?mode=register')}
                className="btn-secondary"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
        <div className="hero-content">
          <h1>ATLAS <span className="accent">PC</span></h1>
          <p className="hero-subtitle">
            Precision engineering meets AI intelligence. Build your dream machine with absolute confidence.
          </p>
          <div className="hero-actions">
            {isAuthenticated && (
              <button className="btn-primary btn-builder" onClick={() => navigate('/builder')}>
                Enter 3D Builder
              </button>
            )}
            <button className="btn-primary btn-wizard" onClick={() => navigate('/wizard')}>
              AI Build Wizard
            </button>
            <button className="btn-secondary" onClick={() => navigate('/parts')}>
              View PC Parts
            </button>
          </div>
        </div>
      </header>

      <section className="features-grid">
        <div className="feature-card">
          <h3>AI Powered</h3>
          <p>Get hardware suggestions tailored to your specific workload and budget.</p>
        </div>
        <div className="feature-card">
          <h3>3D Visualization</h3>
          <p>See exactly how your parts fit together before you spend a single cent.</p>
        </div>
        <div className="feature-card">
          <h3>Guaranteed Compatibility</h3>
          <p>Our engine cross-references thousands of rules to ensure a perfect boot every time.</p>
        </div>
      </section>
    </div>
  );
}
