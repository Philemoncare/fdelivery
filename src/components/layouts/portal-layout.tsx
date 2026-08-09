import { useState, Fragment, type ElementType } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '@/src/components/common/ScrollToTop';
import {
  Settings, LogOut, Menu, ChevronDown, Search, Sun, Moon,
  ChevronLeft, ChevronRight, Bell, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/auth/auth-store';
import { MODULE_LOGIN, ROLE_MODULES } from '@/src/lib/auth/types';
import type { AppModule } from '@/src/lib/auth/types';

export interface PortalSidebarItem {
  label: string;
  icon: ElementType;
  path?: string;
  badge?: number;
}

export interface PortalSection {
  title: string;
  items: PortalSidebarItem[];
}

export interface PortalConfig {
  module: AppModule;
  appName: string;
  title: string;
  colors: string;
  logoGradient: string;
  iconColor: string;
  items?: PortalSidebarItem[];
  sections?: PortalSection[];
  mobileItems?: PortalSidebarItem[];
  settingsPath: string;
  footerTagline: string;
  notificationsPath?: string;
  messagesPath?: string;
}

export function PortalLayout({ config }: { config: PortalConfig }) {
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

  const handleLogout = () => {
    const module = (user && ROLE_MODULES[user.role]) || 'customer';
    logout();
    navigate(MODULE_LOGIN[module]);
  };

  const NavItem = ({ item }: { item: PortalSidebarItem }) => {
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
        {active && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b ${config.iconColor}`} />}
      </Link>
    );
  };

  const allItems = config.sections
    ? config.sections.flatMap(s => s.items)
    : (config.items || []);

  const currentPageLabel = allItems.find(i => i.path && (location.pathname === i.path || location.pathname.startsWith(i.path + '/')))?.label || config.title;

  // When Settings is already a regular nav item, hide the bottom shortcut
  // next to Logout so it doesn't appear twice.
  const settingsInNav = config.settingsPath
    ? allItems.some(i => i.path && i.path === config.settingsPath)
    : false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <ScrollToTop />
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
          <Link to={allItems[0]?.path || '/'}
            className={cn('w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 bg-gradient-to-br', config.logoGradient)}>
            <span className="text-white font-bold text-sm">O</span>
          </Link>
          <div className={cn('min-w-0', !sidebarOpen && 'lg:hidden')}>
            <span className="font-bold text-gray-900 dark:text-white block truncate">{config.appName}</span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 block truncate">{config.title}</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto hidden lg:flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <div className={cn('px-3 py-3 border-b border-gray-100 dark:border-slate-800', !sidebarOpen && 'lg:text-center')}>
          <div className={cn('text-xs font-semibold uppercase tracking-wider', !sidebarOpen && 'lg:hidden')}>
            <span className={`bg-gradient-to-r ${config.colors} bg-clip-text text-transparent`}>{config.title}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {config.sections ? (
            config.sections.map(section => (
              <div key={section.title} className="space-y-1">
                <div className={cn('px-3 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]', !sidebarOpen && 'lg:hidden')}>
                  {section.title}
                </div>
                {section.items.map(item => <NavItem key={item.label} item={item} />)}
              </div>
            ))
          ) : (
            <div className="space-y-1">
              {config.items?.map(item => <NavItem key={item.label} item={item} />)}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-slate-800">
          {!settingsInNav && (
            <button onClick={() => { setMobileOpen(false); navigate(config.settingsPath); }}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800/50 w-full transition-all', !sidebarOpen && 'lg:justify-center')}>
              <Settings className="w-5 h-5" />
              <span className={cn(!sidebarOpen && 'lg:hidden')}>Settings</span>
            </button>
          )}
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
          <div className="hidden md:block text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
            {currentPageLabel}
          </div>
          <div className="flex-1 flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder={`Search ${config.title.toLowerCase()}...`}
                className="bg-transparent border-none outline-none text-sm flex-1 text-gray-700 dark:text-gray-300 placeholder:text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.messagesPath && (
              <button onClick={() => navigate(config.messagesPath!)} className="btn-ghost p-2 relative" title="Messages">
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            {config.notificationsPath && (
              <button onClick={() => navigate(config.notificationsPath!)} className="btn-ghost p-2 relative" title="Notifications">
                <Bell className="w-5 h-5" />
              </button>
            )}
            <button onClick={toggleTheme} className="btn-ghost p-2">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-slate-700">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${config.iconColor} flex items-center justify-center text-white text-[10px] font-black shadow-inner overflow-hidden ring-2 ring-white dark:ring-slate-800`}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-full h-full object-cover" />
                ) : (
                  (user?.displayName || user?.firstName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-bold text-gray-900 dark:text-white leading-none">{user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Account')}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 capitalize mt-0.5">{config.module} account</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
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
          <p className="hidden sm:block">{config.footerTagline}</p>
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around py-1.5 px-2">
          {(config.mobileItems || allItems.slice(0, 5)).map(item => {
            const active = item.path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
            const activeColor = config.colors.includes('emerald') ? 'text-emerald-600 dark:text-emerald-400' :
                               config.colors.includes('violet') ? 'text-violet-600 dark:text-violet-400' :
                               config.colors.includes('amber') ? 'text-amber-600 dark:text-amber-400' :
                               config.colors.includes('blue') ? 'text-blue-600 dark:text-blue-400' :
                               config.colors.includes('rose') ? 'text-rose-600 dark:text-rose-400' : 'text-primary';

            const activeBg = config.colors.includes('emerald') ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                            config.colors.includes('violet') ? 'bg-violet-50 dark:bg-violet-900/20' :
                            config.colors.includes('amber') ? 'bg-amber-50 dark:bg-amber-900/20' :
                            config.colors.includes('blue') ? 'bg-blue-50 dark:bg-blue-900/20' :
                            config.colors.includes('rose') ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-primary/10';

            return (
              <Link key={item.label} to={item.path || '#'}
                className={cn('flex flex-col items-center gap-1 min-w-[64px] py-1 rounded-xl transition-all duration-200',
                  active ? activeColor + ' font-bold' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600')}
              >
                <div className={cn('p-1 rounded-lg transition-colors', active && activeBg)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] leading-none uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
