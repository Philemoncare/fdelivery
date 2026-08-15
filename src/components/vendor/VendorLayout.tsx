import {
  LayoutDashboard, ShoppingBag, Users, BarChart3,
  Megaphone, Wallet, Download, LifeBuoy,
  Tags, UtensilsCrossed, ChefHat, UserRound, Users2, Star, Settings, Crown,
  FolderTree, Boxes, Truck, MessageSquare, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';

export function VendorLayout() {
  const { orders, notifications, vendors } = useApp();
  const { vendorId } = useAuth();
  const navigate = useNavigate();

  const vendorOrders = orders.filter(o => o.vendorId === vendorId);
  const activeOrders = vendorOrders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status.toLowerCase())).length;
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter(n => n && !n.read).length : 0;

  const currentVendor = vendors.find(v => v.id === vendorId);
  const kitchenOpen = !!currentVendor?.isKitchenOpen;

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
    hideAvatarPaths: ['/restaurant/wallet', '/restaurant/withdrawals', '/restaurant/subscription'],
    statusChip: (
      <button
        onClick={() => navigate('/restaurant/kitchen')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition ${kitchenOpen ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'}`}
        title="Tap to view kitchen status"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${kitchenOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        {kitchenOpen ? 'Kitchen Open' : 'Kitchen Paused'}
      </button>
    ),
    footerTagline: 'Manage your restaurant, menu, orders and revenue',
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/restaurant/dashboard' },
          { label: 'Orders', icon: ShoppingBag, path: '/restaurant/orders', badge: activeOrders > 0 ? activeOrders : undefined },
          { label: 'Kitchen Status', icon: ChefHat, path: '/restaurant/kitchen' },
          { label: 'Delivery Requests', icon: Truck, path: '/restaurant/delivery-requests' },
        ],
      },
      {
        title: 'Menu & Stock',
        items: [
          { label: 'Menu', icon: UtensilsCrossed, path: '/restaurant/menu' },
          { label: 'Food Categories', icon: FolderTree, path: '/restaurant/categories' },
          { label: 'Inventory', icon: Boxes, path: '/restaurant/inventory' },
        ],
      },
      {
        title: 'Growth',
        items: [
          { label: 'Customers', icon: Users, path: '/restaurant/customers' },
          { label: 'Reviews', icon: Star, path: '/restaurant/reviews' },
          { label: 'Promotions', icon: Megaphone, path: '/restaurant/promotions' },
          { label: 'Analytics', icon: BarChart3, path: '/restaurant/analytics' },
        ],
      },
      {
        title: 'Finance',
        items: [
          { label: 'Wallet', icon: Wallet, path: '/restaurant/wallet' },
          { label: 'Withdrawals', icon: Download, path: '/restaurant/withdrawals' },
          { label: 'Subscription', icon: Crown, path: '/restaurant/subscription' },
        ],
      },
      {
        title: 'Account',
        items: [
          { label: 'Restaurant Profile', icon: UserRound, path: '/restaurant/store-settings' },
          { label: 'Staff Management', icon: Users2, path: '/restaurant/staff' },
          { label: 'Notifications', icon: Bell, path: '/restaurant/notifications', badge: unreadNotifs > 0 ? unreadNotifs : undefined },
          { label: 'Help & Support', icon: LifeBuoy, path: '/restaurant/support' },
        ],
      },
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
