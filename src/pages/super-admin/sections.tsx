import { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import {
  Users, Store, Bike, CheckCircle, XCircle, Shield,
  Activity, Database, ScrollText, Lock, KeyRound, HardDrive,
  UserCog, Archive, Bell, CreditCard, FileText, Globe, AlertTriangle,
  Search, RefreshCw, Cpu, Save, ShieldAlert, Monitor, Trash2, Copy, Ban, ShieldCheck,
  MoreHorizontal, ChevronLeft, ChevronRight, Mail, Eye, X, Filter, Loader2, Inbox, Download,
  Server, ServerCog, Gauge, Timer, History, Power, Clock, Layers, KeySquare, ShieldOff, ChevronDown, ArrowUpRight,
  Wallet, Banknote, Smartphone, Webhook, Send, Package, Zap, Wrench, ListChecks, Info, MessageSquare, CalendarClock,
  CheckCircle2, ServerOff, Boxes
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/src/components/ui/skeleton';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import { AuthApiService } from '@/src/services/auth-api';
import { ROLE_PERMISSIONS, ROLE_LABELS, isSuperAdminRole, type Role, type Permission } from '@/src/lib/auth/types';
import { ConfirmDialog } from '@/src/components/common/ConfirmDialog';
import { SuperAdminDeliveryLogPage } from '@/src/pages/super-admin/messages';
import { cn } from '@/src/lib/utils';

const ROSE = 'bg-primary';

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
  const [pending, setPending] = useState<{ vendor: any; status: 'active' | 'rejected' } | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      await updateVendorProfile(vendor.id, { status, verificationStatus: verification } as any);
      showToast('Decision Recorded', `${vendor.name} marked as ${status}.`, status === 'active' ? 'success' : 'warning');
      setPending(null);
    } catch {
      showToast('Action Failed', 'Could not update restaurant status.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const confirmDecision = pending ? {
    approve: pending.status === 'active',
    title: pending.status === 'active' ? 'Approve this restaurant?' : 'Reject this restaurant?',
    description: pending.status === 'active'
      ? <><strong>{pending.vendor.name}</strong> will be approved and go live on the marketplace. This is visible to customers immediately.</>
      : <><strong>{pending.vendor.name}</strong> will be rejected and will not be listed on the marketplace. They can re-apply later.</>,
    label: pending.status === 'active' ? 'Approve Restaurant' : 'Reject Restaurant',
  } : null;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Store} title="Restaurant Approvals" description="Approve new restaurant partners, verify food safety docs, and monitor compliance." count={`${stats.pending} pending`} />
      {confirmDecision && pending && (
        <ConfirmDialog
          open
          tone={pending.status === 'active' ? 'primary' : 'danger'}
          icon={pending.status === 'active' ? 'shield' : 'alert'}
          title={confirmDecision.title}
          description={confirmDecision.description}
          confirmLabel={confirmDecision.label}
          busy={busy}
          busyLabel="Saving…"
          onConfirm={() => decide(pending.vendor, pending.status)}
          onCancel={() => setPending(null)}
        />
      )}
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
                              <Button size="sm" className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600" onClick={() => setPending({ vendor: v, status: 'active' })} title="Approve"><CheckCircle className="w-4 h-4" /></Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-lg text-rose-600 hover:bg-rose-50" onClick={() => setPending({ vendor: v, status: 'rejected' })} title="Reject"><XCircle className="w-4 h-4" /></Button>
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
  const [pending, setPending] = useState<{ rider: any; status: 'verified' | 'rejected' } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = riders.filter(r => filter === 'all' || r.verificationStatus === filter)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    pending: riders.filter(r => r.verificationStatus === 'pending').length,
    verified: riders.filter(r => r.verificationStatus === 'verified').length,
    rejected: riders.filter(r => r.verificationStatus === 'rejected').length,
  };

  const toggle = async (rider: any, newStatus: 'verified' | 'rejected') => {
    setBusy(true);
    try {
      await updateRiderProfile(rider.id, { verificationStatus: newStatus, isVerified: newStatus === 'verified' });
      showToast('Decision Recorded', `${rider.name} marked as ${newStatus}.`, newStatus === 'verified' ? 'success' : 'warning');
      setPending(null);
    } catch {
      showToast('Action Failed', 'Could not update rider status.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const confirmDecision = pending ? {
    approve: pending.status === 'verified',
    title: pending.status === 'verified' ? 'Verify this rider?' : 'Reject this rider?',
    description: pending.status === 'verified'
      ? <><strong>{pending.rider.name}</strong> will be verified and able to accept deliveries. This takes effect immediately.</>
      : <><strong>{pending.rider.name}</strong> will be rejected and will not be able to accept deliveries until re-verified.</>,
    label: pending.status === 'verified' ? 'Verify Rider' : 'Reject Rider',
  } : null;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Bike} title="Rider Approvals" description="Verify rider documents and vehicle permits for new fleet members." count={`${stats.pending} pending`} />
      {confirmDecision && pending && (
        <ConfirmDialog
          open
          tone={pending.status === 'verified' ? 'primary' : 'danger'}
          icon={pending.status === 'verified' ? 'shield' : 'alert'}
          title={confirmDecision.title}
          description={confirmDecision.description}
          confirmLabel={confirmDecision.label}
          busy={busy}
          busyLabel="Saving…"
          onConfirm={() => toggle(pending.rider, pending.status)}
          onCancel={() => setPending(null)}
        />
      )}
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
                              <button onClick={() => setPending({ rider: r, status: 'verified' })} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-500 text-gray-400" title="Verify"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => setPending({ rider: r, status: 'rejected' })} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-500 text-gray-400" title="Reject"><XCircle className="w-4 h-4" /></button>
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
  const { showToast } = useApp();
  const { user } = useAuth();
  const isSuper = !!user && isSuperAdminRole(user.role as Role);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('all');
  const [status, setStatus] = useState('all');

  const [selected, setSelected] = useState<any>(null);
  const [toggleTarget, setToggleTarget] = useState<any>(null);
  const [togglePassword, setTogglePassword] = useState('');
  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const d = await AdminService.getPaymentOverview();
      setData(d);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load payment operations');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const id = setInterval(() => load(true), 20000); return () => clearInterval(id); }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const summary = data?.summary || {};
  const providers = Array.isArray(data?.providers) ? data.providers : [];
  const transactions = Array.isArray(data?.transactions) ? data.transactions : [];
  const failures = Array.isArray(data?.failures) ? data.failures : [];
  const webhooks = data?.webhooks || {};
  const lastUpdatedSec = updatedAt ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : 0;

  const providerOptions = useMemo(() => Array.from(new Set(providers.map((p: any) => p.shortName || p.name).filter(Boolean))), [providers]);

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t: any) => {
      if (q && ![t.id, t.orderNumber, t.method, t.customer].some((v: any) => String(v || '').toLowerCase().includes(q))) return false;
      if (provider !== 'all' && !String(t.method).toLowerCase().includes(String(provider).toLowerCase()) && String(t.provider).toLowerCase() !== String(provider).toLowerCase()) return false;
      if (status !== 'all' && String(t.status || '').toLowerCase() !== status.toLowerCase()) return false;
      return true;
    }).sort((a: any, b: any) => new Date(b.createdAt)?.getTime() - new Date(a.createdAt)?.getTime());
  }, [transactions, search, provider, status]);

  const runToggle = async (enabled: boolean) => {
    if (!toggleTarget) return;
    if (!isSuper) { setToggleError('Super admin access required for this action.'); return; }
    setToggleBusy(true); setToggleError(null);
    try {
      const res: any = await AdminService.updatePaymentGateway(toggleTarget.id, { enabled }, togglePassword);
      if (res && !res?.requiresPassword) {
        showToast(enabled ? 'Payment method enabled' : 'Payment method disabled', `${toggleTarget.name} ${enabled ? 'enabled' : 'disabled'}.`, 'success');
        setToggleTarget(null); setTogglePassword(''); setToggleError(null);
        load(true);
      } else {
        setToggleError(res?.message || 'Operation not approved. Check your password or permission.');
      }
    } catch (e: any) {
      setToggleError(e?.message || 'Could not update payment method.');
    } finally {
      setToggleBusy(false);
    }
  };

  const summaryCards = [
    { label: 'Total Transactions', value: fmtNum(summary.totalTransactions), icon: Banknote, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Successful', value: fmtNum(summary.successful), icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Pending', value: fmtNum(summary.pending), icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Failed', value: fmtNum(summary.failed), icon: XCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Refunded', value: fmtNum(summary.refunded), icon: History, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Total Volume', value: fmtCurrency(summary.totalVolume), icon: Wallet, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: "Today's Volume", value: fmtCurrency(summary.todayVolume), icon: Zap, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
    { label: 'Failure Rate', value: pct(summary.failureRate), icon: AlertTriangle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
  ];

  const sel = selected;
  const selDisabled = sel && sel.kind === 'provider' ? !!(sel.provider.enabled === false || sel.provider.status === 'disabled') : false;

  if (loading || !data) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader icon={CreditCard} title="Payments & Gateways" description="Manage payment providers, payment availability, transaction health, failures, configuration, and payment security." count="loading telemetry" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Fragment key={i}><Skeleton className="h-20 rounded-2xl" /></Fragment>)}</div>
        <Skeleton className="h-48 rounded-2xl" />
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/10 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 flex-wrap">
            <span>Payment telemetry unavailable — {error}</span>
            <Button size="sm" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </div>
        )}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader icon={CreditCard} title="Payments & Gateways" description="Manage payment providers, availability, and transaction health." />
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900/40">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <ServerOff className="w-10 h-10 text-rose-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Payment operations unavailable</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">Could not reach the payments service. Reason: {error}</p>
            <Button onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={CreditCard} title="Payments & Gateways" description="Manage payment providers, payment availability, transaction health, failures, configuration, and payment security." count={`${fmtNum(summary.totalTransactions)} transactions`} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400"><Clock className="w-3.5 h-3.5" /> Last updated: {lastUpdatedSec} seconds ago · {data?.environment === 'production' ? 'Production' : 'Development'} environment</div>
        <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(c => (
          <div key={c.label} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2"><span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.color}`}><c.icon className="w-4 h-4" /></span><p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">{c.label}</p></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Webhook className="w-5 h-5 text-rose-500" /> Webhook Monitoring</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60"><p className="text-[11px] text-gray-500 dark:text-slate-400">Last webhook</p><p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{webhooks.lastWebhook || '—'}</p></div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60"><p className="text-[11px] text-gray-500 dark:text-slate-400">Last webhook at</p><p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{webhooks.lastWebhookAt ? new Date(webhooks.lastWebhookAt).toLocaleString() : '—'}</p></div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60"><p className="text-[11px] text-gray-500 dark:text-slate-400">Webhooks processed</p><p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{fmtNum(webhooks.totalProcessed)}</p></div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60"><p className="text-[11px] text-gray-500 dark:text-slate-400">Webhook failures</p><p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-0.5">{fmtNum(webhooks.failures)}</p></div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60"><p className="text-[11px] text-gray-500 dark:text-slate-400">Signature failures</p><p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-0.5">{fmtNum(webhooks.signatureFailures)}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-5 h-5 text-rose-500" /> Payment Providers</CardTitle></CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <EmptyState icon={<Banknote className="w-8 h-8 text-gray-300 dark:text-slate-600" />} title="No providers configured" description="No payment providers are configured yet." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {providers.map((p: any) => (
                <button key={p.id} onClick={() => setSelected({ kind: 'provider', provider: p })} className="text-left p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0"><Wallet className="w-4 h-4 text-rose-500 shrink-0" /><p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.shortName || p.name}</p></div>
                    <StateBadge state={p.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-slate-400">
                    <span className="font-mono text-gray-800 dark:text-slate-200">{fmtNum(p.transactions)}</span> tx
                    <span>{p.successRate != null ? `${p.successRate}%` : '—'} success</span>
                    <span>env {p.environment}</span>
                    {p.lastTransaction && <span>last {timeAgo(p.lastTransaction, now)}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {failures.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-500" /> Payment Failures</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {failures.map((f: any) => (
                <div key={f.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-[11px] flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0"><p className="font-semibold text-gray-800 dark:text-slate-200">{f.provider}</p><p className="text-gray-500 dark:text-slate-400">{f.customer} · {f.orderId}</p></div>
                  <span className="font-mono text-gray-800 dark:text-slate-200">{fmtCurrency(f.amount)}</span>
                  <span className="text-gray-500 dark:text-slate-400">{f.reason || 'Reason unavailable'}</span>
                  <span className="text-gray-400">{timeAgo(f.timestamp, now)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Banknote className="w-5 h-5 text-rose-500" /> Transactions</CardTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <div className="relative"><Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><Input className="pl-9" placeholder="Search ID, order, customer, method…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={provider} onValueChange={v => setProvider(v)}>
              <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All providers</SelectItem>{providerOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={v => setStatus(v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{['paid', 'pending', 'failed', 'refunded', 'cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setProvider('all'); setStatus('all'); }}>Clear filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTx.length === 0 ? (
            <EmptyState icon={<Banknote className="w-8 h-8 text-gray-300 dark:text-slate-600" />} title="No transactions" description="No transactions match the current filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead><tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400">{['Transaction', 'Order', 'Customer', 'Method', 'Amount', 'Status', 'Created'].map(h => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {filteredTx.map((t: any) => (
                    <tr key={t.id} onClick={() => setSelected({ kind: 'tx', tx: t })} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-slate-300">{String(t.id).slice(0, 12)}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{t.orderNumber}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{t.customer}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{t.method}</td>
                      <td className="px-3 py-2 font-mono text-gray-800 dark:text-slate-200">{fmtCurrency(t.amount)}</td>
                      <td className="px-3 py-2"><StateBadge state={t.status} /></td>
                      <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {sel && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col overflow-hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0"><Wallet className="w-4 h-4 text-rose-500 shrink-0" /><span className="text-sm font-mono text-gray-800 dark:text-slate-200 truncate">{sel.kind === 'provider' ? sel.provider.name : sel.tx.id}</span></div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {sel.kind === 'provider' ? (
                  <>
                    <div className="flex items-center gap-2"><StateBadge state={sel.provider.status} /><Badge variant="outline">{sel.provider.type}</Badge><span className="text-[11px] text-gray-400">env {sel.provider.environment}</span></div>
                    <section>
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Provider</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div><p className="text-gray-400">Name</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.provider.name}</p></div>
                        <div><p className="text-gray-400">Short</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.provider.shortName}</p></div>
                        <div><p className="text-gray-400">Configuration</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.provider.configured ? 'Configured' : 'Not Configured'}</p></div>
                        <div><p className="text-gray-400">Transactions</p><p className="text-gray-800 dark:text-slate-200 font-medium">{fmtNum(sel.provider.transactions)}</p></div>
                      </div>
                    </section>
                    <section>
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Performance</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div><p className="text-gray-400">Success rate</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.provider.successRate != null ? `${sel.provider.successRate}%` : '—'}</p></div>
                        <div><p className="text-gray-400">Failure rate</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.provider.failureRate != null ? `${sel.provider.failureRate}%` : '—'}</p></div>
                        <div><p className="text-gray-400">Last transaction</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.provider.lastTransaction ? timeAgo(sel.provider.lastTransaction, now) : '—'}</p></div>
                      </div>
                    </section>
                    <section>
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> API Credentials</h4>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 text-xs"><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.provider.configured ? 'Configured ✓' : 'Not Configured'}</p><p className="text-[11px] text-gray-400 mt-1">Credentials are stored securely and are never exposed.</p></div>
                    </section>
                    <section className="border-t border-gray-100 dark:border-slate-800 pt-4">
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Power className="w-3.5 h-3.5" /> Availability</h4>
                      {!isSuper ? (
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">Super admin access required to enable or disable this payment method.</p>
                      ) : toggleTarget ? (
                        <div className="space-y-2">
                          <Input type="password" placeholder="Enter your password to confirm" value={togglePassword} onChange={e => setTogglePassword(e.target.value)} />
                          {toggleError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{toggleError}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" disabled={toggleBusy} onClick={() => runToggle(selDisabled)}><Power className="w-3.5 h-3.5 mr-1" /> {toggleBusy ? 'Working…' : selDisabled ? 'Enable method' : 'Disable method'}</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setToggleTarget(null); setTogglePassword(''); setToggleError(null); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant={selDisabled ? 'success' : 'danger'} onClick={() => setToggleTarget(sel.provider)} disabled={!sel.provider.configured}>
                          <Power className="w-3.5 h-3.5 mr-1" /> {selDisabled ? 'Enable method' : 'Disable method'}
                        </Button>
                      )}
                      {!sel.provider.configured && <p className="text-[11px] text-gray-400 mt-2">Cannot be enabled until required configuration is provided.</p>}
                    </section>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2"><StateBadge state={sel.tx.status} /><Badge variant="outline">{sel.tx.method}</Badge></div>
                    <section>
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Transaction</h4>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div><p className="text-gray-400">ID</p><p className="text-gray-800 dark:text-slate-200 font-mono font-medium">{sel.tx.id}</p></div>
                        <div><p className="text-gray-400">Order</p><p className="text-gray-800 dark:text-slate-200 font-mono font-medium">{sel.tx.orderNumber}</p></div>
                        <div><p className="text-gray-400">Customer</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.tx.customer}</p></div>
                        <div><p className="text-gray-400">Amount</p><p className="text-gray-800 dark:text-slate-200 font-mono font-medium">{fmtCurrency(sel.tx.amount)}</p></div>
                        <div><p className="text-gray-400">Provider</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.tx.provider}</p></div>
                        <div><p className="text-gray-400">Created</p><p className="text-gray-800 dark:text-slate-200 font-medium">{new Date(sel.tx.createdAt).toLocaleString()}</p></div>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ADMINISTRATORS — real RBAC management
 * ------------------------------------------------------------
 */
export function SuperAdminAdminsPage() {
  const { user, showToast } = useApp();
  const adminRoles = (Object.keys(ROLE_LABELS) as Role[]).filter(r => r === 'administrator' || r === 'super-administrator');

  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: string; user: any } | null>(null);
  const [tempResult, setTempResult] = useState<{ user: any; password: string } | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await AdminService.getUsers();
      const list = Array.isArray(data) ? data : [];
      setAdmins(list.filter(u => u.role === 'administrator' || u.role === 'super-administrator'));
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load administrators.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const suspended = admins.filter(u => u.isSuspended).length;

  const runAction = async (u: any, kind: string) => {
    setBusyId(u.id);
    try {
      if (kind === 'suspend') {
        await AdminService.accountAction(u.id, 'suspend');
        showToast('Account Suspended', `${userDisplayName(u)} is signed out everywhere and blocked from signing in.`, 'success');
      } else if (kind === 'reactivate') {
        await AdminService.accountAction(u.id, 'reactivate');
        showToast('Account Reactivated', `${userDisplayName(u)} can sign in again.`, 'success');
      } else if (kind === 'force-reset') {
        await AdminService.adminForceReset(u.id);
        showToast('Password Reset', `${userDisplayName(u)} must set a new password at next sign-in.`, 'success');
      } else if (kind === 'revoke') {
        const res = await AdminService.adminRevokeSessions(u.id);
        const n = res?.revokedSessions ?? '';
        showToast('Sessions Revoked', `${userDisplayName(u)}'s active sessions${n ? ` (${n})` : ''} were terminated.`, 'success');
      }
      setConfirm(null);
      await fetchAdmins();
    } catch (e: any) {
      showToast('Action Failed', e?.message || 'Could not complete that action.', 'warning');
    } finally {
      setBusyId(null);
    }
  };

  const handleTempPassword = async (u: any) => {
    setBusyId(u.id);
    try {
      const res = await AdminService.adminGenerateTempPassword(u.id);
      if (res?.success && res.tempPassword) {
        setTempResult({ user: u, password: res.tempPassword });
        setConfirm(null);
        await fetchAdmins();
      } else {
        showToast('Action Failed', 'Could not generate a temporary password.', 'warning');
      }
    } catch (e: any) {
      showToast('Action Failed', e?.message || 'Could not generate a temporary password.', 'warning');
    } finally {
      setBusyId(null);
    }
  };

  const copyTempPassword = async () => {
    if (!tempResult) return;
    try {
      await navigator.clipboard.writeText(tempResult.password);
      showToast('Copied', 'Temporary password copied to clipboard.', 'success');
    } catch {
      showToast('Copy', 'Press Ctrl+C to copy.', 'info');
    }
  };

  const confirmProps = (() => {
    if (!confirm) return null;
    const { kind, user: u } = confirm;
    const label = userDisplayName(u);
    if (kind === 'suspend') return { tone: 'danger' as const, icon: 'user' as const, title: 'Suspend administrator?', description: <>You are about to <strong>suspend</strong> <strong>{label}</strong>. They will be signed out of every device immediately and blocked from signing in. Their data will not be deleted and they can be reactivated at any time.</>, confirmLabel: 'Suspend Account' };
    if (kind === 'reactivate') return { tone: 'primary' as const, icon: 'shield' as const, title: 'Reactivate account?', description: <><strong>{label}</strong> will be allowed to sign in again. Their previous settings, roles and data are preserved.</>, confirmLabel: 'Reactivate Account' };
    if (kind === 'force-reset') return { tone: 'warning' as const, icon: 'refresh' as const, title: 'Force password reset?', description: <><strong>{label}</strong> will be signed out and forced to create a new password on their next sign-in.</>, confirmLabel: 'Force Reset' };
    return { tone: 'warning' as const, icon: 'logout' as const, title: 'Revoke all sessions?', description: <>Every active session for <strong>{label}</strong> will be terminated immediately. They will need to sign in again on each device.</>, confirmLabel: 'Revoke Sessions' };
  })();

  const activeBusy = (u: any) => busyId === u.id;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={UserCog} title="Administrator Management" description="Manage platform administrators, roles, and their permissions with real account actions." count={`${admins.length} administrators`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Administrator Roles</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{adminRoles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Administrator Accounts</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{admins.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Suspended</p><p className="text-2xl font-bold text-rose-600">{suspended}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Logged-in Session</p><p className="text-2xl font-bold text-rose-600 truncate">{user?.displayName || user?.email || '—'}</p></CardContent></Card>
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

      <Card className="rounded-2xl">
        <CardHeader className="border-b"><CardTitle className="text-base">Administrators ({admins.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-14 text-center text-gray-400">Loading administrators…</div>
          ) : loadError ? (
            <div className="p-14 text-center">
              <p className="text-sm text-danger mb-3">{loadError}</p>
              <Button variant="outline" size="sm" onClick={fetchAdmins}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-14 text-center text-gray-400 italic">No administrator accounts found. Administrator accounts appear here automatically when assigned the administrator or super-administrator role.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Administrator</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Verification</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(u => {
                    const st = userStatusMeta(u);
                    const busy = activeBusy(u);
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 shrink-0 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-bold">{userInitials(u)}</div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">{userDisplayName(u)}{isSelf ? <span className="ml-1 text-[10px] text-primary font-bold">(You)</span> : null}</div>
                              <div className="text-xs text-gray-500 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6"><Badge variant="outline" className="capitalize">{String(u.role).replace(/-/g, ' ')}</Badge></td>
                        <td className="py-3 px-6"><Badge variant={st.variant} dot>{st.label}</Badge></td>
                        <td className="py-3 px-6">
                          {u.isVerified
                            ? <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>Verified</Badge>
                            : <Badge variant="outline" icon={<Mail className="w-3 h-3" />}>Unverified</Badge>}
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center justify-end gap-2">
                            {isSelf ? (
                              <span className="text-[10px] font-mono text-gray-400">protected</span>
                            ) : u.isSuspended ? (
                              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-ok border-ok/40 hover:bg-ok-soft" disabled={busy} onClick={() => setConfirm({ kind: 'reactivate', user: u })}>
                                {busy ? <Spinner /> : null} Reactivate
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-danger border-danger/40 hover:bg-danger-soft" disabled={busy} onClick={() => setConfirm({ kind: 'suspend', user: u })}>
                                {busy ? <Spinner /> : null} Suspend
                              </Button>
                            )}
                            <div className="relative">
                              <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg px-0" aria-label={`Actions for ${userDisplayName(u)}`} disabled={busy || isSelf} onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                              {menuFor === u.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                                  <div className="absolute right-0 mt-1 z-50 w-52 rounded-xl bg-surface dark:bg-slate-900 border border-line shadow-2xl p-1.5">
                                    {[
                                      { key: 'force-reset', label: 'Force Password Reset', icon: KeyRound, tone: 'text-ink-2' },
                                      { key: 'temp-pass', label: 'Generate Temp Password', icon: Lock, tone: 'text-ink-2' },
                                      { key: 'revoke', label: 'Revoke All Sessions', icon: Ban, tone: 'text-danger' },
                                    ].map(item => (
                                      <button
                                        key={item.key}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition hover:bg-surface-2 dark:hover:bg-slate-800"
                                        onClick={() => {
                                          setMenuFor(null);
                                          if (item.key === 'temp-pass') handleTempPassword(u);
                                          else setConfirm({ kind: item.key, user: u });
                                        }}
                                      >
                                        <item.icon className={cn('w-4 h-4', item.tone)} />
                                        <span className={item.tone}>{item.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {confirmProps && confirm && (
        <ConfirmDialog
          open
          tone={confirmProps.tone}
          icon={confirmProps.icon}
          title={confirmProps.title}
          description={confirmProps.description}
          confirmLabel={confirmProps.confirmLabel}
          busy={activeBusy(confirm.user)}
          busyLabel="Working…"
          onConfirm={() => runAction(confirm.user, confirm.kind)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {tempResult && (
        <ConfirmDialog
          open
          tone="info"
          icon="key"
          title="Temporary password generated"
          description={<>A one-time temporary password was generated for <strong>{userDisplayName(tempResult.user)}</strong>. Share it securely — it can only be viewed once.</>}
          confirmLabel="Copy Password"
          onConfirm={copyTempPassword}
          onCancel={() => setTempResult(null)}
        >
          <div className="rounded-xl bg-gray-50 dark:bg-slate-800 border border-line p-3 font-mono text-center text-sm break-all">{tempResult.password}</div>
        </ConfirmDialog>
      )}
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * SECURITY
 * ------------------------------------------------------------
 */
export function SuperAdminSecurityPage() {
  const { user, sessions } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    AdminService.getAuditSummary().then(setSummary).catch(() => setSummary(null));
    AdminService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
    if (user) {
      AuthApiService.getSessions(user.id).then(s => setMySessions(Array.isArray(s) ? s : [])).catch(() => setMySessions([]));
    }
  }, [user]);

  const securityEvents = (summary?.byAction || []).filter(([a]: any) =>
    String(a).toLowerCase().includes('login') ||
    String(a).toLowerCase().includes('lock') ||
    String(a).toLowerCase().includes('revoke') ||
    String(a).toLowerCase().includes('suspend') ||
    String(a).toLowerCase().includes('reset') ||
    String(a).toLowerCase().includes('password')
  );

  const active = (mySessions || []).filter(s => !s.revoked);
  const current = (mySessions || []).find(s => s.isCurrent);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Shield} title="Security Center" description="Security posture, identity, live sessions and platform access controls." count={`${summary?.total ?? 0} audit events`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="w-5 h-5 text-rose-500" /> Operator Identity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><p className="text-xs text-gray-500">Operator</p><p className="font-bold">{user?.displayName || user?.email || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Role</p><p className="font-bold">{user ? ROLE_LABELS[user.role] : '—'}</p></div>
            <div><p className="text-xs text-gray-500">2FA</p><p className="font-bold">{user?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</p></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-gray-700 dark:text-slate-300">RBAC Enforcement</p>
              <Badge variant="success">On</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Immutable Audit</p>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="w-5 h-5 text-emerald-500" /> Live Sessions</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {active.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center italic">No active sessions recorded.</p>
            ) : (
              active.slice(0, 5).map(s => (
                <div key={s.sessionId} className="flex items-start justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div>
                    <p className={`font-medium ${s.isCurrent ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>
                      {s.deviceName || 'Unknown device'} {s.isCurrent && <span className="text-[10px] font-black uppercase text-emerald-500">· this device</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.ipAddress || '—'} · last active {s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleString() : '—'}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> Security Event Mix</CardTitle></CardHeader>
          <CardContent>
            {securityEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center italic">No security events recorded.</p>
            ) : (
              <div className="space-y-2">
                {securityEvents.slice(0, 8).map(([a, n]: any) => (
                  <div key={a} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    <span className="font-medium capitalize">{String(a).replace(/_/g, ' ')}</span>
                    <Badge variant="outline">{n}</Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-3">Suspended accounts: {health?.security?.suspended ?? 0} · Audit events: {health?.security?.auditEvents ?? 0}</p>
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
  const { showToast } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const d = await AdminService.getSystemOverview();
      setData(d);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load system health');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const id = setInterval(() => load(true), 15000); return () => clearInterval(id); }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const runCheck = async () => {
    setChecking(true);
    try {
      await AdminService.runSystemHealthCheck();
      setError(null);
      await load(true);
      showToast('Health check complete', 'All monitored services re-verified from the backend.', 'success');
    } catch (e: any) {
      setError(e?.message || 'Health check failed');
    } finally {
      setChecking(false);
    }
  };

  const overall = data?.overall || {};
  const resources = data?.resources || {};
  const marketplace = data?.marketplace || {};
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
  const services = Array.isArray(data?.services) ? data.services : [];
  const lastUpdatedSec = updatedAt ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : 0;
  const overallStatus = String(overall.status || 'unknown');
  const overallBadge = overallStatus === 'operational' ? 'success' : overallStatus === 'down' ? 'danger' : 'warning';
  const overallDot = overallStatus === 'operational' ? 'bg-emerald-500' : overallStatus === 'down' ? 'bg-rose-500' : 'bg-amber-500';

  const marketplaceCards = [
    { label: 'Restaurants', value: marketplace.restaurants, icon: Store, to: '/super-admin/restaurant-approvals' },
    { label: 'Riders', value: marketplace.riders, icon: Bike, to: '/super-admin/rider-approvals' },
    { label: 'Customers', value: marketplace.customers, icon: Users, to: '/super-admin/users' },
    { label: 'Orders', value: marketplace.orders, icon: Activity, to: null },
    { label: 'Active Deliveries', value: marketplace.activeDeliveries, icon: Package, to: null },
    { label: 'Pending Approvals', value: marketplace.pendingApprovals, icon: ListChecks, to: '/super-admin/restaurant-approvals' },
    { label: 'Failed Payments', value: marketplace.failedPayments, icon: Banknote, to: '/super-admin/payment-gateways' },
  ];

  const summaryCards = [
    { label: 'Services Healthy', value: `${fmtNum(overall.healthy)}/${fmtNum(overall.total)}`, icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Degraded', value: fmtNum(overall.degraded), icon: Activity, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Down', value: fmtNum(overall.down), icon: XCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Active Incidents', value: fmtNum(incidents.length), icon: AlertTriangle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Requests/min', value: fmtNum(resources.requestRatePerMin), icon: Gauge, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Error Rate', value: pct(resources.errorRate), icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Active Sessions', value: fmtNum(resources.activeSessions), icon: Monitor, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Realtime', value: fmtNum(resources.realtimeConnections), icon: Server, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
  ];

  if (loading || !data) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader icon={ServerCog} title="System Health" description="Monitor the live health of OmniMarket services, infrastructure, realtime connections, database, authentication, payments, and marketplace operations." count="checking telemetry" />
        <div className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300"><RefreshCw className="w-4 h-4 animate-spin text-rose-500" /> Checking services…</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Fragment key={i}><Skeleton className="h-20 rounded-2xl" /></Fragment>)}</div>
        <Skeleton className="h-48 rounded-2xl" />
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/10 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 flex-wrap">
            <span>Health telemetry unavailable — {error}</span>
            <Button size="sm" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </div>
        )}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader icon={ServerCog} title="System Health" description="Monitor the live health of OmniMarket services and infrastructure." />
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900/40">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <ServerOff className="w-10 h-10 text-rose-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">System health unavailable</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">Could not reach the health service. Reason: {error}</p>
            <Button onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={ServerCog} title="System Health" description="Monitor the live health of OmniMarket services, infrastructure, realtime connections, database, authentication, payments, and marketplace operations." count={`${fmtNum(overall.total)} services`} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400"><Clock className="w-3.5 h-3.5" /> Last checked: {lastUpdatedSec} seconds ago · uptime {data && data.uptime != null ? `< ${Math.floor(data.uptime / 60)}m` : 'unavailable'}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Refresh Health</Button>
          <Button size="sm" onClick={runCheck} disabled={checking}><RefreshCw className={`w-4 h-4 mr-1 ${checking ? 'animate-spin' : ''}`} /> {checking ? 'Checking…' : 'Run Health Check'}</Button>
          <Link to="/super-admin/security-events" className="inline-flex items-center gap-1 text-xs text-rose-500 font-semibold"><History className="w-3.5 h-3.5" /> Incident History</Link>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-800/40 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${overallDot} animate-pulse`} />
          <div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-wide font-bold">System Status</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">{overall.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-slate-400">
          <span><b className="text-gray-800 dark:text-slate-200">{fmtNum(overall.healthy)}/{fmtNum(overall.total)}</b> services healthy</span>
          <span>{data?.environment === 'production' ? 'Production' : 'Development'} environment</span>
        </div>
        {data?.maintenance?.mode && <Badge variant="warning" dot>Maintenance active</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(c => (
          <div key={c.label} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2"><span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.color}`}><c.icon className="w-4 h-4" /></span><p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">{c.label}</p></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Server className="w-5 h-5 text-rose-500" /> Service Health</CardTitle></CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <EmptyState icon={<Server className="w-8 h-8 text-gray-300 dark:text-slate-600" />} title="No services reported" description="The backend did not report any service health yet." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {services.map((s: any) => (
                <div key={s.name} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">{s.name}</p>
                    <StateBadge state={s.status} />
                  </div>
                  {s.message && <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2">{s.message}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-slate-400">
                    {s.responseTimeMs != null && <span className="flex items-center gap-1"><Timer className="w-3 h-3 text-gray-400" />{fmtNum(s.responseTimeMs)}ms</span>}
                    {s.lastChecked && <span>checked {timeAgo(s.lastChecked, now)}</span>}
                    {s.uptime != null && <span>uptime {fmtNum(s.uptime)}s</span>}
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-gray-400" />{pct(s.errorRate)} err</span>
                    {s.version && <span className="font-mono">v{s.version}</span>}
                    {s.records != null && <span>{fmtNum(s.records)} records</span>}
                    {s.activeConnections != null && <span>{fmtNum(s.activeConnections)} conns</span>}
                    {s.active != null && <span>{fmtNum(s.active)} active</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="w-5 h-5 text-rose-500" /> Resource Monitoring</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { label: 'Memory (heap)', value: `${fmtNum(resources.memory?.heapUsedMB)}/${fmtNum(resources.memory?.heapTotalMB)} MB`, icon: HardDrive },
              { label: 'CPU', value: resources.cpu != null ? `${resources.cpu}%` : 'unavailable', icon: Cpu },
              { label: 'DB Records', value: fmtNum(resources.dbRecords), icon: Database },
              { label: 'Realtime Conns', value: fmtNum(resources.realtimeConnections), icon: Server },
              { label: 'Request Rate', value: `${fmtNum(resources.requestRatePerMin)}/min`, icon: Gauge },
              { label: 'Error Rate', value: pct(resources.errorRate), icon: AlertTriangle },
              { label: 'Background Jobs', value: fmtNum(resources.backgroundJobs), icon: Boxes },
              { label: 'Queue Length', value: fmtNum(resources.queueLength), icon: Layers },
              { label: 'Active Sessions', value: fmtNum(resources.activeSessions), icon: Monitor },
            ].map((r, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60">
                <r.icon className="w-4 h-4 text-gray-400 mb-2" />
                <p className="text-[11px] text-gray-500 dark:text-slate-400">{r.label}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{r.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="w-5 h-5 text-rose-500" /> Marketplace Health</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {marketplaceCards.map((m, i) => {
              const inner = (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors flex items-center gap-3">
                  <m.icon className="w-5 h-5 text-rose-500 shrink-0" />
                  <div className="min-w-0"><p className="text-lg font-bold text-gray-900 dark:text-white">{fmtNum(m.value)}</p><p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{m.label}</p></div>
                  {m.to && <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 ml-auto shrink-0" />}
                </div>
              );
              return m.to ? <Link key={i} to={m.to}>{inner}</Link> : <div key={i}>{inner}</div>;
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-500" /> Active Incidents</CardTitle></CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /> No active incidents</div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc: any, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Badge variant={inc.severity === 'critical' ? 'danger' : 'warning'} dot>{inc.service}</Badge>{inc.title}</p>
                    {inc.reason && <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">{inc.reason}</p>}
                  </div>
                  <div className="text-right shrink-0 text-[11px] text-gray-400"><p>Started {timeAgo(inc.startedAt, now)}</p><Link to="/super-admin/security-events" className="text-rose-500 font-semibold">View Details</Link></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2"><KeyRound className="w-4 h-4 text-rose-500" /> Related Console Pages</p>
          <div className="flex flex-wrap gap-2">
            {[
              { to: '/super-admin/api', label: 'API Management', icon: ServerCog },
              { to: '/super-admin/security', label: 'Security Center', icon: ShieldCheck },
              { to: '/super-admin/audit', label: 'Audit Logs', icon: History },
              { to: '/super-admin/notifications', label: 'Notifications', icon: Bell },
              { to: '/super-admin/payment-gateways', label: 'Payments & Gateways', icon: CreditCard },
            ].map(l => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-800 transition-colors"><l.icon className="w-3.5 h-3.5 text-rose-500" /> {l.label}</Link>
            ))}
          </div>
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
const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
  PUT: 'bg-violet-50 text-violet-700 border-violet-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_META: Record<string, { variant: 'success' | 'warning' | 'danger' | 'outline'; label: string }> = {
  HEALTHY: { variant: 'success', label: 'HEALTHY' },
  DEGRADED: { variant: 'warning', label: 'DEGRADED' },
  DOWN: { variant: 'danger', label: 'DOWN' },
  BLOCKED: { variant: 'danger', label: 'BLOCKED' },
  DISABLED: { variant: 'outline', label: 'DISABLED' },
};

const RISK_BADGE: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SERVICE_ORDER: string[] = [
  'Core API', 'Database', 'Auth', 'Realtime', 'Payments', 'Notifications',
  'Orders', 'Delivery', 'Security', 'Messaging', 'Wallet',
];

const API_CONSOLE_GROUP_ORDER: string[] = [
  'Control Center', 'Identity & Governance', 'Operations', 'System & Audit', 'Other',
];

function fmtNum(n: any): string {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString() : '0';
}

function pct(n: any): string {
  const v = Number(n);
  return Number.isFinite(v) ? `${v.toFixed(1)}%` : '0%';
}

function timeAgo(t: any, now: number): string {
  if (!t) return '—';
  const ts = Date.parse(t);
  if (Number.isNaN(ts)) return '—';
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  return new Date(ts).toLocaleTimeString();
}

const SVC_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'outline' | 'info'; label: string; dot: string }> = {
  operational: { variant: 'success', label: 'Operational', dot: 'bg-emerald-500' },
  healthy: { variant: 'success', label: 'Healthy', dot: 'bg-emerald-500' },
  enabled: { variant: 'success', label: 'Enabled', dot: 'bg-emerald-500' },
  configured: { variant: 'success', label: 'Configured', dot: 'bg-emerald-500' },
  available: { variant: 'success', label: 'Available', dot: 'bg-emerald-500' },
  active: { variant: 'success', label: 'Active', dot: 'bg-emerald-500' },
  degraded: { variant: 'warning', label: 'Degraded', dot: 'bg-amber-500' },
  warning: { variant: 'warning', label: 'Degraded', dot: 'bg-amber-500' },
  maintenance: { variant: 'warning', label: 'Maintenance', dot: 'bg-amber-500' },
  disabled: { variant: 'outline', label: 'Disabled', dot: 'bg-gray-400' },
  down: { variant: 'danger', label: 'Down', dot: 'bg-rose-500' },
  failed: { variant: 'danger', label: 'Failed', dot: 'bg-rose-500' },
  unknown: { variant: 'outline', label: 'Unknown', dot: 'bg-gray-400' },
  not_configured: { variant: 'outline', label: 'Not Configured', dot: 'bg-gray-400' },
  scheduled: { variant: 'info', label: 'Scheduled', dot: 'bg-blue-500' },
  sent: { variant: 'success', label: 'Sent', dot: 'bg-emerald-500' },
  queued: { variant: 'warning', label: 'Queued', dot: 'bg-amber-500' },
  sending: { variant: 'info', label: 'Sending', dot: 'bg-blue-500' },
  processing: { variant: 'info', label: 'Processing', dot: 'bg-blue-500' },
  paid: { variant: 'success', label: 'Paid', dot: 'bg-emerald-500' },
  pending: { variant: 'warning', label: 'Pending', dot: 'bg-amber-500' },
  refunded: { variant: 'info', label: 'Refunded', dot: 'bg-blue-500' },
  cancelled: { variant: 'outline', label: 'Cancelled', dot: 'bg-gray-400' },
  success: { variant: 'success', label: 'Success', dot: 'bg-emerald-500' },
};

function StateBadge({ state, className }: { state: string; className?: string }) {
  const s = String(state || 'unknown').toLowerCase();
  const m = SVC_BADGE[s] || { variant: 'outline' as const, label: state || 'Unknown', dot: 'bg-gray-400' };
  return <Badge variant={m.variant} dot className={className}>{m.label}</Badge>;
}

function fmtCurrency(n: any, currency = 'GHS'): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0.00';
  const formatted = v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency}${formatted}`;
}

function ServiceHealthTile({ name, svc, now }: { name: string; svc: any; now: number }) {
  const status = String(svc?.status || 'operational').toLowerCase();
  const ok = status === 'operational' || status === 'up';
  const degraded = status === 'degraded';
  const detail: { label: string; value: any }[] = [];
  if (svc?.records != null) detail.push({ label: 'records', value: fmtNum(svc.records) });
  if (svc?.activeConnections != null) detail.push({ label: 'connections', value: fmtNum(svc.activeConnections) });
  if (svc?.queued != null) detail.push({ label: 'queued', value: fmtNum(svc.queued) });
  if (svc?.active != null) detail.push({ label: 'active', value: fmtNum(svc.active) });
  if (svc?.riders != null) detail.push({ label: 'riders', value: fmtNum(svc.riders) });
  if (svc?.events != null) detail.push({ label: 'events', value: fmtNum(svc.events) });
  if (svc?.conversations != null) detail.push({ label: 'conversations', value: fmtNum(svc.conversations) });
  if (svc?.wallets != null) detail.push({ label: 'wallets', value: fmtNum(svc.wallets) });
  if (svc?.message) detail.push({ label: 'message', value: svc.message });
  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">{name}</p>
        </div>
        <Badge variant={degraded ? 'warning' : ok ? 'success' : 'danger'} dot>
          {degraded ? 'degraded' : ok ? 'up' : 'down'}
        </Badge>
      </div>
      {detail.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {detail.map(d => (
            <span key={d.label} className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400">
              <span className="font-mono text-gray-800 dark:text-slate-200 font-medium">{d.value}</span>
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityRow({ ep, now }: { ep: any; now: number }) {
  const s = ep?.security || {};
  const ev = s?.eventCount || 0;
  const blocked = s?.blockedRequests || 0;
  const risk = s?.risk || 'LOW';
  const last = s?.lastEvent;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500 dark:text-slate-400">
      <span className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-rose-500" />
        <span className="font-semibold text-gray-700 dark:text-slate-300">{fmtNum(ev)}</span> security events
      </span>
      <span className="flex items-center gap-1.5">
        <Ban className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-700 dark:text-slate-300">{fmtNum(blocked)}</span> blocked
      </span>
      <span className="flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-gray-400" /> risk
        <Badge variant="outline" className={`text-[10px] px-1.5 ${RISK_BADGE[risk] || RISK_BADGE.LOW}`}>{risk}</Badge>
      </span>
      {last && (
        <span className="w-full md:w-auto text-gray-600 dark:text-slate-400">
          Last security event: <span className="font-mono text-gray-800 dark:text-slate-200">{last.type || last.detection || 'anomaly'}</span>{' '}
          <span className="text-gray-400">{timeAgo(last.timestamp, now)}</span> — Action: {last.actionTaken || last.action || 'none'} ({last.status || '—'})
        </span>
      )}
    </div>
  );
}

function EndpointRow({ ep, now, onView, isSuper }: { ep: any; now: number; onView: () => void; isSuper: boolean }) {
  const status = String(ep?.status || 'DOWN').toUpperCase();
  const meta = STATUS_META[status] || STATUS_META.DOWN;
  const m = ep?.metrics || {};
  const s = ep?.security || {};
  const disabled = ep?.disabled === true || status === 'DISABLED';
  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={`text-[9px] font-black px-2 ${METHOD_COLOR[ep?.method] || ''}`}>{ep?.method}</Badge>
          <span className="text-xs font-mono text-gray-800 dark:text-slate-200 truncate">{ep?.path}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ep?.auth === false && <Badge variant="outline" className="text-[9px]">public</Badge>}
          {ep?.destructive && <Badge variant="danger" className="text-[9px]">destructive</Badge>}
          <Badge variant={meta.variant} dot>{meta.label}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-gray-400" /><b className="text-gray-700 dark:text-slate-300">{fmtNum(m.requestsPerMinute)}</b>/min</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-gray-400" /><b className="text-gray-700 dark:text-slate-300">{pct(m.errorRate)}</b> errors</span>
        <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5 text-gray-400" /><b className="text-gray-700 dark:text-slate-300">{fmtNum(m.avgMs)}ms</b> avg</span>
        {ep?.rateLimit && <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-gray-400" />limit {ep.rateLimit}</span>}
        {disabled && <span className="flex items-center gap-1 text-rose-500"><Power className="w-3.5 h-3.5" />disabled</span>}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onView}>
          <Eye className="w-3.5 h-3.5 mr-1" /> View Details
        </Button>
      </div>
      <SecurityRow ep={ep} now={now} />
    </div>
  );
}

export function SuperAdminApiPage() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const isSuper = !!user && isSuperAdminRole(user.role as Role);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  const [search, setSearch] = useState('');
  const [service, setService] = useState('all');
  const [method, setMethod] = useState('all');
  const [status, setStatus] = useState('all');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    healthy: false, degraded: false, down: false, protected: false, securityEvents: false, blocked: false, highTraffic: false,
  });

  const [selected, setSelected] = useState<any>(null);
  const [toggleTarget, setToggleTarget] = useState<any>(null);
  const [togglePassword, setTogglePassword] = useState('');
  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const d = await AdminService.getApiConsole();
      setData(d);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load API telemetry');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const summary = data?.summary || {};
  const health = data?.health || {};
  const services = health?.services || {};
  const endpoints = Array.isArray(data?.endpoints) ? data.endpoints : [];
  const lastUpdatedSec = updatedAt ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : 0;

  const filtered = useMemo(() => {
    const activeToggle = Object.keys(toggles).some(k => toggles[k]);
    return endpoints.filter((ep: any) => {
      const path = String(ep?.path || '');
      const desc = String(ep?.description || '');
      const mt = String(ep?.method || '');
      const q = search.trim().toLowerCase();
      if (q && !path.toLowerCase().includes(q) && !mt.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) return false;
      if (service !== 'all' && ep?.service !== service) return false;
      if (method !== 'all' && mt !== method) return false;
      if (status !== 'all' && String(ep?.status || '').toUpperCase() !== status) return false;
      if (activeToggle) {
        if (toggles.healthy && String(ep?.status || '').toUpperCase() === 'HEALTHY') return true;
        if (toggles.degraded && String(ep?.status || '').toUpperCase() === 'DEGRADED') return true;
        if (toggles.down && (String(ep?.status || '').toUpperCase() === 'DOWN' || String(ep?.status || '').toUpperCase() === 'BLOCKED')) return true;
        if (toggles.protected && ep?.auth === true) return true;
        if (toggles.securityEvents && (ep?.security?.eventCount || 0) > 0) return true;
        if (toggles.blocked && (ep?.security?.blockedRequests || 0) > 0) return true;
        if (toggles.highTraffic && Number(ep?.metrics?.requestsPerMinute || 0) >= 100) return true;
        return false;
      }
      return true;
    });
  }, [endpoints, search, service, method, status, toggles]);

  const byGroup = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((ep: any) => { const g = ep?.group || 'Other'; (map[g] = map[g] || []).push(ep); });
    const order = Array.isArray(data?.filters?.groups) && (data.filters.groups as any[]).length
      ? (data.filters.groups as string[])
      : API_CONSOLE_GROUP_ORDER;
    const ordered: string[] = [];
    order.forEach((g: string) => { if (map[g] && !ordered.includes(g)) ordered.push(g); });
    Object.keys(map).forEach(g => { if (!ordered.includes(g)) ordered.push(g); });
    return ordered.map(g => ({ group: g, items: map[g] }));
  }, [filtered, data]);

  const serviceOptions = useMemo(() => {
    if (Array.isArray(data?.filters?.services) && (data.filters.services as any[]).length) return data.filters.services as string[];
    return Array.from(new Set(endpoints.map((e: any) => e?.service).filter(Boolean)));
  }, [data, endpoints]);

  const methodOptions = useMemo(() => Array.from(new Set(endpoints.map((e: any) => e?.method).filter(Boolean))), [endpoints]);
  const statusOptions = ['HEALTHY', 'DEGRADED', 'DOWN', 'BLOCKED', 'DISABLED'];

  const orderServices = useMemo(() => {
    const keys = Object.keys(services);
    const ordered: typeof keys = [];
    SERVICE_ORDER.forEach(k => { if (keys.includes(k) && !ordered.includes(k)) ordered.push(k); });
    keys.forEach(k => { if (!ordered.includes(k)) ordered.push(k); });
    return ordered;
  }, [services]);

  const toggleToggle = (k: string) => setToggles(t => ({ ...t, [k]: !t[k] }));
  const clearFilters = () => { setSearch(''); setService('all'); setMethod('all'); setStatus('all'); setToggles({ healthy: false, degraded: false, down: false, protected: false, securityEvents: false, blocked: false, highTraffic: false }); };

  const runToggle = async (enabled: boolean) => {
    if (!toggleTarget) return;
    if (!isSuper) { setToggleError('Super admin access required for this action.'); return; }
    setToggleBusy(true); setToggleError(null);
    try {
      const res = await AdminService.toggleApiEndpoint(toggleTarget.method, toggleTarget.path, enabled, togglePassword);
      if (res?.success) {
        showToast(enabled ? 'Endpoint Enabled' : 'Endpoint Disabled', `${toggleTarget.method} ${toggleTarget.path} ${enabled ? 'enabled' : 'disabled'}.`, 'success');
        setToggleTarget(null); setTogglePassword(''); setToggleError(null);
        load(true);
      } else {
        setToggleError(res?.message || 'Operation not approved. Check your password or permission.');
      }
    } catch (e: any) {
      setToggleError(e?.message || 'Could not update endpoint.');
    } finally {
      setToggleBusy(false);
    }
  };

  const summaryCards = [
    { label: 'Live Endpoints', value: fmtNum(summary.liveEndpoints), icon: ServerCog, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Healthy', value: fmtNum(summary.healthy), icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Degraded', value: fmtNum(summary.degraded), icon: Activity, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Down', value: fmtNum(summary.down), icon: XCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Blocked', value: fmtNum(summary.blocked), icon: Ban, color: 'text-gray-500 bg-gray-50 dark:bg-slate-800/50' },
    { label: 'Disabled', value: fmtNum(summary.disabled), icon: Power, color: 'text-slate-500 bg-gray-100 dark:bg-slate-800/50' },
    { label: 'Critical Security Events', value: fmtNum(summary.criticalSecurityEvents), icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Requests/min', value: fmtNum(summary.requestsPerMinute), icon: Gauge, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Error Rate', value: pct(summary.errorRate), icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  ];

  const filterToggleDefs = [
    { key: 'healthy', label: 'Healthy' },
    { key: 'degraded', label: 'Degraded' },
    { key: 'down', label: 'Down' },
    { key: 'protected', label: 'Protected' },
    { key: 'securityEvents', label: 'Security Events' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'highTraffic', label: 'High Traffic' },
  ];

  const sel = selected;
  const selMeta = sel ? (STATUS_META[String(sel.status || 'DOWN').toUpperCase()] || STATUS_META.DOWN) : null;
  const selMetrics = sel?.metrics || {};
  const selSecurity = sel?.security || {};
  const selAudit = Array.isArray(sel?.audit) ? sel.audit : [];
  const selDisabled = sel ? (sel.disabled === true || String(sel.status || '').toUpperCase() === 'DISABLED') : false;
  const canToggle = !!sel && ((sel.rateLimit != null && sel.rateLimit !== '') || !!sel.permission);

  if (loading || !data) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader icon={ServerCog} title="API Management" description="Live API operations, endpoint health, performance, security, and access control." count="loading telemetry" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Fragment key={i}><Skeleton className="h-20 rounded-2xl" /></Fragment>)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Fragment key={i}><Skeleton className="h-24 rounded-2xl" /></Fragment>)}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/10 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 flex-wrap">
            <span>API telemetry unavailable — {error}</span>
            <Button size="sm" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </div>
        )}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader icon={ServerCog} title="API Management" description="Live API operations, endpoint health, performance, security, and access control." />
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900/40">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">API telemetry unavailable</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">Could not reach the API monitoring service. Reason: {error}</p>
            <Button onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        icon={ServerCog}
        title="API Management"
        description="Live API operations, endpoint health, performance, security, and access control."
        count={`${fmtNum(summary.liveEndpoints)} endpoints`}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          Last updated: {lastUpdatedSec} seconds ago
        </div>
        <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map(c => (
          <div key={c.label} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.color}`}><c.icon className="w-4 h-4" /></span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">{c.label}</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" /> Service Health
            <span className="ml-auto text-[11px] font-normal text-gray-400">checked {timeAgo(data?.generatedAt, now)} · uptime {health?.uptime ?? 0}s</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderServices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">No service health data available.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {orderServices.map(k => <Fragment key={k}><ServiceHealthTile name={k} svc={services[k]} now={now} /></Fragment>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Search className="w-5 h-5 text-rose-500" /> Search &amp; Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input className="pl-9" placeholder="Search path, method, description…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={service} onValueChange={v => setService(v)}>
              <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {serviceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={method} onValueChange={v => setMethod(v)}>
              <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {methodOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => setStatus(v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {filterToggleDefs.map(t => (
              <button
                key={t.key}
                onClick={() => toggleToggle(t.key)}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                  toggles[t.key]
                    ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300'
                    : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                )}
              >
                {t.label}
              </button>
            ))}
            <Button size="sm" variant="ghost" onClick={clearFilters}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent>
            <EmptyState icon={<Search className="w-8 h-8 text-gray-300 dark:text-slate-600" />} title="No endpoints match" description="Try adjusting your search or filters." action={{ label: 'Clear filters', onClick: clearFilters }} />
          </CardContent>
        </Card>
      ) : (
        byGroup.map(g => (
          <Card key={g.group} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-5 h-5 text-rose-500" /> {g.group}
                <Badge variant="outline" className="ml-1">{g.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {g.items.map((ep: any) => (
                  <Fragment key={ep.method + ep.path}><EndpointRow ep={ep} now={now} isSuper={isSuper} onView={() => setSelected(ep)} /></Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Card className="rounded-2xl">
        <CardContent className="space-y-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2"><KeyRound className="w-4 h-4 text-rose-500" /> Related Console Pages</p>
          <div className="flex flex-wrap gap-2">
            {[
              { to: '/super-admin/system', label: 'System Health', icon: Server },
              { to: '/super-admin/security', label: 'Security Center', icon: ShieldCheck },
              { to: '/super-admin/security-events', label: 'Security Events', icon: ShieldAlert },
              { to: '/super-admin/audit', label: 'Audit Logs', icon: History },
              { to: '/super-admin/sessions', label: 'Sessions', icon: Monitor },
              { to: '/super-admin/payment-gateways', label: 'Payment Gateways', icon: CreditCard },
            ].map(l => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
                <l.icon className="w-3.5 h-3.5 text-rose-500" /> {l.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {sel && selMeta && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.aside
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col overflow-hidden"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={`text-[9px] font-black px-2 ${METHOD_COLOR[sel.method] || ''}`}>{sel.method}</Badge>
                  <span className="text-sm font-mono text-gray-800 dark:text-slate-200 truncate">{sel.path}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}><X className="w-4 h-4" /></Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div className="flex items-center gap-2">
                  <Badge variant={selMeta.variant} dot>{selMeta.label}</Badge>
                  {sel.auth === false && <Badge variant="outline">public</Badge>}
                  {sel.destructive && <Badge variant="danger">destructive</Badge>}
                </div>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Overview</h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div><p className="text-gray-400">Description</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.description || '—'}</p></div>
                    <div><p className="text-gray-400">Service</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.service || '—'}</p></div>
                    <div><p className="text-gray-400">Group</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.group || '—'}</p></div>
                    <div><p className="text-gray-400">Last health check</p><p className="text-gray-800 dark:text-slate-200 font-medium">{timeAgo(selMetrics.lastRequestAt || data?.generatedAt, now)}</p></div>
                    <div><p className="text-gray-400">Last request</p><p className="text-gray-800 dark:text-slate-200 font-medium">{timeAgo(selMetrics.lastRequestAt, now)}</p></div>
                    <div><p className="text-gray-400">Total requests</p><p className="text-gray-800 dark:text-slate-200 font-medium">{fmtNum(selMetrics.totalRequests)}</p></div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Security</h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div><p className="text-gray-400">Authentication</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.auth === false ? 'Public' : 'Required'}</p></div>
                    <div><p className="text-gray-400">Role</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.role || '—'}</p></div>
                    <div><p className="text-gray-400">Permission</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.permission || '—'}</p></div>
                    <div><p className="text-gray-400">Rate limit</p><p className="text-gray-800 dark:text-slate-200 font-medium">{sel.rateLimit || '—'}</p></div>
                    <div><p className="text-gray-400">Risk level</p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${RISK_BADGE[selSecurity.risk] || RISK_BADGE.LOW}`}>{selSecurity.risk || 'LOW'}</Badge>
                    </div>
                    <div><p className="text-gray-400">Blocked requests</p><p className="text-gray-800 dark:text-slate-200 font-medium">{fmtNum(selSecurity.blockedRequests)}</p></div>
                  </div>
                  {selSecurity.lastEvent && (
                    <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 text-[11px] space-y-1">
                      <p><span className="text-gray-400">Event:</span> <span className="font-mono text-gray-800 dark:text-slate-200">{selSecurity.lastEvent.type || selSecurity.lastEvent.detection || '—'}</span></p>
                      <p><span className="text-gray-400">Severity:</span> <span className="text-gray-800 dark:text-slate-200">{selSecurity.lastEvent.severity || '—'}</span></p>
                      <p><span className="text-gray-400">Action:</span> <span className="text-gray-800 dark:text-slate-200">{selSecurity.lastEvent.actionTaken || selSecurity.lastEvent.action || '—'}</span></p>
                      <p><span className="text-gray-400">Result:</span> <span className="text-gray-800 dark:text-slate-200">{selSecurity.lastEvent.status || '—'}</span></p>
                      <p><span className="text-gray-400">When:</span> <span className="text-gray-800 dark:text-slate-200">{new Date(selSecurity.lastEvent.timestamp).toLocaleString()}</span></p>
                      <Link to="/super-admin/security-events" className="inline-flex items-center gap-1 text-rose-500 font-semibold no-underline">
                        <ShieldAlert className="w-3.5 h-3.5" /> View Security Event
                      </Link>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries((selSecurity.types || {}) as Record<string, number>).map(([k, v]) => (
                      <Fragment key={k}><Badge variant="outline" className="text-[10px]">{`${k} · ${fmtNum(v)}`}</Badge></Fragment>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Performance</h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div><p className="text-gray-400">Requests/min</p><p className="text-gray-800 dark:text-slate-200 font-medium">{fmtNum(selMetrics.requestsPerMinute)}</p></div>
                    <div><p className="text-gray-400">Total requests</p><p className="text-gray-800 dark:text-slate-200 font-medium">{fmtNum(selMetrics.totalRequests)}</p></div>
                    <div><p className="text-gray-400">Avg latency</p><p className="text-gray-800 dark:text-slate-200 font-medium">{fmtNum(selMetrics.avgMs)}ms</p></div>
                    <div><p className="text-gray-400">P95 latency</p><p className="text-gray-800 dark:text-slate-200 font-medium">{fmtNum(selMetrics.p95Ms)}ms</p></div>
                    <div><p className="text-gray-400">Error rate</p><p className="text-gray-800 dark:text-slate-200 font-medium">{pct(selMetrics.errorRate)}</p></div>
                    <div><p className="text-gray-400">Timeout rate</p><p className="text-gray-800 dark:text-slate-200 font-medium">{pct(selMetrics.timeoutRate)}</p></div>
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] text-gray-400 mb-1.5">Status distribution</p>
                    <div className="space-y-1">
                      {Object.entries((selMetrics.statusDist || {}) as Record<string, number>).map(([k, v]) => {
                        const entries = Object.entries((selMetrics.statusDist || {}) as Record<string, number>);
                        const all = entries.reduce<number>((acc, [, val]) => acc + (Number(val) || 0), 0);
                        const width = all > 0 ? Math.max(2, ((Number(v) || 0) / all) * 100) : 0;
                        return (
                          <div key={k} className="flex items-center gap-2 text-[11px]">
                            <span className="w-10 font-mono text-gray-500 dark:text-slate-400">{k}</span>
                            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-rose-400" style={{ width: `${width}%` }} />
                            </div>
                            <span className="w-10 text-right font-mono text-gray-700 dark:text-slate-300">{fmtNum(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><ScrollText className="w-3.5 h-3.5" /> Recent Activity</h4>
                  {selAudit.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">No audit entries recorded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selAudit.map((a: any, i: number) => (
                        <div key={i} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-[11px] flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-gray-800 dark:text-slate-200 truncate">{a.action || '—'}</p>
                            <p className="text-gray-500 dark:text-slate-400">{a.actorName || '—'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant={a.result === 'success' ? 'success' : 'danger'} className="text-[9px]">{a.result || '—'}</Badge>
                            <p className="text-[10px] text-gray-400 mt-0.5">{a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {canToggle && (
                  <section className="border-t border-gray-100 dark:border-slate-800 pt-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><Power className="w-3.5 h-3.5" /> Access Control</h4>
                    {sel.destructive && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> This is a destructive endpoint. Disabling it may impact downstream operations.</p>
                    )}
                    {!isSuper ? (
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">Super admin access required to toggle endpoint availability.</p>
                    ) : toggleTarget ? (
                      <div className="space-y-2">
                        <Input type="password" placeholder="Enter your password to confirm" value={togglePassword} onChange={e => setTogglePassword(e.target.value)} />
                        {toggleError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{toggleError}</p>}
                        <div className="flex gap-2">
                          <Button size="sm" disabled={toggleBusy} onClick={() => runToggle(!selDisabled)}>
                            <Power className="w-3.5 h-3.5 mr-1" /> {toggleBusy ? 'Working…' : selDisabled ? 'Enable endpoint' : 'Disable endpoint'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setToggleTarget(null); setTogglePassword(''); setToggleError(null); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant={selDisabled ? 'success' : 'danger'} onClick={() => setToggleTarget(sel)}>
                        <Power className="w-3.5 h-3.5 mr-1" /> {selDisabled ? 'Enable endpoint' : 'Disable endpoint'}
                      </Button>
                    )}
                  </section>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * AUDIT LOG
 * ------------------------------------------------------------
 */
export function SuperAdminAuditPage() {
  const { t } = useApp();
  const [audit, setAudit] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [role, setRole] = useState('all');
  const [resource, setResource] = useState('all');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [result, setResult] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [applied, setApplied] = useState(0);

  const [facets, setFacets] = useState<{ actions: string[]; roles: string[]; entities: string[]; categories: string[]; results: string[]; severities: string[]; roleLabels: Record<string, string>; entityLabels: Record<string, string> }>({ actions: [], roles: [], entities: [], categories: [], results: [], severities: [], roleLabels: {}, entityLabels: {} });
  const [summary, setSummary] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const loadSummary = useCallback(() => {
    AdminService.getAuditSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    AdminService.getAuditFacets().then(setFacets).catch(() => {});
  }, []);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const load = useCallback((p = page, ps = pageSize, asRefresh = false) => {
    if (asRefresh) setRefreshing(true); else setLoading(true);
    setError(false);
    const params: any = { page: p, pageSize: ps, sort };
    if (search.trim()) params.search = search.trim();
    if (action !== 'all') params.action = action;
    if (role !== 'all') params.role = role;
    if (resource !== 'all') params.entity = resource;
    if (category !== 'all') params.category = category;
    if (severity !== 'all') params.severity = severity;
    if (result !== 'all') params.result = result;
    if (fromDate) params.from = new Date(fromDate).toISOString();
    if (toDate) params.to = new Date(toDate + 'T23:59:59').toISOString();
    AdminService.getAudit(params)
      .then(r => {
        setAudit(Array.isArray(r?.items) ? r.items : []);
        setTotal(r?.total ?? 0);
        setTotalPages(r?.totalPages ?? 1);
        if (asRefresh) { setJustUpdated(true); setTimeout(() => setJustUpdated(false), 4000); }
      })
      .catch(() => { setError(true); setAudit([]); setTotal(0); setTotalPages(1); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [search, action, role, resource, category, severity, result, fromDate, toDate, sort, page, pageSize]);

  useEffect(() => { load(page, pageSize); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, applied]);

  const apply = () => { setPage(1); setApplied(x => x + 1); };

  const filtersActive = search.trim() !== '' || action !== 'all' || role !== 'all' || resource !== 'all' || result !== 'all' || category !== 'all' || severity !== 'all' || fromDate !== '' || toDate !== '';

  const clearFilters = () => {
    setSearch(''); setAction('all'); setRole('all'); setResource('all'); setResult('all');
    setCategory('all'); setSeverity('all');
    setFromDate(''); setToDate('');
    setPage(1);
    setApplied(x => x + 1);
  };

  const refreshAll = () => { load(page, pageSize, true); loadSummary(); };

  const handleExport = async () => {
    setExporting(true);
    const params: any = { sort };
    if (search.trim()) params.search = search.trim();
    if (action !== 'all') params.action = action;
    if (role !== 'all') params.role = role;
    if (resource !== 'all') params.entity = resource;
    if (category !== 'all') params.category = category;
    if (severity !== 'all') params.severity = severity;
    if (result !== 'all') params.result = result;
    if (fromDate) params.from = new Date(fromDate).toISOString();
    if (toDate) params.to = new Date(toDate + 'T23:59:59').toISOString();
    try {
      await AdminService.exportAudit(params);
    } catch (e: any) {
      // Export failure surfaced via console; the UI stays usable.
      console.error('Audit export failed:', e);
      setError(true);
    } finally {
      setExporting(false);
    }
  };

  const roleLabel = (r: string) => facets.roleLabels[r] || r;
  const entityLabel = (r: string) => facets.entityLabels[r] || r;

  const statCards = [
    { label: t('audit.statTotal'), value: summary?.total ?? 0, variant: 'default' as any, icon: ScrollText },
    { label: t('audit.statToday'), value: summary?.today ?? 0, variant: 'info' as any, icon: Activity },
    { label: t('audit.statFailed'), value: summary?.failed ?? 0, variant: 'danger' as any, icon: AlertTriangle },
    { label: t('audit.statSecurity'), value: summary?.security ?? 0, variant: 'warning' as any, icon: Shield },
    { label: t('audit.statPayments'), value: summary?.payments ?? 0, variant: 'brand' as any, icon: CreditCard },
    { label: t('audit.statAdmin'), value: summary?.adminActions ?? 0, variant: 'warning' as any, icon: UserCog },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br bg-primary">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('audit.title')}</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">{t('audit.subtitle')}</p>
          </div>
        </div>
        <Badge variant="default">{t('audit.events', { count: total })}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.variant === 'danger' ? 'bg-danger-soft text-danger' : s.variant === 'info' ? 'bg-info-soft text-info' : s.variant === 'brand' ? 'bg-primary-soft text-primary' : s.variant === 'warning' ? 'bg-warn-soft text-warn' : 'bg-surface-3 text-ink-2 dark:bg-slate-800 dark:text-slate-300')}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{s.value}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2"><ScrollText className="w-5 h-5 text-rose-500" /> {t('audit.tagline')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={handleExport} disabled={exporting}>
                  <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
                  {exporting ? t('audit.exporting') : t('audit.export')}
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={refreshAll} disabled={refreshing || loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? t('audit.refreshing') : t('audit.refresh')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder={t('audit.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
              </div>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue placeholder={t('audit.action')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.all')}</SelectItem>
                  {facets.actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue placeholder={t('audit.category')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.all')}</SelectItem>
                  {facets.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue placeholder={t('audit.severity')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.all')}</SelectItem>
                  {facets.severities.map(s => <SelectItem key={s} value={s}>{String(s).toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue placeholder={t('audit.role')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.all')}</SelectItem>
                  {facets.roles.map(r => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={resource} onValueChange={setResource}>
                <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue placeholder={t('audit.resource')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.all')}</SelectItem>
                  {facets.entities.map(e => <SelectItem key={e} value={e}>{entityLabel(e)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue placeholder={t('audit.result')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.all')}</SelectItem>
                  {facets.results.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('audit.sortNewest')}</SelectItem>
                  <SelectItem value="oldest">{t('audit.sortOldest')}</SelectItem>
                  <SelectItem value="actor">{t('audit.sortActor')}</SelectItem>
                  <SelectItem value="action">{t('audit.sortAction')}</SelectItem>
                  <SelectItem value="entity">{t('audit.sortResource')}</SelectItem>
                  <SelectItem value="severity">{t('audit.sortSeverity')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-end">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t('audit.from')}</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="rounded-lg bg-white dark:bg-slate-800" />
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t('audit.to')}</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="rounded-lg bg-white dark:bg-slate-800" />
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t('audit.pageSize')}</Label>
                <Select value={String(pageSize)} onValueChange={v => { setPage(1); setPageSize(Number(v)); setApplied(x => x + 1); }}>
                  <SelectTrigger className="rounded-lg bg-white dark:bg-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 col-span-2 lg:col-span-2">
                <Button onClick={apply} className="rounded-lg flex-1"><Filter className="w-4 h-4 mr-2" /> {t('audit.applyFilters')}</Button>
                {filtersActive && (
                  <Button variant="outline" onClick={clearFilters} className="rounded-lg"><X className="w-4 h-4 mr-1" /> {t('audit.clearFilters')}</Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-400">{justUpdated ? <span className="text-emerald-600 dark:text-emerald-400">{t('audit.updatedJustNow')}</span> : null}{filtersActive ? ` · ${t('audit.events', { count: total })}` : ''}</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="w-40 h-4" /><Skeleton className="flex-1" /><Skeleton className="w-24" /><Skeleton className="w-16" /><Skeleton className="w-32" /><Skeleton className="w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-danger-soft text-danger flex items-center justify-center mb-3"><AlertTriangle className="w-6 h-6" /></div>
              <p className="text-sm text-gray-600 dark:text-slate-300">{t('audit.error')}</p>
              <Button variant="outline" size="sm" className="mt-4 rounded-lg" onClick={() => load(page, pageSize)}><RefreshCw className="w-4 h-4 mr-2" /> {t('audit.refresh')}</Button>
            </div>
          ) : audit.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-info-soft text-info flex items-center justify-center mb-3"><Inbox className="w-6 h-6" /></div>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{t('audit.emptyTitle')}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{filtersActive ? t('audit.noEvents') : t('audit.emptyDesc')}</p>
              {filtersActive && <Button variant="outline" size="sm" className="mt-4 rounded-lg" onClick={clearFilters}><X className="w-4 h-4 mr-2" /> {t('audit.clearFilters')}</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">{t('audit.action')}</th>
                    <th className="py-4 px-6">{t('audit.actor')}</th>
                    <th className="py-4 px-6">{t('audit.category')}</th>
                    <th className="py-4 px-6">{t('audit.resource')}</th>
                    <th className="py-4 px-6">{t('audit.severity')}</th>
                    <th className="py-4 px-6">{t('audit.result')}</th>
                    <th className="py-4 px-6">{t('audit.timestamp')}</th>
                    <th className="py-4 px-6 text-right">{t('audit.details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map(e => {
                    const highRisk = e.severity === 'critical' || e.severity === 'high';
                    const sevVariant = e.severity === 'critical' || e.severity === 'high' ? 'danger' : e.severity === 'medium' ? 'warning' : 'outline';
                    return (
                    <tr key={e.id} className={cn('border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors', highRisk ? 'bg-danger-soft/20 dark:bg-rose-950/30' : '')}>
                      <td className={cn('py-3 px-6 font-medium', highRisk ? 'text-danger dark:text-rose-300 font-semibold' : '')}>{String(e.action).replace(/_/g, ' ')}</td>
                      <td className="py-3 px-6">
                        <span className="text-gray-900 dark:text-white">{e.actorName}</span>
                        {e.actorEmail ? <span className="text-gray-400 block text-xs"> {e.actorEmail}</span> : null}
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{roleLabel(e.actorRole)}</span>
                      </td>
                      <td className="py-3 px-6"><Badge variant="brand">{e.category || '—'}</Badge></td>
                      <td className="py-3 px-6">
                        <Badge variant="outline">{entityLabel(e.entity)}</Badge>
                        {e.entityId ? <span className="text-[10px] font-mono text-gray-400 block mt-0.5">{e.entityId}</span> : null}
                      </td>
                      <td className="py-3 px-6">
                        <Badge variant={sevVariant as any} dot>
                          {String(e.severity || 'low').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-6">
                        <Badge variant={e.result === 'success' ? 'success' : e.result === 'failed' ? 'danger' : e.result === 'denied' ? 'warning' : 'outline'} dot>
                          {String(e.result || '').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-6 text-gray-500 dark:text-slate-400">{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-6 text-right">
                        <Button variant="ghost" size="sm" className="h-7 rounded-lg" onClick={() => setDetail(e)}><Eye className="w-3.5 h-3.5 mr-1" /> {t('audit.details')}</Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t">
                <p className="text-xs text-gray-400">
                  {(page - 1) * pageSize + (audit.length ? 1 : 0)}–{(page - 1) * pageSize + audit.length} {t('audit.of')} {total}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg"><ChevronLeft className="w-4 h-4 mr-1" /> {t('audit.prev')}</Button>
                  <span className="text-xs text-gray-400 flex items-center px-2">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-lg">{t('audit.next')} <ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {detail && <AuditDetailDrawer t={t} e={detail} roleLabel={roleLabel} entityLabel={entityLabel} onClose={() => setDetail(null)} />}
    </div>
  );
}

function AuditDetailDrawer({ t, e, roleLabel, entityLabel, onClose }: { t: (k: string, v?: any) => string; e: any; roleLabel: (r: string) => string; entityLabel: (r: string) => string; onClose: () => void }) {
  const beforeAfter: { before?: any; after?: any } = {};
  (function collect(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      if (v && typeof v === 'object' && 'from' in v && 'to' in v) { beforeAfter.before = v.from; beforeAfter.after = v.to; }
      else if (v && typeof v === 'object') collect(v);
    }
  })(e.meta);

  const rows: { label: string; value: any }[] = [];
  if (e.category !== undefined) rows.push({ label: t('audit.category'), value: String(e.category || '—') });
  if (e.severity !== undefined) rows.push({ label: t('audit.severity'), value: String(e.severity || 'low').toUpperCase() });
  if (e.actorName !== undefined) rows.push({ label: t('audit.actor'), value: e.actorEmail ? `${e.actorName} (${e.actorEmail})` : e.actorName });
  if (e.actorRole !== undefined) rows.push({ label: t('audit.role'), value: roleLabel(e.actorRole) });
  if (e.entity !== undefined) rows.push({ label: t('audit.resource'), value: entityLabel(e.entity) });
  if (e.entityId !== undefined && e.entityId !== null && e.entityId !== '') rows.push({ label: t('audit.resourceId'), value: e.entityId });
  if (e.result !== undefined) rows.push({ label: t('audit.result'), value: String(e.result || '').toUpperCase() });
  if (e.timestamp !== undefined) rows.push({ label: t('audit.timestamp'), value: new Date(e.timestamp).toLocaleString() });
  if (e.ipAddress) rows.push({ label: t('audit.ipAddress'), value: e.ipAddress });
  if (e.userAgent) rows.push({ label: t('audit.userAgent'), value: String(e.userAgent).slice(0, 120) });
  if (e.requestId) rows.push({ label: t('audit.requestId'), value: e.requestId });
  if (e.sessionId) rows.push({ label: t('audit.session'), value: e.sessionId });

  const renderVal = (v: any) => v === undefined || v === null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('audit.eventDetails')}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{String(e.action || '').replace(/_/g, ' ')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge variant={e.result === 'success' ? 'success' : e.result === 'failed' ? 'danger' : e.result === 'denied' ? 'warning' : 'outline'} dot>
              {String(e.result || 'UNKNOWN').toUpperCase()}
            </Badge>
            <Badge variant={(e.severity === 'critical' || e.severity === 'high') ? 'danger' : e.severity === 'medium' ? 'warning' : 'outline'} dot>
              {String(e.severity || 'low').toUpperCase()}
            </Badge>
            <span className="text-[11px] font-mono text-gray-400 px-2 py-0.5 rounded-full border border-line-strong dark:border-slate-600">{e.id}</span>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">{t('audit.eventDetails')}</p>
            <dl className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex justify-between gap-4 text-xs">
                  <dt className="text-gray-400 shrink-0">{r.label}</dt>
                  <dd className="text-gray-800 dark:text-slate-200 text-right break-all">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {(beforeAfter.before !== undefined || beforeAfter.after !== undefined) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Δ {t('audit.before')} / {t('audit.after')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line-strong dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{t('audit.before')}</p>
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">{renderVal(beforeAfter.before)}</p>
                </div>
                <div className="rounded-lg border border-line-strong dark:border-slate-700 p-3 bg-emerald-50/40 dark:bg-slate-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{t('audit.after')}</p>
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">{renderVal(beforeAfter.after)}</p>
                </div>
              </div>
            </div>
          )}

          {e.meta && typeof e.meta === 'object' && Object.keys(e.meta).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">{t('audit.metadata')}</p>
              <div className="space-y-1.5">
                {Object.entries(e.meta).filter(([k]) => !/secret|token|password|passphrase|apikey|api_key|key/i.test(k)).map(([k, v]) => {
                  if (v && typeof v === 'object' && 'from' in (v as any) && 'to' in (v as any)) return null;
                  return (
                    <div key={k} className="flex justify-between gap-3 text-xs">
                      <span className="text-gray-400 shrink-0">{k}</span>
                      <span className="text-gray-800 dark:text-slate-200 text-right break-all font-mono text-[11px]">{renderVal(v)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!e.ipAddress && !e.userAgent && !e.meta && (
            <p className="text-xs text-gray-400">{t('audit.noIp')}</p>
          )}
        </div>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full rounded-lg" onClick={onClose}>{t('audit.close')}</Button>
        </div>
      </div>
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
  const [backups, setBackups] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(() => {
    AdminService.getBackups().then(d => setBackups(Array.isArray(d) ? d : [])).catch(() => setBackups([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const runBackup = async () => {
    setRunning(true);
    try {
      const res = await AdminService.createBackup();
      showToast('Backup Created', 'A database snapshot was written to the server.', 'success');
      setRunning(false);
      load();
    } catch (e: any) {
      showToast('Backup Failed', e?.message || 'Could not run backup.', 'warning');
      setRunning(false);
    }
  };

  const runRestore = async () => {
    if (!confirmTarget || confirmText !== confirmTarget.id) return;
    setRestoring(true);
    try {
      const res = await AdminService.restoreBackup(confirmTarget.id);
      showToast('Restore Complete', `Database restored to snapshot ${confirmTarget.id}.`, 'success');
      setConfirmTarget(null);
      setConfirmText('');
      load();
    } catch (e: any) {
      showToast('Restore Failed', e?.message || 'Could not restore database.', 'warning');
    } finally {
      setRestoring(false);
    }
  };

  const lastBackup = backups[0] || null;
  const totalSize = backups.reduce((s, b) => s + (b.size || 0), 0);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={HardDrive} title="Backup & Restore" description="Server-side point-in-time database snapshots. Restoring replaces live data — a confirmed two-step action." count={`${backups.length} snapshots`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Snapshots</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{backups.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Retention</p><p className="text-2xl font-bold text-emerald-600">5 max</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Last Backup</p><p className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{lastBackup ? new Date(lastBackup.createdAt).toLocaleString() : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Snapshot Data</p><p className="text-lg font-bold text-gray-900 dark:text-white">{totalSize ? (totalSize / 1024).toFixed(1) + ' KB' : '—'}</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Button onClick={runBackup} disabled={running} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"><HardDrive className="w-4 h-4 mr-2" /> {running ? 'Creating…' : 'Run Backup Now'}</Button>
            <p className="text-xs text-gray-500 mt-2">Writes a real point-in-time snapshot of all platform collections to the server.</p>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader className="border-b"><CardTitle className="text-base flex items-center gap-2"><Archive className="w-5 h-5 text-violet-500" /> Snapshot History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {backups.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No snapshots yet. Run a backup to enable recovery.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Snapshot</th>
                    <th className="py-4 px-6">Created</th>
                    <th className="py-4 px-6">Size</th>
                    <th className="py-4 px-6">Records</th>
                    <th className="py-4 px-6">Created By</th>
                    <th className="py-4 px-6 text-right">Restore</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b, i) => (
                    <tr key={b.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6 font-mono text-xs">{b.id}{i === 0 && <Badge variant="success" className="ml-2">latest</Badge>}</td>
                      <td className="py-3 px-6">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-6">{(b.size / 1024).toFixed(1)} KB</td>
                      <td className="py-3 px-6 text-xs text-gray-500">U {b.users} · V {b.vendors} · O {b.orders}</td>
                      <td className="py-3 px-6">{b.createdBy || '—'}</td>
                      <td className="py-3 px-6 text-right">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg text-rose-600 border-rose-200" onClick={() => { setConfirmTarget(b); setConfirmText(''); }}>Restore…</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !restoring && setConfirmTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Restore snapshot</h2>
                <p className="text-xs text-gray-500">{confirmTarget.id} · {new Date(confirmTarget.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3 text-xs text-rose-700 dark:text-rose-300 mb-4">
              This replaces the current live database with this snapshot. Newer data will be lost. This action is irreversible and recorded in the audit log.
            </div>
            <Label className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">Type the snapshot id to confirm: <span className="font-mono text-rose-600">{confirmTarget.id}</span></Label>
            <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={confirmTarget.id} className="rounded-lg font-mono" autoFocus />
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" className="rounded-xl" disabled={restoring} onClick={() => setConfirmTarget(null)}>Cancel</Button>
              <Button className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white" disabled={confirmText !== confirmTarget.id || restoring} onClick={runRestore}>
                {restoring ? 'Restoring…' : 'Confirm Restore'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * NOTIFICATIONS
 * ------------------------------------------------------------
 */
export function SuperAdminNotificationsPage() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const isSuper = !!user && isSuperAdminRole(user.role as Role);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [updatedAt, setUpdatedAt] = useState<number>(0);

  const [messages, setMessages] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any>(null);
  const [windows, setWindows] = useState<any[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<any>({});

  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState<any>({ subject: '', message: '', messageType: 'general-announcement', priority: 'NORMAL', recipientGroup: 'all', deliveryChannels: ['In-app'], scheduleAt: '', password: '' });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [resendTarget, setResendTarget] = useState<any>(null);
  const [resendPassword, setResendPassword] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const [detail, setDetail] = useState<any>(null);
  const [msgDetail, setMsgDetail] = useState<any>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const [s, msgs, del] = await Promise.all([
        AdminService.getNotificationSummary(),
        AdminService.getPlatformMessages(),
        AdminService.getNotificationDeliveries({ limit: 50 }),
      ]);
      setData(s);
      setMessages(Array.isArray(msgs?.items) ? msgs.items : (Array.isArray(msgs) ? msgs : []));
      setDeliveries(Array.isArray(del?.items) ? del.items : []);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load notifications');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const id = setInterval(() => load(true), 20000); return () => clearInterval(id); }, [load]);

  const loadMaintenance = useCallback(async () => {
    try {
      const [st, ws] = await Promise.all([AdminService.getMaintenanceStatus(), AdminService.getMaintenanceWindows()]);
      setMaintenance(st);
      setWindows(Array.isArray(ws?.items) ? ws.items : []);
    } catch { /* keep previous */ }
  }, []);
  useEffect(() => { loadMaintenance(); }, [loadMaintenance]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const summary = data?.summary || {};
  const providers = data?.providers || {};
  const lastUpdatedSec = updatedAt ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : 0;

  const summaryCards = [
    { label: 'Notifications', value: fmtNum(summary.total), icon: Bell, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Delivered', value: fmtNum(summary.delivered), icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Pending', value: fmtNum(summary.pending), icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Failed', value: fmtNum(summary.failed), icon: XCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Not Configured', value: fmtNum(summary.notConfigured), icon: ServerOff, color: 'text-gray-500 bg-gray-100 dark:bg-slate-800/50' },
    { label: 'Read', value: fmtNum(summary.read), icon: Eye, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Unread', value: fmtNum(summary.unread), icon: Inbox, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Maintenance Alerts', value: fmtNum(data?.maintenanceNotifications ?? 0), icon: Wrench, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  ];

  const send = async () => {
    if (!form.subject.trim() || !form.message.trim()) { setSendError('Title and message are required.'); return; }
    if (!isSuper) { setSendError('Super admin access required to send notifications.'); return; }
    if (!form.deliveryChannels.length) { setSendError('Select at least one delivery channel.'); return; }
    setSending(true); setSendError(null);
    try {
      const payload: any = {
        subject: form.subject.trim(), message: form.message.trim(),
        messageType: form.messageType, priority: form.priority,
        recipientGroup: form.recipientGroup, deliveryChannels: form.deliveryChannels,
        clientRequestId: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      if (form.scheduleAt) payload.scheduleAt = form.scheduleAt;
      if (form.password) payload.password = form.password;
      const res = await AdminService.createPlatformMessage(payload, payload.password);
      if (res?.success) {
        showToast(form.scheduleAt ? 'Notification scheduled' : 'Notification created', `${form.deliveryChannels.join(' + ')} message ${form.scheduleAt ? 'scheduled' : 'started sending'}.`, 'success');
        setComposing(false); setForm({ subject: '', message: '', messageType: 'general-announcement', priority: 'NORMAL', recipientGroup: 'all', deliveryChannels: ['In-app'], scheduleAt: '', password: '' });
        load(true);
      } else {
        setSendError(res?.message || 'Notification could not be created.');
      }
    } catch (e: any) {
      setSendError(e?.message || 'Could not create notification.');
    } finally {
      setSending(false);
    }
  };

  const doResend = async () => {
    if (!resendTarget) return;
    setResendBusy(true); setResendError(null);
    try {
      const res = await AdminService.resendPlatformMessage(resendTarget.id, resendPassword);
      if (res?.success) {
        showToast('Retry queued', 'Failed deliveries are being re-sent by the backend.', 'success');
        setResendTarget(null); setResendPassword(''); setResendError(null);
        setTimeout(() => load(true), 1500);
      } else {
        setResendError(res?.message || 'Retry not approved. Check your password or permission.');
      }
    } catch (e: any) {
      setResendError(e?.message || 'Could not retry deliveries.');
    } finally {
      setResendBusy(false);
    }
  };

  const activeWindows = Array.isArray(windows) ? windows.filter((w: any) => w.status === 'scheduled' || w.status === 'warning' || w.status === 'active') : [];

  if (loading || !data) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader icon={Bell} title="Notifications" description="Notification delivery, messaging, and maintenance/system communications." count="loading telemetry" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Fragment key={i}><Skeleton className="h-20 rounded-2xl" /></Fragment>)}</div>
        <Skeleton className="h-40 rounded-2xl" />
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/10 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 flex-wrap">
            <span>Notification telemetry unavailable — {error}</span>
            <Button size="sm" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Bell} title="Notifications" description="Notification delivery, messaging, and maintenance/system communications." count={`${fmtNum(summary.total)} records`} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400"><Clock className="w-3.5 h-3.5" /> Last updated: {lastUpdatedSec} seconds ago</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setComposing(true)} disabled={!isSuper}><Send className="w-4 h-4 mr-1" /> Send Notification</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(c => (
          <div key={c.label} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2"><span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.color}`}><c.icon className="w-4 h-4" /></span><p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">{c.label}</p></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-5 h-5 text-rose-500" /> Delivery Channels</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: 'In-App', code: providers?.inApp?.code || 'unknown', mode: providers?.inApp?.label || 'Unknown', icon: Bell },
              { label: 'Email', code: providers?.email?.code || 'unknown', mode: providers?.email?.label || 'Unknown', icon: Mail },
              { label: 'SMS', code: providers?.sms?.code || 'not_configured', mode: providers?.sms?.label || 'Not Configured', icon: Smartphone },
            ].map(c => (
              <div key={c.label} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><c.icon className="w-4 h-4 text-rose-500" /><p className="text-sm font-semibold text-gray-900 dark:text-white">{c.label}</p></div><StateBadge state={c.code} /></div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">{c.mode}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Send className="w-5 h-5 text-rose-500" /> Recent Messages <span className="text-xs font-normal text-gray-400">{fmtNum(data?.messagesCount ?? 0)} total</span></CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <EmptyState icon={<Send className="w-8 h-8 text-gray-300 dark:text-slate-600" />} title="No messages sent" description="No platform messages have been sent yet." />
          ) : (
            <div className="space-y-2">
              {messages.slice(0, 10).map((m: any) => (
                <div key={m.id} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.subject}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">to <b>{m.recipientGroup || 'all'}</b> · {Array.isArray(m.deliveryChannels) ? m.deliveryChannels.join(' + ') : 'In-app'} · {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StateBadge state={m.status} />
                    <Button size="sm" variant="ghost" onClick={() => setMsgDetail(m)}>Details</Button>
                    {m.status === 'failed' || m.status === 'partially_sent' ? <Button size="sm" variant="outline" onClick={() => setResendTarget(m)}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry</Button> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ListChecks className="w-5 h-5 text-rose-500" /> Delivery Log <Link to="/super-admin/deliveries" className="ml-auto text-xs text-rose-500 font-semibold">View all →</Link></CardTitle>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <EmptyState icon={<Inbox className="w-8 h-8 text-gray-300 dark:text-slate-600" />} title="No delivery records" description="No notification deliveries have been recorded yet. Send a message to start tracking delivery." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead><tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400">{['Recipient', 'Notification', 'Channel', 'Status', 'Delivered At', 'Failure Reason'].map(h => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {deliveries.map((d: any) => (
                    <tr key={d.id} onClick={() => setDetail(d)} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{d.name || d.email || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{d.refTitle || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{d.channel}</td>
                      <td className="px-3 py-2"><StateBadge state={d.status} /></td>
                      <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{d.sentAt ? new Date(d.sentAt).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-rose-500 dark:text-rose-400">{d.error || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wrench className="w-5 h-5 text-rose-500" /> Maintenance &amp; System Communications <Link to="/super-admin/maintenance" className="ml-auto text-xs text-rose-500 font-semibold">Manage maintenance →</Link></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-2 mb-3">
            {maintenance?.status ? <StateBadge state={maintenance.status === 'active' ? 'active' : maintenance.status === 'warning' ? 'warning' : 'scheduled'} /> : <StateBadge state="unknown" />}
            {maintenance?.title ? <span className="font-semibold">{maintenance.title}</span> : <span className="text-gray-400">No maintenance currently scheduled.</span>}
          </div>
          {activeWindows.length > 0 ? (
            <div className="space-y-2">
              {activeWindows.map((w: any) => (
                <div key={w.id} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-white">{w.title}</p><p className="text-[11px] text-gray-500 dark:text-slate-400">{w.scheduledStart ? new Date(w.scheduledStart).toLocaleString() : '—'} → {w.scheduledEnd ? new Date(w.scheduledEnd).toLocaleString() : '—'}</p></div>
                  <div className="flex items-center gap-2"><StateBadge state={w.status} /><Link to="/super-admin/maintenance" className="text-rose-500 text-xs font-semibold">Manage</Link></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">Scheduled maintenance notices are created and managed from the Maintenance page, and are broadcast here upon delivery.</p>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {composing && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setComposing(false)} />
            <motion.aside className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col overflow-hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800"><p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Send className="w-4 h-4 text-rose-500" /> Send Notification</p><Button size="sm" variant="ghost" onClick={() => setComposing(false)}><X className="w-4 h-4" /></Button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div><Label>Title</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Notification title" /></div>
                <div><Label>Message</Label><textarea className="w-full min-h-[90px] rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500/30 resize-y" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Notification message" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label><Select value={form.messageType} onValueChange={v => setForm({ ...form, messageType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['general-announcement', 'maintenance', 'order', 'payment', 'security', 'system'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['NORMAL', 'IMPORTANT', 'CRITICAL'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label>Recipients</Label><Select value={form.recipientGroup} onValueChange={v => setForm({ ...form, recipientGroup: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[{ v: 'all', l: 'All Users' }, { v: 'customers', l: 'All Customers' }, { v: 'vendors', l: 'All Vendors' }, { v: 'riders', l: 'All Riders' }, { v: 'administrators', l: 'All Administrators' }].map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent></Select></div>
                <div>
                  <Label>Channels</Label>
                  <div className="flex gap-2 mt-1">
                    {[['In-app', providers?.inApp?.code === 'available'], ['Email', providers?.email?.code === 'configured']].map(([ch, ok]) => (
                      <button key={ch as string} type="button" onClick={() => { const arr = form.deliveryChannels.includes(ch as string) ? form.deliveryChannels.filter((c: string) => c !== ch) : [...form.deliveryChannels, ch as string]; setForm({ ...form, deliveryChannels: arr }); }} disabled={!ok} className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors', form.deliveryChannels.includes(ch as string) ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300' : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400')}>{ch}{ok ? '' : ' (n/a)'}</button>
                    ))}
                    <span className="text-[11px] text-gray-400 self-center">SMS not configured</span>
                  </div>
                </div>
                <div><Label>Schedule (optional)</Label><Input type="datetime-local" value={form.scheduleAt} onChange={e => setForm({ ...form, scheduleAt: e.target.value })} /></div>
                <div><Label>Current password (high-risk action)</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Confirm with your password" /></div>
                {sendError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{sendError}</p>}
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                <Button onClick={send} disabled={sending}><Send className="w-4 h-4 mr-1" /> {sending ? 'Working…' : form.scheduleAt ? 'Schedule' : 'Send'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>Cancel</Button>
              </div>
            </motion.aside>
          </>
        )}

        {resendTarget && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setResendTarget(null)} />
            <motion.aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col overflow-hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800"><p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><RefreshCw className="w-4 h-4 text-rose-500" /> Retry Failed Deliveries</p><Button size="sm" variant="ghost" onClick={() => setResendTarget(null)}><X className="w-4 h-4" /></Button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-sm text-gray-600 dark:text-slate-300"><b className="text-gray-900 dark:text-white">{resendTarget.subject}</b> — re-send to users whose delivery failed.</p>
                <div><Label>Current password (high-risk action)</Label><Input type="password" value={resendPassword} onChange={e => setResendPassword(e.target.value)} placeholder="Confirm with your password" /></div>
                {resendError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{resendError}</p>}
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex gap-2">
                <Button onClick={doResend} disabled={resendBusy}><RefreshCw className={`w-4 h-4 mr-1 ${resendBusy ? 'animate-spin' : ''}`} /> {resendBusy ? 'Working…' : 'Retry'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setResendTarget(null)}>Cancel</Button>
              </div>
            </motion.aside>
          </>
        )}

        {(detail || msgDetail) && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setDetail(null); setMsgDetail(null); }} />
            <motion.aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col overflow-hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800"><p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Bell className="w-4 h-4 text-rose-500" /> {detail ? 'Delivery Details' : 'Message Details'}</p><Button size="sm" variant="ghost" onClick={() => { setDetail(null); setMsgDetail(null); }}><X className="w-4 h-4" /></Button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {detail ? (
                  <>
                    <div className="flex items-center gap-2"><StateBadge state={detail.status} /><Badge variant="outline">{detail.channel}</Badge></div>
                    <section><h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Recipient</h4><div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><p className="text-gray-400">Name</p><p className="text-gray-800 dark:text-slate-200 font-medium">{detail.name || '—'}</p></div><div><p className="text-gray-400">Email</p><p className="text-gray-800 dark:text-slate-200 font-medium">{detail.email || '—'}</p></div><div><p className="text-gray-400">Role</p><p className="text-gray-800 dark:text-slate-200 font-medium">{detail.role || '—'}</p></div><div><p className="text-gray-400">Notification</p><p className="text-gray-800 dark:text-slate-200 font-medium">{detail.refTitle || '—'}</p></div></div></section>
                    <section><h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Timeline</h4><div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><p className="text-gray-400">Created</p><p className="text-gray-800 dark:text-slate-200 font-medium">{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</p></div><div><p className="text-gray-400">Delivered</p><p className="text-gray-800 dark:text-slate-200 font-medium">{detail.sentAt ? new Date(detail.sentAt).toLocaleString() : '—'}</p></div><div><p className="text-gray-400">Read</p><p className="text-gray-800 dark:text-slate-200 font-medium">{detail.readAt ? new Date(detail.readAt).toLocaleString() : '—'}</p></div></div>{detail.error && <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-[11px] text-rose-600 dark:text-rose-400">Failure: {detail.error}</div>}</section>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2"><StateBadge state={msgDetail.status} /><Badge variant="outline">to {msgDetail.recipientGroup || 'all'}</Badge></div>
                    <section><h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Message</h4><p className="text-sm font-semibold text-gray-900 dark:text-white">{msgDetail.subject}</p><p className="text-xs text-gray-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{msgDetail.message}</p></section>
                    <section><h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Delivery</h4><div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><p className="text-gray-400">Channels</p><p className="text-gray-800 dark:text-slate-200 font-medium">{Array.isArray(msgDetail.deliveryChannels) ? msgDetail.deliveryChannels.join(' + ') : 'In-app'}</p></div><div><p className="text-gray-400">Created</p><p className="text-gray-800 dark:text-slate-200 font-medium">{msgDetail.createdAt ? new Date(msgDetail.createdAt).toLocaleString() : '—'}</p></div><div><p className="text-gray-400">Scheduled</p><p className="text-gray-800 dark:text-slate-200 font-medium">{msgDetail.scheduleAt ? new Date(msgDetail.scheduleAt).toLocaleString() : '—'}</p></div><div><p className="text-gray-400">Priority</p><p className="text-gray-800 dark:text-slate-200 font-medium">{msgDetail.priority || '—'}</p></div></div></section>
                    <Link to={`/super-admin/deliveries`} onClick={() => { setDetail(null); setMsgDetail(null); }} className="text-rose-500 text-xs font-semibold">View delivery log →</Link>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * USER MANAGEMENT
 * ------------------------------------------------------------
 */
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'pending', label: 'Pending' },
  { key: 'locked', label: 'Locked' },
] as const;

function userStatusKey(u: any): string {
  if (u.isSuspended) return 'suspended';
  if (u.lockedUntil && u.lockedUntil > Date.now()) return 'locked';
  if (u.status === 'pending' || (u.isApproved === false)) return 'pending';
  return 'active';
}

function userStatusMeta(u: any): { label: string; variant: any } {
  const key = userStatusKey(u);
  if (key === 'suspended') return { label: 'Suspended', variant: 'danger' };
  if (key === 'locked') return { label: 'Locked', variant: 'outline' };
  if (key === 'pending') return { label: 'Pending', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
}

function userDisplayName(u: any): string {
  return u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Unnamed User';
}

function userInitials(u: any): string {
  const name = userDisplayName(u).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const initials = (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
  return initials.toUpperCase();
}

export function SuperAdminUsersPage() {
  const { showToast } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: string; user: any } | null>(null);
  const [tempResult, setTempResult] = useState<{ user: any; password: string } | null>(null);

  const PAGE_SIZE = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await AdminService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 whenever search/filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const counts = useMemo(() => ({
    all: users.length,
    active: users.filter(u => userStatusKey(u) === 'active').length,
    suspended: users.filter(u => u.isSuspended).length,
    pending: users.filter(u => userStatusKey(u) === 'pending').length,
    locked: users.filter(u => userStatusKey(u) === 'locked').length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (statusFilter !== 'all' && userStatusKey(u) !== statusFilter) return false;
      if (!q) return true;
      return (u.email || '').toLowerCase().includes(q)
        || (u.displayName || '').toLowerCase().includes(q)
        || (u.firstName || '').toLowerCase().includes(q)
        || (u.lastName || '').toLowerCase().includes(q)
        || (u.role || '').toLowerCase().includes(q)
        || userStatusMeta(u).label.toLowerCase().includes(q);
    });
  }, [users, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filtered.length);

  const showError = (e: any, fallback: string) =>
    showToast('Action Failed', e?.message || fallback, 'warning');

  const runAction = async (user: any, kind: string) => {
    setBusyId(user.id);
    try {
      if (kind === 'suspend') {
        await AdminService.accountAction(user.id, 'suspend');
        showToast('Account Suspended', `${userDisplayName(user)} is signed out everywhere and cannot sign in.`, 'success');
      } else if (kind === 'reactivate') {
        await AdminService.accountAction(user.id, 'reactivate');
        showToast('Account Reactivated', `${userDisplayName(user)} can sign in again.`, 'success');
      } else if (kind === 'force-reset') {
        await AdminService.adminForceReset(user.id);
        showToast('Password Reset', `${userDisplayName(user)} must set a new password at next sign-in.`, 'success');
      } else if (kind === 'revoke') {
        const res = await AdminService.adminRevokeSessions(user.id);
        const n = res?.revokedSessions ?? '';
        showToast('Sessions Revoked', `${userDisplayName(user)}'s active sessions${n ? ` (${n})` : ''} were terminated.`, 'success');
      }
      setConfirm(null);
      await fetchUsers();
    } catch (e: any) {
      showError(e, 'Could not complete that action. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTempPassword = async (user: any) => {
    setBusyId(user.id);
    try {
      const res = await AdminService.adminGenerateTempPassword(user.id);
      if (res?.success && res.tempPassword) {
        setTempResult({ user, password: res.tempPassword });
        setConfirm(null);
        await fetchUsers();
      } else {
        showToast('Action Failed', 'Could not generate a temporary password.', 'warning');
      }
    } catch (e: any) {
      showError(e, 'Could not generate a temporary password.');
    } finally {
      setBusyId(null);
    }
  };

  const copyTempPassword = async () => {
    if (!tempResult) return;
    try {
      await navigator.clipboard.writeText(tempResult.password);
      showToast('Copied', 'Temporary password copied to clipboard.', 'success');
    } catch {
      showToast('Copy', 'Press Ctrl+C to copy.', 'info');
    }
  };

  const confirmProps = (() => {
    if (!confirm) return null;
    const { kind, user } = confirm;
    const label = userDisplayName(user);
    if (kind === 'suspend') {
      return {
        tone: 'danger' as const, icon: 'user' as const, title: 'Suspend account?',
        description: <>You are about to <strong>suspend</strong> <strong>{label}</strong>. They will be signed out of every device immediately and blocked from signing in. Their data will not be deleted and they can be reactivated at any time.</>,
        confirmLabel: 'Suspend Account',
      };
    }
    if (kind === 'reactivate') {
      return {
        tone: 'primary' as const, icon: 'shield' as const, title: 'Reactivate account?',
        description: <><strong>{label}</strong> will be allowed to sign in again. Their previous settings, roles and data are preserved.</>,
        confirmLabel: 'Reactivate Account',
      };
    }
    if (kind === 'force-reset') {
      return {
        tone: 'warning' as const, icon: 'refresh' as const, title: 'Force password reset?',
        description: <><strong>{label}</strong> will be signed out and forced to create a new password on their next sign-in.</>,
        confirmLabel: 'Force Reset',
      };
    }
    return {
      tone: 'warning' as const, icon: 'logout' as const, title: 'Revoke all sessions?',
      description: <>Every active session for <strong>{label}</strong> will be terminated immediately. They will need to sign in again on each device.</>,
      confirmLabel: 'Revoke Sessions',
    };
  })();

  const activeBusy = (u: any) => busyId === u.id;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Users} title="User Management" description="Manage all platform accounts, monitor status, and perform real security actions." count={`${users.length} users`} />

      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Accounts</CardTitle>
            <p className="text-xs text-ink-3 mt-0.5">Showing {start}–{end} of {filtered.length} · {users.length} total</p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
            <Input placeholder="Search name, email, role, status…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
          </div>
        </CardHeader>

        <div className="px-4 sm:px-6 pt-4 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition border',
                  active
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-2 text-ink-2 border-line hover:bg-surface-3 dark:bg-slate-800 dark:hover:bg-slate-700'
                )}
              >
                {f.label}
                <span className={cn('ml-1.5 text-[10px] font-black', active ? 'text-white/80' : 'text-ink-3')}>{counts[f.key as keyof typeof counts]}</span>
              </button>
            );
          })}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-14 text-center text-ink-3">Loading users…</div>
          ) : loadError ? (
            <div className="p-14 text-center">
              <p className="text-sm text-danger mb-3">{loadError}</p>
              <Button variant="outline" size="sm" onClick={fetchUsers}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="p-14 text-center text-ink-3 italic">No users match your filters.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-y text-[10px] font-black uppercase tracking-wider text-ink-3">
                      <th className="py-3 px-6">User</th>
                      <th className="py-3 px-6">Role</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(u => {
                      const st = userStatusMeta(u);
                      const busy = activeBusy(u);
                      return (
                        <tr key={u.id} className="border-b border-line hover:bg-surface-2/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 shrink-0 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-bold">{userInitials(u)}</div>
                              <div className="min-w-0">
                                <div className="font-medium text-ink dark:text-white truncate">{userDisplayName(u)}</div>
                                <div className="text-xs text-ink-3 truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-6"><Badge variant="outline" className="capitalize">{String(u.role || 'user').replace(/-/g, ' ')}</Badge></td>
                          <td className="py-3 px-6">
                            <Badge variant={st.variant} dot>{st.label}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            {u.isVerified
                              ? <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>Verified</Badge>
                              : <Badge variant="outline" icon={<Mail className="w-3 h-3" />}>Unverified</Badge>}
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-end gap-2">
                              {u.isSuspended ? (
                                <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-ok border-ok/40 hover:bg-ok-soft" disabled={busy} onClick={() => setConfirm({ kind: 'reactivate', user: u })}>
                                  {busy ? <Spinner /> : null} Reactivate
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-danger border-danger/40 hover:bg-danger-soft" disabled={busy} onClick={() => setConfirm({ kind: 'suspend', user: u })}>
                                  {busy ? <Spinner /> : null} Suspend
                                </Button>
                              )}
                              <div className="relative">
                                <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg px-0" aria-label={`Actions for ${userDisplayName(u)}`} disabled={busy} onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                                {menuFor === u.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                                    <div className="absolute right-0 mt-1 z-50 w-52 rounded-xl bg-surface dark:bg-slate-900 border border-line shadow-2xl p-1.5">
                                      {[
                                        { key: 'force-reset', label: 'Force Password Reset', icon: KeyRound, tone: 'text-ink-2' },
                                        { key: 'temp-pass', label: 'Generate Temp Password', icon: Lock, tone: 'text-ink-2' },
                                        { key: 'revoke', label: 'Revoke All Sessions', icon: Ban, tone: 'text-danger' },
                                      ].map(item => (
                                        <button
                                          key={item.key}
                                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition hover:bg-surface-2 dark:hover:bg-slate-800"
                                          onClick={() => {
                                            setMenuFor(null);
                                            if (item.key === 'temp-pass') handleTempPassword(u);
                                            else setConfirm({ kind: item.key, user: u });
                                          }}
                                        >
                                          <item.icon className={cn('w-4 h-4', item.tone)} />
                                          <span className={item.tone}>{item.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-line">
                {pageRows.map(u => {
                  const st = userStatusMeta(u);
                  const busy = activeBusy(u);
                  return (
                    <div key={u.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-bold">{userInitials(u)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-ink dark:text-white truncate">{userDisplayName(u)}</div>
                          <div className="text-xs text-ink-3 truncate">{u.email}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="capitalize">{String(u.role || 'user').replace(/-/g, ' ')}</Badge>
                            <Badge variant={st.variant} dot>{st.label}</Badge>
                            {u.isVerified
                              ? <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>Verified</Badge>
                              : <Badge variant="outline" icon={<Mail className="w-3 h-3" />}>Unverified</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {u.isSuspended ? (
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-ok border-ok/40 hover:bg-ok-soft" disabled={busy} onClick={() => setConfirm({ kind: 'reactivate', user: u })}>
                            {busy ? <Spinner /> : null} Reactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-danger border-danger/40 hover:bg-danger-soft" disabled={busy} onClick={() => setConfirm({ kind: 'suspend', user: u })}>
                            {busy ? <Spinner /> : null} Suspend
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg px-0" aria-label={`More actions for ${userDisplayName(u)}`} onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                      {menuFor === u.id && (
                        <div className="mt-2 rounded-xl bg-surface-2 border border-line p-1.5 dark:bg-slate-800">
                          {[
                            { key: 'force-reset', label: 'Force Password Reset', icon: KeyRound, tone: 'text-ink-2' },
                            { key: 'temp-pass', label: 'Generate Temp Password', icon: Lock, tone: 'text-ink-2' },
                            { key: 'revoke', label: 'Revoke All Sessions', icon: Ban, tone: 'text-danger' },
                          ].map(item => (
                            <button
                              key={item.key}
                              disabled={busy}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition hover:bg-surface-3 dark:hover:bg-slate-700 disabled:opacity-50"
                              onClick={() => {
                                setMenuFor(null);
                                if (item.key === 'temp-pass') handleTempPassword(u);
                                else setConfirm({ kind: item.key, user: u });
                              }}
                            >
                              <item.icon className={cn('w-4 h-4', item.tone)} />
                              <span className={item.tone}>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-line">
                <p className="text-xs text-ink-3">Page {safePage} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-lg" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="Previous page">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-lg" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} aria-label="Next page">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialogs */}
      {confirmProps && (
        <ConfirmDialog
          open
          tone={confirmProps.tone}
          icon={confirmProps.icon as any}
          title={confirmProps.title}
          description={confirmProps.description}
          confirmLabel={confirmProps.confirmLabel}
          busy={busyId === confirm?.user?.id}
          busyLabel="Working…"
          onConfirm={() => confirm && runAction(confirm.user, confirm.kind)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Temp password result */}
      {tempResult && (
        <ConfirmDialog
          open
          tone="primary"
          icon="key"
          title="Temporary Password Generated"
          description={
            <>
              A one-time password was created for <strong>{userDisplayName(tempResult.user)}</strong>. Share it with them privately — it will only be shown once and they will be forced to change it at sign-in.
            </>
          }
          confirmLabel="Done"
          onConfirm={() => setTempResult(null)}
          onCancel={() => setTempResult(null)}
        >
          <div className="rounded-xl bg-surface-2 border border-line p-3 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono text-sm text-primary break-all select-all">{tempResult.password}</code>
              <Button size="sm" variant="outline" className="h-8 w-8 rounded-lg px-0 shrink-0" onClick={copyTempPassword} aria-label="Copy password">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[11px] text-ink-3 mt-1.5">Revealed once — copy it now before closing.</p>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
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

/*
 * ------------------------------------------------------------
 * SECURITY EVENTS
 * ------------------------------------------------------------
 */
export function SuperAdminSecurityEventsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      AdminService.getAuditSummary(),
      AdminService.getAudit({ limit: 200 })
    ]).then(([s, a]) => {
      setSummary(s);
      const list = Array.isArray(a?.items) ? a.items : [];
      setEvents(list.filter((e: any) =>
        /login|logout|lock|suspension|suspended|reactivat|revoke|thread|password|verification|force/i.test(String(e.action))
      ));
    }).catch(() => { setSummary(null); setEvents([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const threatCount = events.filter(e => String(e.result).toLowerCase() !== 'success').length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={ShieldAlert} title="Security Events" description="Authentication, session and account-security events drawn from the real server audit log." count={loading ? 'loading…' : `${events.length} events`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Security Events</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Non-success</p><p className="text-2xl font-bold text-rose-600">{threatCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Last 24h</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.last24h ?? '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Audit Total</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.total ?? '—'}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> Event Timeline</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh</Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-gray-400 py-12 italic">Loading security events…</p>
          ) : events.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No security events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Event</th>
                    <th className="py-4 px-6">Actor</th>
                    <th className="py-4 px-6">Result</th>
                    <th className="py-4 px-6">Meta</th>
                    <th className="py-4 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6 font-medium capitalize text-gray-900 dark:text-white">{String(e.action).replace(/_/g, ' ')}</td>
                      <td className="py-3 px-6">{e.actorName}</td>
                      <td className="py-3 px-6"><Badge variant={e.result === 'success' ? 'success' : 'danger'}>{e.result}</Badge></td>
                      <td className="py-3 px-6 text-xs text-gray-500">
                        {e.meta && (e.meta.device || e.meta.ip || e.meta.portal || e.meta.reason) ? (
                          [e.meta.device, e.meta.ip, e.meta.portal, e.meta.reason].filter(Boolean).join(' · ')
                        ) : '—'}
                      </td>
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
 * SESSIONS — platform-wide live session registry
 * ------------------------------------------------------------
 */
export function SuperAdminSessionsPage() {
  const { showToast } = useApp();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    AdminService.getSessions().then(s => setSessions(Array.isArray(s) ? s : [])).catch(() => setSessions([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const revoke = (row: any) => {
    AdminService.adminRevokeSessions(row.userId)
      .then(() => { showToast('Sessions Revoked', `${row.name}'s active sessions were terminated.`, 'success'); setPending(null); load(); })
      .catch((e: any) => showToast('Error', e?.message || 'Could not revoke sessions.', 'warning'));
  };
  const [pending, setPending] = useState<any | null>(null);

  const filtered = sessions.filter(s =>
    !search ||
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.deviceName || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.ipAddress || '').toLowerCase().includes(search.toLowerCase())
  );

  const active = sessions.filter(s => !s.revoked && !s.expired).length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Monitor} title="Sessions" description="Live platform-wide session registry. Revoking a user's sessions terminates every device instantly." count={`${active} active`} />
      {pending && (
        <ConfirmDialog
          open
          tone="danger"
          icon="logout"
          title="Terminate all sessions?"
          description={<>Every active session for <strong>{pending.name}</strong> ({pending.email}) will be terminated immediately across all devices. They will be signed out and must re-authenticate.</>}
          confirmLabel="Terminate Sessions"
          onConfirm={() => revoke(pending)}
          onCancel={() => setPending(null)}
        />
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-emerald-600">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Revoked</p><p className="text-2xl font-bold text-rose-600">{sessions.filter(s => s.revoked).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Expired</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.filter(s => s.expired && !s.revoked).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Records</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><Monitor className="w-5 h-5 text-emerald-500" /> Session Registry</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search user, device, IP…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-gray-400 py-12 italic">Loading sessions…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No sessions recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Device</th>
                    <th className="py-4 px-6">IP</th>
                    <th className="py-4 px-6">Issued</th>
                    <th className="py-4 px-6">Last Activity</th>
                    <th className="py-4 px-6">State</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.sessionId} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6">
                        <div className="font-medium text-gray-900 dark:text-white">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.email} · <Badge variant="outline" className="ml-0.5 capitalize text-[10px]">{s.role}</Badge></div>
                      </td>
                      <td className="py-3 px-6">{s.deviceName}{s.isSuspended ? <Badge variant="danger" className="ml-1.5">suspended</Badge> : null}</td>
                      <td className="py-3 px-6 font-mono text-xs text-gray-500">{s.ipAddress || '—'}</td>
                      <td className="py-3 px-6 text-xs text-gray-500">{s.issuedAt ? new Date(s.issuedAt).toLocaleString() : '—'}</td>
                      <td className="py-3 px-6 text-xs text-gray-500">{s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleString() : '—'}</td>
                      <td className="py-3 px-6">
                        {s.revoked
                          ? <Badge variant="danger">Revoked</Badge>
                          : s.expired ? <Badge variant="outline">Expired</Badge> : <Badge variant="success">Active</Badge>}
                      </td>
                      <td className="py-3 px-6 text-right">
                        {!s.revoked && (
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setPending(s)}>
                            <Ban className="w-3.5 h-3.5 mr-1" /> Terminate
                          </Button>
                        )}
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
