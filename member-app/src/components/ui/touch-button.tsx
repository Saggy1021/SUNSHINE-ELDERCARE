import React from 'react';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'sos' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function TouchButton({
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  className = '',
  children,
  ...props
}: TouchButtonProps) {
  const baseStyles =
    'touch-target rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] select-none shadow-xs disabled:opacity-50 disabled:pointer-events-none';

  const sizeStyles = {
    md: 'py-3 px-5 text-base min-h-[48px]',
    lg: 'py-4 px-6 text-lg min-h-[56px]',
  };

  const variantStyles = {
    primary: 'bg-[#091329] text-white hover:bg-[#162850] active:bg-[#060D1D]',
    gold: 'bg-[#B08A4A] text-white hover:bg-[#9B773D] active:bg-[#856531] shadow-amber-900/10',
    sos: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-red-900/20 animate-pulse',
    secondary: 'bg-white text-[#091329] border-2 border-[#E8E6DF] hover:bg-slate-50',
    ghost: 'bg-transparent text-[#64748B] hover:bg-black/5 shadow-none',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

