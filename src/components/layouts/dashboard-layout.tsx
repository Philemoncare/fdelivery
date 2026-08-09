import { useState, Fragment, type ElementType } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Truck, Star,
  Heart, Wallet, Bell, MessageSquare, Settings, LogOut,
  Menu, X, ChevronDown, Search, Sun, Moon, Store, Bike,
  BarChart3, CreditCard, FileText, HelpCircle, Shield,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/auth/auth-store';
import type { Role } from '@/src/lib/auth/types';

interface SidebarItem {
  label: string;
  icon: ElementType;
  path?: string;
  badge?: number;
  children?: { label: string; path: string }[];
}

const sidebarConfig: Record<Role, { title: string; items: SidebarItem[]; colors: string }> = {
  customer: {
    title: 'Customer',
    colors: 'from-emerald-500 to-emerald-600',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/customer/dashboard' },
      { label: 'Orders', icon: ShoppingBag, path: '/customer/orders', badge: 2 },
      { label: 'Wishlist', icon: Heart, path: '/customer/wishlist' },
      { label: 'Wallet', icon: Wallet, path: '/customer/wallet' },
      { label: 'Addresses', icon: MapPin, path: '/customer/addresses' },
      { label: 'Messages', icon: MessageSquare, path: '/customer/messages', badge: 3 },
      { label: 'Settings', icon: Settings, path: '/customer/settings' },
    ],
  },
  vendor: {
    title: 'Restaurant Partner',
    colors: 'from-violet-500 to-violet-600',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/restaurant/dashboard' },
      { label: 'Menu', icon: Package, path: '/restaurant/menu' },
      { label: 'Orders', icon: ShoppingBag, path: '/restaurant/orders', badge: 5 },
      { label: 'Inventory', icon: BarChart3, path: '/restaurant/inventory' },
      { label: 'Analytics', icon: BarChart3, path: '/restaurant/analytics' },
      { label: 'Wallet', icon: Wallet, path: '/restaurant/wallet' },
      { label: 'Messages', icon: MessageSquare, path: '/restaurant/messages', badge: 2 },
      { label: 'Restaurant Settings', icon: Settings, path: '/restaurant/store-settings' },
    ],
  },
  rider: {
    title: 'Rider',
    colors: 'from-amber-500 to-amber-600',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/rider/dashboard' },
      { label: 'Deliveries', icon: Truck, path: '/rider/deliveries', badge: 3 },
      { label: 'Earnings', icon: Wallet, path: '/rider/earnings' },
      { label: 'Messages', icon: MessageSquare, path: '/rider/messages' },
      { label: 'Profile', icon: User, path: '/rider/profile' },
    ],
  },
  'store-manager': {
    title: 'Restaurant Manager',
    colors: 'from-violet-500 to-violet-600',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/restaurant/dashboard' },
      { label: 'Menu', icon: Package, path: '/restaurant/menu' },
      { label: 'Orders', icon: ShoppingBag, path: '/restaurant/orders' },
      { label: 'Staff', icon: Users, path: '/restaurant/staff' },
      { label: 'Settings', icon: Settings, path: '/restaurant/store-settings' },
    ],
  },
  'vendor-staff': {
    title: 'Restaurant Staff',
    colors: 'from-violet-500 to-violet-600',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/restaurant/dashboard' },
      { label: 'Orders', icon: ShoppingBag, path: '/restaurant/orders' },
      { label: 'Inventory', icon: Package, path: '/restaurant/menu' },
    ],
  },
  administrator: {
    title: 'Admin',
    colors: 'from-blue-500 to-blue-600',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { label: 'Users', icon: Users, path: '/admin/users' },
      { label: 'Restaurants', icon: Store, path: '/admin/vendors' },
      { label: 'Riders', icon: Bike, path: '/admin/riders' },
      { label: 'Orders', icon: ShoppingBag, path: '/admin/orders' },
      { label: 'Payments', icon: CreditCard, path: '/admin/payments' },
      { label: 'Reports', icon: FileText, path: '/admin/reports' },
      { label: 'Settings', icon: Settings, path: '/admin/settings' },
    ],
  },
  'super-administrator': {
    title: 'Super Admin',
    colors: 'from-purple-500 to-purple-600',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard' },
      { label: 'Platform', icon: Shield, path: '/super-admin/platform' },
      { label: 'Admins', icon: Users, path: '/super-admin/admins' },
      { label: 'Analytics', icon: BarChart3, path: '/super-admin/analytics' },
      { label: 'Security', icon: Shield, path: '/super-admin/security' },
      { label: 'Settings', icon: Settings, path: '/super-admin/settings' },
    ],
  },
};

function MapPin(props: { className?: string }) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>; }
function User(props: { className?: string }) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-7 8-7s8 3 8 7" /></svg>; }

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const role = user?.role || 'customer';
  const config = sidebarConfig[role] || sidebarConfig.customer;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item }: { item: SidebarItem }) => {
    const active = item.path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
    return (
      <Link
        to={item.path || '#'}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
          active
            ? 'bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800/50'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className={cn('transition-opacity', !sidebarOpen && 'lg:hidden')}>{item.label}</span>
        {item.badge && (
          <span className={cn('ml-auto px-1.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500 text-white', !sidebarOpen && 'lg:hidden')}>
            {item.badge}
          </span>
        )}
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-emerald-500 to-emerald-600" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20',
        'lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 dark:border-slate-800">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <span className={cn('font-bold text-gray-900 dark:text-white', !sidebarOpen && 'lg:hidden')}>OmniMarket</span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto hidden lg:flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <div className={cn('px-3 py-3 border-b border-gray-100 dark:border-slate-800', !sidebarOpen && 'lg:text-center')}>
          <div className={cn('text-xs font-semibold uppercase tracking-wider', !sidebarOpen && 'lg:hidden')}>
            <span className={`bg-gradient-to-r ${config.colors} bg-clip-text text-transparent`}>{config.title}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {config.items.map(item => <Fragment key={item.label}><NavItem item={item} /></Fragment>)}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-slate-800">
          <button onClick={() => { setMobileOpen(false); navigate('/customer/settings'); }}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800/50 w-full transition-all', !sidebarOpen && 'lg:justify-center')}>
            <Settings className="w-5 h-5" />
            <span className={cn(!sidebarOpen && 'lg:hidden')}>Settings</span>
          </button>
          <button onClick={handleLogout}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-all', !sidebarOpen && 'lg:justify-center')}>
            <LogOut className="w-5 h-5" />
            <span className={cn(!sidebarOpen && 'lg:hidden')}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className={cn('flex flex-col min-h-screen transition-all duration-300', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass-nav h-16 flex items-center px-4 sm:px-6 gap-4">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-600 dark:text-gray-400">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm flex-1 text-gray-700 dark:text-gray-300 placeholder:text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost p-2">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button className="btn-ghost p-2 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="btn-ghost p-2 relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.displayName?.charAt(0) || user?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-medium text-gray-900 dark:text-white">{user?.displayName || user?.firstName || 'User'}</p>
                <p className="text-gray-400 dark:text-slate-500 capitalize">{role.replace('-', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 flex-1 w-full min-w-0">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6 text-xs text-gray-400 dark:text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <p>© 2026 OmniMarket. All rights reserved.</p>
          <p className="hidden sm:block">Enterprise Multi-Vendor Marketplace & Delivery Platform</p>
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-around py-2">
          {config.items.slice(0, 5).map(item => {
            const active = item.path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
            return (
              <Link key={item.label} to={item.path || '#'}
                className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors',
                  active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500')}>
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}