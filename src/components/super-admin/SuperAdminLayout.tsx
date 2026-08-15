import {
  LayoutDashboard, Users, ShieldCheck, ShieldAlert, Cpu, Database, Plug2, ScrollText,
  Settings, UserCog, KeyRound, Archive, Bell, Store, Bike, CreditCard, LockKeyhole, Monitor,
  Wrench, Megaphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';

export function SuperAdminLayout() {
  const { vendors = [], riders = [], notifications = [] } = useApp();
  const navigate = useNavigate();

  const pendingVendors = Array.isArray(vendors) ? vendors.filter(v => v && (v.status === 'pending' || v.verificationStatus === 'pending')).length : 0;
  const pendingRiders = Array.isArray(riders) ? riders.filter(r => r && (r.verificationStatus === 'pending' || !r.isVerified)).length : 0;
  const pendingApprovals = pendingVendors + pendingRiders;
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter(n => n && !n.read).length : 0;

  const superAdminPortalConfig: PortalConfig = {
    module: 'super-admin',
    appName: 'OmniMarket',
    title: 'Control Center',
    colors: 'from-primary to-primary-hover',
    logoGradient: 'from-primary to-primary-hover',
    iconColor: 'from-primary to-primary-hover',
    settingsPath: '/super-admin/platform-settings',
    notificationsPath: '/super-admin/notifications',
    securityPath: '/super-admin/security',
    hideAvatarPaths: ['/super-admin/payment-gateways', '/super-admin/backup'],
    statusChip: pendingApprovals > 0 ? (
      <button
        onClick={() => navigate('/super-admin/restaurant-approvals')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border bg-warn-soft text-warn border-warn/30 dark:border-warn/30"
        title="View pending approvals"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
        {pendingApprovals} Approval{pendingApprovals !== 1 ? 's' : ''}
      </button>
    ) : undefined,
    footerTagline: 'Food delivery platform command & infrastructure console',
    mobileItems: [
      { label: 'Overview', icon: LayoutDashboard, path: '/super-admin/dashboard' },
      { label: 'Users', icon: Users, path: '/super-admin/users' },
      { label: 'Approvals', icon: Store, path: '/super-admin/restaurant-approvals', badge: pendingApprovals > 0 ? pendingApprovals : undefined },
      { label: 'Audit', icon: ScrollText, path: '/super-admin/audit' },
      { label: 'Settings', icon: Settings, path: '/super-admin/platform-settings' },
    ],
    sections: [
      {
        title: 'Command Center',
        items: [
          { label: 'Overview', icon: LayoutDashboard, path: '/super-admin/dashboard' },
          { label: 'Platform Settings', icon: Settings, path: '/super-admin/platform-settings' },
        ],
      },
      {
        title: 'Identity & Access',
        items: [
          { label: 'User Accounts', icon: Users, path: '/super-admin/users' },
          { label: 'Administrators', icon: UserCog, path: '/super-admin/admins' },
          { label: 'Roles', icon: KeyRound, path: '/super-admin/roles' },
          { label: 'Permissions', icon: LockKeyhole, path: '/super-admin/permissions' },
        ],
      },
      {
        title: 'Marketplace Governance',
        items: [
          { label: 'Restaurant Approvals', icon: Store, path: '/super-admin/restaurant-approvals', badge: pendingVendors > 0 ? pendingVendors : undefined },
          { label: 'Rider Approvals', icon: Bike, path: '/super-admin/rider-approvals', badge: pendingRiders > 0 ? pendingRiders : undefined },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Payments & Gateways', icon: CreditCard, path: '/super-admin/payment-gateways' },
          { label: 'Maintenance', icon: Wrench, path: '/super-admin/maintenance' },
          { label: 'Platform Messages', icon: Megaphone, path: '/super-admin/messages' },
          { label: 'Notifications', icon: Bell, path: '/super-admin/notifications', badge: unreadNotifs > 0 ? unreadNotifs : undefined },
        ],
      },
      {
        title: 'System',
        items: [
          { label: 'System Health', icon: Cpu, path: '/super-admin/system' },
          { label: 'API Management', icon: Plug2, path: '/super-admin/api' },
          { label: 'Database', icon: Database, path: '/super-admin/database' },
          { label: 'Backup & Restore', icon: Archive, path: '/super-admin/backup' },
        ],
      },
      {
        title: 'Security & Audit',
        items: [
          { label: 'Security Center', icon: ShieldCheck, path: '/super-admin/security' },
          { label: 'Security Events', icon: ShieldAlert, path: '/super-admin/security-events' },
          { label: 'Sessions', icon: Monitor, path: '/super-admin/sessions' },
          { label: 'Audit Logs', icon: ScrollText, path: '/super-admin/audit' },
        ],
      },
    ],
  };

  return <PortalLayout config={superAdminPortalConfig} />;
}