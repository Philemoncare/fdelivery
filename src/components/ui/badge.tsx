import { type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
  icon?: ReactNode;
}

export function Badge({ children, variant = 'default', size = 'sm', className, dot, icon }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-surface-3 text-ink-2 dark:bg-slate-800 dark:text-slate-300',
    success: 'bg-ok-soft text-ok dark:bg-ok-soft',
    warning: 'bg-warn-soft text-warn dark:bg-warn-soft',
    danger: 'bg-danger-soft text-danger dark:bg-danger-soft',
    info: 'bg-info-soft text-info dark:bg-info-soft',
    brand: 'bg-primary-soft text-primary dark:bg-primary-soft',
    outline: 'border border-line-strong text-ink-2 dark:border-slate-600 dark:text-slate-300 bg-transparent',
  };
  const sizes: Record<string, string> = { sm: 'px-2 py-0.5 text-[11px]', md: 'px-3 py-1 text-sm' };
  const dotColor: Record<string, string> = {
    success: 'bg-ok',
    warning: 'bg-warn',
    danger: 'bg-danger',
    info: 'bg-info',
    brand: 'bg-primary',
    default: 'bg-ink-3',
    outline: 'bg-ink-3',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold rounded-full', variants[variant], sizes[size], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColor[variant])} />}
      {icon}
      {children}
    </span>
  );
}
