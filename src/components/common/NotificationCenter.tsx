import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Package, Truck, MessageCircle, CreditCard, UserRound,
  AlertTriangle, CheckCheck, Trash2, X, RefreshCw, Inbox, Loader2, ChevronRight
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { InteractionService } from '@/src/services/api';
import type { NotificationCategory, NotificationItem } from '@/src/types';
import { cn } from '@/src/lib/utils';
import {
  NOTIFICATION_CATEGORIES, notifCategoryLabel, notifMeta, priorityMeta, notifTime, mergeNotifications
} from '@/src/lib/notifications';
import { Button } from '@/src/components/ui/button';

export type NotificationCenterRole = 'customer' | 'vendor' | 'rider' | 'admin' | 'super-admin';

const BASE_PATH: Record<NotificationCenterRole, string> = {
  customer: '/customer',
  vendor: '/restaurant',
  rider: '/rider',
  admin: '/admin',
  'super-admin': '/super-admin',
};

const PAGE_LIMIT = 20;

const CATEGORY_ICONS: Record<string, any> = {
  order: Package, delivery: Truck, message: MessageCircle, payment: CreditCard, account: UserRound, system: Bell,
};

type FilterKey = 'all' | 'unread' | NotificationCategory;

export function NotificationCenter({ role }: { role: NotificationCenterRole }) {
  const navigate = useNavigate();
  const {
    notifications: contextNotifs, conversations, markNotificationRead,
    markAllNotificationsRead, clearNotifications, deleteNotification, showToast, t
  } = useApp();

  const basePath = BASE_PATH[role];
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchPage = useCallback(async (fromOffset: number, append: boolean, activeFilter: FilterKey) => {
    try {
      if (append) setLoadingMore(true); else { setLoading(true); setError(null); }
      const res = await InteractionService.getNotificationFeed({
        category: activeFilter === 'all' || activeFilter === 'unread' ? undefined : activeFilter,
        unread: activeFilter === 'unread',
        limit: PAGE_LIMIT,
        offset: fromOffset
      });
      if (!mounted.current) return;
      setItems(prev => append ? mergeNotifications(prev, res.items) : res.items);
      setOffset(fromOffset + res.items.length);
      setHasMore(res.total > fromOffset + res.items.length);
    } catch (e: any) {
      if (mounted.current) {
        setError(e?.message || 'Could not load notifications.');
        if (append) showToast('Load Failed', 'Could not load more notifications.', 'warning');
      }
    } finally {
      if (mounted.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [showToast]);

  // Reset + fetch whenever the filter changes.
  useEffect(() => {
    setItems([]);
    setOffset(0);
    fetchPage(0, false, filter);
  }, [filter, fetchPage]);

  // Merge live context pushes (realtime notifications, read-state updates) into
  // the local feed without duplicates, honoring the active filter.
  useEffect(() => {
    setItems(prev => {
      const relevant = contextNotifs.filter(n =>
        filter === 'all' ? true :
        filter === 'unread' ? !n.read :
        n.category === filter);
      return mergeNotifications(prev, relevant);
    });
  }, [contextNotifs, filter]);

  const unreadCount = useMemo(() => Array.isArray(contextNotifs) ? contextNotifs.filter(n => !n.read).length : 0, [contextNotifs]);

  // Which categories actually have data — chips never render empty filters.
  const populatedCategories = useMemo(() => {
    const set = new Set<NotificationCategory>();
    (items.length ? items : contextNotifs).forEach(n => { if (n.category) set.add(n.category); });
    return NOTIFICATION_CATEGORIES.filter(c => set.has(c.key));
  }, [items, contextNotifs]);

  const openNotification = async (n: NotificationItem) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.category === 'messages' && n.relatedConversationId) {
      if (role === 'customer') {
        const conv = conversations.find(c => c.id === n.relatedConversationId);
        const tab = conv?.type === 'customer_rider' ? 'Rider' : 'Vendor';
        navigate(`${basePath}/messages`, { state: { conversationId: n.relatedConversationId, tab } });
      } else {
        navigate(`${basePath}/messages?convId=${n.relatedConversationId}`);
      }
      return;
    }
    if (n.action) { navigate(n.action); return; }
    navigate(`${basePath}`);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setItems(prev => prev.map(n => ({ ...n, read: true, readAt: n.readAt || new Date().toISOString() })));
  };

  const handleClear = async () => {
    await clearNotifications();
    setItems([]);
    setConfirmClear(false);
  };

  const handleDelete = async (n: NotificationItem) => {
    await deleteNotification(n.id);
    setItems(prev => prev.filter(x => x.id !== n.id));
  };

  const hasNotifications = items.length > 0 || loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('notif.title')}</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} ${t('notif.unreadCount')}`
              : t('notif.allCaughtUp')}
          </p>
        </div>
        {hasNotifications && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                onClick={handleMarkAllRead}>
                <CheckCheck className="w-4 h-4 me-1.5" /> {t('notif.markAllRead')}
              </Button>
            )}
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="text-[10px] font-black text-gray-400 hover:text-rose-500 uppercase tracking-widest"
                onClick={() => setConfirmClear(true)}>
                <Trash2 className="w-4 h-4 me-1.5" /> {t('notif.clearAll')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      {hasNotifications && (
        <div className="flex flex-wrap gap-2">
          {(['all', 'unread'] as FilterKey[]).map(key => (
            <FilterChip key={key} active={filter === key} onClick={() => setFilter(key)} label={key === 'all' ? t('notif.all') : t('notif.unread')} count={key === 'all' ? items.length : unreadCount} />
          ))}
          {populatedCategories.map(c => (
            <FilterChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)} label={c.label}
              count={items.filter(n => n.category === c.key).length} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6">
        {/* Feed */}
        <div className="space-y-3 max-w-3xl">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-slate-800" />
                      <div className="h-2.5 w-2/3 rounded bg-gray-100 dark:bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-14 text-center border-dashed border-2 rounded-[2rem] border-gray-200 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-900/40">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('common.error')}</h3>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
              <Button className="mt-5" onClick={() => fetchPage(0, false, filter)}>
                <RefreshCw className="w-4 h-4 mr-2" /> {t('common.retry')}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center border-dashed border-2 rounded-[2rem] border-gray-200 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-900/40">
              <Inbox className="w-14 h-14 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('notif.nothingHere')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {filter === 'unread' ? t('notif.noUnread') : filter === 'all' ? t('notif.nothingHereDesc') : `${t('common.noResults')} ${filter}.`}
              </p>
            </div>
          ) : (
            <>
              {items.map(n => (
                <NotificationRow key={n.id} n={n} onClick={() => openNotification(n)} onDelete={() => handleDelete(n)} role={role} />
              ))}
              {hasMore && (
                <div className="pt-2 flex justify-center">
                  <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => fetchPage(offset, true, filter)}>
                    {loadingMore ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <ChevronRight className="w-4 h-4 me-2 rotate-90" />}
                    {t('common.viewMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary (desktop) */}
        {!loading && !error && (items.length > 0 || unreadCount > 0) && (
          <aside className="hidden xl:block">
            <div className="sticky top-24 rounded-[2rem] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('notif.unreadByCategory')}</p>
              <div className="space-y-3">
                {NOTIFICATION_CATEGORIES.map(c => {
                  const count = contextNotifs.filter(n => !n.read && n.category === c.key).length;
                  if (count === 0) return null;
                  const meta = notifMeta({ category: c.key } as NotificationItem);
                  const Icon = CATEGORY_ICONS[meta.icon] || Bell;
                  return (
                    <button key={c.key} onClick={() => setFilter(c.key)}
                      className={cn('w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition text-start',
                        filter === c.key && 'bg-gray-50 dark:bg-slate-800')}>
                      <span className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', meta.color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-semibold">{c.label}</span>
                      </span>
                      <span className="text-xs font-black text-gray-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Clear confirmation */}
      {confirmClear && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmClear(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <button onClick={() => setConfirmClear(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mt-4">{t('notif.clearConfirmTitle')}</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              {t('notif.clearConfirmDesc')}
            </p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmClear(false)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleClear}>
                <Trash2 className="w-4 h-4 me-1.5" /> {t('common.clear')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void; key?: unknown }) {
  return (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition border',
        active
          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white'
          : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
      )}>
      {label}
      {count > 0 && (
        <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full',
          active ? 'bg-white/20 text-white dark:bg-black/15 dark:text-gray-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400')}>
          {count}
        </span>
      )}
    </button>
  );
}

function NotificationRow({ n, onClick, onDelete, role }: { n: NotificationItem; onClick: () => void; onDelete: () => void; role: NotificationCenterRole; key?: unknown }) {
  const meta = notifMeta(n);
  const prio = priorityMeta(n.priority);
  const Icon = CATEGORY_ICONS[meta.icon] || Bell;
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-5 rounded-[2rem] border transition-all cursor-pointer flex gap-4 items-start shadow-sm overflow-hidden',
        n.read
          ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'
          : 'bg-white dark:bg-slate-900 border-emerald-500/20 ring-1 ring-emerald-500/10'
      )}>
      {!n.read && <div className="absolute top-0 start-0 w-2 h-full bg-emerald-500" />}
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform', meta.color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className={cn('leading-tight text-sm', n.read ? 'font-semibold text-gray-700 dark:text-gray-300' : 'font-black text-gray-900 dark:text-white')}>
            {n.title}
          </h4>
          {prio.chip && (
            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider', prio.chip)}>{prio.label}</span>
          )}
          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider', meta.chip)}>
            {notifCategoryLabel(n.category)}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium line-clamp-2">{n.message}</p>
        <p className="text-[11px] font-bold text-gray-400">{notifTime(n)}</p>
      </div>
      {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />}
      <button
        aria-label="Delete notification"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 end-3 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 transition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
