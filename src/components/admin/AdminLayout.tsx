import {
  LayoutDashboard, Users, Store, Bike, ShoppingBag, DollarSign,
  FileText, LifeBuoy, Settings, Package, Tags, Bell, MessageSquare,
  TicketPercent, Megaphone, UserCheck, ShieldCheck, Terminal,
  Truck, Activity, TrendingUp, AlertTriangle, Calendar, MapPin,
  Phone, Mail, Search, Filter, Download, Upload, Plus, Minus, Eye, EyeOff,
  Save, RotateCcw, Users as UsersIcon, Store as StoreIcon,
  CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PortalLayout, type PortalConfig } from '@/src/components/layouts/portal-layout';
import { useApp } from '@/src/context/AppContext';

export function AdminLayout() {
  const { orders = [], notifications = [], vendors = [], riders = [], formatPrice } = useApp() || {};
  const navigate = useNavigate();

  const activeOrders = Array.isArray(orders) ? orders.filter(o => o && o.status && !['delivered', 'completed', 'cancelled', 'failed'].includes(o.status.toLowerCase())).length : 0;
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter(n => n && !n.read).length : 0;

  const adminPortalConfig: PortalConfig = {
    module: 'admin',
    appName: 'OmniMarket',
    title: 'Admin Console',
    colors: 'from-primary to-primary-hover',
    logoGradient: 'from-primary to-primary-hover',
    iconColor: 'from-primary to-primary-hover',
    settingsPath: '/admin/settings',
    notificationsPath: '/admin/notifications',
    messagesPath: '/admin/messages',
    hideAvatarPaths: ['/admin/payments', '/admin/payouts'],
    statusChip: (
      <button
        onClick={() => navigate('/admin/live-operations')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition ${activeOrders > 0 ? 'bg-primary-soft text-primary border-primary-border' : 'bg-surface-2 dark:bg-slate-800 text-ink-3 dark:text-slate-300 border-line'}`}
        title="View live operations"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${activeOrders > 0 ? 'bg-primary animate-pulse' : 'bg-ink-3'}`} />
        {activeOrders > 0 ? `${activeOrders} Active` : 'Quiet'}
      </button>
    ),
    footerTagline: 'OmniMarket Platform Administration',
    mobileItems: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { label: 'Customers', icon: Users, path: '/admin/customers' },
      { label: 'Vendors', icon: Store, path: '/admin/vendors' },
      { label: 'Orders', icon: ShoppingBag, path: '/admin/orders', badge: activeOrders > 0 ? activeOrders : undefined },
      { label: 'Settings', icon: Settings, path: '/admin/settings' },
    ],
    sections: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
          { label: 'Live Operations', icon: Bell, path: '/admin/live-operations' },
        ]
      },
      {
        title: 'People',
        items: [
          { label: 'Customers', icon: Users, path: '/admin/customers' },
          { label: 'Vendors', icon: Store, path: '/admin/vendors' },
          { label: 'Restaurant Managers', icon: UserCheck, path: '/admin/managers' },
          { label: 'Riders', icon: Bike, path: '/admin/riders' },
        ]
      },
      {
        title: 'Food Operations',
        items: [
          { label: 'Restaurants', icon: Store, path: '/admin/restaurants' },
          { label: 'Meals', icon: Package, path: '/admin/meals' },
          { label: 'Categories', icon: Tags, path: '/admin/categories' },
        ]
      },
      {
        title: 'Orders & Delivery',
        items: [
          { label: 'Orders', icon: ShoppingBag, path: '/admin/orders', badge: activeOrders > 0 ? activeOrders : undefined },
          { label: 'Deliveries', icon: Bike, path: '/admin/deliveries' },
        ]
      },
      {
        title: 'Marketing',
        items: [
          { label: 'Coupons', icon: TicketPercent, path: '/admin/coupons' },
          { label: 'Promotions', icon: Megaphone, path: '/admin/promotions' },
          { label: 'Referrals', icon: UserCheck, path: '/admin/referrals' },
        ]
      },
      {
        title: 'Finance',
        items: [
          { label: 'Payments', icon: CreditCard, path: '/admin/payments' },
          { label: 'Payouts', icon: CreditCard, path: '/admin/payouts' },
        ]
      },
      {
        title: 'Engagement',
        items: [
          { label: 'Reviews', icon: MessageSquare, path: '/admin/reviews' },
          { label: 'Support', icon: LifeBuoy, path: '/admin/support' },
          { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
        ]
      },
      {
        title: 'Insights',
        items: [
          { label: 'Reports', icon: FileText, path: '/admin/reports' },
          { label: 'Analytics', icon: LayoutDashboard, path: '/admin/analytics' },
        ]
      },
      {
        title: 'Administration',
        items: [
          { label: 'Administrators', icon: ShieldCheck, path: '/admin/administrators' },
          { label: 'Audit Log', icon: Terminal, path: '/admin/audit-log' },
          { label: 'Settings', icon: Settings, path: '/admin/settings' },
        ]
      }
    ],
  };

  return <PortalLayout config={adminPortalConfig} />;
}
