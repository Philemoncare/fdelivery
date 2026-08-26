import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LucideIcon, RefreshCw, AlertTriangle, CheckCircle2, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';

// ---------------------------------------------------------------------------
// OmniMarket Super Admin — shared design system
//
// Single source of truth for every admin page: status badges, page headers,
// cards, tables, stat cards, loading/error/empty states, modals, drawers and
// pagination. Pages must NOT invent their own visual styles — use these.
// ---------------------------------------------------------------------------

export type AdminStatus = 'active' | 'pending' | 'approved' | 'disabled' | 'suspended' | 'failed' | 'processing' | 'operational' | 'degraded' | 'down' | 'success' | 'warning' | 'info' | 'error' | 'unknown';

const STATUS_META: Record<AdminStatus, { tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  approved: { tone: 'success', label: 'Approved' },
  operational: { tone: 'success', label: 'Operational' },
  success: { tone: 'success', label: 'Success' },
  pending: { tone: 'warning', label: 'Pending' },
  processing: { tone: 'info', label: 'Processing' },
  warning: { tone: 'warning', label: 'Warning' },
  degraded: { tone: 'warning', label: 'Degraded' },
  disabled: { tone: 'neutral', label: 'Disabled' },
  suspended: { tone: 'danger', label: 'Suspended' },
  failed: { tone: 'danger', label: 'Failed' },
  down: { tone: 'danger', label: 'Down' },
  error: { tone: 'danger', label: 'Error' },
  info: { tone: 'info', label: 'Info' },
  unknown: { tone: 'neutral', label: 'Unknown' },
};

const TONE_STYLES: Record<string, string> = {
  success: 'bg-ok-soft text-ok border-transparent',
  warning: 'bg-warn-soft text-warn border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  info: 'bg-info-soft text-info border-transparent',
  neutral: 'bg-surface-2 text-ink-2 border border-line-strong',
};

const TONE_DOTS: Record<string, string> = {
  success: 'bg-ok',
  warning: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-ink-3',
};

