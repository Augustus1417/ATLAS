import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

export default function AuthPage({ mode = 'login', onSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loading: authLoading, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    email: '',
    password: '',
    username: '',
  });
  const [error, setError] = useState('');
  const nextPath = new URLSearchParams(location.search).get('next') || '/';

  useEffect(() => {
    setShowPassword(false);
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await login(formData.identifier, formData.password);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const result = await register(formData.username, formData.email, formData.password);
        if (!result.success) {
          throw new Error(result.error);
        }
        navigate('/auth?mode=login');
        return;
      }
      if (onSuccess) onSuccess();
      navigate(nextPath);
    } catch (err) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-topline" />

        <div className="auth-panel">
          <div className="auth-brand">
            <h1>ATLAS</h1>
            <p>NEURAL OPERATIONS CONTROL CENTER</p>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} type="button" onClick={() => navigate('/auth?mode=login')}>
              LOGIN
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} type="button" onClick={() => navigate('/auth?mode=register')}>
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' ? (
              <div className="input-field">
                <label htmlFor="username-field">Username</label>
                <input
                  id="username-field"
                  className="auth-input"
                  type="text"
                  placeholder="operator.alpha"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
            ) : (
              <div className="input-field">
                <div className="auth-label-row">
                  <label htmlFor="identifier-field">Username</label>
                </div>
                <input
                  id="identifier-field"
                  className="auth-input"
                  type="text"
                  placeholder="operator.alpha"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  required
                />
              </div>
            )}

            {mode === 'register' ? (
              <div className="input-field">
                <div className="auth-label-row">
                  <label htmlFor="email-field">Email</label>
                </div>
                <input
                  id="email-field"
                  className="auth-input"
                  type="email"
                  placeholder="operator@atlas.core"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            ) : null}

            <div className="input-field">
              <div className="auth-label-row">
                <label htmlFor="password-field">Password</label>
                <a href="/auth?mode=login" className="auth-link">FORGOT?</a>
              </div>
              <div className="auth-password-group">
                <input
                  id="password-field"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="3.25" />
                      <path d="M4 4l16 16" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="3.25" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error || authError ? <div className="auth-error">{error || authError}</div> : null}

            <button type="submit" className="btn-authorize" disabled={loading || authLoading}>
              {loading || authLoading ? (mode === 'login' ? 'LOGGING IN...' : 'CREATING...') : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <span>● SYSTEM NODE: AMS-04 ONLINE</span>
          <div className="auth-footer-links">
            <a href="/">DOCUMENTATION</a>
            <a href="/">SECURITY AUDIT</a>
          </div>
        </div>
      </div>
    </div>
  );
}
