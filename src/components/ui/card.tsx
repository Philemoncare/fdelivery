import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  key?: string | number;
  onClick?: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, hover = true, glass = false, padding = 'md', ...props }: CardProps) {
  const paddings: Record<string, string> = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };
  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl border border-line shadow-sm transition-all duration-300',
        glass
          ? 'bg-surface/70 dark:bg-slate-800/70 backdrop-blur-xl'
          : 'bg-surface dark:bg-slate-800/90',
        hover && 'hover:shadow-md hover:-translate-y-0.5',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div {...props} className={cn('flex items-center justify-between mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return <h3 {...props} className={cn('text-lg font-semibold text-ink', className)}>{children}</h3>;
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div {...props} className={cn('', className)}>{children}</div>;
}
