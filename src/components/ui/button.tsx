import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'brand';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:focus-visible:ring-offset-slate-950';
    const variants: Record<string, string> = {
      primary: 'bg-primary hover:bg-primary-hover text-white shadow-sm hover:shadow-md',
      secondary: 'bg-surface-2 hover:bg-surface-3 text-ink-2 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-300',
      outline: 'border border-line-strong hover:bg-surface-2 dark:border-slate-700 dark:hover:bg-slate-800 text-ink-2 dark:text-gray-300',
      ghost: 'hover:bg-surface-2 dark:hover:bg-slate-800 text-ink-3 dark:text-gray-400',
      danger: 'bg-danger hover:bg-red-600 text-white shadow-sm focus-visible:ring-danger/40',
      brand: 'bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg bg-gradient-to-br from-primary-strong to-primary',
    };
    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? icon : null}
        {!loading && children}
      </button>
    );
  }
);

Button.displayName = 'Button';