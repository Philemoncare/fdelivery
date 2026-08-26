import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Store, Bike, ShoppingCart, DollarSign,
  FileText, Shield, Bell, CheckCircle, Clock, ArrowUpRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import { useNavigate } from 'react-router-dom';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';

export function AdminDashboardPage() {
  const { vendors, riders, orders, formatPrice, showToast, updateVendorProfile, updateRiderProfile } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'vendors' | 'riders' | 'orders'>('vendors');
  const [workingId, setWorkingId] = useState('');

  useEffect(() => {
    AdminService.getStats().then(setStats).catch(() => setStats(null));
  }, []);

  const pendingVendors = vendors.filter(v => v.status === 'pending' || v.verificationStatus === 'pending').slice(0, 3);
  const pendingRiders = riders.filter(r => r.verificationStatus === 'pending' || !r.isVerified).slice(0, 3);
  const pendingApprovalsCount =
    vendors.filter(v => v.status === 'pending' || v.verificationStatus === 'pending').length +
    riders.filter(r => r.verificationStatus === 'pending' || !r.isVerified).length;

  const statCards = useMemo(() => {
    const s = stats || {};
    return [
      { label: 'Total Revenue', hint: 'Gross revenue from all completed orders on the platform', value: formatPrice(s.revenue || 0), change: `${s.completedOrders ?? 0} completed`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      { label: 'Total Orders', hint: 'All orders placed across every restaurant', value: String(s.orders ?? orders.length), change: `${s.activeOrders ?? orders.filter(o => !['completed', 'delivered', 'cancelled', 'refunded', 'failed'].includes(o.status)).length} active`, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Restaurants', hint: 'Registered vendor stores on the platform', value: String(s.vendors ?? vendors.length), change: `${s.pendingVendors ?? 0} pending approval`, icon: Store, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
      { label: 'Riders', hint: 'Registered delivery partners available to fulfil orders', value: String(s.riders ?? riders.length), change: `${s.pendingRiders ?? 0} unverified`, icon: Bike, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    ];
  }, [stats, vendors.length, riders.length, orders]);

  const approveVendor = async (v: any) => {
    setWorkingId(v.id);
    try {
      await updateVendorProfile(v.id, { status: 'active', verificationStatus: 'verified', isApproved: true });
      showToast('Vendor Approved', `${v.name} is now live on the platform.`);
      AdminService.getStats().then(setStats);
    } catch (e: any) { showToast('Approval Failed', e?.message || 'Could not approve vendor.', 'warning'); } finally { setWorkingId(''); }
  };

  const approveRider = async (r: any) => {
    setWorkingId(r.id);
    try {
      await updateRiderProfile(r.id, { verificationStatus: 'verified', isVerified: true, isOnline: true, isAvailable: true });
      showToast('Rider Verified', `${r.name} can now accept deliveries.`);
      AdminService.getStats().then(setStats);
    } catch (e: any) { showToast('Verification Failed', e?.message || 'Could not verify rider.', 'warning'); } finally { setWorkingId(''); }
  };

  const actions = [
    { label: 'User Management', to: '/admin/users', icon: Users, desc: 'Global account control', color: 'blue' },
    { label: 'Platform Reports', to: '/admin/reports', icon: FileText, desc: 'Revenue & growth', color: 'violet' },
    { label: 'System Health', to: '/admin/settings', icon: Shield, desc: 'Real-time monitoring', color: 'emerald' },
    { label: 'Support', to: '/admin/support', icon: Bell, desc: 'Tickets & messages', color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20"
      >
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Console</h1>
            <p className="text-blue-100 mt-1">Full platform overview and control</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${stats ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-sm">{stats ? `${stats.users || 0} registered users` : 'Loading live data…'}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-6">
<div className="flex items-start justify-between">
                    <div>
                      <AnimatedTooltip
                        variant="gram"
                        content={s.hint}
                        triggerClassName="px-1 py-0.5"
                      >
                        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">{s.label}</p>
                      </AnimatedTooltip>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                      <p className="text-xs text-emerald-500 mt-1 font-bold">{s.change}</p>
                    </div>
                  <div className={`p-3 rounded-xl ${s.bg}`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-2xl shadow-sm border-gray-100 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Pending Approvals
          </CardTitle>
          <Badge variant="warning">{pendingApprovalsCount} pending</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {pendingVendors.map(v => (
              <div key={v.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 flex items-center justify-center shadow-inner">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{v.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Vendor · {v.categoryName || v.categoryId || '—'}</p>
                  </div>
                </div>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8 px-3 rounded-lg" disabled={workingId === v.id} onClick={() => approveVendor(v)}>
                  <CheckCircle className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {pendingRiders.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shadow-inner">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{r.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Rider · {r.vehicleType}</p>
                  </div>
                </div>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8 px-3 rounded-lg" disabled={workingId === r.id} onClick={() => approveRider(r)}>
                  <CheckCircle className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {pendingApprovalsCount === 0 && <p className="text-sm text-gray-500 py-6 text-center col-span-2 italic">All applications processed</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-gray-100 dark:border-slate-800 overflow-hidden">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b">
          <div className="flex gap-1 p-1 bg-gray-200/50 dark:bg-slate-900/50 rounded-xl w-fit">
            {(['vendors', 'riders', 'orders'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all capitalize tracking-widest ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === 'vendors' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/30 dark:bg-slate-800/30 border-b text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-4 px-6">Vendor</th>
                    <th className="py-4 px-6">Total Sales</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-10 italic">No restaurants registered yet.</td></tr>
                  ) : vendors.slice(0, 8).map(v => (
                    <tr key={v.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {v.logo ? <img src={v.logo} className="w-8 h-8 rounded-lg object-cover shadow-sm" /> : <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center text-violet-600"><Store className="w-4 h-4" /></div>}
                          <span className="font-bold text-gray-900 dark:text-white">{v.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold">{formatPrice(v.totalSales || 0)}</td>
                      <td className="py-4 px-6">
                        <Badge variant={v.status === 'active' ? 'success' : v.status === 'pending' ? 'warning' : 'danger'} className="text-[9px] font-black uppercase px-2">{v.status || 'active'}</Badge>
                      </td>
                      <td className="py-4 px-6 font-bold">{v.rating ?? '—'} {v.rating ? '★' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'riders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/30 dark:bg-slate-800/30 border-b text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-4 px-6">Rider</th>
                    <th className="py-4 px-6">Deliveries</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {riders.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-10 italic">No riders registered yet.</td></tr>
                  ) : riders.slice(0, 8).map(r => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {r.avatar ? <img src={r.avatar} className="w-8 h-8 rounded-lg object-cover shadow-sm" /> : <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600"><Bike className="w-4 h-4" /></div>}
                          <span className="font-bold text-gray-900 dark:text-white">{r.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold">{r.totalDeliveries || 0}</td>
                      <td className="py-4 px-6">
                        <Badge variant={r.isOnline ? 'success' : 'default'} className="text-[9px] font-black uppercase px-2">{r.isOnline ? 'online' : r.verificationStatus === 'pending' ? 'pending' : 'offline'}</Badge>
                      </td>
                      <td className="py-4 px-6 font-bold">{r.rating || '—'} {r.rating ? '★' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/30 dark:bg-slate-800/30 border-b text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-4 px-6">Order ID</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Total</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-10 italic">No orders placed yet.</td></tr>
                  ) : orders.slice(0, 10).map(o => (
                    <tr key={o.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-gray-500">#{o.id.slice(0, 8)}</td>
                      <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{o.customerName || 'Customer'}</td>
                      <td className="py-4 px-6 font-black text-emerald-600">{formatPrice(o.totalAmount)}</td>
                      <td className="py-4 px-6">
                        <Badge variant={o.status === 'completed' || o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'} className="text-[9px] font-black uppercase px-2">{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-10">
        {actions.map(a => (
          <div key={a.label} onClick={() => navigate(a.to)} className="border border-gray-100 dark:border-slate-800 rounded-xl group hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
            <div className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-${a.color}-50 dark:bg-${a.color}-900/20 text-${a.color}-500 shadow-sm group-hover:scale-110 transition-transform`}>
                <a.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{a.label}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">{a.desc}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}