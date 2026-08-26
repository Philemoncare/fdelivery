import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Heart, MessageSquare, Globe, ChevronDown,
  CheckCheck, Package, Truck, CreditCard, UserRound, Coins
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import type { CurrencyCode, LanguageCode, NotificationItem } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { notifMeta, notifTime } from '@/src/lib/notifications';
import { SUPPORTED_LANGUAGES } from '@/src/lib/i18n';

const CAT_ICONS: Record<string, any> = { order: Package, delivery: Truck, message: MessageSquare, payment: CreditCard, account: UserRound, system: Bell };

const CURRENCY_OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: 'GHS', label: 'GHS · Ghana Cedi' },
  { code: 'USD', label: 'USD · US Dollar' },
  { code: 'EUR', label: 'EUR · Euro' },
  { code: 'GBP', label: 'GBP · Pound' },
  { code: 'NGN', label: 'NGN · Naira' },
];

/**
 * Secondary global actions (language, wishlist, messages, notifications).
 * Intentionally quiet: plain icon buttons with subtle hover, smaller badges —
 * the search bar, cart and account stay the visual priority in the header.
 */
export function GlobalNavActions({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    language, setLanguage,
    currency, setCurrency,
    notifications, wishlist, conversations, markNotificationRead, markAllNotificationsRead, showToast, t,
  } = useApp();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = Array.isArray(notifications) ? notifications.filter(n => n && !n.read).length : 0;
  const unreadMessages = Array.isArray(conversations) ? conversations.reduce((sum, c) => sum + (c?.unreadCount || 0), 0) : 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) setPrefsOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goMessages = () => navigate(user ? '/customer/messages' : '/login');
  const goWishlist = () => navigate(user ? '/customer/wishlist' : '/login');
  const goNotifications = () => navigate(user ? '/customer/notifications' : '/login');

  const openNotification = async (n: NotificationItem) => {
    setNotifOpen(false);
    if (!n.read) markNotificationRead(n.id);
    if (n.category === 'messages' && n.relatedConversationId) {
      navigate('/customer/messages', { state: { conversationId: n.relatedConversationId, tab: n.relatedUserId ? 'Rider' : 'Vendor' } });
      return;
    }
    if (n.action) { navigate(n.action); return; }
    navigate('/customer');
  };

  const quietBtn = 'relative flex items-center justify-center w-9 h-9 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors';
  const badge = 'absolute -top-0.5 -end-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full text-white text-[8px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900';

  return (
    <div className={cn('flex items-center gap-0.5 sm:gap-1', className)}>
      {/* Language (secondary, quiet text toggle) */}
      <div ref={prefsRef} className="relative block">
        <button
          onClick={() => setPrefsOpen(v => !v)}
          aria-label="Language"
          className="flex items-center gap-1 px-2 h-9 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {language}
          <ChevronDown className={cn('w-3 h-3 transition-transform', prefsOpen && 'rotate-180')} />
        </button>
        {prefsOpen && (
          <div className="absolute end-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in duration-200">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('nav.language')}</p>
            <div className="grid grid-cols-1 gap-0.5">
              {SUPPORTED_LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code as LanguageCode); showToast(t('nav.language'), l.label); }}
                  className={cn(
                    'w-full text-start px-3 py-2 rounded-lg text-xs font-bold transition-all',
                    language === l.code ? 'bg-emerald-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50 dark:border-slate-800">
              <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('nav.currency')}</p>
            </div>
            <div className="grid grid-cols-1 gap-0.5 mt-1">
              {CURRENCY_OPTIONS.map(c => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); showToast(t('common.currencyUpdated'), `${c.code} · ${t('common.pricesShownIn')}`); }}
                  className={cn(
                    'w-full text-start px-3 py-2 rounded-lg text-xs font-bold transition-all',
                    currency === c.code ? 'bg-emerald-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {user && (
      <>
      {/* Wishlist */}
      <button onClick={goWishlist} aria-label="Wishlist" title="Wishlist" className={cn(quietBtn, 'hidden sm:flex')}>
        <Heart className="w-[18px] h-[18px]" />
        {wishlist.length > 0 && (
          <span className={cn(badge, 'bg-rose-500')}>{wishlist.length}</span>
        )}
      </button>

      {/* Messages */}
      <button onClick={goMessages} aria-label="Messages" title="Messages" className={cn(quietBtn, 'hidden xl:flex')}>
        <MessageSquare className="w-[18px] h-[18px]" />
        {unreadMessages > 0 && (
          <span className={cn(badge, 'bg-indigo-500')}>{unreadMessages > 9 ? '9+' : unreadMessages}</span>
        )}
      </button>

      {/* Notifications */}
      <div ref={notifRef} className="relative hidden sm:block">
        <button onClick={() => setNotifOpen(v => !v)} aria-label="Notifications" title="Notifications" className={quietBtn}>
          <Bell className="w-[18px] h-[18px]" />
          {unreadNotifs > 0 && (
            <span className={cn(badge, 'bg-amber-500 animate-pulse-subtle')}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute end-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-scale-in">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('notif.title')}</p>
              <div className="flex items-center gap-2">
                {unreadNotifs > 0 && (
                  <button onClick={markAllNotificationsRead} className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> {t('notif.markAllRead')}
                  </button>
                )}
                <button onClick={goNotifications} className="text-[10px] font-bold text-gray-500 hover:text-emerald-600">{t('common.viewAll')}</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">{t('common.noResults')}</p>
              ) : (
                notifications.slice(0, 6).map(n => {
                  if (!n) return null;
                  const meta = notifMeta(n);
                  const Icon = CAT_ICONS[meta.icon] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={cn(
                        'w-full text-start px-4 py-3 border-b border-gray-50 dark:border-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition flex gap-3 items-start',
                        !n.read && 'bg-emerald-50/50 dark:bg-emerald-950/20'
                      )}
                    >
                      <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', meta.color)}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={cn('block text-xs line-clamp-1', n.read ? 'font-semibold text-gray-600 dark:text-gray-300' : 'font-bold text-gray-900 dark:text-white')}>{n.title}</span>
                        <span className="block text-[10px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</span>
                        <span className="block text-[10px] font-bold text-gray-400 mt-1">{notifTime(n)}</span>
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}