import { cn } from '@/src/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  max?: number;
}

export function Progress({ value, className, indicatorClassName, max = 100 }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full bg-emerald-500 rounded-full transition-all duration-300', indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}