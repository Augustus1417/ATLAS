import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { getApiErrorMessage } from '../utils/api';
import { Button, Input, Card } from '../components/UI';

function AuthShell({ children, title, subtitle }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.18), transparent), linear-gradient(160deg, #020617 0%, #0f172a 45%, #020617 100%)',
      }}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute top-[15%] left-[20%] w-72 h-72 rounded-full opacity-30"
          style={{ background: 'rgba(124,58,237,0.12)', filter: 'blur(80px)' }}
        />
        <div
          className="absolute bottom-[10%] right-[15%] w-80 h-80 rounded-full opacity-25"
          style={{ background: 'rgba(37,99,235,0.14)', filter: 'blur(80px)' }}
        />
      </div>

      <Card className="w-full max-w-md relative z-10 !p-8">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            >
              <span className="text-lg" aria-hidden>
                ⚡
              </span>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.25em] text-violet-300/90 uppercase mb-1">
                ATLAS
              </p>
              <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
              <p className="text-sm text-white/55 mt-1.5 leading-relaxed">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
      </Card>
    </div>
  );
}

function AuthAlert({ message, variant = 'error' }) {
  if (!message) return null;
  const styles =
    variant === 'success'
      ? {
          background: 'rgba(34,197,94,0.10)',
          border: '1px solid rgba(34,197,94,0.35)',
          color: '#86efac',
        }
      : {
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.35)',
          color: '#fca5a5',
        };
  return (
    <div className="px-4 py-3 rounded-xl text-sm leading-relaxed" style={styles} role="alert">
      {message}
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const successMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!identifier.trim()) {
      setErrors({ identifier: 'Email or username is required' });
      return;
    }
    if (!password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({
        submit: getApiErrorMessage(err, 'Login failed. Please check your credentials.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account to continue building"
    >
      <AuthAlert message={successMessage} variant="success" />
      <AuthAlert message={errors.submit} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email or username"
          type="text"
          name="identifier"
          autoComplete="username"
          placeholder="you@example.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" loading={loading} className="w-full !mt-2" size="lg">
          Sign in
        </Button>
      </form>

      <div className="relative flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/40 shrink-0">New to ATLAS?</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => navigate('/register')}
      >
        Create account
      </Button>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (formData.username.trim().length < 3) {
      setErrors({ username: 'Username must be at least 3 characters' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Enter a valid email address' });
      return;
    }
    if (formData.password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      await register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password
      );
      await login(formData.email.trim(), formData.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({
        submit: getApiErrorMessage(err, 'Registration failed. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join ATLAS to build, chat with our bot, and save PC configurations"
    >
      <AuthAlert message={errors.submit} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Username"
          type="text"
          name="username"
          autoComplete="username"
          placeholder="your_username"
          value={formData.username}
          onChange={handleChange}
          error={errors.username}
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />
        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <Button type="submit" loading={loading} className="w-full !mt-2" size="lg">
          Create account
        </Button>
      </form>

      <p className="text-center text-xs text-white/40 leading-relaxed">
        By creating an account you agree to use ATLAS for personal PC planning.
      </p>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/40 shrink-0">Already registered?</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => navigate('/login')}
      >
        Sign in instead
      </Button>
    </AuthShell>
  );
}
