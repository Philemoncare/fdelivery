import {
  LayoutDashboard, ShoppingBag, Users, BarChart3,
  Megaphone, Wallet, Store, Download, LifeBuoy,
  Bell, MessageSquare, Tags, UtensilsCrossed, ChefHat, UserRound, Users2, Star, Settings
} from 'lucide-react';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';

export function VendorLayout() {
  const { orders, notifications, conversations } = useApp();
  const { vendorId } = useAuth();

  const vendorOrders = orders.filter(o => o.vendorId === vendorId);
  const activeOrders = vendorOrders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status.toLowerCase())).length;
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const vendorPortalConfig: PortalConfig = {
    module: 'vendor',
    appName: 'OmniMarket',
    title: 'Restaurant Portal',
    colors: 'from-violet-500 to-purple-600',
    logoGradient: 'from-violet-500 to-purple-600',
    iconColor: 'from-violet-400 to-purple-600',
    settingsPath: '/restaurant/store-settings',
    notificationsPath: '/restaurant/notifications',
    messagesPath: '/restaurant/messages',
    footerTagline: 'Manage your restaurant, menu, orders and revenue',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/restaurant/dashboard' },
      { label: 'Orders', icon: ShoppingBag, path: '/restaurant/orders', badge: activeOrders > 0 ? activeOrders : undefined },
      { label: 'Menu', icon: UtensilsCrossed, path: '/restaurant/menu' },
      { label: 'Food Categories', icon: Tags, path: '/restaurant/categories' },
      { label: 'Kitchen Status', icon: ChefHat, path: '/restaurant/kitchen' },
      { label: 'Customers', icon: Users, path: '/restaurant/customers' },
      { label: 'Reviews', icon: Star, path: '/restaurant/reviews' },
      { label: 'Promotions', icon: Megaphone, path: '/restaurant/promotions' },
      { label: 'Analytics', icon: BarChart3, path: '/restaurant/analytics' },
      { label: 'Wallet', icon: Wallet, path: '/restaurant/wallet' },
      { label: 'Withdrawals', icon: Download, path: '/restaurant/withdrawals' },
      { label: 'Restaurant Profile', icon: UserRound, path: '/restaurant/store-settings' },
      { label: 'Staff Management', icon: Users2, path: '/restaurant/staff' },
      { label: 'Help & Support', icon: LifeBuoy, path: '/restaurant/support' },
    ],
    mobileItems: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/restaurant/dashboard' },
      { label: 'Orders', icon: ShoppingBag, path: '/restaurant/orders', badge: activeOrders > 0 ? activeOrders : undefined },
      { label: 'Menu', icon: UtensilsCrossed, path: '/restaurant/menu' },
      { label: 'Kitchen', icon: ChefHat, path: '/restaurant/kitchen' },
      { label: 'More', icon: Settings, path: '/restaurant/store-settings' },
    ],
  };

  return <PortalLayout config={vendorPortalConfig} />;
}
