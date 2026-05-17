import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { Button } from './UI';

export function Navigation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Builder', href: '/builder' },
    { label: 'Components', href: '/components' },
    { label: 'My Builds', href: '/builds' },
    { label: 'Recommendations', href: '/recommendations' },
    { label: 'Build Chat', href: '/chat' },
  ];

  const isActive = (href) =>
    location.pathname === href ||
    (href !== '/dashboard' && location.pathname.startsWith(href));

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16 lg:h-[4.25rem]">
            {/* Logo */}
            <button
              type="button"
              onClick={() => navigate(user ? '/dashboard' : '/')}
              className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/20"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              >
                A
              </span>
              <span className="text-lg font-bold tracking-wide text-white hidden sm:block">
                ATLAS
              </span>
            </button>

            {/* Desktop nav — centered */}
            <nav
              className="hidden lg:flex flex-1 items-center justify-center"
              aria-label="Main navigation"
            >
              <ul className="flex items-center gap-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <button
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={[
                        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                        isActive(item.href)
                          ? 'bg-white/12 text-white'
                          : 'text-white/65 hover:text-white hover:bg-white/8',
                      ].join(' ')}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* User + actions */}
            <div className="flex items-center gap-3 shrink-0">
              {user ? (
                <>
                  <div className="hidden md:block text-right max-w-[140px] lg:max-w-[180px]">
                    <p className="text-sm font-medium text-white truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-white/50 truncate">{user.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleLogout}
                    className="hidden sm:inline-flex"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate('/register')}
                  >
                    Register
                  </Button>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                type="button"
                className="lg:hidden p-2.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen((open) => !open)}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isOpen}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / tablet drawer */}
        {isOpen && (
          <div className="lg:hidden border-t border-white/10 bg-slate-950/95 px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  navigate(item.href);
                  setIsOpen(false);
                }}
                className={[
                  'w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-white/12 text-white'
                    : 'text-white/70 hover:bg-white/8 hover:text-white',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-300 hover:bg-red-500/10"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </header>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
