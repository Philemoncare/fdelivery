import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Store, Bike, Shield, History, Activity, RefreshCw, Database,
  DollarSign, Plug2, Archive, Monitor, ShoppingCart, AlertTriangle,
  ChevronRight, Lock, BellRing, Clock, ListChecks, CreditCard,
  Settings, KeyRound, Wrench, ShieldCheck, TrendingUp, Package, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';
import { AdminPageHeader, AdminStatCard, AdminCard, AdminBadge, AdminSectionHeading, AdminStatus } from '@/src/components/super-admin/AdminDesignSystem';
import { cn } from '@/src/lib/utils';

const fmt = (n: number) => n.toLocaleString('en-US');

export function SuperAdminDashboardPage() {
  const { vendors, riders, formatPrice, refreshData, isLoading } = useApp();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    AdminService.getStats().then(setStats).catch(() => setStats(null));
    AdminService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
    AdminService.getPaymentOverview().then(setPayment).catch(() => setPayment(null));
    AdminService.getOrders()
      .then((rows: any) => setOrdersList(Array.isArray(rows) ? rows : rows?.orders || rows?.items || []))
      .catch(() => setOrdersList([]));
    AdminService.getAuditSummary().then(setAudit).catch(() => setAudit(null));
    AdminService.getSessions().then(s => setSessionCount(Array.isArray(s) ? s.filter(x => !x.revoked && !x.expired).length : null)).catch(() => setSessionCount(null));
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    load();
    setRefreshing(false);
  };

  const pendingApprovals = (stats?.pendingApprovals ?? ((stats?.pendingVendors ?? 0) + (stats?.pendingRiders ?? 0)));

  const services = [
    { key: 'api', label: 'Core API', ok: health?.api?.status === 'operational', detail: health?.api?.message },
    { key: 'database', label: 'Database', ok: health?.database?.status === 'operational', detail: `${health?.database?.records ?? '—'} records` },
    { key: 'auth', label: 'Auth', ok: health?.auth?.status === 'operational', detail: health?.auth?.message },
    { key: 'realtime', label: 'Realtime', ok: health?.realtime ? health?.realtime?.status === 'operational' : true, detail: `${health?.realtime?.activeConnections ?? 0} conns` },
    { key: 'payments', label: 'Payments', ok: health?.payments?.status === 'operational', detail: health?.payments?.message },
    { key: 'notifications', label: 'Notifs', ok: health?.notifications?.status === 'operational', detail: health?.notifications?.message },
  ];
  const allNominal = services.every(s => s.ok);

  const pmt = payment?.summary;
  const successRate = pmt?.totalTransactions ? Math.round((pmt.successful / pmt.totalTransactions) * 1000) / 10 : null;
  const criticalThreats = (audit?.bySeverity?.CRITICAL || 0) + (audit?.bySeverity?.HIGH || 0);

  // --- Marketplace activity (real order data) ---
  const now = new Date();
  const todayKey = now.toDateString();
  const ordersToday = ordersList.filter(o => new Date(o.createdAt).toDateString() === todayKey);
  const activeOrders = ordersList.filter(o => !['completed', 'delivered', 'cancelled', 'refunded', 'failed'].includes(o.status));
  const deliveryOrders = ordersList.filter(o => o.deliveryMethod === 'delivery');
  const activeDeliveries = activeOrders.filter(o => o.deliveryMethod === 'delivery');
  const pendingCount = ordersList.filter(o => o.status === 'pending').length;
  const deliveredCount = ordersList.filter(o => ['delivered', 'completed'].includes(o.status)).length;
  const cancelledCount = ordersList.filter(o => o.status === 'cancelled').length;
  const todayRevenue = ordersToday.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

  // --- Critical alerts ---
  const alerts: { level: AdminStatus; title: string; desc: string }[] = [];
  if (stats?.maintenanceMode) alerts.push({ level: 'warning', title: 'Maintenance Mode Active', desc: 'Platform is in restricted read-only mode. Check Platform Settings.' });
  if (successRate !== null && successRate < 90) alerts.push({ level: 'error', title: 'Payment Success Rate Dropped', desc: `Payment success rate is ${successRate}%. Review the payment gateways.` });
  if (criticalThreats > 0) alerts.push({ level: 'warning', title: 'Security Threats Detected', desc: `${criticalThreats} high/critical events in the audit trail. Review the Security Center.` });
  if (pendingApprovals > 0) alerts.push({ level: 'info', title: `${pendingApprovals} Pending Approvals`, desc: 'Restaurant and rider applications are waiting for review.' });
  if ((stats?.suspendedUsers ?? 0) > 0) alerts.push({ level: 'info', title: `${stats.suspendedUsers} Suspended Accounts`, desc: 'Some accounts are currently suspended.' });
  if (pendingCount > 0) alerts.push({ level: 'info', title: `${pendingCount} Orders Awaiting Action`, desc: 'Pending orders require restaurant or dispatch action.' });

  const kpis = [
    { label: 'Platform Revenue', hint: 'Gross revenue across all completed orders', value: formatPrice(stats?.revenue ?? 0), icon: DollarSign, status: 'success' as AdminStatus },
    { label: "Today's Revenue", hint: 'Revenue generated so far today', value: formatPrice(stats?.todayRevenue ?? 0), icon: TrendingUp, status: 'info' as AdminStatus },
    { label: 'Restaurants', hint: 'Registered restaurant vendors', value: String(stats?.vendors ?? vendors.length), icon: Store, status: 'info' as AdminStatus },
    { label: 'Riders', hint: 'Registered delivery partners', value: String(stats?.riders ?? riders.length), icon: Bike, status: 'warning' as AdminStatus },
    { label: 'Customers', hint: 'Registered customer accounts', value: String(stats?.customers ?? 0), icon: Users, status: 'info' as AdminStatus },
    { label: 'Active Orders', hint: 'Orders currently in flight across the platform', value: String(stats?.activeOrders ?? 0), icon: ShoppingCart, status: 'info' as AdminStatus },
  ];

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        title="Operations Control Center"
        description={user ? `System overview for ${user.displayName || user.email}` : 'Platform-wide administration and infrastructure command console.'}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-line">
              <span className={cn('w-2 h-2 rounded-full', allNominal ? 'bg-ok animate-pulse' : 'bg-danger')} />
              <span className="text-[10px] font-black text-ink uppercase tracking-wider">{allNominal ? 'All Systems Nominal' : 'Service Degradation'}</span>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold gap-2">
              <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} /> {refreshing ? 'Syncing' : 'Refresh'}
            </Button>
          </div>
        }
      />

      <AdminSectionHeading
        title="Infrastructure Health"
        description="Real-time status of core platform services and microservices."
        actions={<Link to="/super-admin/system" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">Detailed Health <ChevronRight className="w-3 h-3" /></Link>}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {services.map(s => (
          <AdminCard key={s.key} className="relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest">{s.label}</span>
                <span className={cn('w-2 h-2 rounded-full', s.ok ? 'bg-ok' : 'bg-danger')} />
              </div>
              <div className="text-sm font-bold text-ink">{s.ok ? 'Operational' : 'Degraded'}</div>
              <div className="text-xs text-ink-3 truncate">{s.detail || 'Status nominal'}</div>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <AdminStatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <AdminCard
              title="Pending Approvals"
              subtitle="Actionable Applications"
              icon={Clock}
              actions={<Link to="/super-admin/restaurant-approvals"><Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-wider">Review All</Button></Link>}
            >
              {pendingApprovals === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-ok-soft flex items-center justify-center mx-auto text-ok">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-ink-3 uppercase tracking-wider">Queue Clear</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vendors.filter(v => v.status === 'pending' || v.verificationStatus === 'pending').slice(0, 2).map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-2/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-ok-soft text-ok flex items-center justify-center"><Store className="w-4 h-4" /></div>
                        <div>
                          <p className="text-xs font-semibold text-ink">{v.name}</p>
                          <p className="text-[10px] text-ink-3 uppercase font-bold">Restaurant Partner</p>
                        </div>
                      </div>
                      <AdminBadge status="pending" label="Review" />
                    </div>
                  ))}
                  {riders.filter(r => r.verificationStatus === 'pending').slice(0, 2).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-2/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-warn-soft text-warn flex items-center justify-center"><Bike className="w-4 h-4" /></div>
                        <div>
                          <p className="text-xs font-semibold text-ink">{r.name}</p>
                          <p className="text-[10px] text-ink-3 uppercase font-bold">Delivery Rider</p>
                        </div>
                      </div>
                      <AdminBadge status="pending" label="Review" />
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            <AdminCard
              title="Payment Operations"
              subtitle={pmt ? `${pmt.totalTransactions} Transactions Processed` : 'Transaction Health'}
              icon={CreditCard}
              actions={<Link to="/super-admin/payment-gateways"><Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-wider">Gateways</Button></Link>}
            >
              {pmt ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Success Rate</span>
                    <span className={cn('text-sm font-bold', successRate !== null && successRate >= 90 ? 'text-ok' : 'text-danger')}>
                      {successRate !== null ? `${successRate}%` : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', successRate !== null && successRate >= 90 ? 'bg-ok' : 'bg-danger')} style={{ width: `${successRate ?? 0}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl border border-line text-center">
                      <p className="text-[10px] font-bold text-ink-3 uppercase mb-1">Failures</p>
                      <p className="text-lg font-bold text-danger">{pmt.failed}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-line text-center">
                      <p className="text-[10px] font-bold text-ink-3 uppercase mb-1">Refunds</p>
                      <p className="text-lg font-bold text-warn">{pmt.refunded}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-line flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Volume Today</span>
                    <span className="text-sm font-bold text-ink">{formatPrice(pmt.todayVolume ?? 0)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-ink-3 font-bold uppercase tracking-wider">No payment data available</div>
              )}
            </AdminCard>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <AdminCard
              title="Marketplace Activity"
              subtitle="Orders today across the platform"
              icon={ShoppingCart}
              actions={<Link to="/super-admin/orders"><Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-wider">All Orders</Button></Link>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-line text-center">
                    <p className="text-[10px] font-bold text-ink-3 uppercase mb-1">Orders Today</p>
                    <p className="text-lg font-bold text-ink">{fmt(ordersToday.length)}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-line text-center">
                    <p className="text-[10px] font-bold text-ink-3 uppercase mb-1">Today Revenue</p>
                    <p className="text-lg font-bold text-ink">{formatPrice(todayRevenue)}</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: 'Pending', hint: 'Orders awaiting restaurant or dispatch action', value: pendingCount, tone: 'bg-warn' },
                    { label: 'In Progress', hint: 'Orders being prepared, assigned, or en route', value: activeOrders.length, tone: 'bg-primary' },
                    { label: 'Delivered', hint: 'Orders completed and delivered to customers', value: deliveredCount, tone: 'bg-ok' },
                    { label: 'Cancelled', hint: 'Orders cancelled before completion', value: cancelledCount, tone: 'bg-danger' },
                  ].map(row => {
                    const max = Math.max(ordersList.length, 1);
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <AnimatedTooltip variant="sadoc" content={row.hint} triggerClassName="px-1 py-0.5">
                          <span className="w-20 text-[10px] font-bold text-ink-2 uppercase tracking-widest">{row.label}</span>
                        </AnimatedTooltip>
                        <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', row.tone)} style={{ width: `${(row.value / max) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right text-xs font-black text-ink">{row.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AdminCard>

            <AdminCard
              title="Delivery Operations"
              subtitle="Dispatch pipeline status"
              icon={Bike}
              actions={<Link to="/super-admin/deliveries"><Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-wider">Dispatch</Button></Link>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-line text-center">
                    <p className="text-[10px] font-bold text-ink-3 uppercase mb-1">Delivery Orders</p>
                    <p className="text-lg font-bold text-ink">{fmt(deliveryOrders.length)}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-line text-center">
                    <p className="text-[10px] font-bold text-ink-3 uppercase mb-1">In Transit</p>
                    <p className="text-lg font-bold text-ink">{fmt(activeDeliveries.length)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-2/40">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-ink-3" />
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Pickup Orders</span>
                  </div>
                  <span className="text-sm font-black text-ink">{fmt(ordersList.length - deliveryOrders.length)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-2/40">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-ink-3" />
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Active Sessions</span>
                  </div>
                  <span className="text-sm font-black text-ink">{sessionCount ?? '—'}</span>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>

        <div className="space-y-8">
          <AdminCard title="Critical Alerts" subtitle="Requires attention" icon={AlertTriangle} noPadding>
            <div className="divide-y divide-line">
              {alerts.length === 0 ? (
                <div className="px-6 py-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-ok-soft flex items-center justify-center mx-auto text-ok">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-ink-3 uppercase tracking-wider">All Clear</p>
                  <p className="text-[10px] text-ink-3 font-medium">No operational issues detected.</p>
                </div>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-start gap-3 hover:bg-surface-2/30 transition-colors">
                    <AdminBadge status={a.level} label="" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink">{a.title}</p>
                      <p className="text-[10px] text-ink-3 mt-0.5 leading-relaxed">{a.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminCard>

          <AdminCard
            title="Security Status"
            subtitle="Platform Hardening"
            icon={ShieldCheck}
            actions={<Link to="/super-admin/security"><ArrowUpRight className="w-4 h-4 text-ink-3 hover:text-primary transition-colors" /></Link>}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-line">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-ink-2" />
                  <span className="text-xs font-bold text-ink uppercase tracking-tight">Threat Level</span>
                </div>
                <AdminBadge status={criticalThreats > 0 ? 'warning' : 'success'} label={criticalThreats > 0 ? 'Elevated' : 'Stable'} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-ink-3" />
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Events (24h)</span>
                  </div>
                  <span className="text-xs font-bold text-ink">{audit?.last24h ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-ink-3" />
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Failed Actions</span>
                  </div>
                  <span className="text-xs font-bold text-danger">{audit?.failed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-ink-3" />
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Security Events</span>
                  </div>
                  <span className="text-xs font-bold text-ink">{audit?.security ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-ink-3" />
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Payment Events</span>
                  </div>
                  <span className="text-xs font-bold text-ink">{audit?.payments ?? 0}</span>
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Quick Controls" icon={Settings} noPadding>
            <div className="grid grid-cols-2 divide-x divide-y divide-line">
              {[
                { label: 'Database', icon: Database, to: '/super-admin/database' },
                { label: 'API Keys', icon: Plug2, to: '/super-admin/api' },
                { label: 'Broadcast', icon: BellRing, to: '/super-admin/notifications' },
                { label: 'Backups', icon: Archive, to: '/super-admin/backup' },
                { label: 'Roles', icon: KeyRound, to: '/super-admin/roles-permissions' },
                { label: 'Maintenance', icon: Wrench, to: '/super-admin/maintenance' },
              ].map(item => (
                <Link key={item.label} to={item.to} className="p-4 flex flex-col items-center gap-2 hover:bg-surface-2 transition-colors">
                  <item.icon className="w-5 h-5 text-ink-3" />
                  <span className="text-[10px] font-bold text-ink-2 uppercase tracking-widest">{item.label}</span>
                </Link>
              ))}
            </div>
          </AdminCard>

          {stats?.maintenanceMode && (
            <div className="p-4 rounded-2xl bg-warn-soft border border-warn/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warn flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-warn uppercase tracking-tight">Maintenance Active</p>
                <p className="text-[10px] text-warn mt-1">Platform is currently in read-only or restricted mode.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}