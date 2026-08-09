import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  const variants: Record<string, string> = {
    text: 'h-4 w-full rounded-md',
    circular: 'h-10 w-10 rounded-full',
    rectangular: 'h-32 w-full rounded-xl',
    card: 'h-48 w-full rounded-2xl',
  };
  return (
    <motion.div
      className={cn('bg-gray-200 dark:bg-slate-700 shimmer', variants[variant], className)}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-4 space-y-3">
      <Skeleton variant="rectangular" className="h-40" />
      <Skeleton className="w-3/4" />
      <Skeleton className="w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="w-16 h-8 rounded-lg" />
        <Skeleton className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-4">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="flex-1" />
        <Skeleton className="w-24" />
        <Skeleton className="w-20" />
        <Skeleton className="w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="flex-1" />
          <Skeleton className="w-24" />
          <Skeleton className="w-20" />
          <Skeleton className="w-16" />
        </div>
      ))}
    </div>
  );
}