import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { Home, Store, Package, ShoppingCart, User } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cartCount, setIsCartOpen } = useApp();

  // Only authenticated customers get the marketplace bottom nav.
  // Other roles (vendor/rider/admin) use their own portal layouts.
  if (!user || user.role !== 'customer') return null;

  const isCustomer = (path: string) => location.pathname.startsWith(path);

  const items: NavItem[] = [
    {
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      isActive: location.pathname === '/',
      onClick: () => navigate('/')
    },
    {
      label: 'Restaurants',
      icon: <Store className="w-5 h-5" />,
      isActive: location.pathname.startsWith('/vendors'),
      onClick: () => navigate('/vendors')
    },
    {
      label: 'Orders',
      icon: <Package className="w-5 h-5" />,
      isActive: isCustomer('/customer/orders') || location.pathname === '/track-order',
      onClick: () => navigate('/customer/orders')
    },
    {
      label: 'Cart',
      icon: <ShoppingCart className="w-5 h-5" />,
      isActive: isCustomer('/customer/cart'),
      onClick: () => setIsCartOpen(true),
      badge: cartCount
    },
    {
      label: 'Account',
      icon: <User className="w-5 h-5" />,
      isActive: isCustomer('/customer/settings') || isCustomer('/customer/profile'),
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
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition ${
              item.isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {item.badge ? (
              <span className="absolute top-1.5 right-1/2 translate-x-4 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
