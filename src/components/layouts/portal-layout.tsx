import { useState, Fragment, type ElementType, type ReactNode } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '@/src/components/common/ScrollToTop';
import {
  Settings, LogOut, Menu, ChevronDown,
  ChevronLeft, ChevronRight, Bell, MessageSquare, ShieldCheck, UserRound, UserCog, LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/auth/auth-store';
import { MODULE_LOGIN, ROLE_MODULES } from '@/src/lib/auth/types';
import type { AppModule } from '@/src/lib/auth/types';
import { APP_VERSION_LABEL } from '@/src/lib/app-version';
import { SystemStatus } from '@/src/components/common/SystemStatus';
import { ThemeControl } from '@/src/components/common/ThemeControl';
import { HeaderNotificationMenu } from '@/src/components/common/HeaderNotificationMenu';
import { ToastNotification } from '@/src/components/common/ToastNotification';

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
  hideSidebar?: boolean;
  /** Optional context chip shown in the top bar (operational/system status). */
  statusChip?: ReactNode;
  /** Optional security indicator shown in the top bar. */
  securityPath?: string;
  /**
   * Transaction-focused paths where the profile photo is omitted from the top
   * bar (the account menu still provides identity when opened).
   */
  hideAvatarPaths?: string[];
}

// The administration modules follow the selected accent theme. Marketplace
// portals (customer/vendor/rider) keep their branded colours.
const ADMIN_MODULES: AppModule[] = ['admin', 'super-admin'];

