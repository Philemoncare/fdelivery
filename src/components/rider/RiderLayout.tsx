import {
  LayoutDashboard, Bike, Truck, Navigation, Wallet,
  MessageSquare, UserRound, Map as MapIcon, Bell
} from 'lucide-react';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';

export const riderPortalConfig: PortalConfig = {
  module: 'rider',
  appName: 'OmniMarket',
  title: 'Rider Portal',
  colors: 'from-amber-500 to-orange-600',
  logoGradient: 'from-amber-400 to-orange-600',
  iconColor: 'from-amber-400 to-orange-600',
  settingsPath: '/rider/profile',
  notificationsPath: '/rider/notifications',
  messagesPath: '/rider/messages',
  footerTagline: 'Track deliveries, manage earnings and navigate efficiently',
  items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/rider/dashboard' },
    { label: 'Available Deliveries', icon: Bike, path: '/rider/jobs' },
    { label: 'My Deliveries', icon: Truck, path: '/rider/deliveries' },
    { label: 'Navigation', icon: Navigation, path: '/rider/navigation' },
    { label: 'Earnings', icon: Wallet, path: '/rider/earnings' },
    { label: 'Messages', icon: MessageSquare, path: '/rider/messages' },
    { label: 'Notifications', icon: Bell, path: '/rider/notifications' },
    { label: 'Profile', icon: UserRound, path: '/rider/profile' },
  ],
};

const ACTIVE_STATUSES = ['ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'];

export function RiderLayout() {
  const { orders, availableDeliveries, riderStatus, updateRiderStatus, showToast } = useApp();
  const { user } = useAuth();

  // Real counts only — the available pool comes from the backend endpoint and
  // the active badge reflects the rider's own in-flight deliveries.
  const availableJobs = Array.isArray(availableDeliveries) ? availableDeliveries.length : 0;
  const activeCount = orders.filter(o => o.riderId === user?.riderId && ACTIVE_STATUSES.includes(o.status)).length;
  const online = riderStatus !== 'OFFLINE';

  const config: PortalConfig = {
    ...riderPortalConfig,
    hideSidebar: true,
    hideAvatarPaths: ['/rider/earnings', '/rider/deliveries', '/rider/navigation'],
    items: riderPortalConfig.items?.map(item => {
      if (item.label === 'Available Deliveries') return { ...item, badge: availableJobs > 0 ? availableJobs : undefined };
      if (item.label === 'My Deliveries') return { ...item, badge: activeCount > 0 ? activeCount : undefined };
      return item;
    }),
    statusChip: (
      <button
        onClick={() => {
          updateRiderStatus(online ? 'OFFLINE' : 'ONLINE');
          showToast(online ? 'Going Offline' : 'Going Online', online ? 'You will stop receiving delivery requests.' : 'You are now available for deliveries.');
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition ${online ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300 border-gray-200 dark:border-slate-700'}`}
        title={online ? 'Tap to go offline' : 'Tap to go online'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
        {online ? 'Online' : 'Offline'}
      </button>
    ),
    mobileItems: [
      { label: 'Home', icon: LayoutDashboard, path: '/rider/dashboard' },
      { label: 'Jobs', icon: Bike, path: '/rider/jobs', badge: availableJobs > 0 ? availableJobs : undefined },
      { label: 'Active', icon: MapIcon, path: '/rider/deliveries', badge: activeCount > 0 ? activeCount : undefined },
      { label: 'Earnings', icon: Wallet, path: '/rider/earnings' },
      { label: 'Profile', icon: UserRound, path: '/rider/profile' },
    ],
  };

  return <PortalLayout config={config} />;
}