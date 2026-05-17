import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, getApiErrorMessage } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
      }
    }
    setLoading(false);
  }, []);

  const register = async (username, email, password) => {
    try {
      setError(null);
      const { data } = await authAPI.register({ username, email, password });
      return data;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Registration failed');
      setError(message);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await authAPI.login({ identifier: email, password });
      const { token, user: userData } = data.data;

      localStorage.setItem('access_token', token.access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return data;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Login failed');
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
