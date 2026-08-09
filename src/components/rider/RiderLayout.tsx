import {
  LayoutDashboard, Bike, History, Wallet, UserRound,
  Settings, Bell, MessageSquare, Star, TrendingUp, Navigation,
  Clock, Radio, CheckCircle2, ListFilter
} from 'lucide-react';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';

export const riderPortalConfig: PortalConfig = {
  module: 'rider',
  appName: 'OmniMarket',
  title: 'Rider Portal',
  colors: 'from-amber-500 to-orange-600',
  logoGradient: 'from-amber-400 to-orange-600',
  iconColor: 'from-amber-400 to-orange-600',
  settingsPath: '/rider/settings',
  notificationsPath: '/rider/notifications',
  messagesPath: '/rider/messages',
  footerTagline: 'Track deliveries, manage earnings and navigate efficiently',
  items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/rider/dashboard' },
    { label: 'Available Deliveries', icon: Bike, path: '/rider/jobs', badge: 3 },
    { label: 'Active Delivery', icon: History, path: '/rider/deliveries' },
    { label: 'Navigation Map', icon: Navigation, path: '/rider/navigation' },
    { label: 'Pickup Queue', icon: ListFilter, path: '/rider/pickup-queue' },
    { label: 'Delivery History', icon: History, path: '/rider/history' },
    { label: 'Earnings', icon: TrendingUp, path: '/rider/earnings' },
    { label: 'Wallet', icon: Wallet, path: '/rider/wallet' },
    { label: 'Ratings', icon: Star, path: '/rider/ratings' },
    { label: 'My Profile', icon: UserRound, path: '/rider/profile' },
    { label: 'Vehicle Info', icon: Bike, path: '/rider/profile' }, // Mapped to profile for now
    { label: 'Settings', icon: Settings, path: '/rider/settings' },
  ],
};

export function RiderLayout() {
  const { orders, notifications } = useApp();

  // Dynamic badges
  const availableJobs = orders.filter(o => o.status === 'ready_for_pickup' && !o.riderId).length;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const config: PortalConfig = {
    ...riderPortalConfig,
    items: riderPortalConfig.items?.map(item => {
      if (item.label === 'Available Deliveries') return { ...item, badge: availableJobs > 0 ? availableJobs : undefined };
      return item;
    }),
    mobileItems: [
      { label: 'Home', icon: LayoutDashboard, path: '/rider/dashboard' },
      { label: 'Deliveries', icon: Bike, path: '/rider/deliveries' },
      { label: 'Earnings', icon: Wallet, path: '/rider/earnings' },
      { label: 'Messages', icon: MessageSquare, path: '/rider/messages' },
      { label: 'Profile', icon: UserRound, path: '/rider/profile' },
    ],
  };

  return <PortalLayout config={config} />;
}
