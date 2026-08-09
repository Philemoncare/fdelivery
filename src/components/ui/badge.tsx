import { type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'default', size = 'sm', className, dot }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    brand: 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 dark:text-emerald-400',
    outline: 'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-transparent',
  };
  const sizes: Record<string, string> = { sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1 text-sm' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium rounded-full', variants[variant], sizes[size], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', variant === 'success' ? 'bg-emerald-500' : variant === 'warning' ? 'bg-amber-500' : variant === 'danger' ? 'bg-red-500' : 'bg-gray-400')} />}
      {children}
    </span>
  );
}