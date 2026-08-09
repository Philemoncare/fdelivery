import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Store, Bike, CheckCircle, XCircle, Shield,
  Activity, Database, ScrollText, Lock, KeyRound, HardDrive,
  UserCog, Archive, Bell, CreditCard, FileText, Globe, AlertTriangle,
  Search, RefreshCw, Cpu, Save
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import { ROLE_PERMISSIONS, ROLE_LABELS, type Role, type Permission } from '@/src/lib/auth/types';
import { cn } from '@/src/lib/utils';

const ROSE = 'from-rose-500 to-purple-700';

const statusColor: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-gray-50 text-gray-700 border-gray-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unverified: 'bg-gray-50 text-gray-700 border-gray-200',
};

function PageHeader({ title, description, icon: Icon, count }: { title: string; description: string; icon: any; count?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between flex-wrap gap-4">
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br', ROSE)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">{description}</p>
        </div>
      </div>
      {count && <Badge variant="default">{count}</Badge>}
    </motion.div>
  );
}

/*
 * RESTAURANT APPROVALS — approve / reject real vendor records
 */
export function SuperAdminRestaurantApprovalsPage() {
  const { vendors, showToast, updateVendorProfile } = useApp();
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const filtered = vendors
    .filter(v => filter === 'all' || v.status === filter)
    .filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    pending: vendors.filter(v => v.status === 'pending').length,
    active: vendors.filter(v => v.status === 'active').length,
    suspended: vendors.filter(v => v.status === 'suspended').length,
    rejected: vendors.filter(v => v.status === 'rejected').length,
  };

  const decide = async (vendor: any, status: 'active' | 'rejected') => {
    const verification = status === 'active' ? 'verified' : 'rejected';
    try {
      await updateVendorProfile(vendor.id, { status, verificationStatus: verification } as any);
      showToast('Decision Recorded', `${vendor.name} marked as ${status}.`, status === 'active' ? 'success' : 'warning');
    } catch {
      showToast('Action Failed', 'Could not update restaurant status.', 'warning');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Store} title="Restaurant Approvals" description="Approve new restaurant partners, verify food safety docs, and monitor compliance." count={`${stats.pending} pending`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-emerald-600">{stats.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Suspended</p><p className="text-2xl font-bold text-rose-600">{stats.suspended}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Rejected</p><p className="text-2xl font-bold text-gray-700 dark:text-white">{stats.rejected}</p></CardContent></Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><Store className="w-5 h-5 text-violet-500" /> Restaurant Applications</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12 italic">No restaurants matched your criteria.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Restaurant</th>
                    <th className="py-4 px-6">Contact</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Verification</th>
                    <th className="py-4 px-6">Commission</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <img src={v.logo} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{v.name}</div>
                            <div className="text-xs text-gray-500">{v.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="text-sm">{v.email}</div>
                        <div className="text-xs text-gray-500">{v.phone}</div>
                      </td>
                      <td className="py-3 px-6"><Badge variant="outline" className={cn('text-[10px] font-black uppercase px-2', statusColor[v.status])}>{v.status}</Badge></td>
                      <td className="py-3 px-6"><Badge variant="outline" className={cn('text-[10px] font-black uppercase px-2', statusColor[v.verificationStatus])}>{v.verificationStatus}</Badge></td>
                      <td className="py-3 px-6 font-bold">{v.commissionRate}%</td>
                      <td className="py-3 px-6">
                        <div className="flex items-center justify-end gap-2">
                          {v.status === 'pending' || v.verificationStatus === 'rejected' ? (
                            <>
                              <Button size="sm" className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600" onClick={() => decide(v, 'active')} title="Approve"><CheckCircle className="w-4 h-4" /></Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-lg text-rose-600 hover:bg-rose-50" onClick={() => decide(v, 'rejected')} title="Reject"><XCircle className="w-4 h-4" /></Button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * RIDER APPROVALS
 * ------------------------------------------------------------
 */
export function SuperAdminRiderApprovalsPage() {
  const { riders, showToast, updateRiderProfile } = useApp();
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const filtered = riders.filter(r => filter === 'all' || r.verificationStatus === filter)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    pending: riders.filter(r => r.verificationStatus === 'pending').length,
    verified: riders.filter(r => r.verificationStatus === 'verified').length,
    rejected: riders.filter(r => r.verificationStatus === 'rejected').length,
  };

  const toggle = async (rider: any, newStatus: 'verified' | 'rejected') => {
    try {
      await updateRiderProfile(rider.id, { verificationStatus: newStatus, isVerified: newStatus === 'verified' });
      showToast('Decision Recorded', `${rider.name} marked as ${newStatus}.`, newStatus === 'verified' ? 'success' : 'warning');
    } catch {
      showToast('Action Failed', 'Could not update rider status.', 'warning');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Bike} title="Rider Approvals" description="Verify rider documents and vehicle permits for new fleet members." count={`${stats.pending} pending`} />
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pending Checks</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Verified</p><p className="text-2xl font-bold text-emerald-600">{stats.verified}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Rejected</p><p className="text-2xl font-bold text-gray-700 dark:text-white">{stats.rejected}</p></CardContent></Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><Bike className="w-5 h-5 text-amber-500" /> Rider Applications</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No riders matched your criteria.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Rider</th>
                    <th className="py-4 px-6">Vehicle</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Deliveries</th>
                    <th className="py-4 px-6">Rating</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <img src={r.avatar} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{r.name}</div>
                            <div className="text-xs text-gray-500">{r.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="text-sm">{r.vehicleType}</div>
                        <div className="text-xs text-gray-500">{r.vehicleNumber}</div>
                      </td>
                      <td className="py-3 px-6"><Badge variant="outline" className={cn('text-[10px] font-black uppercase px-2', statusColor[r.verificationStatus])}>{r.verificationStatus}</Badge></td>
                      <td className="py-3 px-6 font-bold">{r.totalDeliveries}</td>
                      <td className="py-3 px-6 font-bold">{r.rating} ★</td>
                      <td className="py-3 px-6">
                        <div className="flex items-center justify-end gap-2">
                          {r.verificationStatus === 'pending' || r.verificationStatus === 'rejected' ? (
                            <>
                              <button onClick={() => toggle(r, 'verified')} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-500 text-gray-400" title="Verify"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => toggle(r, 'rejected')} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-500 text-gray-400" title="Reject"><XCircle className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" /> Verified
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * PAYMENT GATEWAYS — real payment data from orders
 * ------------------------------------------------------------
 */
export function SuperAdminPaymentGatewaysPage() {
  const { orders, formatPrice } = useApp();

  const byMethod = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    orders.forEach(o => {
      if (!counts[o.paymentMethod]) counts[o.paymentMethod] = { count: 0, value: 0 };
      counts[o.paymentMethod].count += 1;
      counts[o.paymentMethod].value += o.totalAmount;
    });
    return Object.entries(counts).sort((a, b) => b[1].value - a[1].value);
  }, [orders]);

  const paid = orders.filter(o => o.isPaid || o.paymentStatus === 'paid').length;
  const pending = orders.filter(o => o.paymentStatus === 'pending').length;
  const failed = orders.filter(o => o.paymentStatus === 'failed').length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={CreditCard} title="Payment Gateways" description="Real payment methods used across platform orders, volumes, and statuses." count={`${orders.length} transactions`} />
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Paid</p><p className="text-2xl font-bold text-emerald-600">{paid}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-amber-600">{pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Failed</p><p className="text-2xl font-bold text-rose-600">{failed}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-500" /> Payment Methods (Real order data)</CardTitle></CardHeader>
        <CardContent>
          {byMethod.length === 0 ? (
            <p className="text-center text-gray-400 py-8 italic">No payment transactions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {byMethod.map(([method, d]) => (
                <div key={method} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{method}</p>
                    <p className="text-xs text-gray-500">{d.count} orders</p>
                  </div>
                  <div className="h-2 w-40 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.count ? Math.round((d.count / orders.length) * 100) : 0}%` }} />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{formatPrice(d.value)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ADMINISTRATORS — real RBAC management
 * ------------------------------------------------------------
 */
export function SuperAdminAdminsPage() {
  const { user } = useAuth();
  const adminRoles = (Object.keys(ROLE_LABELS) as Role[]).filter(r => r === 'administrator' || r === 'super-administrator');

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Users} title="Administrator Management" description="Manage platform administrators, roles, and their permissions." count={`${adminRoles.length} admin roles`} />
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Administrator Roles</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{adminRoles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Logged-in Session</p><p className="text-2xl font-bold text-rose-600">{user?.displayName || user?.email || '—'}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5 text-rose-500" /> Role-based Access</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adminRoles.map(role => (
              <div key={role} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-900 dark:text-white">{ROLE_LABELS[role]}</p>
                  <Badge variant={role === 'super-administrator' ? 'brand' : 'default'}>{role === user?.role ? 'Current' : role}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ROLE_PERMISSIONS[role].slice(0, 8).map(p => (
                    <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300">{p}</span>
                  ))}
                  {ROLE_PERMISSIONS[role].length > 8 && <span className="text-[10px] py-0.5 text-gray-400">+{ROLE_PERMISSIONS[role].length - 8} more</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * SECURITY
 * ------------------------------------------------------------
 */
export function SuperAdminSecurityPage() {
  const { user } = useAuth();
  const [audit, setAudit] = useState<any[]>([]);
  useEffect(() => {
    AdminService.getAudit().then(r => setAudit(Array.isArray(r) ? r : [])).catch(() => setAudit([]));
  }, []);

  const recent = audit
    .filter(e => e.action.toLowerCase().includes('login') || e.action.toLowerCase().includes('fail') || e.action.toLowerCase().includes('denied') || e.action.toLowerCase().includes('revoke') || e.action.toLowerCase().includes('suspend'))
    .slice(0, 6);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Shield} title="Security" description="Platform-wide security posture, policies, and device/session details from this console." count={`${audit.length} audit events`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="w-5 h-5 text-rose-500" /> Identity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><p className="text-xs text-gray-500">Operator</p><p className="font-bold">{user?.displayName || user?.email || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Role</p><p className="font-bold">{user ? ROLE_LABELS[user.role] : '—'}</p></div>
            <div><p className="text-xs text-gray-500">2FA</p><p className="font-bold">{user?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-500" /> Live Session</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-sm font-bold text-emerald-700">Authenticated &amp; active</p>
            </div>
            <p className="text-xs text-gray-500 mt-3">Access-controlled via server-side role middleware (RBAC).</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5 text-amber-500" /> Recent Security Events</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center italic">No security events recorded.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    <span className="font-medium">{e.action.replace(/_/g, ' ')}</span>
                    <span className="text-gray-400">{new Date(e.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * SYSTEM — live counts from real connected data
 * ------------------------------------------------------------
 */
export function SuperAdminSystemPage() {
  const { vendors, riders, orders, products, isLoading } = useApp();
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    AdminService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
  }, []);
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Cpu} title="System" description="Live platform statistics and real service health checks." count={isLoading ? 'loading…' : 'live'} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Restaurants', value: vendors.length, icon: Store, col: 'text-violet-500' },
          { label: 'Riders', value: riders.length, icon: Bike, col: 'text-amber-500' },
          { label: 'Orders', value: orders.length, icon: Activity, col: 'text-blue-500' },
          { label: 'Meals', value: products.length, icon: Database, col: 'text-emerald-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-5 flex items-center gap-4">
            <s.icon className={`w-5 h-5 ${s.col}`} />
            <div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" /> Service Health</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-xs text-emerald-700 font-bold uppercase">Core API</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{health?.api?.status === 'operational' ? 'Operational' : 'Checking…'}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs text-blue-700 font-bold uppercase">Live Feed (SSE)</p>
              <p className="text-lg font-bold text-blue-600 mt-1">{health?.realtime ? `${health.realtime.activeConnections ?? 0} connections` : 'Live'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <p className="text-xs text-gray-500 font-bold uppercase">Uptime</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{health?.uptime != null ? formatUptime(health.uptime) : '—'}</p>
            </div>
          </div>
          {health && (
            <div className="mt-4 grid md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-xs text-gray-500 font-bold uppercase">Database</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{health.database?.status === 'operational' ? 'Operational' : 'Unknown'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{health.database?.records ?? 0} records {health.database?.persisted ? '· persisted' : ''}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-xs text-gray-500 font-bold uppercase">Memory</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{health.memory?.used ?? 0} MB</p>
                <p className="text-[10px] text-gray-400 mt-0.5">heap used</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-xs text-gray-500 font-bold uppercase">Auth</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{health.auth?.status === 'operational' ? 'OK' : '—'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{health.auth?.message || ''}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * DATABASE
 * ------------------------------------------------------------
 */
export function SuperAdminDatabasePage() {
  const { vendors, riders, orders, products, categories, coupons, reviews, transactions } = useApp();
  const rows = [
    { name: 'Vendors', count: vendors.length },
    { name: 'Riders', count: riders.length },
    { name: 'Orders', count: orders.length },
    { name: 'Products / Meals', count: products.length },
    { name: 'Categories', count: categories.length },
    { name: 'Coupons', count: coupons.length },
    { name: 'Reviews', count: reviews.length },
    { name: 'Transactions', count: transactions.length },
  ];
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Database} title="Database" description="Record counts per entity collection, reflecting actual application state." count={`${total} total records`} />
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><HardDrive className="w-5 h-5 text-purple-500" /> Entity Collections</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rows.map(r => (
              <div key={r.name} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-xs text-gray-500">{r.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{r.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * API MANAGEMENT
 * ------------------------------------------------------------
 */
export function SuperAdminApiPage() {
  const endpoints = [
    '/api/vendors', '/api/products', '/api/categories', '/api/orders', '/api/riders',
    '/api/customers', '/api/wallets', '/api/notifications', '/api/reviews', '/api/realtime (SSE)',
    '/api/messages', '/api/search', '/api/health', '/api/auth/login',
  ];
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={FileText} title="API Gateway" description="Exposed OmniMarket API surface consumed by the frontend across all modules." count={`${endpoints.length} endpoints`} />
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5 text-rose-500" /> Registered Endpoints</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {endpoints.map(e => (
              <div key={e} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <Badge variant="outline" className="text-[9px] font-black">GET</Badge>
                <span className="text-sm font-mono text-gray-800 dark:text-slate-200">{e}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * AUDIT LOG
 * ------------------------------------------------------------
 */
export function SuperAdminAuditPage() {
  const [audit, setAudit] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    AdminService.getAudit().then(r => setAudit(Array.isArray(r) ? r : [])).catch(() => setAudit([]));
  }, []);
  const types = Array.from(new Set(audit.map(e => e.entity)));
  const filtered = audit.filter(e => filter === 'all' || e.entity === filter);
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={ScrollText} title="Audit Log" description="Immutable audit trail of administrative &amp; security events recorded on the server." count={`${audit.length} events`} />
      <Card className="rounded-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2"><ScrollText className="w-5 h-5 text-rose-500" /> Event Trail</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {types.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No audit events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Action</th>
                    <th className="py-4 px-6">Actor</th>
                    <th className="py-4 px-6">Resource</th>
                    <th className="py-4 px-6">Resource ID</th>
                    <th className="py-4 px-6">Result</th>
                    <th className="py-4 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6 font-medium capitalize">{e.action.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-6 text-sm">{e.actorName}{e.actorEmail ? ` (${e.actorEmail})` : ''}</td>
                      <td className="py-3 px-6"><Badge variant="outline">{e.entity}</Badge></td>
                      <td className="py-3 px-6 font-mono text-xs text-gray-500">{e.entityId || '—'}</td>
                      <td className="py-3 px-6"><Badge variant={e.result === 'success' ? 'success' : 'danger'}>{e.result}</Badge></td>
                      <td className="py-3 px-6 text-gray-500">{new Date(e.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ROLES
 * ------------------------------------------------------------
 */
export function SuperAdminRolesPage() {
  const roles = Object.entries(ROLE_LABELS) as [Role, string][];
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Users} title="Roles" description="Every role in the platform with its scope and module access." count={`${roles.length} roles`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(([role, label]) => (
          <Card key={role}>
            <CardContent className="p-5">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-900 dark:text-white">{label}</p>
                <Badge variant={role === 'super-administrator' ? 'brand' : 'default'}>{ROLE_PERMISSIONS[role].length} perms</Badge>
              </div>
              <div className="mt-3 text-xs text-gray-500">{ROLE_PERMISSIONS[role].slice(0, 4).map(p => p.split(':').pop()).join(', ')}{ROLE_PERMISSIONS[role].length > 4 ? '…' : ''}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * PERMISSIONS MATRIX
 * ------------------------------------------------------------
 */
export function SuperAdminPermissionsPage() {
  const roles = Object.keys(ROLE_LABELS) as Role[];
  const perms = ROLE_PERMISSIONS['super-administrator'];
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={KeyRound} title="Permissions Matrix" description="Granular permission mapping across every role (source: RBAC config)." count={`${perms.length} super-admin permissions`} />
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-5 h-5 text-amber-500" /> Role × Permission</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                <th className="py-3 px-5 sticky left-0 bg-white dark:bg-slate-900">Permission</th>
                {roles.map(r => <th key={r} className="py-3 px-2 text-center">{ROLE_LABELS[r].split(' ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {perms.map(p => (
                <tr key={p} className="border-b border-gray-50 dark:border-slate-800">
                  <td className="py-2.5 px-5 font-mono text-xs text-gray-700 dark:text-slate-300">{p}</td>
                  {roles.map(r => (
                    <td key={r} className="py-2.5 px-2 text-center">
                      {ROLE_PERMISSIONS[r].includes(p as Permission) ? <CheckCircle className="w-4 h-4 text-emerald-500 inline" /> : <XCircle className="w-4 h-4 text-gray-200 dark:text-slate-600 inline" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * BACKUP & RESTORE
 * ------------------------------------------------------------
 */
export function SuperAdminBackupPage() {
  const { showToast } = useApp();
  const [backup, setBackup] = useState<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    AdminService.getBackup().then(setBackup).catch(() => setBackup(null));
  }, []);

  const runBackup = async () => {
    setRunning(true);
    try {
      const res = await AdminService.createBackup();
      setBackup(res);
      showToast('Backup Created', 'A database backup was written to the server.', 'success');
    } catch (e: any) {
      showToast('Backup Failed', e?.message || 'Could not run backup.', 'warning');
    } finally {
      setRunning(false);
    }
  };

  const counts = backup?.db ? {
    vendors: backup.db.vendors?.length || 0,
    riders: backup.db.riders?.length || 0,
    orders: backup.db.orders?.length || 0,
    products: backup.db.products?.length || 0,
    users: backup.db.users?.length || 0,
    transactions: backup.db.transactions?.length || 0,
  } : null;
  const records = counts ? Object.values(counts).reduce((s, n) => s + n, 0) : 0;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={HardDrive} title="Backup & Restore" description="Create server-side database snapshots for recovery." count={backup?.createdAt ? `Backed up ${new Date(backup.createdAt).toLocaleString()}` : 'No backup yet'} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Records Snapshot</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{records}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Backup Status</p><p className="text-2xl font-bold text-emerald-600">{backup?.createdAt ? 'Server-side' : 'Not created'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Last Backup</p><p className="text-xl font-bold text-gray-900 dark:text-white">{backup?.createdAt ? new Date(backup.createdAt).toLocaleString() : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Backup File</p><p className="text-xl font-bold text-gray-900 dark:text-white truncate">{backup?.file || '—'}</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-6 flex items-center gap-4 flex-wrap">
          <Button onClick={runBackup} disabled={running} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"><HardDrive className="w-4 h-4 mr-2" /> {running ? 'Creating…' : 'Run Backup Now'}</Button>
          <p className="text-xs text-gray-500">Writes a full snapshot of the database to the server filesystem.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * NOTIFICATIONS
 * ------------------------------------------------------------
 */
export function SuperAdminNotificationsPage() {
  const { notifications, markNotificationRead, clearNotifications } = useApp();
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Bell} title="Notifications" description="Platform alerts and system announcements for the logged-in administrative account." count={`${unread} unread`} />
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" /> Inbox</CardTitle>
          <Button variant="outline" size="sm" onClick={clearNotifications}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Clear</Button>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-center text-gray-400 py-10 italic">No notifications for this account.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <button key={n.id} onClick={() => markNotificationRead(n.id)} className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${n.read ? 'bg-gray-300' : 'bg-rose-500'}`} />
                  <div className="flex-1">
                    <p className={`text-sm ${n.read ? 'text-gray-500' : 'font-bold text-gray-900 dark:text-white'}`}>{n.title}</p>
                    <p className="text-xs text-gray-500">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">{n.time}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * USER MANAGEMENT
 * ------------------------------------------------------------
 */
export function SuperAdminUsersPage() {
  const { showToast } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminService.getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerateTempPassword = async (userId: string) => {
    try {
      const res = await AdminService.adminGenerateTempPassword(userId);
      if (res.success && res.tempPassword) {
        showToast('Password Generated', `Temp password: ${res.tempPassword}. User must change it at login.`, 'success');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'warning');
    }
  };

  const handleForceReset = async (userId: string) => {
    try {
      await AdminService.adminForceReset(userId);
      showToast('Action Successful', 'User will be forced to reset password.', 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'warning');
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    try {
      await AdminService.adminRevokeSessions(userId);
      showToast('Sessions Revoked', 'All active sessions for this user have been terminated.', 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'warning');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Users} title="User Management" description="Manage all platform accounts, monitor activity, and perform security actions." count={`${users.length} total users`} />

      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base">All Accounts</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500 italic">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Security Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6">
                        <div className="font-medium text-gray-900 dark:text-white">{u.displayName || 'Unnamed User'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-6"><Badge variant="outline" className="capitalize">{u.role}</Badge></td>
                      <td className="py-3 px-6">
                        <Badge variant="outline" className={cn('text-[10px] font-black uppercase px-2', statusColor[u.status] || 'bg-gray-100')}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleForceReset(u.id)}>Force Reset</Button>
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleGenerateTempPassword(u.id)}>Temp Pass</Button>
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleRevokeSessions(u.id)}>Revoke Sessions</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}