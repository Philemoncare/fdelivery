import {
  LayoutDashboard, ShoppingCart, Heart, Wallet,
  MessageSquare, MapPin, Bell, Star, Settings, UserRound, LifeBuoy,
  Store, Utensils, History
} from 'lucide-react';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';

export function CustomerLayout() {
  const { cartCount, wishlist, notifications, orders } = useApp();

  const unreadNotifs = notifications.filter(n => !n.read).length;
  const activeOrders = orders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status.toLowerCase())).length;

  const customerPortalConfig: PortalConfig = {
    module: 'customer',
    appName: 'OmniMarket',
    title: 'Customer App',
    colors: 'from-emerald-600 to-teal-500',
    logoGradient: 'from-emerald-500 to-teal-500',
    iconColor: 'from-emerald-400 to-teal-500',
    settingsPath: '/customer/settings',
    notificationsPath: '/customer/notifications',
    messagesPath: '/customer/messages',
    footerTagline: 'Track food orders, manage your wallet and order faster',
    mobileItems: [
      { label: 'Home', icon: LayoutDashboard, path: '/customer/dashboard' },
      { label: 'Restaurants', icon: Store, path: '/vendors' },
      { label: 'Orders', icon: History, path: '/customer/orders', badge: activeOrders > 0 ? activeOrders : undefined },
      { label: 'Cart', icon: ShoppingCart, path: '/customer/cart', badge: cartCount > 0 ? cartCount : undefined },
      { label: 'Profile', icon: UserRound, path: '/customer/settings' },
    ],
    sections: [
      {
        title: 'Home',
        items: [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/customer/dashboard' },
        ]
      },
      {
        title: 'Discover',
        items: [
          { label: 'Browse Restaurants', icon: Store, path: '/vendors' },
          { label: 'Browse Meals', icon: Utensils, path: '/products' },
          { label: 'Favorites', icon: Heart, path: '/customer/wishlist', badge: wishlist.length > 0 ? wishlist.length : undefined },
        ]
      },
      {
        title: 'Orders',
        items: [
          { label: 'My Orders', icon: History, path: '/customer/orders', badge: activeOrders > 0 ? activeOrders : undefined },
          { label: 'Cart', icon: ShoppingCart, path: '/customer/cart', badge: cartCount > 0 ? cartCount : undefined },
        ]
      },
      {
        title: 'Payments',
        items: [
          { label: 'Wallet', icon: Wallet, path: '/customer/wallet' },
        ]
      },
      {
        title: 'Saved',
        items: [
          { label: 'Saved Addresses', icon: MapPin, path: '/customer/addresses' },
        ]
      },
      {
        title: 'Communication',
        items: [
          { label: 'Messages', icon: MessageSquare, path: '/customer/messages', badge: 2 }, // Dummy badge for demo as requested
          { label: 'Notifications', icon: Bell, path: '/customer/notifications', badge: unreadNotifs > 0 ? unreadNotifs : undefined },
        ]
      },
      {
        title: 'Feedback',
        items: [
          { label: 'Reviews & Ratings', icon: Star, path: '/customer/reviews' },
        ]
      },
      {
        title: 'Account',
        items: [
          { label: 'Profile & Settings', icon: Settings, path: '/customer/settings' },
        ]
      },
      {
        title: 'Support',
        items: [
          { label: 'Help & Support', icon: LifeBuoy, path: '/customer/support' },
        ]
      },
    ],
  };

  return <PortalLayout config={customerPortalConfig} />;
}
