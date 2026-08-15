import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Store, Bike, Shield, ScrollText, CheckCircle, Clock, AlertTriangle,
  Activity, RefreshCw, Database, Cpu, DollarSign, Plug2, Archive, Monitor, ShoppingCart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import { ROLE_LABELS } from '@/src/lib/auth/types';

const ROSE = 'from-rose-500 to-purple-700';

export function SuperAdminDashboardPage() {
  const { vendors, riders, orders, formatPrice, refreshData, isLoading } = useApp();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    AdminService.getStats().then(setStats).catch(() => setStats(null));
    AdminService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
    AdminService.getAudit({ limit: 8 })
      .then(r => setRecent(Array.isArray(r?.items) ? r.items : []))
      .catch(() => setRecent([]));
    AdminService.getAuditSummary().then(s => setSummary(s)).catch(() => setSummary(null));
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
  const suspendedUsers = stats?.suspendedUsers ?? 0;
  const admins = stats?.admins ?? 0;

  const services = [
    { key: 'api', label: 'Core API', ok: health?.api?.status === 'operational', detail: health?.api?.message },
    { key: 'database', label: 'Database', ok: health?.database?.status === 'operational', detail: `${health?.database?.records ?? '—'} records` },
    { key: 'auth', label: 'Auth', ok: health?.auth?.status === 'operational', detail: health?.auth?.message },
    { key: 'realtime', label: 'Live Feed', ok: health?.realtime ? health?.realtime?.status === 'operational' : true, detail: `${health?.realtime?.activeConnections ?? 0} connections` },
    { key: 'payments', label: 'Payments', ok: health?.payments?.status === 'operational', detail: health?.payments?.message },
    { key: 'notifications', label: 'Notifications', ok: health?.notifications?.status === 'operational', detail: health?.notifications?.message },
  ];

  const alerts = [
    ...(health?.payments && health.payments.status === 'degraded' ? ['Payment gateways degraded'] : []),
    ...(stats?.maintenanceMode ? ['Maintenance mode is ON'] : []),
    ...(summary && summary.total > 0 && summary.byAction && summary.byAction[0]?.[0] === 'Account locked' ? [`Lockout events: ${summary.byAction[0][1]}`] : []),
  ];

  const kpis = [
    { label: 'Revenue', value: formatPrice(stats?.revenue ?? 0), sub: `${stats?.completedOrders ?? 0} completed`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Restaurants', value: String(stats?.vendors ?? vendors.length), sub: `${stats?.pendingVendors ?? 0} pending`, icon: Store, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Riders', value: String(stats?.riders ?? riders.length), sub: `${stats?.pendingRiders ?? 0} pending`, icon: Bike, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Users', value: String(stats?.users ?? 0), sub: `${suspendedUsers} suspended`, icon: Users, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Orders', value: String(stats?.orders ?? orders.length), sub: `${stats?.activeOrders ?? 0} live`, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Active Sessions', value: String(sessionCount ?? '—'), sub: `${admins} admin accounts`, icon: Monitor, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  ];

  const securityCount = summary?.last24h ?? 0;

  return (
    <div className="space-y-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-purple-600 to-indigo-600 p-6 sm:p-8 text-white"
      >
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Command Center</h1>
            <p className="text-purple-100 mt-1">
              {user ? `Signed in as ${user.displayName || user.email} · ${ROLE_LABELS[user.role]}` : 'Full platform control and infrastructure overview'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-white/10 text-white border-0 backdrop-blur-sm">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              {isLoading ? 'Loading…' : `${stats?.users ?? 0} users · ${stats?.orders ?? 0} orders`}
            </Badge>
            <Button onClick={handleRefresh} disabled={refreshing} className="bg-white/20 hover:bg-white/30 text-white border-0">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Syncing…' : 'Sync'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Service status strip */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Cpu className="w-5 h-5 text-blue-500" /> Platform Status</CardTitle>
          <Badge variant={health?.status === 'ok' ? 'success' : 'warning'}>{health?.status === 'ok' ? 'Operational' : 'Checking…'}</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {services.map(s => (
              <div key={s.key} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.ok ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{s.label}</p>
                </div>
                <p className="text-xs font-black mt-1.5">{s.ok ? 'Operational' : s.label === 'Notifications' && health?.notifications?.status === 'disabled' ? 'Disabled' : 'Attention'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{s.detail || '—'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">{s.value}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 truncate">{s.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${s.bg} flex-shrink-0`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent administrative activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="w-5 h-5 text-rose-500" /> Recent Activity</CardTitle>
            <Badge variant="default">{summary?.last24h ?? 0} in 24h</Badge>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="text-center py-8">
                <ScrollText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No audit events recorded yet. Server-side actions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 text-sm py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${ev.result === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate capitalize">{String(ev.action).replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 truncate">{ev.actorName} · {ev.entity}{ev.entityId ? ` · ${ev.entityId}` : ''}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(ev.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="w-5 h-5 text-amber-500" /> Pending Approvals</CardTitle>
            <Badge variant={pendingApprovals > 0 ? 'warning' : 'success'}>{pendingApprovals} pending</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending applications</p>
              </div>
            ) : (
              <>
                {vendors.filter(v => v.status === 'pending' || v.verificationStatus === 'pending').slice(0, 3).map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 flex items-center justify-center flex-shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{v.name}</p>
                        <p className="text-[10px] text-gray-500">Restaurant</p>
                      </div>
                    </div>
                    <Badge variant="warning">pending</Badge>
                  </div>
                ))}
                {riders.filter(r => r.verificationStatus === 'pending').slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Bike className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{r.name}</p>
                        <p className="text-[10px] text-gray-500">Rider · {r.vehicleType}</p>
                      </div>
                    </div>
                    <Badge variant="warning">pending</Badge>
                  </div>
                ))}
              </>
            )}
            {alerts.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {alerts.length} alert{alerts.length === 1 ? '' : 's'}</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-1">{alerts.join(' · ')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="w-5 h-5 text-purple-500" /> Quick Actions</CardTitle>
            <Badge variant="default">{securityCount} security events / 24h</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'User Accounts', icon: Users, to: '/super-admin/users' },
                { label: 'Restaurant Approvals', icon: Store, to: '/super-admin/restaurant-approvals' },
                { label: 'Audit Logs', icon: ScrollText, to: '/super-admin/audit' },
                { label: 'Sessions', icon: Monitor, to: '/super-admin/sessions' },
                { label: 'Platform Settings', icon: Cpu, to: '/super-admin/platform-settings' },
                { label: 'Backup & Restore', icon: Archive, to: '/super-admin/backup' },
                { label: 'API Management', icon: Plug2, to: '/super-admin/api' },
                { label: 'Database', icon: Database, to: '/super-admin/database' },
              ].map(a => (
                <Link key={a.label} to={a.to}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group">
                  <a.icon className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">{a.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}