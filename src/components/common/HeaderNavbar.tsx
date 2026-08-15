import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { resolvePostAuthenticationRoute } from '@/src/lib/auth/types';
import { SearchAutocomplete } from './SearchAutocomplete';
import { GlobalNavActions } from './GlobalNavActions';
import {
  ChevronDown,
  Menu,
  X,
  MapPin,
  Bike,
  User,
  ShoppingCart,
  LayoutGrid,
  Search
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/src/lib/utils';

interface HeaderNavbarProps {
  onToggleMegaMenu: () => void;
  isMegaMenuOpen: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({ onToggleMegaMenu, isMegaMenuOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    cartCount,
    setIsCartOpen,
    currentAddressName,
    t
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);

  const closeMenus = () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    setConfirmSignOut(false);
  };

  const handleSignOut = () => {
    closeMenus();
    logout();
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenus();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const mobileNavLinks = user
    ? user.role === 'customer'
      ? [
          { label: t('nav.home'), onClick: () => navigate('/') },
          { label: t('nav.restaurants'), onClick: () => navigate('/vendors') },
          { label: t('deliver.title'), onClick: () => navigate('/customer/deliver') },
          { label: t('nav.orders'), onClick: () => navigate('/customer/orders') },
          { label: t('nav.favorites'), onClick: () => navigate('/customer/wishlist') },
          { label: t('nav.settings'), onClick: () => navigate('/customer/settings') },
        ]
      : user.role === 'rider'
      ? [
          { label: t('nav.dashboard'), onClick: () => navigate('/rider/dashboard') },
          { label: t('common.delivery'), onClick: () => navigate('/rider/deliveries') },
          { label: t('nav.wallet'), onClick: () => navigate('/rider/earnings') },
          { label: t('nav.profile'), onClick: () => navigate('/rider/profile') },
        ]
      : [
          { label: t('nav.dashboard'), onClick: () => navigate('/restaurant/dashboard') },
          { label: t('nav.orders'), onClick: () => navigate('/restaurant/orders') },
          { label: t('menu.title'), onClick: () => navigate('/restaurant/menu') },
          { label: t('nav.settings'), onClick: () => navigate('/restaurant/store-settings') },
        ]
    : [
        { label: t('nav.home'), onClick: () => navigate('/') },
        { label: t('nav.products'), onClick: () => navigate('/products') },
        { label: t('nav.restaurants'), onClick: () => navigate('/vendors') },
        { label: t('footer.deals'), onClick: () => navigate('/deals') },
      ];

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg border-b border-gray-100 dark:border-slate-800"
          : "bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800"
      )}
    >
      {/* Top Announcement Bar */}
      <div className="bg-gray-900 dark:bg-black text-white text-[9px] sm:text-xs py-1.5 px-4 text-center font-bold tracking-widest flex items-center justify-center gap-2 uppercase">
        <span className="opacity-90">{t('header.promo')} <span className="text-emerald-400">FREEDEL</span></span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">

          {/* Logo & Category Toggle */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 group transition-transform active:scale-95"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
                <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="hidden xs:block">
                <span className="block font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-none">
                  OmniMarket<span className="text-emerald-500">.</span>
                </span>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Takoradi Express</span>
              </div>
            </button>

            <button
              onClick={onToggleMegaMenu}
              className={cn(
                "hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                isMegaMenuOpen
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-gray-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t('header.browse')}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", isMegaMenuOpen && "rotate-180")} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:block flex-1 max-w-xl">
            <SearchAutocomplete />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">

            <button
              onClick={() => navigate('/customer/addresses')}
              className="hidden lg:flex items-center gap-2.5 p-2 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="text-start">
                <p className="text-[9px] text-gray-400 font-black uppercase leading-none mb-1">{t('header.deliverTo')}</p>
                <p className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[120px]">
                  {currentAddressName || t('location.set')}
                </p>
              </div>
            </button>

            {/* Global Actions (Theme, Notifications, etc.) */}
            <GlobalNavActions className="hidden sm:flex" />

            <div className="h-8 w-[1px] bg-gray-100 dark:bg-slate-800 mx-1 hidden sm:block"></div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl active:scale-95 transition-transform"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 bg-emerald-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition lg:hidden"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* User Profile / Auth */}
            <div className="hidden lg:block relative ms-1">
              {user ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 ps-3 rounded-2xl border border-gray-100 dark:border-slate-800 hover:shadow-lg transition-all bg-white dark:bg-slate-900 group"
                >
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">
                    {user.firstName || 'Account'}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/10">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-xs font-black">{(user.firstName?.[0] || 'U').toUpperCase()}</span>
                    )}
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="rounded-xl font-black text-xs px-5 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    SIGN IN
                  </Button>
                  <Button
                    onClick={() => navigate('/register')}
                    className="rounded-xl font-black text-xs px-5 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-500/20"
                  >
                    REGISTER
                  </Button>
                </div>
              )}

              {/* User Dropdown */}
              {isUserMenuOpen && user && (
                <div className="absolute end-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-gray-50 dark:border-slate-800 mb-2">
                    <p className="font-black text-slate-900 dark:text-white">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-wider">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        // Customers return to the consumer home; other roles go to their console.
                        navigate(user.role === 'customer' ? '/customer/orders' : resolvePostAuthenticationRoute(user));
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {user.role === 'customer' ? t('header.myOrders') : t('nav.dashboard')}
                    </button>
                    <button
                      onClick={() => { navigate('/customer/settings'); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {t('nav.settings')}
                    </button>
                    <div className="h-px bg-gray-50 dark:bg-slate-800 my-2 mx-2"></div>
                    {confirmSignOut ? (
                      <div className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 space-y-2.5">
                        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-300 leading-snug">
                          Sign out of your account? You'll need to sign in again to access your orders and messages.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmSignOut(false)}
                            className="flex-1 h-9 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            onClick={handleSignOut}
                            className="flex-1 h-9 rounded-lg bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition"
                          >
                            {t('header.signOut')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmSignOut(true)}
                        className="w-full text-start px-4 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                      >
                        {t('header.signOut')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-2xl p-6 z-50 rounded-b-[2.5rem] animate-in slide-in-from-top duration-300">
          <div className="space-y-6">
            <SearchAutocomplete onNavigate={() => setIsMobileMenuOpen(false)} />

            {/* Deliver-to control stays reachable on mobile */}
            <button
              onClick={() => { navigate('/customer/addresses'); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 text-start transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-emerald-500">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{t('header.deliverTo')}</p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{currentAddressName || t('location.set')}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 rtl:rotate-90 ltr:rotate-[-90deg]" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              {mobileNavLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => { link.onClick(); setIsMobileMenuOpen(false); }}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-start bg-gray-50/50 dark:bg-slate-800/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors group"
                >
                  <p className="text-[10px] font-black text-gray-400 group-hover:text-emerald-500 uppercase tracking-widest mb-1">Go to</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{link.label}</p>
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
              {user ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black">
                      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" /> : (user.firstName?.[0] || 'U')}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white leading-tight">{user.firstName} {user.lastName}</p>
                      {confirmSignOut ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button onClick={() => setConfirmSignOut(false)} className="rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                            {t('common.cancel')}
                          </button>
                          <button onClick={handleSignOut} className="rounded-lg bg-rose-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-rose-600">
                            {t('header.signOut')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmSignOut(true)}
                          className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1"
                        >
                          {t('header.signOut')}
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Customers go to their orders; other roles go to their console.
                      navigate(user.role === 'customer' ? '/customer/orders' : resolvePostAuthenticationRoute(user));
                      setIsMobileMenuOpen(false);
                    }}
                    className="rounded-xl font-black text-[10px] tracking-widest uppercase"
                  >
                    {user.role === 'customer' ? t('header.myOrders') : t('nav.dashboard')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} variant="outline" className="rounded-2xl font-black py-6 border-gray-100">{t('nav.login')}</Button>
                  <Button onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }} className="rounded-2xl font-black py-6 bg-emerald-500 hover:bg-emerald-600 text-white">{t('header.joinNow')}</Button>
                </div>
              )}
            </div>

            {/* Mobile Bottom Actions (Theme/Language) */}
            <div className="flex items-center justify-center gap-4 pt-2">
               <GlobalNavActions className="flex" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
