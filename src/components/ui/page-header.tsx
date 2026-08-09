import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-wrap items-start justify-between gap-4 mb-6', className)}
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  );
}