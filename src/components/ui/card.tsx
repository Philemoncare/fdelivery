import { type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, hover = true, glass = false, padding = 'md' }: CardProps) {
  const paddings: Record<string, string> = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-300',
        glass
          ? 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-white/20 dark:border-slate-700/30'
          : 'bg-white dark:bg-slate-800/90 border-gray-100 dark:border-slate-700/50',
        hover && 'hover:shadow-md hover:-translate-y-0.5',
        'shadow-sm',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>;
}