export function PortalLayout({ config }: { config: PortalConfig }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = ADMIN_MODULES.includes(config.module);

  // Coherent icon-button treatment for every header action.
  const iconBtn = 'btn-ghost p-2 relative rounded-xl focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition';

  const handleLogout = () => {
    const module = (user && ROLE_MODULES[user.role]) || 'customer';
    logout();
    navigate(MODULE_LOGIN[module]);
  };

  // Identity is only surfaced where it provides account context; transaction-
  // focused pages drop the profile photo (account access stays via the menu).
  const hideAvatar = (config.hideAvatarPaths || []).some(p =>
    location.pathname === p || location.pathname.startsWith(p + '/')
  );

  const NavItem = ({ item }: { item: PortalSidebarItem }) => {
    const active = item.path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
    return (
      <Link
        to={item.path || '#'}
        title={item.label}
        aria-label={item.label}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
          active
            ? isAdmin
              ? 'bg-primary-soft text-primary shadow-sm'
              : 'bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white shadow-sm'
            : 'text-ink-3 dark:text-slate-500 hover:text-ink dark:hover:text-gray-300 hover:bg-surface-2 dark:hover:bg-slate-800/50'
        )}
      >
        <item.icon className={cn('w-5 h-5 flex-shrink-0 transition-colors', active && isAdmin && 'text-primary')} />
        <span className={cn('transition-opacity', !sidebarOpen && 'lg:hidden')}>{item.label}</span>
        {item.badge && (
          <span className={cn('ml-auto px-1.5 py-0.5 text-xs font-bold rounded-full text-white', isAdmin ? 'bg-primary' : 'bg-emerald-500', !sidebarOpen && 'lg:hidden')}>
            {item.badge}
          </span>
        )}
        {active && (
          <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full', isAdmin ? 'bg-primary' : `bg-gradient-to-b ${config.iconColor}`)} />
        )}
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

  const hideSidebar = !!config.hideSidebar;

  const logoGradient = isAdmin ? 'from-primary to-primary-hover' : config.logoGradient;

  return (
    <div className="min-h-screen bg-app">
      <ScrollToTop />
      {/* Renders AppContext toasts (refresh/save/error feedback) for the admin consoles */}
      <ToastNotification />
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && !hideSidebar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {!hideSidebar && (<aside className={cn(
        'fixed top-0 left-0 z-50 h-full flex flex-col bg-sidebar border-r border-line transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20',
        'lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-line">
          <Link to={allItems[0]?.path || '/'}
            className={cn('w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 bg-gradient-to-br', logoGradient)}>
            <span className="text-white font-bold text-sm">O</span>
          </Link>
          <div className={cn('min-w-0', !sidebarOpen && 'lg:hidden')}>
            <span className="font-bold text-ink block truncate">{config.appName}</span>
            <span className="text-[10px] text-ink-3 block truncate">{config.title}</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto hidden lg:flex text-ink-3 hover:text-ink dark:hover:text-gray-300">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <div className={cn('px-3 py-3 border-b border-line', !sidebarOpen && 'lg:text-center')}>
          <div className={cn('text-xs font-semibold uppercase tracking-wider', !sidebarOpen && 'lg:hidden')}>
            <span className={cn('bg-clip-text text-transparent bg-gradient-to-r', isAdmin ? 'from-primary to-primary-hover' : config.colors)}>{config.title}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {config.sections ? (
            config.sections.map(section => (
              <div key={section.title} className="space-y-1">
                <div className={cn('px-3 py-2 text-[10px] font-black text-ink-3 dark:text-slate-500 uppercase tracking-[0.2em]', !sidebarOpen && 'lg:hidden')}>
                  {section.title}
                </div>
                {section.items.map(item => <Fragment key={item.label}><NavItem item={item} /></Fragment>)}
              </div>
            ))
          ) : (
            <div className="space-y-1">
              {config.items?.map(item => <Fragment key={item.label}><NavItem item={item} /></Fragment>)}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-line">
          {!settingsInNav && (
            <button onClick={() => { setMobileOpen(false); navigate(config.settingsPath); }}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-3 hover:text-ink dark:hover:text-gray-300 hover:bg-surface-2 dark:hover:bg-slate-800/50 w-full transition-all', !sidebarOpen && 'lg:justify-center')}>
              <Settings className="w-5 h-5" />
              <span className={cn(!sidebarOpen && 'lg:hidden')}>Settings</span>
            </button>
          )}
          <button onClick={handleLogout}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:text-danger hover:bg-danger-soft dark:hover:bg-red-900/20 w-full transition-all', !sidebarOpen && 'lg:justify-center')}>
            <LogOut className="w-5 h-5" />
            <span className={cn(!sidebarOpen && 'lg:hidden')}>Logout</span>
          </button>
        </div>
      </aside>)}

      {/* Main area */}
      <div className={cn('flex flex-col min-h-screen transition-all duration-300', !hideSidebar && (sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'))}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass-nav h-16 flex items-center px-4 sm:px-6 gap-4">
          <button onClick={() => setMobileOpen(true)} className={cn('lg:hidden text-ink-2 dark:text-gray-400', hideSidebar && 'hidden')}>
            <Menu className="w-6 h-6" />
          </button>
          {hideSidebar ? (
            <Link to={allItems[0]?.path || '/'} className="flex items-center gap-2.5 flex-shrink-0">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br', logoGradient)}>
                <span className="text-white font-black text-sm">O</span>
              </div>
              <span className="text-sm font-black text-ink uppercase tracking-tight">{config.appName}</span>
            </Link>
          ) : (
            <div className="hidden md:block text-sm font-semibold text-ink whitespace-nowrap">
              {currentPageLabel}
            </div>
          )}
          <div className="flex-1" />
          <div className={cn('flex items-center gap-1.5 sm:gap-2')}>
            {config.securityPath && (
              <button onClick={() => navigate(config.securityPath!)} className={cn(iconBtn)} title="Security" aria-label="Security">
                <ShieldCheck className="w-5 h-5" />
              </button>
            )}
            {/* Real system health status for the admin consoles */}
            {config.statusChip ?? (isAdmin ? <SystemStatus compact /> : null)}
            {config.messagesPath && (
              <button onClick={() => navigate(config.messagesPath!)} className={cn(iconBtn)} title="Messages" aria-label="Messages">
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            {config.notificationsPath && <HeaderNotificationMenu basePath={`/${config.module}`} />}
            {/* ONE unified theme control — direct cycling + compact picker */}
            <ThemeControl />
            <div className="relative flex items-center gap-2 pl-2 border-l border-line">
              <button onClick={() => setUserMenuOpen(v => !v)} className="flex items-center gap-2 group"
                aria-haspopup="menu" aria-expanded={userMenuOpen} aria-label="Account menu">
                {hideAvatar ? (
                  <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-ink-3 group-hover:text-ink transition-colors">
                    <UserRound className="w-4 h-4" />
                  </div>
                ) : (
                  <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-black shadow-inner overflow-hidden ring-2 ring-line-strong group-hover:ring-primary transition-all', logoGradient)}>
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      (user?.displayName || user?.firstName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    )}
                  </div>
                )}
                <div className={cn('hidden sm:block text-xs text-left', hideAvatar && 'sm:hidden')}>
                  <p className="font-bold text-ink leading-none">{user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Account')}</p>
                  <p className="text-[10px] text-ink-3 capitalize mt-0.5">{config.module} account</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-ink-3 hidden sm:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      role="menu"
                      aria-label="Account menu"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-60 z-40 bg-surface dark:bg-slate-900 rounded-2xl shadow-2xl border border-line overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-line">
                        <p className="text-xs font-black text-ink truncate">{user?.displayName || 'Account'}</p>
                        <p className="text-[10px] text-ink-3 truncate mt-0.5">{user?.email}</p>
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-primary-soft text-primary text-[10px] font-black capitalize">
                          <ShieldCheck className="w-3 h-3" />
                          {user?.role?.replace('-', ' ') || 'Member'}
                        </span>
                      </div>
                      <div className="p-1.5">
                        <button role="menuitem" onClick={() => { setUserMenuOpen(false); navigate(allItems[0]?.path || config.settingsPath); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-2 dark:text-gray-200 hover:bg-surface-2 dark:hover:bg-slate-800 transition-colors">
                          <LayoutDashboard className="w-4 h-4 text-ink-3" /> Dashboard
                        </button>
                        <button role="menuitem" onClick={() => { setUserMenuOpen(false); navigate(config.settingsPath); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-2 dark:text-gray-200 hover:bg-surface-2 dark:hover:bg-slate-800 transition-colors">
                          <UserRound className="w-4 h-4 text-ink-3" /> Profile &amp; Settings
                        </button>
                        {config.securityPath && (
                          <button role="menuitem" onClick={() => { setUserMenuOpen(false); navigate(config.securityPath!); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-2 dark:text-gray-200 hover:bg-surface-2 dark:hover:bg-slate-800 transition-colors">
                            <ShieldCheck className="w-4 h-4 text-ink-3" /> Security
                          </button>
                        )}
                        <button role="menuitem" onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger-soft dark:hover:bg-red-900/20 transition-colors">
                          <LogOut className="w-4 h-4" /> Log Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {hideSidebar && (
          <nav className="sticky top-16 z-20 hidden lg:block border-b border-line bg-surface/90 dark:bg-slate-900/90 backdrop-blur">
            <div className="flex items-center gap-1 px-4 sm:px-6 overflow-x-auto">
              {allItems.filter(i => i.path).map(item => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link key={item.label} to={item.path!}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors',
                      active
                        ? isAdmin ? 'text-primary border-primary' : 'text-gray-900 dark:text-white border-amber-500'
                        : 'text-ink-2 dark:text-slate-400 border-transparent hover:text-ink dark:hover:text-gray-200'
                    )}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className={cn('ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white', isAdmin ? 'bg-primary' : 'bg-emerald-500')}>{item.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Page content */}
        <main className={cn('mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 flex-1 min-w-0', !hideSidebar && 'lg:pb-8')}>
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="px-4 sm:px-6 lg:px-8 pb-20 lg:pb-4 text-[11px] text-ink-3 dark:text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <p>© 2026 OmniMarket. All rights reserved.</p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-3 dark:bg-slate-800 text-ink-2 dark:text-slate-400 font-black tracking-wider uppercase text-[9px]">
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', isAdmin ? 'bg-primary' : 'bg-emerald-500')} /> {APP_VERSION_LABEL}
            </span>
          </div>
          <p className="hidden sm:block">{config.footerTagline}</p>
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-3 mb-3 rounded-[2rem] bg-surface/95 dark:bg-slate-900/95 backdrop-blur-xl border border-line shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <div className="relative flex items-center justify-around px-2 py-2">
            {(config.mobileItems || allItems.slice(0, 5)).map(item => {
              const active = item.path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
              const activeColor = isAdmin ? 'text-primary' :
                                 config.colors.includes('emerald') ? 'text-emerald-600 dark:text-emerald-400' :
                                 config.colors.includes('violet') ? 'text-violet-600 dark:text-violet-400' :
                                 config.colors.includes('amber') ? 'text-amber-600 dark:text-amber-400' :
                                 config.colors.includes('blue') ? 'text-blue-600 dark:text-blue-400' :
                                 config.colors.includes('rose') ? 'text-rose-600 dark:text-rose-400' : 'text-primary';

              const activeBg = isAdmin ? 'bg-primary' :
                              config.colors.includes('emerald') ? 'bg-emerald-500' :
                              config.colors.includes('violet') ? 'bg-violet-500' :
                              config.colors.includes('amber') ? 'bg-amber-500' :
                              config.colors.includes('blue') ? 'bg-blue-500' :
                              config.colors.includes('rose') ? 'bg-rose-500' : 'bg-gray-900';

              return (
                <Link key={item.label} to={item.path || '#'}
                  className={cn('group relative flex flex-col items-center gap-1 min-w-0 flex-1 py-1.5', active && activeColor)}>
                  <div className={cn(
                    'relative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-300',
                    active ? 'bg-surface dark:bg-slate-800 shadow-lg scale-110' : 'text-ink-3 dark:text-slate-500'
                  )}>
                    <item.icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                  </div>
                  <span className="text-[10px] leading-none font-bold tracking-tight">
                    {active ? <span className="text-[11px]">{item.label}</span> : item.label}
                  </span>
                  {active && (
                    <motion.div layoutId="bottomNavPill"
                      className={cn('absolute -bottom-0.5 h-[3px] w-8 rounded-full', activeBg)}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  {item.badge ? (
                    <span className={cn('absolute top-0 right-3 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-surface dark:border-slate-900', isAdmin ? 'bg-primary' : 'bg-emerald-500')}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
