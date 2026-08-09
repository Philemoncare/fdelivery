import { type ElementType, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';

export interface SectionFeature {
  label: string;
  value: string;
  desc?: string;
  icon: ElementType;
  color: string;
  bg: string;
}

interface SectionPageProps {
  title: string;
  eyebrow?: string;
  description: string;
  accent: string;
  icon: ElementType;
  features?: SectionFeature[];
  children?: ReactNode;
}

export function SectionPage({ title, eyebrow, description, accent, icon: Icon, features, children }: SectionPageProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
        <div className="relative z-10 flex items-start gap-4">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br', accent)}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            {eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">{eyebrow}</p>}
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">{description}</p>
          </div>
        </div>
      </motion.div>

      {features && features.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{f.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{f.value}</p>
                      {f.desc && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{f.desc}</p>}
                    </div>
                    <div className={cn('p-3 rounded-xl', f.bg)}>
                      <f.icon className={cn('w-5 h-5', f.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {children}

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <Badge variant="brand">Module Active</Badge>
        <span className="text-[11px] text-gray-400 dark:text-slate-500">This section is live in your {title.toLowerCase()} workspace.</span>
      </div>
    </div>
  );
}
