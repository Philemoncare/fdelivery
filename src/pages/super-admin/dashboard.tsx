import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Store, Bike, ShoppingCart, TrendingUp, DollarSign,
  Shield, ScrollText, CheckCircle, Clock, AlertTriangle,
  Activity, RefreshCw, XCircle, Database
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import { ROLE_LABELS } from '@/src/lib/auth/types';

export function SuperAdminDashboardPage() {
  const { vendors, riders, orders, formatPrice, refreshData, isLoading } = useApp();
  const { user, sessions, refreshSessions } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    AdminService.getStats().then(setStats).catch(() => setStats(null));
    AdminService.getAudit().then(r => setAudit(Array.isArray(r) ? r : [])).catch(() => setAudit([]));
    AdminService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
  };
  useEffect(() => { load(); }, []);

  const activeSessions = useMemo(() => sessions.filter(s => !s.isCurrent).length, [sessions]);

  const auditEvents = audit.slice(0, 6);

  const statsCards = useMemo(() => {
    const s = stats || {};
    return [
      { label: 'Platform Revenue', value: formatPrice(s.revenue || 0), sub: `${s.completedOrders ?? 0} completed orders`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      { label: 'Gross Volume', value: formatPrice(s.revenue || 0), sub: 'Total order value', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Restaurants', value: String(s.vendors ?? vendors.length), sub: `${s.pendingVendors ?? 0} pending approval`, icon: Store, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
      { label: 'Delivery Fleet', value: String(s.riders ?? riders.length), sub: `${s.pendingRiders ?? 0} pending verification`, icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { label: 'Registered Users', value: String(s.users ?? 0), sub: `${s.customers ?? 0} customers`, icon: Users, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
      { label: 'Active Sessions', value: String(sessions.length), sub: `${activeSessions} other session${activeSessions === 1 ? '' : 's'}`, icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    ];
  }, [stats, sessions.length, activeSessions, vendors.length, riders.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    refreshSessions();
    load();
    setRefreshing(false);
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    preparing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ready_for_pickup: 'bg-violet-50 text-violet-700 border-violet-200',
    rider_assigned: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    picked_up: 'bg-teal-50 text-teal-700 border-teal-200',
    in_transit: 'bg-sky-50 text-sky-700 border-sky-200',
    arriving: 'bg-blue-50 text-blue-700 border-blue-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
    refunded: 'bg-rose-50 text-rose-700 border-rose-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  };

  const pendingApprovals = (stats?.pendingVendors ?? 0) + (stats?.pendingRiders ?? 0);
  const suspended = vendors.filter(v => v.status === 'suspended').length;
  const rejectedRiders = riders.filter(r => r.verificationStatus === 'rejected').length;
  const alerts = [
    ...(health && health.api?.status !== 'operational' ? ['API degraded'] : []),
    ...(health && health.database?.status !== 'operational' ? ['Database not persisted'] : []),
    ...(stats?.maintenanceMode ? ['Maintenance mode is ON'] : []),
    ...(suspended > 0 ? [`${suspended} suspended restaurant${suspended === 1 ? '' : 's'}`] : []),
  ];

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
            <h1 className="text-2xl sm:text-3xl font-bold">Super Admin Console</h1>
            <p className="text-purple-100 mt-1">
              {user ? `Signed in as ${user.displayName || user.email} · ${ROLE_LABELS[user.role]}` : 'Full platform control and global analytics'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-white/10 text-white border-0 backdrop-blur-sm">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              {isLoading ? 'Loading data…' : `${stats?.users ?? 0} users · ${stats?.orders ?? 0} orders`}
            </Badge>
            <Button onClick={handleRefresh} disabled={refreshing} className="bg-white/20 hover:bg-white/30 text-white border-0">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Syncing…' : 'Sync'}
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-rose-500" /> Audit Trail
            </CardTitle>
            <Badge variant="default">Server log</Badge>
          </CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              <div className="text-center py-8">
                <ScrollText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No audit events recorded yet. Actions taken on the platform will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {audit.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 text-sm py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${ev.result === 'failure' || ev.result === 'denied' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{ev.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 truncate">{ev.actorName} · {ev.entity}{ev.entityId ? ` · ${ev.entityId}` : ''}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(ev.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="w-5 h-5 text-blue-500" /> Order Pipeline
            </CardTitle>
            <Badge variant="default">{stats?.orders ?? 0} total</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
                <p className="text-xl font-bold text-amber-600">{stats?.pendingOrders ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">Pending</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
                <p className="text-xl font-bold text-blue-600">{stats?.activeOrders ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wide text-blue-700 dark:text-blue-400">In Progress</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                <p className="text-xl font-bold text-emerald-600">{stats?.completedOrders ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Completed</p>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {orders.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center italic">No orders yet</p>
              )}
              {orders.slice(0, 8).map(o => (
                <div key={o.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">#{o.id.slice(0, 8)}</p>
                    <p className="text-[10px] text-gray-500 truncate">{o.customerName || 'Customer'} · {o.vendorName || 'Vendor'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{formatPrice(o.totalAmount)}</span>
                    <Badge className={`text-[9px] font-black uppercase px-2 ${statusColor[o.status] || 'bg-gray-50 text-gray-600'}`} variant="outline">
                      {o.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-amber-500" /> Pending Approvals
            </CardTitle>
            <Badge variant={pendingApprovals > 0 ? 'warning' : 'success'}>
              {pendingApprovals} pending
            </Badge>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-emerald-500" /> Active Sessions
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refreshSessions}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center italic">No active sessions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.sessionId} className="border-b border-gray-50 dark:border-slate-800">
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 dark:text-white">{s.deviceName}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">{s.ipAddress}</td>
                      <td className="py-3 px-4 text-gray-500">{new Date(s.lastActivityAt).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {s.isCurrent ? <Badge variant="success">Current</Badge> : <Badge variant="warning">Other</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20">
              <XCircle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Suspended Restaurants</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{suspended}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
              <XCircle className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Rejected Riders</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{rejectedRiders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">System Alerts</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{alerts.length}</p>
              {alerts.length > 0 && <p className="text-[10px] text-amber-600 font-bold mt-0.5">{alerts.slice(0, 2).join(' · ')}</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">DB Records</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{health?.database?.records ?? '—'}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">{health?.database?.persisted ? 'Persisted' : 'Not persisted'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}