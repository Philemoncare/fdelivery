import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ShoppingCart,
  Search,
  UserRound
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/src/lib/utils';
import omniLogo from '@/assets/omni-logo.png';

interface HeaderNavbarProps {
  onToggleMegaMenu: () => void;
  isMegaMenuOpen: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({ onToggleMegaMenu, isMegaMenuOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const {
    cartCount,
    setIsCartOpen,
    currentAddressName,
    t
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
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
        setIsMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const firstName = user?.firstName || user?.displayName?.split(' ')[0] || 'Account';
  const avatarLabel = user?.avatarUrl
    ? null
    : (user?.firstName?.[0] || user?.displayName?.[0] || 'A').toUpperCase();

  const mobileNavLinks = user
    ? user.role === 'customer'
      ? [
          { label: t('nav.home'), onClick: () => navigate('/') },
          { label: 'Food', onClick: () => navigate('/food') },
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
        { label: 'Food', onClick: () => navigate('/food') },
        { label: t('nav.products'), onClick: () => navigate('/products') },
        { label: t('nav.restaurants'), onClick: () => navigate('/vendors') },
        { label: t('landing.nav.howItWorks'), onClick: () => navigate('/how-delivery-works') },
        { label: t('landing.nav.becomeVendor'), onClick: () => navigate('/become-vendor') },
        { label: t('landing.nav.trackOrder'), onClick: () => navigate('/track-order') },
      ];

  const navLinks = [
    { label: 'Food', to: '/food' },
    { label: t('nav.restaurants'), to: '/vendors' },
    { label: t('landing.nav.howItWorks'), to: '/how-delivery-works' },
    { label: t('landing.nav.becomeVendor'), to: '/become-vendor' },
    { label: t('landing.nav.trackOrder'), to: '/track-order' },
  ];

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-50 transition-shadow duration-300",
        scrolled ? "shadow-md" : "shadow-none"
      )}
    >
      {/* Promo bar — slim, never dominates */}
      <div className="bg-[#0b1f16] dark:bg-black text-white h-9 flex items-center justify-center gap-1.5 px-4 text-[11px] sm:text-xs font-bold tracking-wide uppercase">
        <span className="opacity-95">{t('header.promo')}</span>
        <span className="text-emerald-400 font-black tracking-widest">FREEDEL</span>
      </div>

      {/* Main header bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-[72px]">
            {/* Logo — official asset, fixed visual height, never cropped/stretched */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center shrink-0 group transition-transform active:scale-[0.98]"
              aria-label="OmniMarket"
              title="OmniMarket"
            >
              <img
                src={omniLogo}
                alt="OmniMarket"
                className="object-contain w-[130px] h-[42px] group-hover:opacity-90 transition-opacity dark:invert dark:hue-rotate-180"
              />
            </button>

            {/* Primary global search — the only search bar on the landing page */}
            <div className="hidden md:block flex-1 max-w-[560px]">
              <SearchAutocomplete />
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Location — lightweight, visually light */}
              <button
                onClick={() => navigate('/customer/addresses')}
                className="hidden lg:flex flex-col items-start justify-center ps-1 pe-2.5 h-10 rounded-xl text-start hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Delivery location"
                title="Delivery location"
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">
                  {t('header.deliverTo')}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-none truncate max-w-[130px]">
                  <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                  {currentAddressName || t('location.currentLocation')}
                </span>
              </button>

              <span className="hidden lg:block h-6 w-px bg-gray-100 dark:bg-slate-800 mx-0.5" />

              {/* Secondary quiet actions: language, wishlist, messages, notifications */}
              <GlobalNavActions className="hidden md:flex" />

              <div className="h-6 w-px bg-gray-100 dark:bg-slate-800 mx-1 hidden md:block"></div>

              {/* Cart — prominent, badge from the real cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="Cart"
                title="Cart"
                className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg active:scale-95 transition-transform"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -end-1.5 bg-emerald-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Search toggle (mobile/tablet) */}
              <button
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                aria-label="Search"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition md:hidden"
              >
                {isMobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition lg:hidden"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* Account / Profile */}
              <div className="hidden lg:block relative ms-1">
                {user ? (
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 ps-0.5 pe-1.5 h-11 rounded-2xl border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-all"
                    aria-label="Account"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-black overflow-hidden shadow-sm">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : avatarLabel ? (
                        <span>{avatarLabel}</span>
                      ) : (
                        <UserRound className="w-4 h-4" aria-hidden />
                      )}
                    </div>
                    <span className="flex flex-col items-start leading-none">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {firstName.length > 10 ? `${firstName.slice(0, 10)}…` : firstName}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Account</span>
                    </span>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', isUserMenuOpen && 'rotate-180')} />
                  </button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="h-10 rounded-xl font-bold text-sm px-4 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-slate-200"
                  >
                    {t('nav.login')}
                  </Button>
                )}

