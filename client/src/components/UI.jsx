import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  ...props
}) {
  const baseClasses =
    'rounded-xl font-semibold transition-all duration-200 ease-out inline-flex items-center justify-center gap-2 active:scale-95 cursor-pointer';

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[2.25rem]',
    md: 'px-6 py-2.5 text-sm min-h-[2.75rem]',
    lg: 'px-8 py-3 text-base min-h-[3rem]',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-violet-600 to-blue-600 text-white border border-transparent hover:from-violet-500 hover:to-blue-500 hover:shadow-lg hover:shadow-violet-500/20 hover:-translate-y-0.5',
    secondary: 'text-white border border-solid hover:bg-white/10',
    danger:
      'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500',
    ghost: 'text-white/80 hover:text-white hover:bg-white/5',
  };

  const variantInlineStyles = {
    primary: {},
    secondary: { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.22)', color: '#f1f5f9' },
    danger: {},
    ghost: {},
  };

  return (
    <button
      className={[baseClasses, sizeClasses[size], variantClasses[variant], 'disabled:opacity-40 disabled:cursor-not-allowed', className].filter(Boolean).join(' ')}
      style={variantInlineStyles[variant]}
      disabled={loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {Icon && !loading && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
}

export function Card({ children, className = '', withBorder = true, onClick }) {
  return (
    <div
      className={`rounded-2xl backdrop-blur-xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: withBorder ? '1px solid rgba(255,255,255,0.10)' : '1px solid transparent',
        padding: '1.25rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none ${className}`}
          style={{
            background: error ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.07)',
            border: error ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.12)',
            padding: '0.625rem 0.875rem',
            color: error ? '#fca5a5' : '#ffffff',
          }}
          onFocus={e => {
            e.target.style.background = 'rgba(255,255,255,0.10)';
            e.target.style.borderColor = error ? 'rgba(239,68,68,0.65)' : 'rgba(139,92,246,0.5)';
          }}
          onBlur={e => {
            e.target.style.background = error ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.07)';
            e.target.style.borderColor = error ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.12)';
          }}
          {...props}
        />
        {Icon && (
          <Icon
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          />
        )}
      </div>
      {error && <span className="text-xs font-medium text-red-400">{error}</span>}
    </div>
  );
}

export function Select({ label, options, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {label}
        </label>
      )}
      <select
        className={`w-full rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none appearance-none cursor-pointer text-white ${className}`}
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: error ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.12)',
          padding: '0.625rem 0.875rem',
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900 text-white">
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs font-medium text-red-400">{error}</span>}
    </div>
  );
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const variantStyles = {
    default: { background: 'rgba(139,92,246,0.18)', color: '#c4b5fd' },
    success: { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' },
    warning: { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
    danger: { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' },
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`rounded-full font-semibold inline-block ${sizeClasses[size]} ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

export function Eyebrow({ children }) {
  return (
    <div
      className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold inline-block mb-3"
      style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }}
    >
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-8">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          {description}
        </p>
      )}
    </div>
  );
}

export function BentoGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 auto-rows-max">
      {children}
    </div>
  );
}

export function BentoItem({ colSpan = 1, rowSpan = 1, children }) {
  return (
    <div className={`col-span-1 ${colSpan > 1 ? `md:col-span-${colSpan}` : ''} ${rowSpan > 1 ? `row-span-${rowSpan}` : ''}`}>
      {children}
    </div>
  );
}