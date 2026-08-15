import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Package, Truck, MessageSquare, CreditCard, UserRound, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/src/context/AppContext';
import type { NotificationItem } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { notifMeta, notifTime } from '@/src/lib/notifications';

const CAT_ICONS: Record<string, any> = {
  order: Package, delivery: Truck, message: MessageSquare, payment: CreditCard, account: UserRound, system: Bell,
};

/**
 * Coherent header notification action: a bell button with a live unread badge
 * that opens a real panel fed by the app's notification store. Items are marked
 * read through the existing API-backed markNotificationRead flow; an empty state
 * is shown when there is nothing to display.
 */
export function HeaderNotificationMenu({ basePath }: { basePath: string }) {
  const navigate = useNavigate();
  const {
    notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead, showToast,
  } = useApp();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.read) markNotificationRead(n.id);
    if (n.action) { navigate(n.action); return; }
    if (n.category === 'messages') { navigate(`${basePath}/messages`); return; }
    if (n.relatedOrderId) { navigate(`${basePath}/orders/${n.relatedOrderId}`); return; }
    navigate(basePath);
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
    } catch (e) {
      showToast('Error', 'Could not mark all notifications as read.', 'warning');
    }
  };

  const items = Array.isArray(notifications) ? notifications.slice(0, 8) : [];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifications"
        className="btn-ghost p-2 relative rounded-xl focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition"
      >
        <Bell className="w-5 h-5" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-white text-[9px] font-black min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center animate-pulse-subtle bg-primary">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <div ref={panelRef}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-2xl bg-surface dark:bg-slate-900 shadow-2xl border border-line overflow-hidden origin-top-right"
            >
              <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-black text-ink dark:text-white leading-none">Notifications</p>
                    <p className="text-[10px] text-ink-3 mt-0.5">
                      {unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All caught up'}
                    </p>
                  </div>
                </div>
                {unreadNotifications > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <span className="mx-auto w-10 h-10 rounded-full bg-surface-2 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Inbox className="w-5 h-5 text-ink-3" />
                    </span>
                    <p className="text-sm font-semibold text-ink-2 dark:text-gray-300">No notifications</p>
                    <p className="text-xs text-ink-3 mt-1">You're all caught up.</p>
                  </div>
                ) : (
                  items.map(n => {
                    const meta = notifMeta(n);
                    const Icon = CAT_ICONS[meta.icon] || Bell;
                    return (
                      <button
                        key={n.id}
                        onClick={() => openItem(n)}
                        className={cn(
                          'w-full text-start px-4 py-3 border-b border-line/60 hover:bg-surface-2 dark:hover:bg-slate-800/60 transition flex gap-3 items-start',
                          !n.read && 'bg-primary-soft/30'
                        )}
                      >
                        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', meta.color)}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={cn('block text-xs line-clamp-1', n.read ? 'font-semibold text-ink-2 dark:text-gray-300' : 'font-bold text-ink dark:text-white')}>{n.title}</span>
                          <span className="block text-[10px] text-ink-3 mt-0.5 line-clamp-2">{n.message}</span>
                          <span className="block text-[10px] font-bold text-ink-3 mt-1">{notifTime(n)}</span>
                        </span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => { setOpen(false); navigate(`${basePath}/notifications`); }}
                className="w-full py-2.5 border-t border-line text-xs font-bold text-ink-2 dark:text-gray-300 hover:bg-surface-2 dark:hover:bg-slate-800 transition"
              >
                View all notifications
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