                {/* User Dropdown */}
                {isUserMenuOpen && user && (
                  <div className="absolute end-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-3 p-2 mb-2 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                      <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          avatarLabel
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {user.displayName || `${user.firstName} ${user.lastName}`.trim()}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase truncate tracking-wider">{user.email}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
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
                      <button
                        onClick={() => { navigate('/customer/wishlist'); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        {t('nav.favorites')}
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-slate-800 my-2 mx-2"></div>
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

        {/* Mobile expandable search row */}
        {isMobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 animate-in slide-in-from-top duration-200">
            <SearchAutocomplete
              onNavigate={() => { setIsMobileSearchOpen(false); setIsMobileMenuOpen(false); }}
            />
          </div>
        )}

        {/* Secondary navigation strip — compact, consistent, left-aligned */}
        <nav className="hidden lg:block bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 h-[52px]">
              <button
                onClick={onToggleMegaMenu}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[15px] font-semibold transition-all",
                  isMegaMenuOpen
                    ? "bg-emerald-500 text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400"
                )}
              >
                {t('header.browse')}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', isMegaMenuOpen && 'rotate-180')} />
              </button>

              <span className="w-px h-4 bg-gray-100 dark:bg-slate-800 mx-3" />

              {navLinks.map((link) => {
                const active = location.pathname.startsWith(link.to);
                return (
                  <button
                    key={link.to}
                    onClick={() => navigate(link.to)}
                    className={cn(
                      "relative px-3.5 h-9 rounded-lg text-[15px] font-semibold transition-all",
                      active
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-500/10"
                        : "text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400"
                    )}
                  >
                    {link.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full inset-x-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-2xl p-5 z-50 animate-in slide-in-from-top duration-300 max-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="space-y-5">
            {isMobileSearchOpen && (
              <SearchAutocomplete onNavigate={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Deliver-to control */}
            <button
              onClick={() => { navigate('/customer/addresses'); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/30 text-start transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-[18px] h-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{t('header.deliverTo')}</p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{currentAddressName || t('location.currentLocation')}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 rtl:rotate-90 ltr:rotate-[-90deg]" />
            </button>

            {/* Account area */}
            <div className="border-b border-gray-100 dark:border-slate-800 pb-5">
              {user ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-sm font-black overflow-hidden">
                      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : avatarLabel}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white leading-tight">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">@{user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigate(user.role === 'customer' ? '/customer/orders' : resolvePostAuthenticationRoute(user));
                        setIsMobileMenuOpen(false);
                      }}
                      className="rounded-xl font-black text-[10px] tracking-widest uppercase"
                    >
                      {user.role === 'customer' ? t('header.myOrders') : t('nav.dashboard')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className="rounded-xl font-black text-[10px] tracking-widest uppercase text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      {t('header.signOut')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} variant="outline" className="rounded-2xl font-black py-5 border-gray-100">{t('nav.login')}</Button>
                  <Button onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }} className="rounded-2xl font-black py-5 bg-emerald-500 hover:bg-emerald-600 text-white">Create account</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {mobileNavLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => { link.onClick(); setIsMobileMenuOpen(false); }}
                  className="p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800 text-start bg-white dark:bg-slate-800/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors group"
                >
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{link.label}</p>
                </button>
              ))}
            </div>

            {/* Language + notifications for mobile */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <GlobalNavActions className="flex" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};