/** Status badge — one badge style for the entire admin console. */
export function AdminBadge({
  status,
  label,
  dot = true,
  className,
}: {
  status: AdminStatus;
  label?: string;
  dot?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status] || STATUS_META.unknown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4',
        TONE_STYLES[meta.tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOTS[meta.tone])} />}
      {label ?? meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

export const AdminPageHeader = ({
  icon: Icon,
  title,
  description,
  stats,
  actions,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  stats?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
    <div className="flex items-start gap-3.5 min-w-0">
      {Icon && (
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {stats && <span className="shrink-0">{stats}</span>}
        </div>
        {description && <p className="max-w-2xl text-sm text-ink-3">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export const AdminCard = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className,
  noPadding = false,
  ...rest
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  key?: React.Key;
}) => (
  <div {...rest} className={cn('rounded-2xl border border-line bg-surface shadow-sm', className)}>
    {(title || Icon || actions) && (
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-ink-3" />}
          <div className="min-w-0">
            {title && <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>}
            {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={cn(noPadding ? '' : 'p-5')}>{children}</div>
  </div>
);

/** Metric tile used across every admin page. */
export const AdminStatCard = ({
  label,
  value,
  trend,
  icon: Icon,
  status = 'info',
  hint,
  ...rest
}: {
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  icon: LucideIcon;
  status?: AdminStatus;
  hint?: string;
  key?: React.Key;
}) => {
  const meta = STATUS_META[status] || STATUS_META.info;
  return (
    <div {...rest} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {hint ? (
            <AnimatedTooltip variant="gram" content={hint} triggerClassName="px-1 py-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</p>
            </AnimatedTooltip>
          ) : (
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</p>
          )}
          <p className="truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
          {trend && (
            <p className={cn('text-[11px] font-semibold', trend.positive ? 'text-ok' : 'text-danger')}>
              {trend.positive ? '↑' : '↓'} {trend.value} vs last period
            </p>
          )}
        </div>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONE_STYLES[meta.tone])}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const AdminTable = ({
  headers,
  children,
  className,
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('overflow-x-auto', className)}>
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-line bg-surface-2/60">
          {headers.map((header, i) => (
            <th key={i} className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  </div>
);

/** Shared pagination footer — one pattern across tables. */
export const AdminPagination = ({
  page,
  totalPages,
  showingFrom,
  showingTo,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <div className="flex flex-col gap-3 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs font-medium text-ink-3">
      Showing <span className="font-semibold text-ink">{showingFrom}–{showingTo}</span> of{' '}
      <span className="font-semibold text-ink">{total}</span>
    </p>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-semibold" disabled={page <= 1} onClick={onPrev}>
        <ChevronLeft className="h-3.5 w-3.5" /> Prev
      </Button>
      <span className="px-1 text-xs font-medium text-ink-3">Page {page} of {totalPages}</span>
      <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-semibold" disabled={page >= totalPages} onClick={onNext}>
        Next <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

export const AdminSectionHeading = ({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-wrap items-end justify-between gap-2', className)}>
    <div className="space-y-0.5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description && <p className="text-xs text-ink-3">{description}</p>}
    </div>
    {actions}
  </div>
);

// ---------------------------------------------------------------------------
// States — loading / empty / error (must be used on every data page)
// ---------------------------------------------------------------------------

export const AdminLoading = ({ message = 'Loading operations data…' }: { message?: string }) => (
  <div className="space-y-4" role="status" aria-live="polite">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-surface-2/70" />
      ))}
    </div>
    <div className="space-y-3">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-surface-2/70" />
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2/50" />
      ))}
    </div>
    <p className="sr-only">{message}</p>
  </div>
);

export const AdminError = ({
  message = 'Unable to load platform data',
  detail,
  retry,
}: {
  message?: string;
  detail?: string;
  retry?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <h3 className="text-base font-semibold text-ink">{message}</h3>
    <p className="mt-1 max-w-sm text-sm text-ink-3">{detail ?? 'The server did not return the requested data.'}</p>
    {retry && (
      <Button onClick={retry} variant="outline" className="mt-5 gap-2 text-sm font-semibold">
        <RefreshCw className="h-4 w-4" /> Try Again
      </Button>
    )}
  </div>
);

export const AdminEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-3">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Modal + Drawer — one structure for every overlay
// ---------------------------------------------------------------------------

export const AdminModal = ({
  open,
  onClose,
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
  danger = false,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  danger?: boolean;
  maxWidth?: string;
}) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn('relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl', maxWidth)}
          >
            <div className={cn('absolute inset-x-0 top-0 h-1', danger ? 'bg-danger' : 'bg-primary')} />
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', danger ? 'bg-danger-soft text-danger' : 'bg-primary/10 text-primary')}>
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-ink">{title}</h2>
                  {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 rounded-lg p-0" onClick={onClose} aria-label="Close dialog">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && <div className="flex gap-3 border-t border-line bg-surface-2/50 px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export const AdminDrawer = ({
  open,
  onClose,
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.22 }}
          className="fixed right-0 top-0 z-[110] flex h-full w-full max-w-md flex-col overflow-hidden border-l border-line bg-surface shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex items-center gap-3">
              {Icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4.5 w-4.5" /></div>}
              <div>
                <h2 className="text-sm font-bold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 rounded-lg p-0" onClick={onClose} aria-label="Close panel">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="border-t border-line bg-surface-2/50 px-5 py-4">{footer}</div>}
        </motion.aside>
      </>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// Refresh control — standard "Last updated" + refresh affordance
// ---------------------------------------------------------------------------

export const AdminRefresh = ({
  updatedAt,
  onRefresh,
  loading = false,
  label = 'Refresh',
  className,
}: {
  updatedAt?: number;
  onRefresh: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}) => {
  const seconds = updatedAt ? Math.max(0, Math.floor((Date.now() - updatedAt) / 1000)) : null;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {updatedAt != null && (
        <span className="hidden text-xs font-medium text-ink-3 lg:block">
          {seconds === null || seconds < 5 ? 'Just now' : `Last updated ${seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`} ago`}
        </span>
      )}
      <Button size="sm" variant="outline" className="h-9 gap-2 px-3.5 text-xs font-semibold" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        {loading ? 'Refreshing…' : label}
      </Button>
    </div>
  );
};

export { CheckCircle2 };
