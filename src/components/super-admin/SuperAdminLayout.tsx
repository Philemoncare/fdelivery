import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';
import { buildSuperAdminNav } from '@/src/lib/super-admin-nav';

export function SuperAdminLayout() {
  const { vendors = [], riders = [], notifications = [] } = useApp();

  const pendingVendors = Array.isArray(vendors) ? vendors.filter(v => v && (v.status === 'pending' || v.verificationStatus === 'pending')).length : 0;
  const pendingRiders = Array.isArray(riders) ? riders.filter(r => r && (r.verificationStatus === 'pending' || !r.isVerified)).length : 0;
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter(n => n && !n.read).length : 0;

  const nav = buildSuperAdminNav({ pendingVendors, pendingRiders, unreadNotifs });

  const superAdminPortalConfig: PortalConfig = {
    module: 'super-admin',
    appName: 'OmniMarket',
    title: 'Control Center',
    colors: 'from-emerald-500 to-emerald-600',
    logoGradient: 'from-emerald-500 to-emerald-600',
    iconColor: 'from-emerald-500 to-emerald-600',
    settingsPath: '/super-admin/account',
    notificationsPath: '/super-admin/notifications',
    securityPath: '/super-admin/security',
    hideAvatarPaths: ['/super-admin/payment-gateways', '/super-admin/backup'],
    // No hard-coded status chip: the real, health-driven SystemStatus pill is
    // rendered by the portal header for every admin module.
    footerTagline: 'OmniMarket Infrastructure v1.0.0',
    mobileItems: nav.mobileItems,
    sections: nav.sections,
  };

  return <PortalLayout config={superAdminPortalConfig} />;
}