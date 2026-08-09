import {
  LayoutDashboard, Users, Shield, Cpu, Database, Plug2, ScrollText,
  Settings, UserCog, KeyRound, Archive, Bell, Store, Bike, CreditCard
} from 'lucide-react';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';

export function SuperAdminLayout() {
  const { vendors = [], riders = [], notifications = [] } = useApp();

  const pendingVendors = Array.isArray(vendors) ? vendors.filter(v => v && v.status === 'pending').length : 0;
  const pendingRiders = Array.isArray(riders) ? riders.filter(r => r && !r.isVerified).length : 0;
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter(n => n && !n.read).length : 0;

  const superAdminPortalConfig: PortalConfig = {
    module: 'super-admin',
    appName: 'OmniMarket',
    title: 'Super Admin',
    colors: 'from-rose-500 to-purple-700',
    logoGradient: 'from-rose-500 to-purple-700',
    iconColor: 'from-rose-400 to-purple-700',
    settingsPath: '/super-admin/platform-settings',
    notificationsPath: '/super-admin/notifications',
    footerTagline: 'Food delivery platform control & infrastructure console',
    mobileItems: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard' },
      { label: 'Admins', icon: Users, path: '/super-admin/admins' },
      { label: 'Approvals', icon: Store, path: '/super-admin/restaurant-approvals', badge: pendingVendors > 0 ? pendingVendors : undefined },
      { label: 'Riders', icon: Bike, path: '/super-admin/rider-approvals', badge: pendingRiders > 0 ? pendingRiders : undefined },
      { label: 'Settings', icon: Settings, path: '/super-admin/platform-settings' },
    ],
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard' },
      { label: 'Administrators', icon: Users, path: '/super-admin/admins' },
      { label: 'User Accounts', icon: Users, path: '/super-admin/users' },
      { label: 'Restaurant Approvals', icon: Store, path: '/super-admin/restaurant-approvals', badge: pendingVendors > 0 ? pendingVendors : undefined },
      { label: 'Rider Approvals', icon: Bike, path: '/super-admin/rider-approvals', badge: pendingRiders > 0 ? pendingRiders : undefined },
      { label: 'Roles', icon: UserCog, path: '/super-admin/roles' },
      { label: 'Permissions', icon: KeyRound, path: '/super-admin/permissions' },
      { label: 'System Settings', icon: Cpu, path: '/super-admin/system' },
      { label: 'Database', icon: Database, path: '/super-admin/database' },
      { label: 'API Management', icon: Plug2, path: '/super-admin/api' },
      { label: 'Payment Gateways', icon: CreditCard, path: '/super-admin/payment-gateways' },
      { label: 'Security', icon: Shield, path: '/super-admin/security' },
      { label: 'Audit Logs', icon: ScrollText, path: '/super-admin/audit' },
      { label: 'Platform Settings', icon: Settings, path: '/super-admin/platform-settings' },
      { label: 'Backup & Restore', icon: Archive, path: '/super-admin/backup' },
    ],
  };

  return <PortalLayout config={superAdminPortalConfig} />;
}
