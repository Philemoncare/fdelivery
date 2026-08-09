import { type ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: ReactNode;
  iconColor?: string;
  iconBg?: string;
  delay?: number;
}

export function StatsCard({ label, value, change, changeType = 'up', icon, iconColor = 'text-emerald-500', iconBg = 'bg-emerald-50 dark:bg-emerald-900/20', delay = 0 }: StatsCardProps) {
  return (
    <motionCard delay={delay}>
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</p>
            {change && (
              <p className={cn(
                'text-xs mt-1',
                changeType === 'up' && 'text-emerald-500',
                changeType === 'down' && 'text-red-500',
                changeType === 'neutral' && 'text-gray-400'
              )}>{change}</p>
            )}
          </div>
          <div className={cn('p-2.5 sm:p-3 rounded-xl flex-shrink-0', iconBg)}>{icon}</div>
        </div>
      </div>
    </motionCard>
  );
}

import { motion } from 'framer-motion';

function motionCard({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="h-full">
      {children}
    </motion.div>
  );
}