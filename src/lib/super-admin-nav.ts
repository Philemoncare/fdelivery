import {
  LayoutDashboard, Users, ShieldCheck, ShieldAlert, Cpu, Database, Plug2,
  Settings, UserCog, KeyRound, Archive, Bell, Store, Bike, CreditCard,
  LockKeyhole, Monitor, Wrench, History, Activity, Shield, ShoppingCart,
  ReceiptText, Wallet, FileText, Truck, ScrollText
} from 'lucide-react';
import type { PortalSection, PortalSidebarItem } from '@/src/components/layouts/portal-layout';

/**
 * Single source of truth for Super Admin navigation.
 *
 * Every sidebar entry, mobile shortcut and route path the super-admin console
 * exposes lives here. Pages must NOT hard-code their own nav; layouts render
 * what this config defines. `buildSuperAdminNav` receives the live badge
 * counts (pending approvals / unread notifications) and returns the resolved
 * structure consumed by PortalLayout.
 */

export type SuperAdminNavBadges = {
  pendingVendors: number;
  pendingRiders: number;
  unreadNotifs: number;
};

export type SuperAdminNavData = {
  sections: PortalSection[];
  mobileItems: PortalSidebarItem[];
};

/** Every unique route reachable from the super-admin navigation. */
export const SUPER_ADMIN_NAV_PATHS: string[] = [
  '/super-admin/dashboard',
  '/super-admin/platform-settings',
  '/super-admin/api',
  '/super-admin/system',
  '/super-admin/users',
  '/super-admin/admins',
  '/super-admin/roles-permissions',
  '/super-admin/sessions',
  '/super-admin/restaurant-approvals',
  '/super-admin/rider-approvals',
  '/super-admin/orders',
  '/super-admin/restaurants',
  '/super-admin/riders',
  '/super-admin/payment-gateways',
  '/super-admin/transactions',
  '/super-admin/wallets',
  '/super-admin/reports',
  '/super-admin/notifications',
  '/super-admin/deliveries',
  '/super-admin/system-logs',
  '/super-admin/security',
  '/super-admin/audit',
  '/super-admin/access-logs',
  '/super-admin/security-events',
  '/super-admin/database',
  '/super-admin/backup',
  '/super-admin/maintenance',
  '/super-admin/account',
  '/super-admin/roles',
  '/super-admin/permissions',
  '/super-admin/settings',
];

export function buildSuperAdminNav(badges: SuperAdminNavBadges): SuperAdminNavData {
  const b = badges || { pendingVendors: 0, pendingRiders: 0, unreadNotifs: 0 };
  return {
    mobileItems: [
      { label: 'Overview', icon: LayoutDashboard, path: '/super-admin/dashboard' },
      { label: 'Platform Settings', icon: Settings, path: '/super-admin/platform-settings' },
      { label: 'Security Center', icon: ShieldCheck, path: '/super-admin/security' },
      { label: 'Restaurant Approvals', icon: Store, path: '/super-admin/restaurant-approvals', badge: b.pendingVendors > 0 ? b.pendingVendors : undefined },
      { label: 'Account Settings', icon: UserCog, path: '/super-admin/account' },
    ],
    sections: [
      {
        title: 'Command Center',
        items: [
          { label: 'Overview', icon: LayoutDashboard, path: '/super-admin/dashboard' },
        ],
      },
      {
        title: 'Platform',
        items: [
          { label: 'Platform Settings', icon: Settings, path: '/super-admin/platform-settings' },
          { label: 'API Management', icon: Plug2, path: '/super-admin/api' },
          { label: 'System Health', icon: Activity, path: '/super-admin/system' },
        ],
      },
      {
        title: 'Identity & Access',
        items: [
          { label: 'Users', icon: Users, path: '/super-admin/users' },
          { label: 'Administrators', icon: Shield, path: '/super-admin/admins' },
          { label: 'Roles & Permissions', icon: KeyRound, path: '/super-admin/roles-permissions' },
          { label: 'Sessions', icon: Monitor, path: '/super-admin/sessions' },
        ],
      },
      {
        title: 'Marketplace',
        items: [
          { label: 'Restaurant Approvals', icon: Store, path: '/super-admin/restaurant-approvals', badge: b.pendingVendors > 0 ? b.pendingVendors : undefined },
          { label: 'Rider Approvals', icon: Bike, path: '/super-admin/rider-approvals', badge: b.pendingRiders > 0 ? b.pendingRiders : undefined },
          { label: 'Orders', icon: ShoppingCart, path: '/super-admin/orders' },
          { label: 'Restaurants', icon: Store, path: '/super-admin/restaurants' },
          { label: 'Riders', icon: Bike, path: '/super-admin/riders' },
        ],
      },
      {
        title: 'Finance',
        items: [
          { label: 'Payments & Gateways', icon: CreditCard, path: '/super-admin/payment-gateways' },
          { label: 'Transactions', icon: ReceiptText, path: '/super-admin/transactions' },
          { label: 'Wallets', icon: Wallet, path: '/super-admin/wallets' },
          { label: 'Financial Reports', icon: FileText, path: '/super-admin/reports' },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Notifications', icon: Bell, path: '/super-admin/notifications', badge: b.unreadNotifs > 0 ? b.unreadNotifs : undefined },
          { label: 'Delivery Operations', icon: Truck, path: '/super-admin/deliveries' },
          { label: 'System Logs', icon: ScrollText, path: '/super-admin/system-logs' },
        ],
      },
      {
        title: 'Security & Audit',
        items: [
          { label: 'Security Center', icon: ShieldCheck, path: '/super-admin/security' },
          { label: 'Audit Logs', icon: History, path: '/super-admin/audit' },
          { label: 'Access Logs', icon: LockKeyhole, path: '/super-admin/access-logs' },
          { label: 'Security Events', icon: ShieldAlert, path: '/super-admin/security-events' },
        ],
      },
      {
        title: 'System',
        items: [
          { label: 'Database', icon: Database, path: '/super-admin/database' },
          { label: 'Backup & Restore', icon: Archive, path: '/super-admin/backup' },
          { label: 'Maintenance', icon: Wrench, path: '/super-admin/maintenance' },
        ],
      },
      {
        title: 'Account',
        items: [
          { label: 'Account Settings', icon: UserCog, path: '/super-admin/account' },
        ],
      },
    ],
  };
}