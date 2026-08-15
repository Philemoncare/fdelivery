import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[10px] font-black uppercase tracking-widest text-ink-3 dark:text-slate-400 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 dark:text-slate-500 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-4 py-3 bg-surface dark:bg-slate-900/50 border rounded-2xl text-sm text-ink dark:text-slate-100 placeholder:text-ink-3 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200',
              icon && 'pl-12',
              error
                ? 'border-danger/60 dark:border-red-800 focus:ring-danger/30'
                : 'border-line dark:border-slate-800',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-ink-3 dark:text-slate-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';