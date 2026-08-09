import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import {
  resolvePostAuthenticationRoute
} from '@/src/lib/auth/types';
import {
  Search,
  ShoppingCart,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Bike,
  User
} from 'lucide-react';
import { Button } from '../ui/button';

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
    searchQuery,
    setSearchQuery,
    currentAddressName,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);

  const closeMenus = () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const mobileNavLinks = user
    ? user.role === 'customer'
      ? [
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Restaurants', onClick: () => navigate('/vendors') },
          { label: 'Orders', onClick: () => navigate('/customer/orders') },
          { label: 'Favorites', onClick: () => navigate('/customer/wishlist') },
          { label: 'Settings', onClick: () => navigate('/customer/settings') },
        ]
      : user.role === 'rider'
      ? [
          { label: 'Dashboard', onClick: () => navigate('/rider/dashboard') },
          { label: 'Deliveries', onClick: () => navigate('/rider/deliveries') },
          { label: 'Earnings', onClick: () => navigate('/rider/earnings') },
          { label: 'Profile', onClick: () => navigate('/rider/profile') },
        ]
      : [
          { label: 'Dashboard', onClick: () => navigate('/restaurant/dashboard') },
          { label: 'Orders', onClick: () => navigate('/restaurant/orders') },
          { label: 'Menu', onClick: () => navigate('/restaurant/menu') },
          { label: 'Settings', onClick: () => navigate('/restaurant/store-settings') },
        ]
    : [
        { label: 'Home', onClick: () => navigate('/') },
        { label: 'Meals', onClick: () => navigate('/products') },
        { label: 'Restaurants', onClick: () => navigate('/vendors') },
        { label: 'Deals', onClick: () => navigate('/deals') },
      ];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenus();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header ref={headerRef} className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors sticky top-0 z-50">
      <div className="bg-gray-900 text-white text-[9px] sm:text-xs py-1.5 px-4 text-center font-bold tracking-widest flex items-center justify-center space-x-2 uppercase">
        <span>Free delivery: Use code <span className="text-emerald-400">FREEDEL</span></span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
              <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="block">
              <span className="block font-heading font-black text-lg sm:text-xl text-black dark:text-white leading-none">
                OmniMarket<span className="text-emerald-500">.</span>
              </span>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Takoradi Express</span>
            </div>
          </button>

          <div className="hidden sm:flex flex-1 max-w-xl relative">
            <div className="flex w-full rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-transparent focus-within:border-emerald-500/40">
              <div className="relative flex-1 flex items-center h-12">
                <Search className="w-4 h-4 text-gray-400 ml-4" />
                <input
                  type="text"
                  placeholder="Search restaurants or meals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <button onClick={() => navigate('/customer/addresses')} className="flex items-center gap-2 p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
              <MapPin className="w-5 h-5 text-emerald-500" />
              <div className="hidden lg:block text-left">
                <p className="text-[9px] text-gray-400 font-black uppercase leading-none">Deliver to</p>
                <p className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[100px]">{currentAddressName}</p>
              </div>
            </button>

            <button onClick={() => setIsCartOpen(true)} className="relative p-2.5 rounded-xl bg-emerald-500 text-white shadow-lg">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-gray-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {cartCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition lg:hidden">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="hidden lg:block relative">
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800 hover:shadow-md transition bg-white dark:bg-slate-900">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-black">
                  {user ? (user.firstName?.[0] || 'U') : <User className="w-5 h-5" />}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-700 p-3 z-50">
                  {user ? (
                    <div className="space-y-1">
                      <div className="p-4 border-b border-gray-50 dark:border-slate-700 mb-2">
                        <p className="font-black text-gray-900 dark:text-white">{user.displayName || user.firstName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{user.email}</p>
                      </div>
                      <button onClick={() => { navigate(resolvePostAuthenticationRoute(user)); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700">Dashboard</button>
                      <button onClick={() => { navigate('/customer/settings'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700">Settings</button>
                      <button onClick={() => { logout(); setIsUserMenuOpen(false); navigate('/'); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-rose-50 text-rose-500 text-sm font-black uppercase tracking-widest">Sign Out</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 p-2">
                      <Button onClick={() => navigate('/login')} className="rounded-xl font-black">SIGN IN</Button>
                      <Button onClick={() => navigate('/register')} variant="outline" className="rounded-xl font-black border-gray-100">CREATE ACCOUNT</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-2xl p-6 z-50 rounded-b-[2.5rem]">
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none pl-12 py-4 rounded-2xl text-sm font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {mobileNavLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => { link.onClick(); setIsMobileMenuOpen(false); }}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-left bg-gray-50/50"
                >
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Go to</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{link.label}</p>
                </button>
              ))}
            </div>

            {user && (
              <div className="pt-4 border-t border-gray-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">{user.firstName?.[0]}</div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{user.displayName || user.firstName}</p>
                    <button onClick={() => { logout(); setIsMobileMenuOpen(false); navigate('/'); }} className="text-xs font-black text-rose-500 uppercase tracking-widest">Sign Out</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
