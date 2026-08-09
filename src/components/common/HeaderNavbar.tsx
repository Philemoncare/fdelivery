import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import {
  ROLE_DASHBOARDS,
  resolvePostAuthenticationRoute
} from '@/src/lib/auth/types';
import {
  Search,
  ShoppingCart,
  Heart,
  Bell,
  ChevronDown,
  Menu,
  X,
  Store,
  MapPin,
  Clock,
  Bike,
  Home,
  Package,
  User
} from 'lucide-react';

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
    cartTotal,
    formatPrice,
    setIsCartOpen,
    wishlist,
    notifications,
    markNotificationRead,
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    products,
    setSelectedProduct,
    customerProfile,
    categories,
    currentAddressName,
    showToast
  } = useApp();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);

  const closeMenus = () => {
    setIsNotifOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchFocused(false);
    setIsMobileMenuOpen(false);
  };

  const mobileNavLinks = user
    ? user.role === 'customer'
      ? [
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Restaurants', onClick: () => navigate('/vendors') },
          { label: 'Orders', onClick: () => navigate('/customer/orders') },
          { label: 'Cart', onClick: () => navigate('/customer/cart') },
          { label: 'Account', onClick: () => navigate('/customer/settings') },
        ]
      : user.role === 'rider'
      ? [
          { label: 'Home', onClick: () => navigate('/rider/dashboard') },
          { label: 'Deliveries', onClick: () => navigate('/rider/deliveries') },
          { label: 'Earnings', onClick: () => navigate('/rider/earnings') },
          { label: 'Messages', onClick: () => navigate('/rider/messages') },
          { label: 'Profile', onClick: () => navigate('/rider/profile') },
        ]
      : [
          { label: 'Dashboard', onClick: () => navigate('/restaurant/dashboard') },
          { label: 'Orders', onClick: () => navigate('/restaurant/orders') },
          { label: 'Menu', onClick: () => navigate('/restaurant/menu') },
          { label: 'Kitchen', onClick: () => navigate('/restaurant/kitchen') },
          { label: 'More', onClick: () => navigate('/restaurant/store-settings') },
        ]
    : [
        { label: 'Home', onClick: () => navigate('/') },
        { label: 'Meals', onClick: () => navigate('/products') },
        { label: 'Restaurants', onClick: () => navigate('/vendors') },
        { label: 'Deals', onClick: () => navigate('/deals') },
        { label: 'Become Rider', onClick: () => navigate('/become-rider') },
      ];

  const mobileQuickLinks = user?.role === 'customer' ? [
    { label: 'Favorites', onClick: () => navigate('/customer/wishlist') },
    { label: 'Wallet', onClick: () => navigate('/customer/wallet') },
    { label: 'Addresses', onClick: () => navigate('/customer/addresses') },
    { label: 'Help', onClick: () => navigate('/customer/support') },
  ] : [];
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenus();
        setIsMobileMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenus();
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.read);

  // Filtered autocomplete search results
  const searchResults = searchQuery.trim()
    ? products.filter(
        (p) =>
          (p.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.category?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5)
    : [];

  const handleSelectSearchResult = (product: any) => {
    setSelectedProduct(product);
    navigate(`/product/${product.id}`);
    setIsSearchFocused(false);
    setSearchQuery('');
  };

  return (
    <header ref={headerRef} className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors relative z-30">
      {/* Top Banner Offer */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center space-x-2">
        <span><strong>FREE DELIVERY:</strong> Use code <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold">FREEDEL</span> for free delivery on your first meal order!</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          
          {/* Logo & Category Button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <span className="font-heading font-extrabold text-xl tracking-tight text-gray-900 dark:text-white flex items-center gap-1">
                  OmniMarket<span className="text-emerald-500">.</span>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase block -mt-1">
                  Food Delivery & Express
                </span>
              </div>
            </button>

            {/* Mega Menu Toggle Button */}
            <button
              onClick={onToggleMegaMenu}
              className={`hidden lg:flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                isMegaMenuOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <Menu className="w-4 h-4 text-emerald-600" />
              <span>All Categories</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Search Bar with Autocomplete */}
          <div className="hidden md:flex flex-1 max-w-2xl relative">
            <div className="flex w-full rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all overflow-hidden shadow-sm">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="bg-gray-100 dark:bg-slate-800 text-xs text-gray-700 dark:text-gray-300 px-3 py-2.5 border-r border-gray-300 dark:border-slate-700 focus:outline-none font-medium cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-gray-400 ml-3" />
                <input
                  type="text"
                  placeholder="Search restaurants, meals, cuisines, or riders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="w-full bg-transparent px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <button
                onClick={() => navigate('/products')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Search</span>
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="p-2 border-b border-gray-100 dark:border-slate-700 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <span>Suggested Meals ({searchResults.length})</span>
                </div>
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectSearchResult(product)}
                    className="flex items-center space-x-3 p-3 hover:bg-emerald-50 dark:hover:bg-slate-700/60 cursor-pointer transition border-b border-gray-50 dark:border-slate-700/40 last:border-0"
                  >
                    <img src={product.images?.[0] || ''} alt={product.title} className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-slate-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{product.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Store className="w-3 h-3 text-emerald-500" /> {product.vendorName} | <span className="text-emerald-600 font-semibold">{formatPrice(product.price)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Icons & User Account */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Location Selector (Always visible) */}
            <button
              onClick={() => showToast('Location', 'Feature to change delivery address coming soon.', 'info')}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 transition mr-2"
            >
              <MapPin className="w-4 h-4 text-emerald-500" />
              <div className="text-left">
                <span className="block text-[9px] text-gray-500 uppercase leading-none">Deliver to</span>
                <span className="block text-xs font-bold leading-tight">{currentAddressName}</span>
              </div>
            </button>

            {/* Wishlist Button (Only for logged-in customers) */}
            {user && user.role === 'customer' && (
              <button
                onClick={() => navigate('/customer/wishlist')}
                className="relative p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                title="View Saved Meals"
              >
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </button>
            )}

            {/* Notifications Popover Trigger (Only if logged in) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifs.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-3 z-50">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-slate-700">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-emerald-500" /> Updates
                      </h4>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                        {unreadNotifs.length} New
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No notifications yet</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`p-2.5 rounded-xl text-xs transition cursor-pointer ${
                              n.read
                                ? 'bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-400'
                                : 'bg-emerald-50/70 dark:bg-emerald-950/40 text-gray-900 dark:text-white border-l-2 border-emerald-500'
                            }`}
                          >
                            <p className="font-semibold text-gray-900 dark:text-white">{n.title}</p>
                            <p className="text-gray-600 dark:text-gray-300 text-[11px] mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-gray-400 mt-1 block">{n.time}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shopping Cart Drawer Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-gray-900 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              {user && <span className="hidden sm:inline font-semibold">{formatPrice(cartTotal)}</span>}
            </button>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                {user ? (
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-bold">
                    {(user.firstName?.[0] || '')}{(user.lastName?.[0] || '')}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                    <Bike className="w-4 h-4" />
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:inline" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-2 z-50">
                  {user ? (
                    <>
                      <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
                        <p className="text-[10px] text-gray-500">{user.email}</p>
                        {user.role === 'customer' && customerProfile && (
                          <span className="inline-block bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded font-semibold mt-1">
                            Wallet: {formatPrice(customerProfile.walletBalance)}
                          </span>
                        )}
                      </div>

                      <div className="py-1 text-xs">
                        <button
                          onClick={() => {
                            if (user) {
                              const dash = resolvePostAuthenticationRoute(user);
                              navigate(dash);
                            }
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                        >
                          Dashboard
                        </button>
                        {user.role === 'customer' && (
                          <>
                            <button
                              onClick={() => { navigate('/track-order'); setIsUserMenuOpen(false); }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                            >
                              Track Orders
                            </button>
                            <button
                              onClick={() => { navigate('/customer/wishlist'); setIsUserMenuOpen(false); }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                            >
                              Favorites
                            </button>
                          </>
                        )}
                        <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                        <button
                          onClick={() => { logout(); setIsUserMenuOpen(false); navigate('/'); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-semibold"
                        >
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-1 text-xs">
                      <button
                        onClick={() => { navigate('/login'); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 font-semibold"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => { navigate('/register'); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold"
                      >
                        Create Account
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 px-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-100 dark:bg-slate-800 p-3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurants, meals or riders"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {mobileNavLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => {
                      link.onClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 px-3 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              {mobileQuickLinks.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {mobileQuickLinks.map((link) => (
                    <button
                      key={link.label}
                      onClick={() => {
                        link.onClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full rounded-2xl bg-emerald-500 text-white text-xs font-semibold px-3 py-3 transition hover:bg-emerald-600"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Links Bar */}
        <div className="hidden lg:flex items-center justify-between py-2 border-t border-gray-100 dark:border-slate-800 text-xs font-medium text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-6">
            {!user ? (
              <>
                <button onClick={() => navigate('/')} className={`hover:text-emerald-500 transition ${location.pathname === '/' ? 'text-emerald-600 font-bold' : ''}`}>
                  Home
                </button>
                <button onClick={() => navigate('/products')} className={`hover:text-emerald-500 transition ${location.pathname === '/products' ? 'text-emerald-600 font-bold' : ''}`}>
                  Meals
                </button>
                <button onClick={() => navigate('/vendors')} className={`hover:text-emerald-500 transition ${location.pathname === '/vendors' ? 'text-emerald-600 font-bold' : ''}`}>
                  Restaurants
                </button>
                <button onClick={() => navigate('/deals')} className={`hover:text-amber-500 transition text-amber-600 font-bold ${location.pathname === '/deals' ? 'underline underline-offset-4' : ''}`}>
                  Deals
                </button>
                <button onClick={() => navigate('/about')} className={`hover:text-emerald-500 transition ${location.pathname === '/about' ? 'text-emerald-600 font-bold' : ''}`}>
                  About
                </button>
                <button onClick={() => navigate('/how-delivery-works')} className={`hover:text-emerald-500 transition ${location.pathname === '/how-delivery-works' ? 'text-emerald-600 font-bold' : ''}`}>
                  How Delivery Works
                </button>
                <button onClick={() => navigate('/become-vendor')} className={`hover:text-emerald-500 transition ${location.pathname === '/become-vendor' ? 'text-emerald-600 font-bold' : ''}`}>
                  Partner Restaurant
                </button>
                <button onClick={() => navigate('/become-rider')} className={`hover:text-blue-500 transition text-blue-600 font-bold ${location.pathname === '/become-rider' ? 'underline underline-offset-4' : ''}`}>
                  Become Rider
                </button>
              </>
            ) : user.role === 'customer' ? (
              <>
                <button onClick={() => navigate('/')} className={`hover:text-emerald-500 transition ${location.pathname === '/' ? 'text-emerald-600 font-bold' : ''}`}>
                  Home
                </button>
                <button onClick={() => navigate('/customer/dashboard')} className={`hover:text-emerald-500 transition ${location.pathname === '/customer/dashboard' ? 'text-emerald-600 font-bold' : ''}`}>
                  Dashboard
                </button>
                <button onClick={() => navigate('/customer/orders')} className={`hover:text-emerald-500 transition ${location.pathname === '/customer/orders' ? 'text-emerald-600 font-bold' : ''}`}>
                  Orders
                </button>
                <button onClick={() => navigate('/customer/cart')} className={`hover:text-emerald-500 transition ${location.pathname === '/customer/cart' ? 'text-emerald-600 font-bold' : ''}`}>
                  Cart
                </button>
                <button onClick={() => navigate('/customer/notifications')} className={`hover:text-emerald-500 transition ${location.pathname === '/customer/notifications' ? 'text-emerald-600 font-bold' : ''}`}>
                  Notifications
                </button>
                <button onClick={() => navigate('/customer/settings')} className={`hover:text-emerald-500 transition ${location.pathname.startsWith('/customer/settings') ? 'text-emerald-600 font-bold' : ''}`}>
                  Profile
                </button>
              </>
            ) : (user.role === 'vendor' || user.role === 'vendor-staff' || user.role === 'store-manager') ? (
              <>
                <button onClick={() => navigate('/')} className={`hover:text-emerald-500 transition ${location.pathname === '/' ? 'text-emerald-600 font-bold' : ''}`}>
                  Home
                </button>
                <button onClick={() => navigate('/restaurant/dashboard')} className={`hover:text-emerald-500 transition ${location.pathname === '/restaurant/dashboard' ? 'text-emerald-600 font-bold' : ''}`}>
                  Dashboard
                </button>
                <button onClick={() => navigate('/restaurant/orders')} className={`hover:text-emerald-500 transition ${location.pathname === '/restaurant/orders' ? 'text-emerald-600 font-bold' : ''}`}>
                  Orders
                </button>
                <button onClick={() => navigate('/restaurant/menu')} className={`hover:text-emerald-500 transition ${location.pathname === '/restaurant/menu' ? 'text-emerald-600 font-bold' : ''}`}>
                  Menu
                </button>
                <button onClick={() => navigate('/restaurant/store-settings')} className={`hover:text-emerald-500 transition ${location.pathname === '/restaurant/store-settings' ? 'text-emerald-600 font-bold' : ''}`}>
                  Restaurant Settings
                </button>
              </>
            ) : user.role === 'rider' ? (
              <>
                <button onClick={() => navigate('/')} className={`hover:text-emerald-500 transition ${location.pathname === '/' ? 'text-emerald-600 font-bold' : ''}`}>
                  Home
                </button>
                <button onClick={() => navigate('/rider/dashboard')} className={`hover:text-emerald-500 transition ${location.pathname === '/rider/dashboard' ? 'text-emerald-600 font-bold' : ''}`}>
                  Dashboard
                </button>
                <button onClick={() => navigate('/rider/deliveries')} className={`hover:text-emerald-500 transition ${location.pathname === '/rider/deliveries' ? 'text-emerald-600 font-bold' : ''}`}>
                  Deliveries
                </button>
                <button onClick={() => navigate('/rider/earnings')} className={`hover:text-emerald-500 transition ${location.pathname === '/rider/earnings' ? 'text-emerald-600 font-bold' : ''}`}>
                  Earnings
                </button>
                <button onClick={() => navigate('/rider/profile')} className={`hover:text-emerald-500 transition ${location.pathname === '/rider/profile' ? 'text-emerald-600 font-bold' : ''}`}>
                  Profile
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-500" /> Deliver to: <strong className="text-gray-800 dark:text-gray-200">{currentAddressName || 'Takoradi'}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" /> Avg Rider ETA: <strong className="text-emerald-600">12 Mins</strong>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
