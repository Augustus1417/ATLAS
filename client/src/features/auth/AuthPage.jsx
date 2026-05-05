import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { atlasApi } from '../../services/atlasApi';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login with email
        const response = await atlasApi.loginUser({
          email: formData.email,
          password: formData.password,
        });
        login(response.token.access_token, {
          username: response.user.username,
          user_id: response.user.user_id,
        });
        navigate('/');
      } else {
        // Register
        await atlasApi.registerUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        // Auto-login after registration
        const response = await atlasApi.loginUser({
          email: formData.email,
          password: formData.password,
        });
        login(response.token.access_token, {
          username: response.user.username,
          user_id: response.user.user_id,
        });
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>ATLAS</h1>
          <p>PC Building Assistant</p>
        </div>

        <div className="auth-form-wrapper">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
            >
              Login
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required={!isLogin}
                placeholder={isLogin ? "Not needed for login" : "Enter your username"}
                disabled={isLogin}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">{isLogin ? "Email (for login)" : "Email"}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
