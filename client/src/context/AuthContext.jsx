import React, { createContext, useContext, useEffect, useState } from 'react';
import { atlasApi } from '../services/atlasApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = window.localStorage.getItem('atlas_token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token is still valid by fetching current user
      atlasApi.getMe(storedToken)
        .then(user => {
          setUser(user);
          setError(null);
        })
        .catch(err => {
          console.error('Failed to verify token:', err);
          window.localStorage.removeItem('atlas_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier, password) => {
    setError(null);
    try {
      const data = await atlasApi.loginUser({ identifier, password });
      const newToken = data?.access_token || '';
      if (!newToken) throw new Error('No access token returned from server');
      
      setToken(newToken);
      setUser(data.user);
      window.localStorage.setItem('atlas_token', newToken);
      return { success: true };
    } catch (err) {
      const message = err.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    setError(null);
    try {
      await atlasApi.registerUser({ username, email, password });
      return { success: true };
    } catch (err) {
      const message = err.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    window.localStorage.removeItem('atlas_token');
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
