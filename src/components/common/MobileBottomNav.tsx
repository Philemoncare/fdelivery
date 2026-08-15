import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { Home, Store, Bike, Package, User } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  featured?: boolean;
}

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { orders, t } = useApp();

  // Only authenticated customers get the consumer bottom nav.
  // Other roles (vendor/rider/admin) use their own portal layouts.
  if (!user || user.role !== 'customer') return null;

  const activeOrders = orders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status.toLowerCase())).length;

  // Account area covers every /customer/* page that isn't Deliver or Orders.
  const isAccount = location.pathname.startsWith('/customer/settings')
    || location.pathname.startsWith('/customer/profile')
    || location.pathname.startsWith('/customer/wishlist')
    || location.pathname.startsWith('/customer/favorites')
    || location.pathname.startsWith('/customer/addresses')
    || location.pathname.startsWith('/customer/wallet')
    || location.pathname.startsWith('/customer/messages')
    || location.pathname.startsWith('/customer/notifications')
    || location.pathname.startsWith('/customer/reviews')
    || location.pathname.startsWith('/customer/coupons')
    || location.pathname.startsWith('/customer/support')
    || location.pathname.startsWith('/customer/payment-methods');

  const items: NavItem[] = [
    {
      label: t('nav.home'),
      icon: <Home className="w-5 h-5" />,
      isActive: location.pathname === '/',
      onClick: () => navigate('/')
    },
    {
      label: t('nav.restaurants'),
      icon: <Store className="w-5 h-5" />,
      isActive: location.pathname.startsWith('/vendors'),
      onClick: () => navigate('/vendors')
    },
    {
      label: t('nav.deliver'),
      icon: <Bike className="w-5 h-5" />,
      isActive: location.pathname.startsWith('/customer/deliver'),
      onClick: () => navigate('/customer/deliver'),
      featured: true
    },
    {
      label: t('nav.orders'),
      icon: <Package className="w-5 h-5" />,
      isActive: location.pathname.startsWith('/customer/orders') || location.pathname === '/track-order',
      onClick: () => navigate('/customer/orders'),
      badge: activeOrders
    },
    {
      label: t('nav.me'),
      icon: <User className="w-5 h-5" />,
      isActive: isAccount,
      onClick: () => navigate('/customer/settings')
    }
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="max-w-lg mx-auto grid grid-cols-5">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            aria-label={item.label}
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition ${
              item.isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span
              className={`flex items-center justify-center w-12 h-8 rounded-2xl transition-all ${
                item.isActive ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
              }`}
            >
              {item.icon}
            </span>
            {item.featured && !item.isActive && (
              <span className="absolute top-1 right-1/2 translate-x-4 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {item.badge && item.badge > 0 ? (
              <span className="absolute top-1.5 right-1/2 translate-x-4 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
            {item.label === t('nav.deliver') && item.isActive && (
              <span className="absolute -top-3 flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
                <Bike className="w-5 h-5" />
              </span>
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};