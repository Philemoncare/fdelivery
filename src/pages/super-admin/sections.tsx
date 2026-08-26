import { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Users, Store, Bike, CheckCircle, XCircle, Shield,
  Activity, Database, ScrollText, Lock, KeyRound, HardDrive,
  UserCog, Archive, Bell, CreditCard, FileText, Globe, AlertTriangle,
  Search, RefreshCw, Cpu, Save, ShieldAlert, Monitor, Trash2, Copy, Ban, ShieldCheck,
  MoreHorizontal, ChevronLeft, ChevronRight, Mail, Eye, X, Filter, Loader2, Inbox, Download,
  Server, ServerCog, Gauge, Timer, History, Power, Clock, Layers, KeySquare, ShieldOff, ChevronDown, ArrowUpRight,
  Wallet, Banknote, Smartphone, Webhook, Send, Package, Zap, Wrench, ListChecks, Info, MessageSquare, CalendarClock,
  CheckCircle2, ServerOff, Boxes, Megaphone, ShoppingCart, Plug2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Switch } from '@/src/components/ui/switch';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import { AuthApiService } from '@/src/services/auth-api';
import { ROLE_PERMISSIONS, ROLE_LABELS, isSuperAdminRole, type Role, type Permission } from '@/src/lib/auth/types';
import { ConfirmDialog } from '@/src/components/common/ConfirmDialog';
import { cn } from '@/src/lib/utils';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable,
  AdminStatCard, AdminSectionHeading, AdminStatus, AdminLoading, AdminError, AdminEmptyState,
  AdminDrawer, AdminModal, AdminPagination, AdminRefresh
} from '@/src/components/super-admin/AdminDesignSystem';




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
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Store}
        title="Restaurant Approvals"
        description="Review and approve new restaurant partner applications to maintain marketplace quality."
        stats={<AdminBadge status="pending" label={`${stats.pending} Pending`} />}
      />

      {confirmDecision && pending && (
        <ConfirmDialog
          open
          tone={pending.status === 'active' ? 'primary' : 'danger'}
          icon={pending.status === 'active' ? 'shield' : 'alert'}
          title={confirmDecision.title}
          description={confirmDecision.description}
          confirmLabel={confirmDecision.label}
          busy={busy}
          busyLabel="Processing…"
          onConfirm={() => decide(pending.vendor, pending.status)}
          onCancel={() => setPending(null)}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Pending" value={stats.pending} icon={Clock} status="warning" />
        <AdminStatCard label="Active" value={stats.active} icon={CheckCircle2} status="success" />
        <AdminStatCard label="Suspended" value={stats.suspended} icon={Ban} status="error" />
        <AdminStatCard label="Rejected" value={stats.rejected} icon={XCircle} status="info" />
      </div>

      <AdminCard
        title="Application Queue"
        subtitle="Manage restaurant merchant accounts"
        icon={ListChecks}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
              <Input placeholder="Search merchants…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs rounded-xl w-48 lg:w-64" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        noPadding
      >
        {filtered.length === 0 ? (
          <AdminEmptyState
            icon={Store}
            title="No records found"
            description="No restaurant applications match your current filters or search criteria."
          />
        ) : (
          <AdminTable headers={['Merchant', 'Contact Information', 'Status', 'Verification', 'Commission', 'Actions']}>
            {filtered.map(v => (
              <tr key={v.id} className="group hover:bg-surface-2/40 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={v.logo} className="w-9 h-9 rounded-xl object-cover border border-line" alt="" />
                    <div>
                      <div className="text-xs font-black text-ink uppercase tracking-tight">{v.name}</div>
                      <div className="text-[10px] text-ink-3 font-bold uppercase tracking-widest">{v.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-medium text-ink">{v.email}</div>
                  <div className="text-[10px] text-ink-3 font-mono">{v.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <AdminBadge status={v.status as AdminStatus} />
                </td>
                <td className="px-6 py-4">
                   <AdminBadge status={v.verificationStatus === 'verified' ? 'success' : v.verificationStatus === 'pending' ? 'pending' : 'error'} label={v.verificationStatus} />
                </td>
                <td className="px-6 py-4 font-black text-xs text-ink">{v.commissionRate}%</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {v.status === 'pending' || v.verificationStatus === 'rejected' ? (
                      <>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => setPending({ vendor: v, status: 'active' })} title="Approve"><CheckCircle className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setPending({ vendor: v, status: 'rejected' })} title="Reject"><XCircle className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>
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
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Bike}
        title="Rider Fleet Verification"
        description="Review background checks and documentation for new logistics partners."
        stats={<AdminBadge status="pending" label={`${stats.pending} Applications`} />}
      />

      {confirmDecision && pending && (
        <ConfirmDialog
          open
          tone={pending.status === 'verified' ? 'primary' : 'danger'}
          icon={pending.status === 'verified' ? 'shield' : 'alert'}
          title={confirmDecision.title}
          description={confirmDecision.description}
          confirmLabel={confirmDecision.label}
          busy={busy}
          busyLabel="Processing…"
          onConfirm={() => toggle(pending.rider, pending.status)}
          onCancel={() => setPending(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminStatCard label="Pending Background Checks" value={stats.pending} icon={Clock} status="warning" />
        <AdminStatCard label="Active Fleet Members" value={stats.verified} icon={ShieldCheck} status="success" />
        <AdminStatCard label="Rejected Applications" value={stats.rejected} icon={XCircle} status="info" />
      </div>

      <AdminCard
        title="Fleet Applications"
        subtitle="Verification and compliance queue"
        icon={Users}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
              <Input placeholder="Search riders…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs rounded-xl w-48 lg:w-64" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Riders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        noPadding
      >
        {filtered.length === 0 ? (
          <AdminEmptyState
            icon={Bike}
            title="Queue empty"
            description="No rider applications match the current filter criteria."
          />
        ) : (
          <AdminTable headers={['Rider Partner', 'Vehicle Details', 'Status', 'Performance', 'Rating', 'Actions']}>
            {filtered.map(r => (
              <tr key={r.id} className="group hover:bg-surface-2/40 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={r.avatar} className="w-9 h-9 rounded-full object-cover border-2 border-line" alt="" />
                    <div>
                      <div className="text-xs font-black text-ink uppercase tracking-tight">{r.name}</div>
                      <div className="text-[10px] text-ink-3 font-mono">{r.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-bold text-ink uppercase tracking-tight">{r.vehicleType}</div>
                  <div className="text-[10px] text-ink-3 font-mono uppercase tracking-widest">{r.vehicleNumber}</div>
                </td>
                <td className="px-6 py-4">
                  <AdminBadge status={r.verificationStatus === 'verified' ? 'success' : r.verificationStatus === 'pending' ? 'pending' : 'error'} label={r.verificationStatus} />
                </td>
                <td className="px-6 py-4 font-black text-xs text-ink">{r.totalDeliveries} Jobs</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                    {r.rating} <Zap className="w-3 h-3 fill-current" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {r.verificationStatus === 'pending' || r.verificationStatus === 'rejected' ? (
                      <>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => setPending({ rider: r, status: 'verified' })} title="Verify"><CheckCircle className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setPending({ rider: r, status: 'rejected' })} title="Reject"><XCircle className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600">
                        <ShieldCheck className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * PAYMENT GATEWAYS
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

  const requestToggle = (p: any) => {
    if (!isSuper) { showToast('Access Denied', 'Super admin access required for gateway configuration.', 'warning'); return; }
    setToggleTarget(p);
    setTogglePassword('');
    setToggleError(null);
  };

  const runToggle = async (enabled: boolean) => {
    if (!toggleTarget) return;
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

  if (error && !data) return <AdminError message="Unable to load payment operations." detail={error} retry={() => load()} />;
  if (loading || !data) return <AdminLoading message="Reading payment gateway telemetry…" />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={CreditCard}
        title="Payments & Gateways"
        description="Monitor transaction success rates, manage payment providers and secure gateway configuration."
        stats={<AdminBadge status="operational" label={`${fmtNum(summary.totalTransactions)} processed`} />}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-3 hidden lg:block">Synced {lastUpdatedSec}s ago</span>
            <Button size="sm" variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold" onClick={() => load()}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard label="Success Rate" value={pct(100 - (summary.failureRate || 0))} icon={CheckCircle2} status="success" />
        <AdminStatCard label="Total Volume" value={fmtCurrency(summary.totalVolume)} icon={Wallet} status="info" />
        <AdminStatCard label="Failure Rate" value={pct(summary.failureRate)} icon={AlertTriangle} status="error" />
        <AdminStatCard label="Daily Revenue" value={fmtCurrency(summary.todayVolume)} icon={Zap} status="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <AdminCard title="Payment Providers" icon={Banknote} noPadding>
            <div className="divide-y divide-line">
              {providers.map((p: any) => {
                const enabled = p.status !== 'disabled' && p.configured;
                return (
                  <div key={p.id} className="p-5 flex items-center justify-between group hover:bg-surface-2/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-ink-3" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-ink">{p.shortName || p.name}</p>
                        <p className="text-[10px] text-ink-3 font-semibold uppercase tracking-widest">{p.type} · env {p.environment}</p>
                        <p className="mt-0.5 max-w-[260px] truncate text-[10px] text-ink-3">
                          {p.configured
                            ? enabled ? `${fmtNum(p.success)} successful · ${fmtNum(p.failed)} failed`
                            : 'CURRENTLY UNAVAILABLE — configured but disabled'
                            : 'NOT CONFIGURED — not available in customer checkout'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block text-right">
                        <p className="text-xs font-bold text-ink">{fmtNum(p.transactions)} Tx</p>
                        <p className="text-[10px] text-ink-3 font-semibold uppercase">{p.successRate != null ? `${p.successRate}% Success` : 'No traffic'}</p>
                      </div>
                      <AdminBadge status={!p.configured ? 'disabled' : enabled ? 'operational' : 'disabled'} label={!p.configured ? 'not configured' : enabled ? 'enabled' : 'disabled'} />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={enabled}
                          disabled={!isSuper || !p.configured}
                          onCheckedChange={() => requestToggle(p)}
                          aria-label={`Toggle ${p.name}`}
                        />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => setSelected({ kind: 'provider', provider: p })}><MoreHorizontal className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminCard>

          <AdminCard
            title="Transaction History"
            icon={History}
            noPadding
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
                  <Input placeholder="Search tx, customer…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-44 rounded-xl pl-9 text-xs lg:w-52" />
                </div>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger className="h-9 w-32 rounded-xl text-xs"><SelectValue placeholder="Provider" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {providerOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-32 rounded-xl text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            {filteredTx.length === 0 ? (
              <AdminEmptyState
                icon={History}
                title="No transactions"
                description={transactions.length === 0 ? 'No payments have been processed yet.' : 'No transactions match the current filters.'}
                action={<Button variant="outline" size="sm" onClick={() => { setSearch(''); setProvider('all'); setStatus('all'); }}>Clear Filters</Button>}
              />
            ) : (
              <AdminTable headers={['Transaction', 'Customer', 'Method', 'Amount', 'Status', 'Timestamp']}>
                {filteredTx.slice(0, 10).map((t: any) => (
                  <tr key={t.id} onClick={() => setSelected({ kind: 'tx', tx: t })} className="cursor-pointer hover:bg-surface-2/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-mono text-ink font-bold uppercase">{String(t.id).slice(0, 12)}</p>
                      <p className="text-[10px] text-ink-3 uppercase tracking-widest">Order {t.orderNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-ink">{t.customer}</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-ink-2 uppercase tracking-widest">{t.method}</td>
                    <td className="px-6 py-4 font-bold text-xs text-ink">{fmtCurrency(t.amount)}</td>
                    <td className="px-6 py-4"><AdminBadge status={t.status as AdminStatus} /></td>
                    <td className="px-6 py-4 text-[10px] text-ink-3 uppercase font-bold tracking-widest">{new Date(t.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </AdminCard>
        </div>

        <div className="space-y-8">
          <AdminCard title="Webhook Health" icon={Webhook}>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-line pb-3">
                <span className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Last Webhook</span>
                <span className="text-[10px] font-mono text-ink font-bold uppercase">{webhooks.lastWebhook || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-surface-2 border border-line">
                  <p className="text-[9px] font-bold text-ink-3 uppercase mb-1">Processed</p>
                  <p className="text-lg font-bold text-ink">{fmtNum(webhooks.totalProcessed)}</p>
                </div>
                <div className="p-3 rounded-xl bg-danger-soft border border-danger/20">
                  <p className="text-[9px] font-bold text-danger uppercase mb-1">Failures</p>
                  <p className="text-lg font-bold text-danger">{fmtNum(webhooks.failures)}</p>
                </div>
              </div>
            </div>
          </AdminCard>
          {failures.length > 0 && (
            <AdminCard title="Failure Log" icon={AlertTriangle} noPadding>
              <div className="divide-y divide-line">
                {failures.slice(0, 5).map((f: any) => (
                  <div key={f.id} className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[10px] font-bold uppercase text-ink-2">Order {f.orderId}</span>
                      <AdminBadge status="error" label={fmtCurrency(f.amount)} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] text-ink-3">{f.reason || 'No failure reason recorded'}</p>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}
        </div>
      </div>

      {selected?.kind === 'provider' && (
        <AdminDrawer
          open
          onClose={() => setSelected(null)}
          icon={Wallet}
          title={selected.provider.name}
          subtitle="Gateway configuration & telemetry"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <AdminBadge status={!selected.provider.configured ? 'disabled' : selected.provider.status === 'disabled' ? 'disabled' : 'operational'} label={selected.provider.status} />
              <AdminBadge status="info" label={`env ${selected.provider.environment}`} />
              {selected.provider.successRate != null && <AdminBadge status="success" label={`${selected.provider.successRate}% success`} />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 border border-line p-3">
                <p className="text-[9px] font-bold text-ink-3 uppercase mb-1">Transactions</p>
                <p className="text-lg font-bold text-ink">{fmtNum(selected.provider.transactions)}</p>
              </div>
              <div className="rounded-xl bg-ok-soft/40 border border-ok/20 p-3">
                <p className="text-[9px] font-bold text-ok uppercase mb-1">Successful</p>
                <p className="text-lg font-bold text-ok">{fmtNum(selected.provider.success)}</p>
              </div>
              <div className="rounded-xl bg-danger-soft/40 border border-danger/20 p-3">
                <p className="text-[9px] font-bold text-danger uppercase mb-1">Failed</p>
                <p className="text-lg font-bold text-danger">{fmtNum(selected.provider.failed)}</p>
              </div>
              <div className="rounded-xl bg-surface-2 border border-line p-3">
                <p className="text-[9px] font-bold text-ink-3 uppercase mb-1">Last Activity</p>
                <p className="text-xs font-bold text-ink">{selected.provider.lastTransaction ? new Date(selected.provider.lastTransaction).toLocaleString() : '—'}</p>
              </div>
            </div>
            <p className="text-xs text-ink-3 leading-relaxed">
              {selected.provider.configured
                ? selected.provider.enabled
                  ? 'This gateway is configured and enabled. Customer checkout can use it.'
                  : 'This gateway is configured but currently disabled. Customer checkout does not surface it; customers see it as currently unavailable.'
                : 'This gateway is not configured. It is hidden from customer checkout until credentials are configured.'}
            </p>
          </div>
        </AdminDrawer>
      )}

      {selected?.kind === 'tx' && (
        <AdminDrawer
          open
          onClose={() => setSelected(null)}
          icon={Wallet}
          title={`Transaction ${String(selected.tx.id).slice(0, 12)}`}
          subtitle={`Order ${selected.tx.orderNumber || selected.tx.orderId}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Customer</p>
                <p className="text-sm text-ink">{selected.tx.customer || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Method</p>
                <p className="text-sm text-ink">{selected.tx.method || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Amount</p>
                <p className="text-sm font-bold text-ink">{fmtCurrency(selected.tx.amount)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Status</p>
                <AdminBadge status={selected.tx.status as AdminStatus} />
              </div>
              <div className="col-span-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Placed</p>
                <p className="text-sm text-ink">{new Date(selected.tx.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </AdminDrawer>
      )}

      {toggleTarget && (
        <AdminModal
          open
          onClose={() => !toggleBusy && setToggleTarget(null)}
          icon={toggleTarget.configured && toggleTarget.enabled ? Ban : CheckCircle2}
          title={toggleTarget.configured && toggleTarget.enabled ? 'Disable payment method?' : 'Enable payment method?'}
          subtitle={toggleTarget.name}
          danger={toggleTarget.configured && toggleTarget.enabled}
          footer={
            <>
              <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={toggleBusy} onClick={() => setToggleTarget(null)}>Abort</Button>
              <Button className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={toggleBusy} onClick={() => runToggle(!(toggleTarget.configured && toggleTarget.enabled))}>
                {toggleBusy ? 'Applying…' : (toggleTarget.configured && toggleTarget.enabled ? 'Disable Gateway' : 'Enable Gateway')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-3 leading-relaxed">
            Changing this gateway affects live checkout availability for customers immediately. This is a high-risk operation and is recorded in the audit log.
          </p>
          <div className="space-y-2">
            <Label className="block text-xs font-semibold text-danger">Authorization Password</Label>
            <Input type="password" value={togglePassword} onChange={e => setTogglePassword(e.target.value)} className="h-11 rounded-xl text-sm" placeholder="Required for this operation" />
          </div>
          {toggleError && <p className="text-xs font-medium text-danger">{toggleError}</p>}
        </AdminModal>
      )}
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
        showToast('Account Suspended', `${userDisplayName(u)} is signed out everywhere.`, 'success');
      } else if (kind === 'reactivate') {
        await AdminService.accountAction(u.id, 'reactivate');
        showToast('Account Reactivated', `${userDisplayName(u)} can sign in again.`, 'success');
      } else if (kind === 'force-reset') {
        await AdminService.adminForceReset(u.id);
        showToast('Password Reset', `${userDisplayName(u)} must set a new password at next sign-in.`, 'success');
      } else if (kind === 'revoke') {
        const res = await AdminService.adminRevokeSessions(u.id);
        showToast('Sessions Revoked', `${userDisplayName(u)}'s active sessions were terminated.`, 'success');
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
      }
    } catch (e: any) {
      showToast('Action Failed', 'Could not generate a temporary password.', 'warning');
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
    if (kind === 'suspend') return { tone: 'danger' as const, icon: 'user' as const, title: 'Suspend administrator?', description: <>You are about to <strong>suspend</strong> <strong>{label}</strong>. They will be signed out of every device immediately and blocked from signing in.</>, confirmLabel: 'Suspend Account' };
    if (kind === 'reactivate') return { tone: 'primary' as const, icon: 'shield' as const, title: 'Reactivate account?', description: <><strong>{label}</strong> will be allowed to sign in again.</>, confirmLabel: 'Reactivate Account' };
    if (kind === 'force-reset') return { tone: 'warning' as const, icon: 'refresh' as const, title: 'Force password reset?', description: <><strong>{label}</strong> will be signed out and forced to create a new password on their next sign-in.</>, confirmLabel: 'Force Reset' };
    return { tone: 'warning' as const, icon: 'logout' as const, title: 'Revoke all sessions?', description: <>Every active session for <strong>{label}</strong> will be terminated immediately.</>, confirmLabel: 'Revoke Sessions' };
  })();

  const activeBusy = (u: any) => busyId === u.id;

  if (loading && !admins.length) return <AdminLoading message="Retrieving authorized operator list..." />;
  if (loadError && !admins.length) return <AdminError message="Unable to load administrators." detail={loadError} retry={fetchAdmins} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={UserCog}
        title="Administrative Access"
        description="Govern internal platform operators, monitor administrative sessions, and enforce security policies."
        stats={<AdminBadge status="active" label={`${admins.length} Operators`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Privileged Roles" value={adminRoles.length} icon={Shield} status="info" />
        <AdminStatCard label="Total Admins" value={admins.length} icon={UserCog} status="info" />
        <AdminStatCard label="Suspended" value={suspended} icon={Ban} status="error" />
        <AdminStatCard label="Current Session" value={user?.displayName?.split(' ')[0] || 'You'} icon={KeyRound} status="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <AdminCard title="Identity Registry" icon={Users} className="lg:col-span-2" noPadding>
          <AdminTable headers={['Operator', 'Authorization Level', 'Account Status', 'Security', 'Actions']}>
            {admins.map(u => {
              const st = userStatusMeta(u);
              const busy = activeBusy(u);
              const isSelf = u.id === user?.id;
              return (
                <tr key={u.id} className="group hover:bg-surface-2/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black uppercase shadow-inner border border-primary/20">{userInitials(u)}</div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-ink uppercase tracking-tight truncate">{userDisplayName(u)}{isSelf && <span className="ml-1.5 text-[9px] bg-primary/10 text-primary px-1 rounded">ROOT</span>}</div>
                        <div className="text-[10px] text-ink-3 font-mono truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <AdminBadge status="info" label={String(u.role).replace(/-/g, ' ')} />
                  </td>
                  <td className="px-6 py-4">
                    <AdminBadge status={st.variant === 'success' ? 'success' : st.variant === 'warning' ? 'warning' : 'error'} label={st.label} />
                  </td>
                  <td className="px-6 py-4">
                    {u.isVerified
                      ? <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secure</span>
                      : <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1"><Mail className="w-3 h-3" /> Pending</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" disabled={isSelf} onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}><MoreHorizontal className="w-4 h-4" /></Button>
                       {menuFor === u.id && (
                          <div className="relative">
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
                          </div>
                       )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </AdminCard>

        <AdminCard title="Policy Summary" icon={ShieldAlert}>
           <div className="space-y-4">
              {adminRoles.map(role => (
                <div key={role} className="p-4 rounded-2xl bg-surface-2 border border-line">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black text-ink uppercase tracking-widest">{ROLE_LABELS[role]}</p>
                    <AdminBadge status={role === 'super-administrator' ? 'success' : 'info'} label="Active Policy" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_PERMISSIONS[role].slice(0, 5).map(p => (
                      <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-surface border border-line text-ink-3">{p}</span>
                    ))}
                    <span className="text-[9px] text-ink-3 font-bold">+{ROLE_PERMISSIONS[role].length - 5} more</span>
                  </div>
                </div>
              ))}
           </div>
        </AdminCard>
      </div>

      {confirmProps && confirm && (
        <ConfirmDialog
          open
          tone={confirmProps.tone}
          icon={confirmProps.icon as any}
          title={confirmProps.title}
          description={confirmProps.description}
          confirmLabel={confirmProps.confirmLabel}
          busy={activeBusy(confirm.user)}
          onConfirm={() => runAction(confirm.user, confirm.kind)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * SECURITY
 * ------------------------------------------------------------
 */
const SEC_POSTURE: Record<string, { status: AdminStatus; label: string }> = {
  SECURE: { status: 'success', label: 'Secure' },
  MONITORING: { status: 'info', label: 'Monitoring' },
  ATTENTION: { status: 'warning', label: 'Attention' },
  AT_RISK: { status: 'error', label: 'At Risk' },
};

export function SuperAdminSecurityPage() {
  const { user } = useAuth();
  const [ov, setOv] = useState<any>(null);
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      AdminService.getSecurityOverview(),
      user ? AuthApiService.getSessions(user.id) : Promise.resolve([]),
    ])
      .then(([o, sess]) => { setOv(o); setMySessions(Array.isArray(sess) ? sess : []); })
      .catch((e: any) => setLoadError(e?.message || 'Could not load security telemetry.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading && !ov) return <AdminLoading message="Reading security posture…" />;
  if (loadError && !ov) return <AdminError message="Unable to load security telemetry." detail={loadError} retry={load} />;

  const c = ov?.counters || {};
  const posture = SEC_POSTURE[ov?.posture] || { status: 'info' as AdminStatus, label: 'Unknown' };
  const sev = ov?.bySeverity || {};
  const activeSessions = (mySessions || []).filter(s => !s.revoked);
  const hasAdminRole = user ? isSuperAdminRole(user.role) || user.role === 'administrator' : false;
  const rbacChecks = user
    ? ROLE_PERMISSIONS[user.role]?.some((p: string) => String(p).startsWith('security') || String(p).startsWith('audit'))
    : false;

  const severityStatus = (sevName: string): AdminStatus =>
    sevName === 'CRITICAL' ? 'error' : sevName === 'HIGH' ? 'warning' : sevName === 'MEDIUM' ? 'info' : 'success';

  const severityRows = [
    { label: 'Critical', value: sev.CRITICAL || 0, status: 'error' as AdminStatus },
    { label: 'High', value: sev.HIGH || 0, status: 'warning' as AdminStatus },
    { label: 'Medium', value: sev.MEDIUM || 0, status: 'info' as AdminStatus },
    { label: 'Low', value: sev.LOW || 0, status: 'success' as AdminStatus },
    { label: 'Info', value: sev.INFO || 0, status: 'info' as AdminStatus },
  ];

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Shield}
        title="Security Center"
        description="Live security posture, threat feed, identity enforcement, and administrative governance."
        stats={<AdminBadge status={posture.status} label={posture.label} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Critical Alerts" value={String(c.criticalAlerts ?? 0)} icon={ShieldAlert} status={(c.criticalAlerts ?? 0) > 0 ? 'error' : 'success'} />
        <AdminStatCard label="Active Threats" value={String(ov?.summary?.activeThreats ?? 0)} icon={AlertTriangle} status={(ov?.summary?.activeThreats ?? 0) > 0 ? 'warning' : 'info'} />
        <AdminStatCard label="Failed Auth (24h)" value={String(c.failedAuthentication ?? 0)} icon={Ban} status={(c.failedAuthentication ?? 0) > 0 ? 'warning' : 'info'} />
        <AdminStatCard label="Active Sessions" value={String(c.activeSessions ?? activeSessions.length)} icon={Monitor} status="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AdminCard title="Identity Enforcement" icon={Lock}>
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-ink-3 uppercase tracking-widest">Signed in as</p>
              <p className="text-sm font-black text-ink uppercase tracking-tight">{user?.displayName || user?.email}</p>
              <p className="text-[10px] text-primary font-black uppercase tracking-widest">{user ? ROLE_LABELS[user.role] || user.role : 'N/A'}</p>
            </div>

            <div className="pt-4 border-t border-line space-y-3">
              {[
                { label: 'Privileged Access', status: hasAdminRole ? ('success' as AdminStatus) : ('warning' as AdminStatus), labelTxt: hasAdminRole ? 'Granted' : 'Restricted' },
                { label: 'Security Permissions', status: rbacChecks ? ('success' as AdminStatus) : ('warning' as AdminStatus), labelTxt: rbacChecks ? 'Granted' : 'Restricted' },
                { label: '2FA Status', status: user?.twoFactorEnabled ? ('success' as AdminStatus) : ('warning' as AdminStatus), labelTxt: user?.twoFactorEnabled ? 'Enabled' : 'Disabled' },
                { label: 'Identity Account', status: (ov?.summary?.total ?? 0) > 0 ? ('success' as AdminStatus) : ('info' as AdminStatus), labelTxt: 'Verified' },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-line">
                  <span className="text-[10px] font-black text-ink-2 uppercase tracking-widest">{p.label}</span>
                  <AdminBadge status={p.status} label={p.labelTxt} />
                </div>
              ))}
            </div>
          </div>
        </AdminCard>

        <AdminCard
          title="Threat Monitoring"
          icon={ShieldAlert}
          actions={<Link to="/super-admin/security-events"><Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-wider">All Events</Button></Link>}
          noPadding
        >
          <div className="space-y-3 p-5">
            {severityRows.map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-16 text-[10px] font-black text-ink-2 uppercase tracking-widest">{r.label}</span>
                <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-current" style={{ width: `${(r.value / Math.max(ov?.summary?.total || 1, 1)) * 100}%`, color: r.status === 'error' ? 'var(--color-danger)' : r.status === 'warning' ? 'var(--color-warn)' : 'var(--color-primary)' }} />
                </div>
                <span className="w-7 text-right text-xs font-black text-ink">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line">
            {(ov?.recentEvents || []).length === 0 ? (
              <AdminEmptyState icon={Shield} title="No security events" description="No events have been recorded yet." />
            ) : (
              <div className="divide-y divide-line max-h-64 overflow-y-auto">
                {(ov?.recentEvents || []).slice(0, 6).map((e: any, i: number) => (
                  <div key={e.id || i} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-ink uppercase tracking-tight truncate">{String(e.type || 'EVENT').replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-ink-3 font-mono mt-0.5 truncate">{e.account || e.endpoint || 'system'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <AdminBadge status={severityStatus(e.severity)} label={e.severity || 'INFO'} />
                      <span className="text-[9px] text-ink-3 font-mono">{timeAgo(e.timestamp, Date.now())}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard
          title="Governance & Audit"
          icon={ScrollText}
          actions={<Link to="/super-admin/audit-logs"><Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-wider">Audit Log</Button></Link>}
          noPadding
        >
          <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
            <div className="p-4 text-center">
              <p className="text-lg font-black text-ink">{ov?.summary?.total ?? 0}</p>
              <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">Audit Events</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-lg font-black text-ink">{ov?.summary?.last24h ?? 0}</p>
              <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">Last 24h</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-lg font-black text-warn">{c.suspendedAccounts ?? 0}</p>
              <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">Suspended</p>
            </div>
          </div>
          <div className="p-5 space-y-2">
            <p className="text-[10px] font-black text-ink-3 uppercase tracking-widest">Recent Admin Actions</p>
            {(ov?.recentAdminActions || []).length === 0 ? (
              <p className="text-[10px] text-ink-3 font-bold uppercase tracking-widest text-center py-3">No privileged actions recorded</p>
            ) : (
              (ov?.recentAdminActions || []).slice(0, 6).map((a: any, i: number) => (
                <div key={a.id || i} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-ink truncate">{String(a.action || a.type || 'event').replace(/_/g, ' ')}</p>
                    <p className="text-[9px] text-ink-3 font-mono truncate">{a.actorEmail || a.actor || 'admin'} · {timeAgo(a.timestamp, Date.now())}</p>
                  </div>
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', a.outcome === 'failure' || a.failure ? 'bg-danger' : 'bg-ok')} />
                </div>
              ))
            )}
          </div>
          <div className="border-t border-line px-5 py-3">
            <Link to="/super-admin/access-logs" className="flex items-center justify-between text-[11px] font-bold text-primary uppercase tracking-widest hover:underline">
              <span>Access &amp; Sessions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </AdminCard>
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
      await load(true);
      showToast('Health Verified', 'All core microservices re-verified.', 'success');
    } catch (e: any) {
      setError(e?.message || 'Health check failed');
    } finally {
      setChecking(false);
    }
  };

  if (error && !data) return <AdminError message="Unable to load system infrastructure." detail={error} retry={() => load()} />;
  if (loading || !data) return <AdminLoading message="Verifying service telemetry..." />;

  const overall = data?.overall || {};
  const resources = data?.resources || {};
  const marketplace = data?.marketplace || {};
  const services = Array.isArray(data?.services) ? data.services : [];

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={ServerCog}
        title="System Infrastructure"
        description="Monitor platform-wide microservices, resource utilization, and marketplace health vitals."
        stats={<AdminBadge status={overall.status === 'operational' ? 'operational' : 'warning'} label={overall.label} />}
        actions={
          <div className="flex items-center gap-3">
<Button variant="outline" className="h-9 px-4 rounded-xl text-sm font-semibold" onClick={runCheck} disabled={checking}>
                 <Zap className={cn('w-3.5 h-3.5 mr-2', checking && 'animate-pulse')} /> {checking ? 'Verifying…' : 'Health Check'}
              </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard label="Services Healthy" value={`${overall.healthy}/${overall.total}`} icon={Server} status="success" />
        <AdminStatCard label="Error Rate" value={pct(resources.errorRate)} icon={AlertTriangle} status={resources.errorRate > 1 ? 'error' : 'success'} />
        <AdminStatCard label="Request Throughput" value={`${fmtNum(resources.requestRatePerMin)}/m`} icon={Gauge} status="info" />
        <AdminStatCard label="Live Connections" value={fmtNum(resources.realtimeConnections)} icon={Activity} status="success" />
      </div>

      <AdminSectionHeading title="Service Components" description="Health and latency of individual microservices." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((s: any) => (
          <AdminCard key={s.name} noPadding className="relative group">
            <div className="p-5 flex items-center justify-between border-b border-line">
              <div className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full', s.status === 'operational' ? 'bg-emerald-500' : 'bg-rose-500')} />
                <span className="text-xs font-black text-ink uppercase tracking-tight">{s.name}</span>
              </div>
              <AdminBadge status={s.status as AdminStatus} label={s.responseTimeMs ? `${s.responseTimeMs}ms` : s.status} />
            </div>
            <div className="p-5 space-y-3">
               <p className="text-[10px] text-ink-3 font-medium line-clamp-1">{s.message || 'Processing normally.'}</p>
               <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {s.records != null && <span className="text-[9px] font-black text-ink-3 uppercase">{fmtNum(s.records)} Records</span>}
                  {s.uptime != null && <span className="text-[9px] font-black text-ink-3 uppercase">{fmtNum(s.uptime)}s Uptime</span>}
               </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <AdminCard title="Resource Allocation" icon={Cpu} className="lg:col-span-2">
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              {[
                { label: 'Heap Memory', value: `${fmtNum(resources.memory?.heapUsedMB)} MB`, sub: `of ${fmtNum(resources.memory?.heapTotalMB)} MB`, icon: HardDrive },
                { label: 'Process Load', value: `${resources.cpu || 0}%`, sub: 'Current CPU cycle', icon: Cpu },
                { label: 'DB Indexing', value: fmtNum(resources.dbRecords), sub: 'Entity records', icon: Database },
                { label: 'Event Bus', value: fmtNum(resources.queueLength), sub: 'Queued operations', icon: Layers },
                { label: 'Worker Pool', value: fmtNum(resources.backgroundJobs), sub: 'Active jobs', icon: Boxes },
                { label: 'Auth Store', value: fmtNum(resources.activeSessions), sub: 'Active sessions', icon: Monitor },
              ].map(r => (
                <div key={r.label} className="space-y-1.5">
                  <p className="text-[10px] font-black text-ink-3 uppercase tracking-[0.15em]">{r.label}</p>
                  <p className="text-xl font-black text-ink tracking-tight">{r.value}</p>
                  <p className="text-[9px] text-ink-3 font-bold uppercase">{r.sub}</p>
                </div>
              ))}
           </div>
        </AdminCard>

        <AdminCard title="Infrastructure Links" icon={History}>
           <div className="space-y-3">
              {[
                { to: '/super-admin/api', label: 'API Gateway Console', icon: ServerCog },
                { to: '/super-admin/security', label: 'Security Command', icon: ShieldCheck },
                { to: '/super-admin/audit', label: 'Audit Timeline', icon: History },
                { to: '/super-admin/database', label: 'Database Console', icon: Database },
              ].map(l => (
                <Link key={l.to} to={l.to} className="flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-line hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <l.icon className="w-4 h-4 text-ink-3 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-black text-ink uppercase tracking-widest">{l.label}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-ink-3" />
                </Link>
              ))}
           </div>
        </AdminCard>
      </div>
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
    { name: 'Vendors', count: vendors.length, icon: Store },
    { name: 'Riders', count: riders.length, icon: Bike },
    { name: 'Orders', count: orders.length, icon: Package },
    { name: 'Products / Meals', count: products.length, icon: ShoppingCart },
    { name: 'Categories', count: categories.length, icon: Layers },
    { name: 'Coupons', count: coupons.length, icon: Zap },
    { name: 'Reviews', count: reviews.length, icon: MessageSquare },
    { name: 'Transactions', count: transactions.length, icon: Banknote },
  ];
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Database}
        title="Database Console"
        description="Monitor system entity collections and record volumes across the distributed platform."
        stats={<AdminBadge status="info" label={`${total} Global Records`} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {rows.map(r => (
          <AdminStatCard key={r.name} label={r.name} value={fmtNum(r.count)} icon={r.icon} status="info" />
        ))}
      </div>

      <AdminCard title="Storage Infrastructure" icon={HardDrive}>
         <div className="flex flex-col md:flex-row items-center gap-8 py-4">
            <div className="w-48 h-48 rounded-full border-8 border-primary/20 border-t-primary flex items-center justify-center flex-shrink-0">
               <div className="text-center">
                  <p className="text-2xl font-black text-ink">{fmtNum(total)}</p>
                  <p className="text-[10px] font-bold text-ink-3 uppercase tracking-widest">Total Records</p>
               </div>
            </div>
            <div className="space-y-4 flex-1">
               <AdminSectionHeading title="Collection Metrics" description="Live record volumes across tracked platform collections." />
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...rows].sort((a, b) => b.count - a.count).map(r => (
                    <div key={r.name} className="p-3 rounded-xl bg-surface-2 border border-line">
                      <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">{r.name}</p>
                      <p className="mt-1 text-lg font-black text-ink">{fmtNum(r.count)}</p>
                    </div>
                  ))}
               </div>
               <p className="text-[10px] text-ink-3 font-bold uppercase tracking-widest">
                 {rows.length} collections tracked · {total === 0 ? 'no records yet' : `largest: ${rows.reduce((a, b) => a.count >= b.count ? a : b).name}`}
               </p>
            </div>
         </div>
      </AdminCard>
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

function fmtCurrency(n: any, currency = 'GHS'): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0.00';
  const formatted = v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency}${formatted}`;
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
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  useEffect(() => { load(); const id = setInterval(() => load(true), 15000); return () => clearInterval(id); }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const summary = data?.summary || {};
  const endpoints = Array.isArray(data?.endpoints) ? data.endpoints : [];
  const lastUpdatedSec = updatedAt ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : 0;

  const filtered = useMemo(() => {
    const activeToggle = Object.keys(toggles).some(k => toggles[k]);
    return endpoints.filter((ep: any) => {
      const path = String(ep?.path || '');
      const mt = String(ep?.method || '');
      const q = search.trim().toLowerCase();
      if (q && !path.toLowerCase().includes(q) && !mt.toLowerCase().includes(q)) return false;
      if (service !== 'all' && ep?.service !== service) return false;
      if (method !== 'all' && mt !== method) return false;
      if (status !== 'all' && String(ep?.status || '').toUpperCase() !== status) return false;
      return true;
    });
  }, [endpoints, search, service, method, status, toggles]);

  const byGroup = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((ep: any) => { const g = ep?.group || 'Other'; (map[g] = map[g] || []).push(ep); });
    return Object.keys(map).map(g => ({ group: g, items: map[g] }));
  }, [filtered]);

  const doToggle = async () => {
    if (!toggleTarget) return;
    const next = !toggleTarget.disabled;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await AdminService.toggleApiEndpoint(toggleTarget.method, toggleTarget.path, next, authPassword || undefined);
      showToast(next ? 'Endpoint Enabled' : 'Endpoint Disabled', `${toggleTarget.method} ${toggleTarget.path} ${next ? 'enabled' : 'disabled'}.`, next ? 'success' : 'warning');
      setToggleTarget(null);
      setAuthPassword('');
      setSelected(null);
      await load(true);
    } catch (e: any) {
      setAuthError(e?.message || 'Re-authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  if (error && !data) return <AdminError message="Unable to load API telemetry." detail={error} retry={() => load()} />;
  if (loading || !data) return <AdminLoading message="Reading API Gateway telemetry..." />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Plug2}
        title="API Management"
        description="Monitor system-wide API endpoints, performance metrics, and real-time security events."
        stats={<AdminBadge status="operational" label={`${summary.liveEndpoints} Endpoints`} />}
        actions={
          <Button variant="outline" className="h-9 px-4 rounded-xl text-sm font-semibold" onClick={() => load()}>
             <RefreshCw className="w-3.5 h-3.5 mr-2" /> Sync Gateway
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Requests / Min" value={fmtNum(summary.requestsPerMinute)} icon={Gauge} status="info" />
        <AdminStatCard label="Critical Events" value={fmtNum(summary.criticalSecurityEvents)} icon={ShieldAlert} status="error" />
        <AdminStatCard label="Error Rate" value={pct(summary.errorRate)} icon={AlertTriangle} status="warning" />
        <AdminStatCard label="Blocked Flow" value={fmtNum(summary.blocked)} icon={Ban} status="error" />
      </div>

      <AdminCard
        title="Gateway Console"
        subtitle="Route discovery and telemetry"
        icon={Globe}
        actions={
          <div className="flex items-center gap-3">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
              <Input placeholder="Filter routes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs rounded-xl w-64" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="HEALTHY">Healthy</SelectItem>
                <SelectItem value="DEGRADED">Degraded</SelectItem>
                <SelectItem value="DOWN">Down</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        noPadding
      >
        <div className="divide-y divide-line">
           {byGroup.map(g => (
             <div key={g.group} className="p-0">
                <div className="px-6 py-3 bg-surface-2/50 border-y border-line">
                   <p className="text-[10px] font-black text-ink-3 uppercase tracking-[0.2em]">{g.group}</p>
                </div>
                <div className="divide-y divide-line">
                   {g.items.map(ep => (
                     <div key={ep.method + ep.path} className="px-6 py-4 flex items-center justify-between hover:bg-surface-2/20 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className={cn('px-2 py-0.5 rounded text-[9px] font-black border', METHOD_COLOR[ep.method])}>{ep.method}</div>
                           <div>
                              <p className="text-xs font-mono font-bold text-ink uppercase">{ep.path}</p>
                              <p className="text-[9px] text-ink-3 font-bold uppercase tracking-widest mt-1">{ep.service} · {ep.metrics?.avgMs}ms latency</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right hidden sm:block">
                              <p className="text-[10px] font-black text-ink uppercase tracking-tight">{fmtNum(ep.metrics?.requestsPerMinute)} req/m</p>
                              <p className={cn('text-[9px] font-bold uppercase', ep.metrics?.errorRate > 0 ? 'text-rose-500' : 'text-emerald-500')}>{pct(ep.metrics?.errorRate)} err</p>
                           </div>
                           {ep.disabled ? (
                             <AdminBadge status="error" label="Disabled" />
                           ) : (
                             <AdminBadge status={ep.status.toLowerCase() as AdminStatus} label={ep.status} />
                           )}
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelected(ep)}><MoreHorizontal className="w-4 h-4" /></Button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
            ))}
        </div>
      </AdminCard>

      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        icon={Globe}
        title={selected ? `${selected.method} ${selected.path}` : 'Endpoint'}
        subtitle={selected?.description}
        footer={selected && (
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-ink-3 uppercase tracking-widest">{selected.disabled ? 'Currently Disabled' : 'Currently Live'}</p>
              <p className="text-[10px] text-ink-3">Changing state requires re-authentication.</p>
            </div>
            <Button
              variant={selected.disabled ? 'default' : 'destructive'}
              size="sm"
              className="gap-2 rounded-xl"
              disabled={!isSuper}
              onClick={() => { setAuthError(null); setAuthPassword(''); setToggleTarget(selected); }}
            >
              <Power className="w-3.5 h-3.5" /> {selected.disabled ? 'Enable Endpoint' : 'Disable Endpoint'}
            </Button>
          </div>
        )}
      >
        {selected && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-[10px] font-black text-ink-3 uppercase tracking-widest">Access &amp; Governance</p>
              <div className="space-y-2">
                {[
                  { k: 'Authentication', v: selected.auth ? 'Required' : 'Public' },
                  { k: 'Role', v: selected.role ? String(selected.role).replace(/-/g, ' ') : 'Any authenticated' },
                  { k: 'Permission', v: selected.permission ? String(selected.permission) : 'None required' },
                  { k: 'Rate Limit', v: selected.rateLimit ? `${selected.rateLimit}/min` : 'Unlimited' },
                  { k: 'Destructive', v: selected.destructive ? 'Yes' : 'No' },
                ].map(r => (
                  <div key={r.k} className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                    <span className="text-[10px] font-bold text-ink-2 uppercase tracking-widest">{r.k}</span>
                    <span className={cn('text-[10px] font-black uppercase', selected.destructive && r.k === 'Destructive' ? 'text-danger' : 'text-ink')}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-black text-ink-3 uppercase tracking-widest">Live Metrics</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Requests / Min', value: fmtNum(selected.metrics?.requestsPerMinute) },
                  { label: 'Total Requests', value: fmtNum(selected.metrics?.totalRequests) },
                  { label: 'Avg Latency', value: `${Math.round(selected.metrics?.avgMs || 0)}ms` },
                  { label: 'P95 Latency', value: `${Math.round(selected.metrics?.p95Ms || 0)}ms` },
                  { label: 'Error Rate', value: pct(selected.metrics?.errorRate) },
                  { label: 'Timeout Rate', value: pct(selected.metrics?.timeoutRate) },
                ].map(m => (
                  <div key={m.label} className="rounded-xl border border-line px-3 py-2.5 text-center">
                    <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">{m.label}</p>
                    <p className="mt-0.5 text-sm font-black text-ink">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-black text-ink-3 uppercase tracking-widest">Security Signals</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                  <span className="text-[10px] font-bold text-ink-2 uppercase tracking-widest">Risk Level</span>
                  <AdminBadge status={selected.security?.risk === 'HIGH' ? 'error' : selected.security?.risk === 'MEDIUM' ? 'warning' : 'success'} label={selected.security?.risk || 'LOW'} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                  <span className="text-[10px] font-bold text-ink-2 uppercase tracking-widest">Security Events</span>
                  <span className="text-xs font-black text-ink">{selected.security?.eventCount || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                  <span className="text-[10px] font-bold text-ink-2 uppercase tracking-widest">Blocked Requests</span>
                  <span className="text-xs font-black text-ink">{selected.security?.blockedRequests || 0}</span>
                </div>
                {selected.security?.lastEvent && (
                  <div className="rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                    <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">Last Event</p>
                    <p className="mt-1 text-[11px] font-semibold text-ink">{String(selected.security.lastEvent.type || 'event').replace(/_/g, ' ')}</p>
                    <p className="text-[9px] text-ink-3 font-mono">{timeAgo(selected.security.lastEvent.timestamp, Date.now())} · {selected.security.lastEvent.severity}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-black text-ink-3 uppercase tracking-widest">Recent Admin Activity</p>
              {(selected.audit || []).length === 0 ? (
                <p className="rounded-xl border border-line bg-surface-2/50 px-3 py-3 text-center text-[10px] font-bold text-ink-3 uppercase tracking-widest">No admin activity recorded</p>
              ) : (
                <div className="divide-y divide-line rounded-xl border border-line">
                  {(selected.audit || []).map((a: any, i: number) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-ink truncate">{String(a.action || 'action').replace(/_/g, ' ')}</p>
                        <p className="text-[9px] text-ink-3 font-mono truncate">{a.actorName || 'admin'} · {timeAgo(a.timestamp, Date.now())}</p>
                      </div>
                      <span className={cn('text-[9px] font-black uppercase', a.result === 'success' ? 'text-ok' : 'text-danger')}>{a.result || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>

      <AdminModal
        open={!!toggleTarget}
        onClose={() => { if (!authBusy) { setToggleTarget(null); setAuthPassword(''); setAuthError(null); } }}
        icon={Power}
        title={toggleTarget?.disabled ? 'Enable Endpoint?' : 'Disable Endpoint?'}
        subtitle={toggleTarget ? `${toggleTarget.method} ${toggleTarget.path}` : ''}
        danger={!toggleTarget?.disabled}
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" disabled={authBusy} onClick={() => setToggleTarget(null)}>Cancel</Button>
            <Button variant={toggleTarget?.disabled ? 'default' : 'destructive'} size="sm" disabled={authBusy} onClick={doToggle}>
              {authBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {toggleTarget?.disabled ? 'Enable Endpoint' : 'Disable Endpoint'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-3">
            {toggleTarget?.disabled
              ? 'Re-enabling will restore traffic to this route immediately.'
              : 'Disabling this route will block traffic to it across the platform. Existing in-flight requests may still complete.'}
          </p>
          <div>
            <Label className="text-[10px] font-black text-ink-3 uppercase tracking-widest">Confirm password</Label>
            <Input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Enter your password" className="mt-1.5" />
          </div>
          {authError && <p className="text-xs text-danger">{authError}</p>}
        </div>
      </AdminModal>
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

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [role, setRole] = useState('all');
  const [resource, setResource] = useState('all');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [result, setResult] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [applied, setApplied] = useState(0);

  const [facets, setFacets] = useState<{ actions: string[]; roles: string[]; entities: string[]; categories: string[]; results: string[]; severities: string[]; roleLabels: Record<string, string>; entityLabels: Record<string, string> }>({ actions: [], roles: [], entities: [], categories: [], results: [], severities: [], roleLabels: {}, entityLabels: {} });
  const [summary, setSummary] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    AdminService.getAuditFacets().then(setFacets).catch(() => {});
    AdminService.getAuditSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  const load = useCallback((p = page, ps = pageSize, asRefresh = false) => {
    if (asRefresh) setRefreshing(true); else setLoading(true);
    setError(false);
    AdminService.getAudit({
      page: p, pageSize: ps, search, action, role, entity: resource === 'all' ? '' : resource,
      category: category === 'all' ? '' : category, severity: severity === 'all' ? '' : severity,
      result: result === 'all' ? '' : result, from: from || undefined, to: to || undefined, sort
    })
      .then(r => {
        setAudit(Array.isArray(r?.items) ? r.items : []);
        setTotal(r?.total ?? 0);
        setTotalPages(r?.totalPages ?? 1);
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [search, action, role, resource, category, severity, result, from, to, sort, page, pageSize]);

  useEffect(() => { load(page, pageSize); }, [page, applied, load]);

  if (loading && !refreshing) return <AdminLoading message="Querying immutable audit records..." />;
  if (error && !audit.length) return <AdminError message="Unable to load audit records." retry={() => load(page, pageSize, true)} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={History}
        title="Audit Registry"
        description="Immutable record of all administrative actions and security-relevant platform events."
        stats={<AdminBadge status="info" label={`${total} Events`} />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 px-4 rounded-xl text-sm font-semibold" onClick={() => AdminService.exportAudit({ search, action: action === 'all' ? '' : action, role: role === 'all' ? '' : role, entity: resource === 'all' ? '' : resource, category: category === 'all' ? '' : category, severity: severity === 'all' ? '' : severity, result: result === 'all' ? '' : result, from: from || undefined, to: to || undefined, sort }).catch(() => {})}>
              <Download className="w-3.5 h-3.5 mr-2" /> Export
            </Button>
            <Button variant="outline" className="h-9 px-4 rounded-xl text-sm font-semibold" onClick={() => load(page, pageSize, true)}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-2', refreshing && 'animate-spin')} /> Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
         <AdminStatCard label="Total Audit" value={summary?.total || 0} icon={ScrollText} status="info" />
         <AdminStatCard label="Critical Risk" value={summary?.criticalRisk ?? 0} icon={ShieldAlert} status="error" />
         <AdminStatCard label="Failed Actions" value={summary?.failed ?? 0} icon={XCircle} status="warning" />
         <AdminStatCard label="Security" value={summary?.security ?? 0} icon={Shield} status="info" />
         <AdminStatCard label="Operations" value={summary?.operations ?? 0} icon={Activity} status="success" />
         <AdminStatCard label="Today" value={summary?.today ?? 0} icon={Clock} status="info" />
      </div>

      <AdminCard title="Log Explorer" icon={Search} noPadding>
         <div className="p-4 border-b border-line grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-surface-2/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
              <Input placeholder="Filter by event..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-xs rounded-xl" />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Event Type" /></SelectTrigger>
              <SelectContent>{facets.actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={resource} onValueChange={setResource}>
              <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Resource" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {facets.entities.map(e => <SelectItem key={e} value={e}>{facets.entityLabels[e] || e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Result" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                {['success', 'failed', 'blocked', 'denied'].map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>{['all', 'low', 'medium', 'high', 'critical'].map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Risk Levels' : s.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Actor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actors</SelectItem>
                {facets.roles.map(r => <SelectItem key={r} value={r}>{facets.roleLabels[r] || r}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="pl-9 h-10 text-xs rounded-xl" aria-label="From date" />
            </div>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="pl-9 h-10 text-xs rounded-xl" aria-label="To date" />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="action">By Action</SelectItem>
                <SelectItem value="actor">By Actor</SelectItem>
                <SelectItem value="entity">By Resource</SelectItem>
                <SelectItem value="severity">By Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setApplied(x => x + 1)} className="h-10 rounded-xl text-xs font-semibold">Apply Filter</Button>
         </div>

         <AdminTable headers={['Event Action', 'Identity / Actor', 'Resource', 'Risk', 'Result', 'Time']}>
            {audit.map(e => (
              <tr key={e.id} className="group hover:bg-surface-2/40 transition-colors cursor-pointer" onClick={() => setDetail(e)}>
                <td className="px-6 py-4">
                   <div className="text-xs font-black text-ink uppercase tracking-tight">{String(e.action).replace(/_/g, ' ')}</div>
                   <div className="text-[9px] text-ink-3 font-bold uppercase tracking-widest">{e.category}</div>
                </td>
                <td className="px-6 py-4">
                   <div className="text-xs font-medium text-ink">{e.actorName}</div>
                   <div className="text-[9px] text-ink-3 font-bold uppercase">{e.actorRole}</div>
                </td>
                <td className="px-6 py-4">
                   <div className="text-[10px] font-mono text-ink-2 uppercase">{e.entity}</div>
                </td>
                <td className="px-6 py-4">
                   <AdminBadge status={e.severity === 'critical' || e.severity === 'high' ? 'error' : e.severity === 'medium' ? 'warning' : 'info'} label={e.severity} />
                </td>
                <td className="px-6 py-4">
                   <AdminBadge status={e.result === 'success' ? 'success' : 'error'} label={e.result} />
                </td>
                <td className="px-6 py-4 text-[10px] text-ink-3 font-bold uppercase">
                   {new Date(e.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
         </AdminTable>
         {total > 0 && (
           <div className="p-4 border-t border-line">
             <AdminPagination
               page={page}
               totalPages={totalPages}
               showingFrom={(page - 1) * pageSize + 1}
               showingTo={Math.min(page * pageSize, total)}
               total={total}
               onPrev={() => setPage(p => Math.max(1, p - 1))}
               onNext={() => setPage(p => Math.min(totalPages, p + 1))}
             />
           </div>
         )}
      </AdminCard>

      {detail && <AuditDetailDrawer t={t} e={detail} roleLabel={r => r} entityLabel={e => e} onClose={() => setDetail(null)} />}
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

  // Records carry explicit before/after snapshots (pricing/config changes).
  if (beforeAfter.before === undefined && e.previousValue !== undefined && e.previousValue !== null) beforeAfter.before = e.previousValue;
  if (beforeAfter.after === undefined && e.newValue !== undefined && e.newValue !== null) beforeAfter.after = e.newValue;

  const riskLevel = e.riskLevel || e.severity || 'low';
  const rows: { label: string; value: any }[] = [];
  if (e.description !== undefined && e.description !== null) rows.push({ label: t('audit.description'), value: e.description });
  if (e.category !== undefined) rows.push({ label: t('audit.category'), value: String(e.category || '—') });
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
    <AdminDrawer
      open
      onClose={onClose}
      title={t('audit.eventDetails')}
      subtitle={String(e.action || '').replace(/_/g, ' ')}
      footer={
        <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>{t('audit.close')}</Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <AdminBadge status={e.result === 'success' ? 'success' : e.result === 'failed' ? 'failed' : e.result === 'denied' ? 'warning' : 'info'} label={String(e.result || 'UNKNOWN').toUpperCase()} />
          <AdminBadge status={(riskLevel === 'critical' || riskLevel === 'high') ? 'error' : riskLevel === 'medium' ? 'warning' : 'info'} label={String(riskLevel || 'low').toUpperCase()} />
          <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[11px] text-ink-3">{e.id}</span>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t('audit.eventDetails')}</p>
          <dl className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex justify-between gap-4 text-xs">
                <dt className="shrink-0 text-ink-3">{r.label}</dt>
                <dd className="break-all text-right text-ink">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {(beforeAfter.before !== undefined || beforeAfter.after !== undefined) && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Δ {t('audit.before')} / {t('audit.after')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t('audit.before')}</p>
                <p className="break-all font-mono text-xs text-ink">{renderVal(beforeAfter.before)}</p>
              </div>
              <div className="rounded-xl border border-line bg-ok-soft/50 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ok">{t('audit.after')}</p>
                <p className="break-all font-mono text-xs text-ink">{renderVal(beforeAfter.after)}</p>
              </div>
            </div>
          </div>
        )}

        {e.meta && typeof e.meta === 'object' && Object.keys(e.meta).length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t('audit.metadata')}</p>
            <div className="space-y-1.5">
              {Object.entries(e.meta).filter(([k]) => !/secret|token|password|passphrase|apikey|api_key|key/i.test(k)).map(([k, v]) => {
                if (v && typeof v === 'object' && 'from' in (v as any) && 'to' in (v as any)) return null;
                return (
                  <div key={k} className="flex justify-between gap-3 text-xs">
                    <span className="shrink-0 text-ink-3">{k}</span>
                    <span className="break-all text-right font-mono text-[11px] text-ink">{renderVal(v)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!e.ipAddress && !e.userAgent && !e.meta && (
          <p className="text-xs text-ink-3">{t('audit.noIp')}</p>
        )}
      </div>
    </AdminDrawer>
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    AdminService.getBackups().then(d => setBackups(Array.isArray(d) ? d : [])).catch((e: any) => { setBackups([]); setLoadError(e?.message || 'Could not load snapshots.'); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const runBackup = async () => {
    setRunning(true);
    try {
      await AdminService.createBackup();
      showToast('Backup Sequence Initiated', 'Database snapshot being written to secondary storage.', 'success');
      setRunning(false);
      load();
    } catch (e: any) {
      showToast('Backup Failure', e?.message || 'Process interrupted.', 'warning');
      setRunning(false);
    }
  };

  const runRestore = async () => {
    if (!confirmTarget || confirmText !== confirmTarget.id) return;
    setRestoring(true);
    try {
      await AdminService.restoreBackup(confirmTarget.id);
      showToast('Restore Sequence Success', `Platform data reverted to state ${confirmTarget.id}.`, 'success');
      setConfirmTarget(null);
      setConfirmText('');
      load();
    } catch (e: any) {
      showToast('Restore Critical Failure', e?.message || 'Integrity violation.', 'warning');
    } finally {
      setRestoring(false);
    }
  };

  const lastBackup = backups[0] || null;
  const totalSize = backups.reduce((s, b) => s + (b.size || 0), 0);

  if (loadError && !backups.length) return <AdminError message="Unable to load backup snapshots." detail={loadError} retry={load} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Archive}
        title="Backup & Continuity"
        description="Manage server-side point-in-time database snapshots and disaster recovery procedures."
        stats={<AdminBadge status="operational" label={`${backups.length} Snapshots Available`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Snapshot Count" value={backups.length} icon={Database} status="info" />
        <AdminStatCard label="Storage Retention" value="5 Max" icon={Layers} status="warning" />
        <AdminStatCard label="Last Snap Size" value={lastBackup ? (lastBackup.size / 1024).toFixed(1) + ' KB' : '0 KB'} icon={HardDrive} status="info" />
        <AdminStatCard label="Total Footprint" value={(totalSize / 1024).toFixed(1) + ' KB'} icon={Boxes} status="info" />
      </div>

      <AdminCard title="Recovery Control" icon={Zap} actions={
        <Button onClick={runBackup} disabled={running} className="h-9 px-4 rounded-xl text-xs font-semibold">
          <HardDrive className={cn('w-3.5 h-3.5 mr-2', running && 'animate-spin')} /> {running ? 'Writing…' : 'Run Manual Backup'}
        </Button>
      }>
         <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
               <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">Continuity Advisory</p>
               <p className="text-[10px] text-amber-600 dark:text-amber-300 mt-1 leading-relaxed">Snapshot restoration replaces all live marketplace data. Ensure high-traffic periods are avoided before performing a revert operation.</p>
            </div>
         </div>
      </AdminCard>

      <AdminCard title="Snapshot History" icon={History} noPadding>
         <AdminTable headers={['Snapshot ID', 'Created Timestamp', 'Data Payload', 'Record Volumes', 'Action']}>
            {backups.map((b, i) => (
              <tr key={b.id} className="group hover:bg-surface-2/40 transition-colors">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-ink uppercase tracking-tighter">{b.id}</span>
                      {i === 0 && <AdminBadge status="success" label="Latest" />}
                   </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-ink">
                   {new Date(b.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-xs font-black text-ink uppercase tracking-widest">
                   {(b.size / 1024).toFixed(1)} KB
                </td>
                <td className="px-6 py-4">
                   <p className="text-[10px] text-ink-3 font-bold uppercase">U:{b.users} V:{b.vendors} O:{b.orders}</p>
                </td>
                <td className="px-6 py-4 text-right">
                   <Button size="sm" variant="outline" className="h-8 text-[11px] font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg" onClick={() => { setConfirmTarget(b); setConfirmText(''); }}>Revert</Button>
                </td>
              </tr>
            ))}
         </AdminTable>
      </AdminCard>

      <AdminModal
        open={!!confirmTarget}
        onClose={() => !restoring && setConfirmTarget(null)}
        icon={AlertTriangle}
        title="Restore snapshot"
        subtitle={confirmTarget?.id}
        danger
        footer={
          <>
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={restoring} onClick={() => setConfirmTarget(null)}>Abort</Button>
            <Button variant="danger" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={confirmText !== confirmTarget?.id || restoring} onClick={runRestore}>
              {restoring ? 'Reverting…' : 'Confirm Restore'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-2">This replaces the current live database with the selected snapshot. Newer data will be permanently overwritten.</p>
          <div>
            <Label className="mb-2 block text-xs font-semibold text-ink-3">Verify Snapshot ID to Proceed</Label>
            <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={confirmTarget?.id} className="h-11 rounded-xl font-mono text-xs" autoFocus />
          </div>
        </div>
      </AdminModal>
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
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState<any>({ subject: '', message: '', messageType: 'general-announcement', priority: 'NORMAL', recipientGroup: 'all', deliveryChannels: ['In-app'], scheduleAt: '', password: '' });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ recipients: number; channels: string[] } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [msgSearch, setMsgSearch] = useState('');
  const [msgType, setMsgType] = useState('all');
  const [msgPriority, setMsgPriority] = useState('all');
  const [msgStatus, setMsgStatus] = useState('all');
  const [delChannel, setDelChannel] = useState('all');
  const [delStatus, setDelStatus] = useState('all');
  const [delQ, setDelQ] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [detailSummary, setDetailSummary] = useState<any>(null);
  const [resendTarget, setResendTarget] = useState<any>(null);
  const [resendPassword, setResendPassword] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const loadDeliveries = useCallback(async () => {
    try {
      const del = await AdminService.getNotificationDeliveries({
        limit: 20,
        ...(delChannel !== 'all' ? { channel: delChannel } : {}),
        ...(delStatus !== 'all' ? { status: delStatus } : {}),
        ...(delQ.trim() ? { q: delQ.trim() } : {}),
      });
      setDeliveries(Array.isArray(del?.items) ? del.items : []);
    } catch { /* non-fatal */ }
  }, [delChannel, delStatus, delQ]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const [s, msgs] = await Promise.all([
        AdminService.getNotificationSummary(),
        AdminService.getPlatformMessages(),
      ]);
      setData(s);
      setMessages(Array.isArray(msgs?.items) ? msgs.items : (Array.isArray(msgs) ? msgs : []));
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load notifications');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    if (!detail?.id) return;
    AdminService.getPlatformMessageStatus(detail.id)
      .then((r: any) => setDetailSummary(r?.summary || null))
      .catch(() => setDetailSummary(null));
  }, [detail?.id]);

  useEffect(() => {
    if (!composing) { setPreview(null); return; }
    setPreviewBusy(true);
    AdminService.previewPlatformMessage({ recipientGroup: form.recipientGroup, deliveryChannels: form.deliveryChannels })
      .then((r: any) => setPreview(r?.success && r.recipients != null ? { recipients: r.recipients, channels: r.channels } : null))
      .catch(() => setPreview(null))
      .finally(() => setPreviewBusy(false));
  }, [composing, form.recipientGroup]);

  const summary = data?.summary || {};
  const providers = data?.providers || {};

  const filteredMessages = useMemo(() => {
    const q = msgSearch.trim().toLowerCase();
    return messages.filter(m => {
      if (msgType !== 'all' && String(m.messageType || 'general-announcement') !== msgType) return false;
      if (msgPriority !== 'all' && String(m.priority || 'NORMAL') !== msgPriority) return false;
      if (msgStatus !== 'all' && String(m.status || 'sent') !== msgStatus) return false;
      if (q && !String(m.subject || '').toLowerCase().includes(q) && !String(m.message || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [messages, msgType, msgPriority, msgStatus, msgSearch]);

  const doResend = async () => {
    if (!resendTarget) return;
    setResendBusy(true);
    setResendError(null);
    try {
      const res = await AdminService.resendPlatformMessage(resendTarget.id, resendPassword);
      showToast('Retry Started', res?.retried ? `Retrying ${res.retried} failed deliveries.` : 'No failed deliveries to retry.', 'success');
      setResendTarget(null);
      setResendPassword('');
      load(true);
      loadDeliveries();
      if (detail?.id) AdminService.getPlatformMessageStatus(detail.id).then((r: any) => setDetailSummary(r?.summary || null)).catch(() => null);
    } catch (e: any) {
      setResendError(e?.message || 'Retry failed.');
    } finally {
      setResendBusy(false);
    }
  };

  const providerStatus = (code?: string): AdminStatus => {
    const c = code || 'disabled';
    if (c === 'available' || c === 'configured') return 'success';
    if (c === 'degraded') return 'warning';
    return 'disabled';
  };

  // Truthful retry affordance: only surface "Retry Failed" when a delivery
  // actually failed. The drawer summary is authoritative (fall back to the
  // stored deliverySummary on the message record while status is loading).
  const detailFailed = detailSummary?.failed ?? detail?.deliverySummary?.failed ?? 0;

  const send = async () => {
    if (!form.subject.trim() || !form.message.trim()) { setSendError('Title and message are required.'); return; }
    setSending(true); setSendError(null);
    try {
      const res = await AdminService.createPlatformMessage(form, form.password);
      if (res?.success) {
        showToast('Notification Dispatched', 'Broadcast sequence started successfully.', 'success');
        setComposing(false);
        load(true);
      } else {
        setSendError(res?.message || 'Dispatch failed. Please try again.');
      }
    } catch (e: any) {
      setSendError(e?.message || 'Dispatch failed.');
    } finally {
      setSending(false);
    }
  };

  if (error && !data) return <AdminError message="Unable to load notifications." detail={error} retry={() => load()} />;
  if (loading || !data) return <AdminLoading message="Establishing communication gateway..." />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Bell}
        title="Broadcast & Notifications"
        description="Manage platform-wide messaging, maintenance announcements, and system alerts."
        stats={<AdminBadge status="active" label={`${summary.total} Dispatched`} />}
        actions={
          <Button onClick={() => setComposing(true)} disabled={!isSuper} className="h-9 px-4 rounded-xl text-sm font-semibold">
             <Send className="w-3.5 h-3.5 mr-2" /> New Broadcast
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Delivered" hint="Notifications successfully delivered to their targets" value={fmtNum(summary.delivered)} icon={CheckCircle2} status="success" />
        <AdminStatCard label="Pending Flow" hint="Notifications still in the delivery pipeline" value={fmtNum(summary.pending)} icon={Clock} status="warning" />
        <AdminStatCard label="Failed" hint="Deliveries that failed and may be retried" value={fmtNum(summary.failed)} icon={XCircle} status="error" />
        <AdminStatCard label="In-App Read" hint="In-app notifications opened by recipients" value={fmtNum(summary.read)} icon={Eye} status="info" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <AdminCard title="Broadcast History" icon={Send} noPadding>
              <div className="border-b border-line px-5 py-3 space-y-3">
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
                       <Input placeholder="Search broadcasts…" value={msgSearch} onChange={e => setMsgSearch(e.target.value)} className="pl-9 h-9 text-xs rounded-xl w-60" />
                    </div>
                    <Select value={msgType} onValueChange={setMsgType}>
                       <SelectTrigger className="h-9 text-xs rounded-xl w-40"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="general-announcement">Announcement</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="alert">Alert</SelectItem>
                       </SelectContent>
                    </Select>
                    <Select value={msgPriority} onValueChange={setMsgPriority}>
                       <SelectTrigger className="h-9 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">All Priority</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="IMPORTANT">Important</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                       </SelectContent>
                    </Select>
                    <Select value={msgStatus} onValueChange={setMsgStatus}>
                       <SelectTrigger className="h-9 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                       </SelectContent>
                    </Select>
                    <span className="ml-auto text-[10px] font-bold text-ink-3 uppercase tracking-widest">{filteredMessages.length} of {messages.length}</span>
                 </div>
              </div>
              <div className="divide-y divide-line">
                 {filteredMessages.length === 0 ? (
                    <AdminEmptyState icon={Inbox} title="No broadcasts" description="No platform-wide messages match the current filters." />
                 ) : (
                    filteredMessages.map((m: any) => (
                      <button key={m.id} onClick={() => { setDetail(m); setDetailSummary(null); }} className="w-full text-left p-5 flex items-center justify-between hover:bg-surface-2/30 transition-colors">
                         <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-ink-3 flex-shrink-0">
                               <Megaphone className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-xs font-black text-ink uppercase tracking-tight truncate">{m.subject}</p>
                               <p className="text-[10px] text-ink-3 font-bold uppercase tracking-widest mt-1 truncate">To {m.recipientGroup} · {Array.isArray(m.deliveryChannels) ? m.deliveryChannels.join(' + ') : 'In-app'} · {m.priority || 'NORMAL'}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-[10px] text-ink-3 font-bold uppercase hidden sm:block">{timeAgo(m.createdAt, now)}</span>
                            <AdminBadge status={m.priority === 'CRITICAL' ? 'error' : m.priority === 'IMPORTANT' ? 'warning' : 'info'} label={m.priority || 'NORMAL'} />
                            <AdminBadge status={m.status === 'sent' ? 'success' : m.status === 'failed' ? 'error' : 'warning'} label={m.status} />
                            <ChevronRight className="w-4 h-4 text-ink-3" />
                         </div>
                      </button>
                    ))
                 )}
              </div>
           </AdminCard>

           <AdminCard title="Real-time Delivery Log" icon={Activity} noPadding>
              <div className="border-b border-line px-5 py-3 flex flex-wrap items-center gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
                    <Input placeholder="Search recipient…" value={delQ} onChange={e => setDelQ(e.target.value)} className="pl-9 h-9 text-xs rounded-xl w-56" />
                 </div>
                 <Select value={delChannel} onValueChange={setDelChannel}>
                    <SelectTrigger className="h-9 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all">All Channels</SelectItem>
                       <SelectItem value="In-app">In-app</SelectItem>
                       <SelectItem value="Email">Email</SelectItem>
                       <SelectItem value="SMS">SMS</SelectItem>
                    </SelectContent>
                 </Select>
                 <Select value={delStatus} onValueChange={setDelStatus}>
                    <SelectTrigger className="h-9 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all">All Status</SelectItem>
                       <SelectItem value="sent">Sent</SelectItem>
                       <SelectItem value="queued">Queued</SelectItem>
                       <SelectItem value="failed">Failed</SelectItem>
                       <SelectItem value="skipped">Skipped</SelectItem>
                    </SelectContent>
                 </Select>
                 <span className="ml-auto text-[10px] font-bold text-ink-3 uppercase tracking-widest">{deliveries.length} shown</span>
              </div>
              <AdminTable headers={['Recipient', 'Channel', 'Status', 'Timestamp']}>
                 {deliveries.length === 0 ? (
                    <tr><td colSpan={4}><AdminEmptyState icon={Inbox} title="No deliveries" description="No notification deliveries match the current filters." /></td></tr>
                 ) : deliveries.map((d: any) => (
                    <tr key={d.id} className="group hover:bg-surface-2/40 transition-colors">
                       <td className="px-6 py-4">
                          <p className="text-xs font-black text-ink uppercase tracking-tight">{d.name || d.email}</p>
                          <p className="text-[10px] text-ink-3 font-bold uppercase tracking-widest mt-0.5">{d.refTitle}</p>
                       </td>
                       <td className="px-6 py-4">
                          <AdminBadge status="info" label={d.channel} />
                       </td>
                       <td className="px-6 py-4">
                          <AdminBadge status={d.status === 'delivered' || d.status === 'sent' ? 'success' : 'error'} label={d.status} />
                       </td>
                       <td className="px-6 py-4 text-[10px] text-ink-3 font-bold uppercase">
                          {new Date(d.sentAt).toLocaleTimeString()}
                       </td>
                    </tr>
                 ))}
              </AdminTable>
           </AdminCard>
        </div>

        <div className="space-y-8">
           <AdminCard title="Provider Status" icon={Server}>
              <div className="space-y-4">
{[
                    { label: 'In-App Engine', icon: Bell, status: providers?.inApp?.code },
                    { label: 'Mail Transfer', icon: Mail, status: providers?.email?.code },
                    { label: 'SMS Gateway', icon: Smartphone, status: providers?.sms?.code },
                  ].map(p => (
                    <div key={p.label} className="flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-line">
                      <div className="flex items-center gap-3">
                        <p.icon className="w-4 h-4 text-ink-3" />
                        <AnimatedTooltip
                          variant="sadoc"
                          content={
                            p.status === 'available' || p.status === 'configured'
                              ? `${p.label} is operational and accepting deliveries.`
                              : p.status === 'degraded'
                                ? `${p.label} is degraded — deliveries may be delayed.`
                                : `${p.label} is not configured — deliveries via this channel are skipped.`
                          }
                          triggerClassName="px-1 py-0.5"
                        >
                          <span className="text-[10px] font-black text-ink uppercase tracking-widest">{p.label}</span>
                        </AnimatedTooltip>
                      </div>
                      <AdminBadge status={providerStatus(p.status)} label={p.status === 'available' || p.status === 'configured' ? 'Operational' : p.status === 'degraded' ? 'Degraded' : 'Not Configured'} />
                    </div>
                  ))}
              </div>
           </AdminCard>
        </div>
      </div>

      <AdminDrawer
        open={composing}
        onClose={() => setComposing(false)}
        icon={Send}
        title="New Broadcast"
        subtitle="System-generated or broadcast alert"
        footer={
          <>
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" onClick={() => setComposing(false)}>Abort</Button>
            <Button onClick={send} disabled={sending} className="flex-1 h-11 rounded-xl text-xs font-semibold">
              {sending ? 'Sending…' : 'Initiate Broadcast'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="block text-xs font-semibold text-ink-3">Subject / Title</Label>
            <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="h-11 rounded-xl text-sm" placeholder="e.g. Scheduled Maintenance" />
          </div>
          <div className="space-y-2">
            <Label className="block text-xs font-semibold text-ink-3">Message Content</Label>
            <textarea className="w-full min-h-[120px] resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Type your broadcast message…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="block text-xs font-semibold text-ink-3">Recipient Segment</Label>
              <Select value={form.recipientGroup} onValueChange={v => setForm({ ...form, recipientGroup: v })}>
                <SelectTrigger className="h-11 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="vendors">Vendors</SelectItem>
                  <SelectItem value="riders">Riders</SelectItem>
                </SelectContent>
              </Select>
              {previewBusy ? (
                <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Counting recipients…</p>
              ) : preview ? (
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">{fmtNum(preview.recipients)} recipients · {preview.channels.join(' + ')}</p>
              ) : (
                <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest">Recipient count unavailable</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="block text-xs font-semibold text-ink-3">Priority Level</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-11 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="IMPORTANT">Important</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 border-t border-line pt-4">
            <Label className="block text-xs font-semibold text-danger">Authorization Password</Label>
            <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-11 rounded-xl border-danger/30 text-sm" placeholder="Required for high-risk broadcast" />
          </div>
          {sendError && <p className="text-xs font-medium text-danger">{sendError}</p>}
        </div>
      </AdminDrawer>

      <AdminDrawer
        open={!!detail}
        onClose={() => { setDetail(null); setDetailSummary(null); }}
        icon={Megaphone}
        title={detail?.subject || 'Broadcast'}
        subtitle={detail ? `${detail.recipientGroup} · ${Array.isArray(detail.deliveryChannels) ? detail.deliveryChannels.join(' + ') : 'In-app'}` : ''}
        footer={detail && (
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black text-ink-3 uppercase tracking-widest">{detailSummary?.totalRecipients ?? detail.totalRecipients ?? 0} recipients</p>
              <p className="text-[10px] text-ink-3">{detailSummary?.delivered ?? 0} delivered · {detailSummary?.skipped ?? 0} skipped · {detailFailed} failed</p>
            </div>
            {detailFailed > 0 ? (
              <AnimatedTooltip
                variant="malva"
                content="Re-attempts delivery only to recipients whose delivery failed or could not be configured. Delivered recipients are never re-sent to."
                placement="left"
                triggerClassName="px-0.5 py-0.5"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl"
                  disabled={!isSuper || resendBusy}
                  onClick={() => { setResendError(null); setResendPassword(''); setResendTarget(detail); }}
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', resendBusy && 'animate-spin')} /> Retry Failed ({detailFailed})
                </Button>
              </AnimatedTooltip>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ok">
                <CheckCircle2 className="w-3.5 h-3.5" /> All delivered
              </span>
            )}
          </div>
        )}
      >
        {detail && (
          <div className="space-y-5">
            <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
              <p className="text-[10px] font-black text-ink-3 uppercase tracking-widest">Message</p>
              <p className="mt-1.5 text-sm font-medium text-ink leading-relaxed">{detail.message || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Status', value: detail.status, tone: detail.status === 'sent' ? 'text-ok' : detail.status === 'failed' ? 'text-danger' : 'text-warn' },
                { label: 'Priority', value: detail.priority || 'NORMAL', tone: detail.priority === 'CRITICAL' ? 'text-danger' : detail.priority === 'IMPORTANT' ? 'text-warn' : 'text-ink' },
                { label: 'Type', value: detail.messageType || 'general-announcement', tone: 'text-ink' },
                { label: 'Created', value: new Date(detail.createdAt).toLocaleString(), tone: 'text-ink' },
              ].map(r => (
                <div key={r.label} className="rounded-xl border border-line px-3 py-2.5">
                  <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">{r.label}</p>
                  <p className={cn('mt-0.5 text-xs font-black capitalize', r.tone)}>{r.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black text-ink-3 uppercase tracking-widest">Delivery Breakdown</p>
              <div className="space-y-2">
                {[
                  { label: 'In-app Delivered', value: detailSummary?.channels?.inApp?.delivered ?? 0, tone: 'bg-ok' },
                  { label: 'In-app Skipped', value: detailSummary?.channels?.inApp?.skipped ?? 0, tone: 'bg-ink-3' },
                  { label: 'Email Delivered', value: detailSummary?.channels?.email?.delivered ?? 0, tone: 'bg-primary' },
                  { label: 'Email Failed', value: detailSummary?.channels?.email?.failed ?? 0, tone: 'bg-danger' },
                  { label: 'Email Not Configured', value: detailSummary?.channels?.email?.notConfigured ?? 0, tone: 'bg-warn' },
                ].map(row => {
                  const max = Math.max(detailSummary?.totalRecipients ?? 1, 1);
                  return (
                    <div key={row.label} className="flex items-center gap-3">
                      <span className="w-36 text-[10px] font-bold text-ink-2 uppercase tracking-widest">{row.label}</span>
                      <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', row.tone)} style={{ width: `${(row.value / max) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs font-black text-ink">{row.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {Array.isArray(detailSummary?.failedRecipients) && detailSummary.failedRecipients.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black text-ink-3 uppercase tracking-widest">Failed Recipients</p>
                <div className="divide-y divide-line rounded-xl border border-line">
                  {detailSummary.failedRecipients.slice(0, 8).map((r: any, i: number) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-ink truncate">{r.name || r.email}</p>
                        <p className="text-[9px] text-ink-3 font-mono truncate">{r.email} · {r.reason}</p>
                      </div>
                      <AdminBadge status="error" label="Failed" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AdminDrawer>

      <AdminModal
        open={!!resendTarget}
        onClose={() => { if (!resendBusy) { setResendTarget(null); setResendPassword(''); setResendError(null); } }}
        icon={RefreshCw}
        title="Retry Failed Deliveries?"
        subtitle={resendTarget?.subject}
        danger
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" disabled={resendBusy} onClick={() => setResendTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={resendBusy} onClick={doResend}>
              {resendBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Retry Failed
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-3">
            This will re-attempt delivery only to recipients whose prior delivery failed or could not be configured. Delivered recipients are never re-sent to.
          </p>
          <div>
            <Label className="text-[10px] font-black text-ink-3 uppercase tracking-widest">Confirm password</Label>
            <Input type="password" value={resendPassword} onChange={e => setResendPassword(e.target.value)} placeholder="Enter your password" className="mt-1.5" />
          </div>
          {resendError && <p className="text-xs text-danger">{resendError}</p>}
        </div>
      </AdminModal>
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ kind: string; user: any } | null>(null);

  const PAGE_SIZE = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load the user directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
      return (u.email || '').toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
    });
  }, [users, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const runAction = async (user: any, kind: string) => {
    setBusyId(user.id);
    try {
      await AdminService.accountAction(user.id, kind as any);
      showToast('Account Updated', `Action ${kind} completed successfully.`, 'success');
      setConfirm(null);
      await fetchUsers();
    } catch (e: any) {
      showToast('Action Failed', e?.message || 'Could not complete that action.', 'warning');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !users.length) return <AdminLoading message="Synchronizing global account directory..." />;
  if (loadError && !users.length) return <AdminError message="Unable to load the user directory." detail={loadError} retry={fetchUsers} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Users}
        title="Global User Directory"
        description="Unified management of marketplace customers, merchant partners, and delivery logistics accounts."
        stats={<AdminBadge status="info" label={`${users.length} Identities`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATUS_FILTERS.map(f => (
          <AdminStatCard key={f.key} label={f.label} value={counts[f.key as keyof typeof counts]} icon={Users} status={f.key === 'active' ? 'success' : f.key === 'suspended' ? 'error' : 'info'} />
        ))}
      </div>

      <AdminCard
        title="Account Management"
        subtitle="Enforce platform policies and security"
        icon={ShieldCheck}
        actions={
          <div className="flex items-center gap-3">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
              <Input placeholder="Filter identity..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs rounded-xl w-64" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        noPadding
      >
        <AdminTable headers={['Account Profile', 'System Role', 'State', 'Verified', 'Actions']}>
           {pageRows.map(u => {
             const st = userStatusMeta(u);
             return (
               <tr key={u.id} className="group hover:bg-surface-2/40 transition-colors">
                 <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-xl bg-surface-3 flex items-center justify-center text-[11px] font-black uppercase text-ink-3 border border-line">{userInitials(u)}</div>
                       <div>
                          <p className="text-xs font-black text-ink uppercase tracking-tight">{userDisplayName(u)}</p>
                          <p className="text-[10px] text-ink-3 font-mono">{u.email}</p>
                       </div>
                    </div>
                 </td>
                 <td className="px-6 py-4">
                    <AdminBadge status="info" label={String(u.role).replace(/-/g, ' ')} />
                 </td>
                 <td className="px-6 py-4">
                    <AdminBadge status={st.variant === 'success' ? 'success' : st.variant === 'warning' ? 'warning' : 'error'} label={st.label} />
                 </td>
                 <td className="px-6 py-4">
                    <div className={cn('w-2 h-2 rounded-full shadow-sm', u.isVerified ? 'bg-emerald-500' : 'bg-surface-3')} />
                 </td>
                 <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                       <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setConfirm({ kind: u.isSuspended ? 'reactivate' : 'suspend', user: u })}><Ban className="w-4 h-4 text-ink-3 hover:text-rose-500" /></Button>
                    </div>
                 </td>
               </tr>
             );
           })}
        </AdminTable>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          showingFrom={filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          showingTo={(page - 1) * PAGE_SIZE + pageRows.length}
          total={filtered.length}
          onPrev={() => setPage(p => p - 1)}
          onNext={() => setPage(p => p + 1)}
        />
      </AdminCard>

      {confirm && (
        <ConfirmDialog
          open
          tone={confirm.kind === 'suspend' ? 'danger' : 'primary'}
          icon={confirm.kind === 'suspend' ? 'alert' : 'shield'}
          title={confirm.kind === 'suspend' ? 'Suspend Account?' : 'Reactivate Account?'}
          description={`Update system access for ${userDisplayName(confirm.user)}.`}
          confirmLabel={confirm.kind === 'suspend' ? 'Confirm Suspension' : 'Confirm Activation'}
          busy={busyId === confirm.user.id}
          onConfirm={() => runAction(confirm.user, confirm.kind)}
          onCancel={() => setConfirm(null)}
        />
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
 * SECURITY EVENTS — real backend event feed (/api/security/events)
 * ------------------------------------------------------------
 */
export function SuperAdminSecurityEventsPage() {
  const { showToast } = useApp();
  const [overview, setOverview] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchAll = useCallback((quiet = false) => {
    if (!quiet) { setLoading(true); setLoadError(null); }
    const q: any = { page, pageSize: 25 };
    if (severity !== 'all') q.severity = severity;
    if (status !== 'all') q.status = status;
    if (search.trim()) q.search = search.trim();
    Promise.all([
      AdminService.getSecurityOverview().catch(() => null),
      AdminService.getSecurityEvents(q),
    ]).then(([ov, ev]) => {
      setOverview(ov);
      setEvents(Array.isArray(ev?.items) ? ev.items : []);
      setTotal(ev?.total || 0);
      setLoadError(null);
    }).catch((e: any) => {
      setEvents([]);
      setTotal(0);
      setLoadError(e?.message || 'Could not load the security event feed.');
    }).finally(() => { if (!quiet) setLoading(false); });
  }, [page, severity, status, search, applied]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [severity, status, applied]);

  const sevTone = (s: string): AdminStatus =>
    s === 'CRITICAL' || s === 'HIGH' ? 'error' : s === 'MEDIUM' ? 'warning' : 'info';
  const statusTone = (s: string): AdminStatus =>
    s === 'resolved' ? 'success' : s === 'blocked' ? 'error' : s === 'monitoring' ? 'warning' : 'info';

  const c = overview?.counters || {};
  const bySev = overview?.bySeverity || {};
  const threats = (bySev.CRITICAL || 0) + (bySev.HIGH || 0);

  if (loading) return <AdminLoading message="Loading real-time security event feed…" />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={ShieldAlert}
        title="Security Events"
        description="Live authentication, access-control and abuse events detected by the backend security monitors."
        stats={<AdminBadge status={threats > 0 ? 'error' : 'success'} label={overview?.posture || '—'} />}
        actions={
          <Button variant="outline" className="h-9 px-4 rounded-xl text-sm font-semibold" onClick={() => { setLoading(true); fetchAll(); }}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-2', loading && 'animate-spin')} /> Sync Events
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Critical Alerts" value={c.criticalAlerts ?? 0} icon={AlertTriangle} status="error" />
        <AdminStatCard label="High Risk" value={c.highRiskEvents ?? 0} icon={ShieldAlert} status="error" />
        <AdminStatCard label="Failed Auth (24h)" value={c.failedAuthentication ?? 0} icon={Lock} status="warning" />
        <AdminStatCard label="Blocked Requests" value={c.blockedRequests ?? 0} icon={Ban} status="info" />
      </div>

      {loadError ? (
        <AdminError message="Unable to retrieve security events." detail={loadError} retry={() => { setLoading(true); fetchAll(); }} />
      ) : (
        <AdminCard title="Incident Timeline" icon={Activity} noPadding
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
                <Input placeholder="Search account, endpoint…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-44 rounded-xl pl-9 text-xs lg:w-56" />
              </div>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-9 w-32 rounded-xl text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-32 rounded-xl text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setApplied(x => x + 1)} className="h-9 rounded-xl px-3 text-xs font-semibold">Apply</Button>
            </div>
          }
        >
          {events.length === 0 ? (
            <AdminEmptyState
              icon={Shield}
              title="No security events"
              description={total === 0 ? 'No matching events were recorded by the security monitors.' : 'No events match the current filters.'}
              action={<Button variant="outline" size="sm" onClick={() => { setSeverity('all'); setStatus('all'); setSearch(''); }}>Clear Filters</Button>}
            />
          ) : (
            <AdminTable headers={['Event', 'Account', 'Severity', 'State', 'Detection', 'Occurred']}>
              {events.map(e => (
                <tr key={e.id} className="group hover:bg-surface-2/40 transition-colors cursor-pointer" onClick={() => setSelected(e)}>
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-bold text-ink">{String(e.type).replace(/_/g, ' ')}</div>
                    <div className="max-w-xs truncate text-[10px] text-ink-3">{e.endpoint || '—'}</div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-2">{e.account || 'System'}</td>
                  <td className="px-5 py-3.5"><AdminBadge status={sevTone(e.severity)} label={e.severity} /></td>
                  <td className="px-5 py-3.5"><AdminBadge status={statusTone(e.status)} label={e.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="max-w-[220px] truncate text-xs text-ink-2">{e.detection || e.actionTaken || '—'}</div>
                    {e.frequency > 1 && <div className="text-[10px] text-ink-3">×{e.frequency} occurrences</div>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-3">{timeAgo(e.timestamp, Date.now())}</td>
                </tr>
              ))}
            </AdminTable>
          )}
          {total > 25 && (
            <div className="border-t border-line px-5 py-3">
              <AdminPagination
                page={page}
                totalPages={Math.max(1, Math.ceil(total / 25))}
                showingFrom={total === 0 ? 0 : (page - 1) * 25 + 1}
                showingTo={Math.min((page - 1) * 25 + events.length, total)}
                total={total}
                onPrev={() => setPage(p => Math.max(1, p - 1))}
                onNext={() => setPage(p => p + 1)}
              />
            </div>
          )}
        </AdminCard>
      )}

      {selected && (
        <SecurityEventDrawer
          event={selected}
          onClose={() => setSelected(null)}
          onChanged={(note: string) => {
            setSelected(null);
            showToast('Security Response', note, 'success');
            setLoading(true);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function SecurityEventDrawer({ event, onClose, onChanged }: { event: any; onClose: () => void; onChanged: (note: string) => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    AdminService.getSecurityEvent(event.id).then(d => { if (alive) setDetail(d); }).catch(() => {});
    return () => { alive = false; };
  }, [event.id]);

  const respond = (action: string) => {
    setBusy(true); setError(null);
    AdminService.respondSecurityEvent(event.id, action, note.trim() || undefined, password || undefined)
      .then(() => onChanged('Security response applied.'))
      .catch((e: any) => setError(e?.message || 'Response failed.'))
      .finally(() => setBusy(false));
  };

  const resolve = () => {
    setBusy(true); setError(null);
    AdminService.resolveSecurityEvent(event.id, note.trim() || undefined, password || undefined)
      .then(() => onChanged('Security event resolved.'))
      .catch((e: any) => setError(e?.message || 'Resolution failed.'))
      .finally(() => setBusy(false));
  };

  const needsPassword = event.status !== 'resolved';

  return (
    <AdminDrawer
      open
      onClose={onClose}
      icon={ShieldAlert}
      title={String(event.type).replace(/_/g, ' ')}
      subtitle={event.id}
      footer={
        event.status !== 'resolved' ? (
          <div className="flex w-full flex-col gap-3">
            {needsPassword && (
              <div className="space-y-2">
                <Label className="block text-xs font-semibold text-danger">Authorization Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl text-sm" placeholder="Required for destructive actions" />
              </div>
            )}
            {error && <p className="text-xs font-medium text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold" disabled={busy} onClick={() => respond('require_reauth')}>Require Re-auth</Button>
              <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold text-warn" disabled={busy} onClick={() => respond('rate_limit_ip')}>Rate-limit IP</Button>
              <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold text-danger" disabled={busy} onClick={() => respond('revoke_sessions')}>Revoke Sessions</Button>
              <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-semibold text-danger" disabled={busy} onClick={() => respond('lock_account')}>Lock Account</Button>
              <Button className="flex-1 h-10 rounded-xl text-xs font-semibold" disabled={busy} onClick={resolve}>{busy ? 'Applying…' : 'Mark Resolved'}</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <AdminBadge status={event.severity === 'CRITICAL' || event.severity === 'HIGH' ? 'error' : event.severity === 'MEDIUM' ? 'warning' : 'info'} label={event.severity} />
          <AdminBadge status={event.status === 'resolved' ? 'success' : event.status === 'blocked' ? 'error' : 'warning'} label={event.status} />
          {event.frequency > 1 && <AdminBadge status="info" label={`×${event.frequency}`} />}
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Detection</p>
          <p className="text-sm text-ink">{event.detection || '—'}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Account</p>
            <p className="text-sm text-ink">{event.account || 'System'}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Endpoint</p>
            <p className="truncate font-mono text-xs text-ink-2">{event.endpoint || '—'}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Source IP</p>
            <p className="font-mono text-xs text-ink-2">{event.source?.ip || '—'}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Action Taken</p>
            <p className="text-sm text-ink">{event.actionTaken || '—'}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">First Seen</p>
            <p className="text-xs text-ink-2">{new Date(event.timestamp).toLocaleString()}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Last Seen</p>
            <p className="text-xs text-ink-2">{event.lastSeenAt ? new Date(event.lastSeenAt).toLocaleString() : '—'}</p>
          </div>
        </div>
        {event.resolvedAt && (
          <div className="rounded-xl bg-ok-soft/50 p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ok">Resolved</p>
            <p className="text-xs text-ink">By {event.resolvedBy || '—'} · {event.resolutionNote || 'No note'} · {new Date(event.resolvedAt).toLocaleString()}</p>
          </div>
        )}
        {event.automaticResponse && (
          <div className="rounded-xl bg-info-soft/50 p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-info">Automatic Response</p>
            <p className="text-xs text-ink">{event.automaticResponse.note || 'System response applied automatically'}</p>
          </div>
        )}
        <div className="space-y-2 border-t border-line pt-4">
          <Label className="block text-xs font-semibold text-ink-3">Resolution / Response Note</Label>
          <textarea className="w-full min-h-[80px] resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note attached to the audit record…" />
        </div>
        {detail?.relatedAudit?.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Related Audit Records ({detail.relatedAudit.length})</p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {detail.relatedAudit.slice(0, 6).map((a: any) => (
                <div key={a.id} className="rounded-lg border border-line bg-surface-2/50 p-2.5">
                  <p className="text-xs font-semibold text-ink">{a.action}</p>
                  <p className="text-[10px] text-ink-3">{a.actorEmail || 'System'} · {new Date(a.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminDrawer>
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pending, setPending] = useState<any | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    AdminService.getSessions()
      .then(s => setSessions(Array.isArray(s) ? s : []))
      .catch(e => setLoadError(e?.message || 'Could not load session registry.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const revoke = (row: any) => {
    AdminService.adminRevokeSessions(row.userId)
      .then(() => { showToast('Sessions Revoked', `${row.name}'s active sessions were terminated.`, 'success'); setPending(null); load(); })
      .catch((e: any) => showToast('Error', e?.message || 'Could not revoke sessions.', 'warning'));
  };

  const sessionState = (s: any): 'active' | 'revoked' | 'expired' =>
    s.revoked ? 'revoked' : s.expired ? 'expired' : 'active';

  const filtered = sessions.filter(s => {
    if (statusFilter !== 'all' && sessionState(s) !== statusFilter) return false;
    return !search ||
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.deviceName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.ipAddress || '').toLowerCase().includes(search.toLowerCase());
  });

  const active = sessions.filter(s => !s.revoked && !s.expired).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Monitor}
        title="Session Registry"
        description="Live platform-wide session registry. Revoking a user's sessions terminates every device instantly."
        stats={<AdminBadge status="active" label={`${active} Active`} />}
      />

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

      {loading ? (
        <AdminLoading message="Loading session registry…" />
      ) : loadError ? (
        <AdminError message="Unable to load session registry." detail={loadError} retry={load} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <AdminStatCard label="Active Sessions" value={active} icon={Activity} status="success" />
            <AdminStatCard label="Revoked" value={sessions.filter(s => s.revoked).length} icon={Ban} status="error" />
            <AdminStatCard label="Expired" value={sessions.filter(s => s.expired && !s.revoked).length} icon={Clock} status="warning" />
            <AdminStatCard label="Total Records" value={sessions.length} icon={Monitor} status="info" />
          </div>

          <AdminCard
            title="Live Registry"
            subtitle="All known user sessions"
            icon={Monitor}
            noPadding
            actions={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
                  <Input placeholder="Search user, device, IP…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-48 rounded-xl pl-9 text-xs lg:w-56" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            {filtered.length === 0 ? (
              <AdminEmptyState
                icon={Monitor}
                title={sessions.length === 0 ? 'No sessions recorded' : 'No matching sessions'}
                description={sessions.length === 0 ? 'Active platform sessions will appear here once users sign in.' : 'No sessions match your current search criteria.'}
                action={<Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear Filters</Button>}
              />
            ) : (
              <AdminTable headers={['User', 'Device', 'Network', 'Issued', 'Last Activity', 'State', 'Action']}>
                {filtered.map(s => (
                  <tr key={s.sessionId} className="group hover:bg-surface-2/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-ink">{s.name}</div>
                      <div className="text-xs text-ink-3">{s.email} · <span className="capitalize">{s.role}</span></div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-2">
                      {s.deviceName || '—'}
                      {s.isSuspended ? <AdminBadge status="suspended" label="Suspended" className="ml-1.5" /> : null}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-3">{s.ipAddress || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-ink-3">{s.issuedAt ? new Date(s.issuedAt).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-ink-3">{s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3.5">
                      {sessionState(s) === 'revoked'
                        ? <AdminBadge status="suspended" label="Revoked" />
                        : sessionState(s) === 'expired' ? <AdminBadge status="disabled" label="Expired" /> : <AdminBadge status="active" label="Active" />}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!s.revoked && (
                        <Button size="sm" variant="outline" className="h-8 border-danger/30 px-2.5 text-xs font-semibold text-danger hover:bg-danger-soft" onClick={() => setPending(s)}>
                          <Ban className="h-3.5 w-3.5" /> Terminate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All Accounts' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'pending', label: 'Pending' },
  { key: 'locked', label: 'Locked' },
];

function userDisplayName(u: any) {
  if (!u) return 'Unknown User';
  return u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Unknown User';
}

function userInitials(u: any) {
  if (!u) return 'U';
  if (u.displayName) return u.displayName.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2);
  if (u.firstName && u.lastName) return (u.firstName[0] + u.lastName[0]).toUpperCase();
  return (u.email || 'U')[0].toUpperCase();
}

function userStatusKey(u: any) {
  if (!u) return 'unknown';
  if (u.isSuspended) return 'suspended';
  if (u.isLocked) return 'locked';
  if (!u.isVerified) return 'pending';
  return 'active';
}

function userStatusMeta(u: any) {
  if (!u) return { label: 'Unknown', variant: 'warning' };
  if (u.isSuspended) return { label: 'Suspended', variant: 'danger' };
  if (u.isLocked) return { label: 'Locked', variant: 'warning' };
  if (!u.isVerified) return { label: 'Pending', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
}

