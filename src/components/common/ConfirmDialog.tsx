import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, KeyRound, RefreshCw, UserX, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/lib/utils';

export type ConfirmTone = 'primary' | 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: 'alert' | 'shield' | 'key' | 'refresh' | 'user' | 'logout' | null;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}

const TONE_ICONS: Record<Exclude<ConfirmDialogProps['icon'], null>, ReactNode> = {
  alert: <AlertTriangle className="w-5 h-5" />,
  shield: <ShieldAlert className="w-5 h-5" />,
  key: <KeyRound className="w-5 h-5" />,
  refresh: <RefreshCw className="w-5 h-5" />,
  user: <UserX className="w-5 h-5" />,
  logout: <LogOut className="w-5 h-5" />,
};

const TONE_STYLES: Record<ConfirmTone, { ring: string; iconBox: string; confirm: string }> = {
  primary: { ring: 'ring-primary/20', iconBox: 'bg-primary-soft text-primary', confirm: '' },
  danger: { ring: 'ring-danger/20', iconBox: 'bg-danger-soft text-danger', confirm: '' },
  warning: { ring: 'ring-warn/20', iconBox: 'bg-warn-soft text-warn', confirm: '' },
  info: { ring: 'ring-info/20', iconBox: 'bg-info-soft text-info', confirm: '' },
};

export function ConfirmDialog({
  open, title, description, confirmLabel, cancelLabel = 'Cancel', tone = 'danger',
  icon = 'alert', busy, busyLabel, onConfirm, onCancel, children,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the primary action when opened; restore nothing on close (dialog is unmounted).
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape closes; focus stays trapped inside the dialog while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  const styles = TONE_STYLES[tone];
  const confirmVariant = tone === 'danger' ? 'danger' : 'primary';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className={cn('relative w-full max-w-md rounded-2xl bg-surface dark:bg-slate-900 border border-line shadow-2xl ring-1 p-6', styles.ring)}
          >
            <div className="flex items-start gap-4">
              {icon && (
                <div className={cn('w-11 h-11 shrink-0 rounded-xl flex items-center justify-center', styles.iconBox)}>
                  {TONE_ICONS[icon]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 id="confirm-dialog-title" className="text-lg font-bold text-ink dark:text-white leading-tight">{title}</h3>
                <div className="mt-1.5 text-sm text-ink-2 dark:text-slate-400 leading-relaxed">{description}</div>
              </div>
            </div>

            {children && <div className="mt-4">{children}</div>}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button variant="outline" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
              <Button
                ref={confirmRef as any}
                variant={confirmVariant}
                onClick={onConfirm}
                disabled={busy}
                className="min-w-[9rem]"
              >
                {busy && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>}
                {busy && busyLabel ? busyLabel : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
