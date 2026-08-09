import { type ReactNode } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center mb-4">
        {icon || <Package className="w-8 h-8 text-gray-300 dark:text-slate-600" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <Button className="mt-4" size="sm" onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}