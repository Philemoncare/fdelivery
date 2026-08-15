import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Heart, MessageSquare, Globe, ChevronDown,
  CheckCheck, Package, Truck, CreditCard, UserRound
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import type { LanguageCode, NotificationItem } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { notifMeta, notifTime } from '@/src/lib/notifications';
import { SUPPORTED_LANGUAGES } from '@/src/lib/i18n';

const CAT_ICONS: Record<string, any> = { order: Package, delivery: Truck, message: MessageSquare, payment: CreditCard, account: UserRound, system: Bell };

export function GlobalNavActions({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    language, setLanguage,
    notifications, wishlist, conversations, markNotificationRead, markAllNotificationsRead, showToast, t
  } = useApp();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

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

  return (
    <div className={cn('flex items-center gap-0.5 sm:gap-1', className)}>
      {/* Language (canonical location; currency lives in the utility bar) */}
      <div ref={prefsRef} className="relative block">
        <button
          onClick={() => setPrefsOpen(v => !v)}
          className="flex items-center gap-1.5 p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition group"
          aria-label="Language"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
            <Globe className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">{language}</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", prefsOpen && "rotate-180")} />
        </button>
        {prefsOpen && (
          <div className="absolute end-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('nav.language')}</p>
              <div className="grid grid-cols-1 gap-1">
                {SUPPORTED_LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLanguage(l.code as LanguageCode); showToast(t('nav.language'), l.label); }}
                    className={cn(
                      'w-full text-start px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
                      language === l.code ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {user && (
      <>
      {/* Wishlist */}
      <button
        onClick={goWishlist}
        aria-label="Wishlist"
        className="relative hidden sm:flex p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
      >
        <Heart className="w-5 h-5" />
        {wishlist.length > 0 && (
          <span className="absolute -top-0.5 -end-0.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {wishlist.length}
          </span>
        )}
      </button>

      {/* Messages */}
      <button
        onClick={goMessages}
        aria-label="Messages"
        className="relative hidden lg:flex p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadMessages > 0 && (
          <span className="absolute -top-0.5 -end-0.5 bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {unreadMessages}
          </span>
        )}
      </button>

      {/* Notifications */}
      <div ref={notifRef} className="relative hidden lg:block">
        <button
          onClick={() => setNotifOpen(v => !v)}
          aria-label="Notifications"
          className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifs > 0 && (
            <span className="absolute -top-0.5 -end-0.5 bg-orange-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse-subtle">
              {unreadNotifs}
            </span>
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
