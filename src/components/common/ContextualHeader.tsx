import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, ShoppingCart, Bell,
  Bike, MapPin, Package, ClipboardCheck
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';
import { HeaderNavbar } from './HeaderNavbar';
import {
  getHeaderFeatures, getHeaderModeTitle, orderStatusTone, orderStatusLabel,
  resolveTrackingOrder,
  type HeaderMode,
} from '@/src/lib/header-modes';

interface ContextualHeaderProps {
  mode: HeaderMode;
  onToggleMegaMenu?: () => void;
  isMegaMenuOpen?: boolean;
}

const BOOKING_STEPS = [
  { label: 'Pickup', icon: MapPin },
  { label: 'Destination', icon: MapPin },
  { label: 'Package', icon: Package },
  { label: 'Review', icon: ClipboardCheck },
];

export function ContextualHeader({ mode, onToggleMegaMenu, isMegaMenuOpen }: ContextualHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const app = useApp();
  const {
    cartCount, setIsCartOpen, notifications,
    orders, selectedOrder, conversations,
  } = app;

  // The full marketplace consumer header owns the discovery experience.
  if (mode === 'marketplace') {
    return (
      <HeaderNavbar
        onToggleMegaMenu={onToggleMegaMenu || (() => {})}
        isMegaMenuOpen={!!isMegaMenuOpen}
      />
    );
  }

  const features = getHeaderFeatures(mode);
  const title = getHeaderModeTitle(mode, location.pathname);
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter(n => n && !n.read).length : 0;
  const unreadMessages = Array.isArray(conversations)
    ? conversations.reduce((sum, c) => sum + (c?.unreadCount || 0), 0)
    : 0;

  const trackingOrder = mode === 'tracking'
    ? resolveTrackingOrder(location.pathname, orders, selectedOrder)
    : null;
  const trackingRef = mode === 'tracking'
    ? (trackingOrder?.orderNumber || trackingOrder?.id || null)
    : null;

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
    else navigate(features.defaultBackTo);
  };

  const avatarInitials = user
    ? (user.displayName || (user.firstName ? `${user.firstName} ${user.lastName || ''}` : '') || 'Account')
        .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const iconBtn = 'relative p-2 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition shrink-0';

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn('flex items-center justify-between gap-3', features.compact ? 'h-14' : 'h-20')}>

          {/* Left: back + compact brand */}
          <div className="flex items-center min-w-0 shrink-0">
            {features.showBack && (
              <button onClick={goBack} aria-label="Back" className="p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => navigate('/')} className="flex items-center gap-2 group active:scale-95 transition-transform ml-1 shrink-0" title="OmniMarket home">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Bike className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left leading-none">
                <span className="block font-heading font-black text-sm text-slate-900 dark:text-white">OmniMarket<span className="text-emerald-500">.</span></span>
              </div>
            </button>
          </div>

          {/* Center: page task context */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            {features.secureContext ? (
              <div className="flex items-center gap-1.5 px-1 text-emerald-600 dark:text-emerald-400 font-black text-[11px] sm:text-xs uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{features.secureContext === 'payment' ? 'Secure Payment' : 'Secure Checkout'}</span>
                <span className="sm:hidden">{features.secureContext === 'payment' ? 'Payment' : 'Checkout'}</span>
              </div>
            ) : features.showOrderReference ? (
              <div className="flex items-center justify-center gap-2 min-w-0">
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                  {trackingRef ? `#${trackingRef}` : title}
                </span>
                {features.showStatus && trackingOrder?.status && (
                  <span className={cn('hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ring-1', orderStatusTone(trackingOrder.status))}>
                    {orderStatusLabel(trackingOrder.status)}
                  </span>
                )}
              </div>
            ) : (
              <div className="min-w-0 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">{title}</h1>
                  {mode === 'messaging' && unreadMessages > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                      {unreadMessages} unread
                    </span>
                  )}
                </div>
                {features.showProgress && (
                  <div className="hidden md:flex items-center justify-center gap-2 mt-0.5">
                    {BOOKING_STEPS.map((step, i) => (
                      <div key={step.label} className="flex items-center gap-1.5">
                        <step.icon className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{step.label}</span>
                        {i < BOOKING_STEPS.length - 1 && <span className="text-[10px] text-gray-300 dark:text-slate-600">→</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: only the controls this page needs */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {features.showCart && (
              <button onClick={() => setIsCartOpen(true)} aria-label="Cart" title="Cart" className={cn(iconBtn, 'text-gray-600 dark:text-gray-300')}>
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
            {user && features.showNotifications && (
              <button onClick={() => navigate('/customer/notifications')} aria-label="Notifications" title="Notifications" className={iconBtn}>
                <Bell className="w-5 h-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-black min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
            )}
            {features.showAvatar && user && (
              <button
                onClick={() => navigate('/customer/settings')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-black overflow-hidden ring-2 ring-white dark:ring-slate-800 hover:ring-emerald-300 transition-all shrink-0"
                title={user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  avatarInitials
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}