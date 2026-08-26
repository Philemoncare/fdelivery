import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Store, Bike, CreditCard, FileText, LifeBuoy, Settings,
  ShieldCheck, Package, Tags, Bell, MessageSquare,
  TicketPercent, Megaphone, Search, XCircle, DollarSign,
  RefreshCw, Plus, Trash2, Ban, UserCheck, Send, Minus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService, MessagingService } from '@/src/services/api';
import { NotificationCenter } from '@/src/components/common/NotificationCenter';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';
import { cn } from '@/src/lib/utils';

const ACCENT = 'from-blue-500 to-indigo-600';

function PageHeader({ title, description, icon: Icon, count }: { title: string; description: string; icon: any; count?: string }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br', ACCENT)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">{description}</p>
        </div>
      </div>
      {count && <Badge variant="default">{count}</Badge>}
    </div>
  );
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

/* RIDERS — real fleet with working verification actions */
export function AdminRidersPage() {
  const { riders, updateRiderProfile, showToast } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [working, setWorking] = useState('');

  const filtered = riders.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'online') return r.isOnline;
    if (filter === 'pending') return r.verificationStatus === 'pending';
    if (filter === 'verified') return r.verificationStatus === 'verified';
    return false;
  }).filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.phone || '').toLowerCase().includes(search.toLowerCase()));

  const act = async (id: string, fn: () => Promise<void>, title: string, desc: string) => {
    setWorking(id);
    try { await fn(); showToast(title, desc); } catch (e: any) { showToast('Action Failed', e?.message || 'Could not update rider.', 'warning'); } finally { setWorking(''); }
  };

  const verify = (r: any) => act(r.id, () => updateRiderProfile(r.id, { verificationStatus: 'verified', isVerified: true }), 'Rider Verified', 'The rider is now verified and can go online.');
  const reject = (r: any) => act(r.id, () => updateRiderProfile(r.id, { verificationStatus: 'rejected', isVerified: false }), 'Application Rejected', 'The rider was not approved.');
  const offboard = (r: any) => act(r.id, () => updateRiderProfile(r.id, { isOnline: false, isAvailable: false }), 'Rider Offboarded', 'The rider is now offline and unavailable.');
  const reactivate = (r: any) => act(r.id, () => updateRiderProfile(r.id, { isOnline: true, isAvailable: true }), 'Rider Reactivated', 'The rider is back online.');

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Bike} title="Rider Fleet" description="Dispatch riders, verification and availability from live records." count={`${riders.length} riders`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Riders</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{riders.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Online Now</p><p className="text-2xl font-bold text-emerald-600">{riders.filter(r => r.isOnline).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-amber-600">{riders.filter(r => r.verificationStatus === 'pending').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Verified</p><p className="text-2xl font-bold text-blue-600">{riders.filter(r => r.verificationStatus === 'verified').length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><Bike className="w-5 h-5 text-amber-500" /> Fleet Directory</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-6">Rider</th>
                  <th className="py-4 px-6">Vehicle</th>
                  <th className="py-4 px-6">Verification</th>
                  <th className="py-4 px-6">Deliveries</th>
                  <th className="py-4 px-6">Earnings</th>
                  <th className="py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-12 italic">{riders.length === 0 ? 'No riders registered yet.' : 'No riders matched your criteria.'}</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <img src={r.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6"><span className="text-sm">{r.vehicleType}</span><div className="text-xs text-gray-500">{r.vehicleNumber}</div></td>
                    <td className="py-3 px-6">
                      <Badge variant={r.verificationStatus === 'verified' ? 'success' : r.verificationStatus === 'pending' ? 'warning' : 'danger'}>{r.verificationStatus || 'unverified'}</Badge>
                    </td>
                    <td className="py-3 px-6 font-bold">{r.totalDeliveries || 0}</td>
                    <td className="py-3 px-6 font-bold text-emerald-600">GHS {(r.totalEarnings || 0).toFixed(2)}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5">
                        {r.verificationStatus !== 'verified' && (
                          <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => verify(r)} disabled={working === r.id}>
                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Verify
                          </Button>
                        )}
                        {r.verificationStatus === 'pending' && (
                          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => reject(r)} disabled={working === r.id}>
                            <Ban className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        )}
                        {r.isOnline ? (
                          <Button size="sm" variant="outline" className="text-amber-600" onClick={() => offboard(r)} disabled={working === r.id}>
                            <Ban className="w-3.5 h-3.5 mr-1" /> Offboard
                          </Button>
                        ) : r.verificationStatus === 'verified' && (
                          <Button size="sm" variant="outline" className="text-blue-600" onClick={() => reactivate(r)} disabled={working === r.id}>
                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Go Online
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* PAYMENTS — real order-based payment data */
export function AdminPaymentsPage() {
  const { orders, formatPrice } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { AdminService.getPayments().then(r => setRows(Array.isArray(r) ? r : [])).catch(() => {}); }, []);
  const totalVolume = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const commission = orders.reduce((s, o) => s + (o.platformCommission || 0), 0);
  const paid = rows.filter(r => r.status === 'paid').length;
  const pending = rows.filter(r => r.status === 'pending').length;
  const byMethod = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[r.method] = (counts[r.method] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={CreditCard} title="Payments" description="Payment records derived from every real order on the platform." count={`${rows.length} transactions`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><AnimatedTooltip variant="gram" content="Total volume of all payment records tied to real orders." triggerClassName="px-1 py-0.5"><p className="text-sm text-gray-500">Gross Volume</p></AnimatedTooltip><p className="text-2xl font-bold text-emerald-600">{formatPrice(totalVolume)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><AnimatedTooltip variant="gram" content="Total platform commission earned across all orders." triggerClassName="px-1 py-0.5"><p className="text-sm text-gray-500">Commission</p></AnimatedTooltip><p className="text-2xl font-bold text-blue-600">{formatPrice(commission)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><AnimatedTooltip variant="gram" content="Payments settled and completed for customers." triggerClassName="px-1 py-0.5"><p className="text-sm text-gray-500">Paid</p></AnimatedTooltip><p className="text-2xl font-bold text-gray-900 dark:text-white">{paid}</p></CardContent></Card>
        <Card><CardContent className="p-4"><AnimatedTooltip variant="gram" content="Payments awaiting settlement or confirmation." triggerClassName="px-1 py-0.5"><p className="text-sm text-gray-500">Pending</p></AnimatedTooltip><p className="text-2xl font-bold text-amber-600">{pending}</p></CardContent></Card>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {byMethod.length === 0 ? <p className="text-center text-gray-400 py-8 italic">No payment data yet.</p> : (
              <div className="space-y-3">
                {byMethod.map(([m, c]) => (
                  <div key={m} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{m}</p>
                    <Badge variant="default">{c} orders</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-5 h-5 text-blue-500" /> Transaction Ledger</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-6">Reference</th>
                    <th className="py-3 px-6">Customer</th>
                    <th className="py-3 px-6">Method</th>
                    <th className="py-3 px-6">Amount</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-400 py-8 italic">{rows.length === 0 && "No payments recorded yet."}</td></tr> : rows.slice(0, 15).map(r => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800">
                      <td className="py-3 px-6 font-mono text-xs">{r.reference}</td>
                      <td className="py-3 px-6 text-sm">{r.customerName}</td>
                      <td className="py-3 px-6 text-sm">{r.method}</td>
                      <td className="py-3 px-6 font-bold">{formatPrice(r.amount)}</td>
                      <td className="py-3 px-6"><Badge variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* REPORTS — real analytics with working date ranges */
export function AdminReportsPage() {
  const { formatPrice } = useApp();
  const [range, setRange] = useState('30');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    AdminService.getReports(range).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [range]);
  const totals = data?.totals || {};
  const maxRev = data?.series ? Math.max(...data.series.map((s: any) => s.revenue), 1) : 1;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={FileText} title="Platform Reports" description="Financial and operational metrics computed from real orders." count={data ? `${totals.orders} orders analyzed` : 'Loading…'} />
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Date Range</label>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40 rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? <p className="text-center text-gray-400 py-12">Loading reports…</p> : !data ? <p className="text-center text-gray-400 py-12">No report data available.</p> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Orders</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.orders}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Gross Volume</p><p className="text-2xl font-bold text-emerald-600">{formatPrice(totals.revenue)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Commission</p><p className="text-2xl font-bold text-blue-600">{formatPrice(totals.commission)}</p></CardContent></Card>
            <Card><CardContent className="p-4">
              <AnimatedTooltip variant="gram" content="Share of orders that completed successfully in this period (excludes cancellations)." triggerClassName="px-1 py-0.5">
                <p className="text-sm text-gray-500">Completion Rate</p>
              </AnimatedTooltip>
              <p className="text-2xl font-bold text-violet-600">{totals.completionRate}%</p>
            </CardContent></Card>
          </div>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-5 h-5 text-indigo-500" /> Revenue over time ({range} days)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40 overflow-hidden">
                {data.series.map((s: any) => (
                  <div key={s.date} className="flex-1 flex items-end" title={`${s.date} — ${formatPrice(s.revenue)} (${s.orders} orders)`}>
                    <div className="w-full rounded-t bg-gradient-to-t from-blue-500 to-indigo-400" style={{ height: `${Math.max(3, (s.revenue / maxRev) * 140)}px` }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="w-5 h-5 text-violet-500" /> Top Restaurants</CardTitle></CardHeader>
              <CardContent>
                {!data.topVendors?.length ? <p className="text-gray-400 text-sm py-6 text-center italic">No orders in this window.</p> : data.topVendors.slice(0, 6).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 mb-2">
                    <div><p className="text-sm font-bold text-gray-900 dark:text-white">{v.name}</p><p className="text-xs text-gray-500">{v.orders} orders</p></div>
                    <span className="font-bold text-emerald-600 text-sm">{formatPrice(v.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-5 h-5 text-amber-500" /> Top Meals</CardTitle></CardHeader>
              <CardContent>
                {!data.topProducts?.length ? <p className="text-gray-400 text-sm py-6 text-center italic">No orders in this window.</p> : data.topProducts.slice(0, 6).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 mb-2">
                    <div><p className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</p><p className="text-xs text-gray-500">{p.quantity} sold</p></div>
                    <span className="font-bold text-amber-600 text-sm">{formatPrice(p.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* SUPPORT — real tickets with replies */
export function AdminSupportPage() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [working, setWorking] = useState(false);
  const load = () => { AdminService.getTickets().then(r => setTickets(Array.isArray(r) ? r : [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setWorking(true);
    try {
      const updated = await AdminService.replyToTicket(active.id, { content: reply.trim(), senderId: user?.id });
      setActive(updated);
      setReply('');
      load();
      showToast('Reply Sent', 'Your response was attached to the ticket.');
    } catch (e: any) { showToast('Send Failed', e?.message || 'Could not send reply.', 'warning'); } finally { setWorking(false); }
  };

  const setStatus = async (ticket: any, status: string) => {
    try {
      await AdminService.updateTicket(ticket.id, { status });
      setActive(null);
      load();
      showToast('Ticket Updated', `Status set to ${status}.`);
    } catch (e: any) { showToast('Update Failed', e?.message || 'Could not update ticket.', 'warning'); }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={LifeBuoy} title="Support" description="Customer and partner support tickets with full reply workflow." count={`${tickets.length} tickets`} />
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-500" /> Ticket Queue</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh</Button>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-center text-gray-400 py-10 italic">No support tickets yet. Tickets from customers, vendors and riders appear here.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map(t => (
                <button key={t.id} onClick={() => setActive(t)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500 truncate">{t.userName} · {t.message.slice(0, 60)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={t.status === 'open' ? 'warning' : t.status === 'resolved' || t.status === 'closed' ? 'success' : 'default'}>{t.status}</Badge>
                    <p className="text-[10px] text-gray-400 mt-1">{fmtDate(t.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {active && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{active.subject}</h3>
                <p className="text-xs text-gray-500">{active.userName} ({active.userEmail}) · {fmtDate(active.createdAt)} · {active.priority}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActive(null)}>Close</Button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-xs text-gray-400 mb-1">{active.userName}</p>
                <p className="text-sm text-gray-900 dark:text-white">{active.message}</p>
              </div>
              {(active.replies || []).map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-500 mb-1">{r.senderId === user?.id ? 'You' : 'Support'} · {fmtDate(r.createdAt)}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{r.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" />
              <Button onClick={sendReply} disabled={working} size="sm"><Send className="w-4 h-4 mr-1" /> Send</Button>
            </div>
            <div className="flex gap-2">
              {active.status !== 'resolved' && <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => setStatus(active, 'resolved')}>Resolve</Button>}
              {active.status !== 'closed' && <Button size="sm" variant="outline" className="text-gray-600" onClick={() => setStatus(active, 'closed')}>Close</Button>}
              {active.status !== 'reopened' && <Button size="sm" variant="outline" className="text-amber-600" onClick={() => setStatus(active, 'open')}>Reopen</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* SETTINGS — real persisted platform settings */
export function AdminSettingsPage() {
  const { vendors, riders, orders, showToast } = useApp();
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const isSuper = user?.role === 'super-administrator';

  useEffect(() => { AdminService.getPlatformSettings().then(setSettings).catch(() => {}); }, []);

  const toggle = async (key: string) => {
    if (!isSuper) { showToast('Permission Denied', 'Only the Super Admin can change platform settings.', 'warning'); return; }
    if (!settings) return;
    setSaving(true);
    try {
      const next = { ...settings, [key]: !settings[key] };
      const saved = await AdminService.updatePlatformSettings(next);
      setSettings(saved);
      showToast('Settings Saved', 'Platform settings were updated in the database.');
    } catch (e: any) { showToast('Save Failed', e?.message || 'Could not save settings.', 'warning'); } finally { setSaving(false); }
  };

  const row = (title: string, desc: string, value: boolean, key: string) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <button disabled={!isSuper || saving} onClick={() => toggle(key)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'} ${!isSuper ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Settings} title="Settings" description="Live platform configuration. Changes are saved to the database." count={isSuper ? 'Super Admin' : 'Read-only'} />
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Restaurants</p><p className="text-2xl font-bold">{vendors.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Riders</p><p className="text-2xl font-bold">{riders.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Orders</p><p className="text-2xl font-bold">{orders.length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Platform Controls</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {row('Maintenance Mode', settings?.maintenanceMode ? 'Marketplace is offline for maintenance' : 'Marketplace is online', !!settings?.maintenanceMode, 'maintenanceMode')}
          {row('Notifications Enabled', 'Send system and order notifications to users', !!settings?.notificationsEnabled, 'notificationsEnabled')}
          {row('New Vendor Applications', 'Allow restaurants to register on the platform', !!settings?.allowNewVendors, 'allowNewVendors')}
          {row('New Rider Applications', 'Allow riders to register on the platform', !!settings?.allowNewRiders, 'allowNewRiders')}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Approval Mode</p>
              <p className="text-xs text-gray-400 mt-0.5">Vendor &amp; rider applications require manual review</p>
            </div>
            <Badge variant="info">{settings?.vendorApprovalMode || 'manual'}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
            <div>
              <AnimatedTooltip variant="indis" content="The percentage of each order subtotal kept by the platform as commission before vendor payouts are settled." triggerClassName="px-1 py-0.5">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Commission Rate</p>
              </AnimatedTooltip>
              <p className="text-xs text-gray-400 mt-0.5">Platform commission applied per subtotal</p>
            </div>
            <Badge variant="default">{settings?.defaultCommissionRate || 10}%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* MEALS (products) — real moderation */
export function AdminProductsPage() {
  const { products, vendors, formatPrice, updateProduct, deleteProduct, showToast } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const filtered = products.filter(p => filter === 'all' || p.status === filter)
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.vendorName || '').toLowerCase().includes(search.toLowerCase()));

  const toggle = async (p: any) => {
    try { await updateProduct(p.id, { status: p.status === 'active' ? 'inactive' : 'active' }); showToast('Meal Updated', `${p.title} is now ${p.status === 'active' ? 'inactive' : 'active'}.`); }
    catch (e: any) { showToast('Update Failed', e?.message, 'warning'); }
  };
  const remove = async (p: any) => {
    if (!window.confirm(`Remove "${p.title}" from the platform?`)) return;
    try { await deleteProduct(p.id); showToast('Meal Removed', 'The meal was removed.'); }
    catch (e: any) { showToast('Update Failed', e?.message, 'warning'); }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Package} title="Meals" description="Moderation of every meal listed on the platform." count={`${products.length} meals`} />
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Meals</p><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-emerald-600">{products.filter(p => p.status === 'active').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Avg. Price</p><p className="text-2xl font-bold text-emerald-600">{products.length ? formatPrice(products.reduce((s, p) => s + p.price, 0) / products.length) : formatPrice(0)}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><Package className="w-5 h-5 text-blue-500" /> Meal Directory</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search meals or restaurant…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-6">Meal</th>
                  <th className="py-4 px-6">Restaurant</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Stock</th>
                  <th className="py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-12 italic">{products.length === 0 ? 'No meals on the platform yet.' : 'No meals matched your criteria.'}</td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <img src={p.images?.[0] || ''} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        <span className="font-medium text-gray-900 dark:text-white">{p.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm">{p.vendorName || '—'}</td>
                    <td className="py-3 px-6 font-bold">{formatPrice(p.price)}</td>
                    <td className="py-3 px-6"><Badge variant={p.status === 'active' ? 'success' : 'default'}>{p.status || 'active'}</Badge></td>
                    <td className="py-3 px-6">{p.stock}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => toggle(p)} className={p.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}>
                          {p.status === 'active' ? 'Unavailable' : 'Available'}
                        </Button>
                        <Button size="sm" variant="outline" className="text-rose-600" onClick={() => remove(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* CATEGORIES — real CRUD */
export function AdminCategoriesPage() {
  const { categories, products, addCategory, updateCategory, deleteCategory, showToast } = useApp();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const withCount = categories.map(c => ({ ...c, mealCount: products.filter(p => p.category === c.name || p.categoryId === c.id).length }));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editing) { await updateCategory(editing.id, { name: name.trim(), icon: editing.icon || 'Utensils' }); showToast('Category Updated', 'Category renamed.'); }
      else { await addCategory({ name: name.trim(), icon: 'Utensils', image: '', count: 0 }); showToast('Category Created', 'New category added to the catalog.'); }
      setName(''); setEditing(null);
    } catch (err: any) { showToast('Save Failed', err?.message || 'Could not save category.', 'warning'); }
  };

  const remove = async (c: any) => {
    if (!window.confirm(`Delete the "${c.name}" category? Meals in it will not be deleted, but no longer assigned.`)) return;
    try { await deleteCategory(c.id); showToast('Category Deleted', 'Category removed.'); } catch (err: any) { showToast('Delete Failed', err?.message, 'warning'); }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Tags} title="Categories" description="Create, rename and remove food categories used across the platform." count={`${categories.length} categories`} />
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">{editing ? `Edit "${editing.name}"` : 'Add Category'}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={editing ? editing.name : 'e.g. Fried Chicken'} />
            <Button onClick={submit}><Plus className="w-4 h-4 mr-1" /> {editing ? 'Save' : 'Add'}</Button>
            {editing && <Button variant="outline" onClick={() => { setEditing(null); setName(''); }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {withCount.length === 0 ? (
          <p className="text-sm text-gray-400 italic col-span-full text-center py-10">No categories yet.</p>
        ) : withCount.map(c => (
          <Card key={c.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                <Badge variant="info">{c.mealCount} meals</Badge>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => { setEditing(c); setName(c.name); }}><Plus className="w-3.5 h-3.5 mr-1 scale-x-100 rotate-90" /> Edit</Button>
                <Button size="sm" variant="outline" className="text-rose-600" onClick={() => remove(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* COUPONS — real CRUD */
export function AdminCouponsPage() {
  const { showToast, formatPrice } = useApp();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ code: '', type: 'percentage', value: '', minSpend: '', expiryDate: '', maxDiscount: '', usageLimit: '' });
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    AdminService.getCoupons().then(r => setCoupons(Array.isArray(r) ? r : [])).catch(() => setCoupons([]));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code, type: form.type, value: Number(form.value) || 0,
        minSpend: Number(form.minSpend) || 0, maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined, expiryDate: form.expiryDate || ''
      };
      if (editing) await AdminService.updateCoupon(editing.id, payload);
      else await AdminService.createCoupon(payload);
      showToast('Coupon Saved', editing ? 'Coupon updated.' : 'Coupon created.');
      setShowForm(false); setEditing(null); setForm({ code: '', type: 'percentage', value: '', minSpend: '', expiryDate: '', maxDiscount: '', usageLimit: '' });
      await load();
    } catch (err: any) { showToast('Save Failed', err?.message || 'Could not save coupon.', 'warning'); } finally { setSaving(false); }
  };

  const remove = async (c: any) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try { await AdminService.deleteCoupon(c.id); showToast('Coupon Deleted', `${c.code} removed.`); await load(); } catch (err: any) { showToast('Delete Failed', err?.message, 'warning'); }
  };

  const active = coupons.filter(c => c.isActive).length;
  const inactive = coupons.filter(c => !c.isActive).length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={TicketPercent} title="Coupons" description="Create and manage real promo codes validated at checkout." count={`${coupons.length} coupons`} />
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-emerald-600">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Inactive</p><p className="text-2xl font-bold text-gray-700 dark:text-white">{inactive}</p></CardContent></Card>
      </div>

      {!showForm && (
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Create Coupon</Button>
      )}

      {showForm && (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">{editing ? `Edit ${editing.code}` : 'New Coupon'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
              <div><Label>Code</Label><Input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE25" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="free_delivery">Free Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input required type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? '10' : '15'} /></div>
              <div><Label>Min. Order (GHS)</Label><Input type="number" value={form.minSpend} onChange={e => setForm({ ...form, minSpend: e.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
              <div><Label>Usage Limit (optional)</Label><Input type="number" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} /></div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Coupon'}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TicketPercent className="w-5 h-5 text-emerald-500" /> Coupon List</CardTitle></CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-center text-gray-400 py-10 italic">No coupons created yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {coupons.map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-bold text-gray-900 dark:text-white">{c.code}</p>
                    <Badge variant={c.isActive ? 'success' : 'danger'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{c.type} · {c.value}{c.type === 'percentage' ? '%' : ''} off · Used {c.totalUsed || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Min order {formatPrice(c.minSpend || 0)} · Exp {fmtDate(c.expiryDate)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(c); setForm({ code: c.code, type: c.type, value: String(c.value), minSpend: String(c.minSpend || ''), expiryDate: (c.expiryDate || '').slice(0, 10), maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '', usageLimit: c.usageLimit ? String(c.usageLimit) : '' }); setShowForm(true); }}><Plus className="w-3.5 h-3.5 mr-0.5" style={{ transform: 'rotate(90deg)' }} /> Edit</Button>
                    <Button size="sm" variant="outline" className="text-rose-600" onClick={() => remove(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* PROMOTIONS — real featured promotions */
export function AdminPromotionsPage() {
  const { vendors, products, updateVendorProfile, showToast } = useApp();
  const featuredVendors = vendors.filter(v => v.isFeatured);
  const popularMeals = products.filter(p => p.isPopular || p.isTrending);

  const toggleFeatured = async (v: any) => {
    try { await updateVendorProfile(v.id, { isFeatured: !v.isFeatured }); showToast('Promotion Updated', `${v.name} is now ${v.isFeatured ? 'no longer' : ''} featured.`); }
    catch (e: any) { showToast('Update Failed', e?.message, 'warning'); }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Megaphone} title="Promotions" description="Featured restaurants and promoted meals — changes affect the public marketplace." count={`${featuredVendors.length} featured`} />
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Featured Restaurants</p><p className="text-2xl font-bold text-violet-600">{featuredVendors.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Popular Meals</p><p className="text-2xl font-bold text-amber-600">{popularMeals.length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="w-5 h-5 text-violet-500" /> Restaurants</CardTitle></CardHeader>
        <CardContent>
          {vendors.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center italic">No restaurants registered yet.</p> : (
            <div className="space-y-2">
              {vendors.slice(0, 12).map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <img src={v.logo} className="w-8 h-8 rounded-lg object-cover" alt="" />
                    <span className="font-medium text-gray-900 dark:text-white">{v.name}</span>
                    {v.isFeatured && <Badge variant="success">Featured</Badge>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toggleFeatured(v)} className={v.isFeatured ? 'text-amber-600' : 'text-blue-600'}>
                    {v.isFeatured ? 'Unfeature' : 'Feature'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* NOTIFICATIONS — real admin inbox */
export function AdminNotificationsPage() {
  return <NotificationCenter role="admin" />;
}

/* MESSAGES — real threads */
export function AdminMessagesPage() {
  const { conversations, orders, showToast } = useApp();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [openConv, setOpenConv] = useState<any>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadMsgStatus, setLoadMsgStatus] = useState<string | null>(null);

  const openThread = async (c: any) => {
    setOpenConv(c);
    setLoadMsgStatus('loading');
    try {
      const rows = await MessagingService.getMessages(c.id);
      setMessages(Array.isArray(rows) ? rows : []);
      setLoadMsgStatus(null);
    } catch (e: any) {
      setMessages([]);
      setLoadMsgStatus('error');
      showToast('Load Failed', e?.message || 'Could not load conversation.', 'warning');
    }
  };

  const sendMessage = async () => {
    if (!draft.trim() || !openConv || !user) return;
    setSending(true);
    try {
      await MessagingService.sendMessage({ conversationId: openConv.id, senderId: user.id, content: draft.trim() });
      setDraft('');
      const rows = await MessagingService.getMessages(openConv.id);
      setMessages(Array.isArray(rows) ? rows : []);
    } catch (e: any) { showToast('Send Failed', e?.message || 'Could not send message.', 'warning'); } finally { setSending(false); }
  };

  const orderLink = (c: any) => {
    const o = orders.find(ord => ord.id === c.orderId || ord.conversationId === c.id);
    return o ? { n: o.orderNumber || o.id, id: o.id } : null;
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={MessageSquare} title="Messages" description="Direct message threads available to this console account." count={`${conversations.length} threads`} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-500" /> Conversations</CardTitle></CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="text-center text-gray-400 py-10 italic">No conversations found for this account.</p>
            ) : (
              <div className="space-y-2">
                {conversations.map(c => (
                  <button key={c.id} onClick={() => openThread(c)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.participants?.[0]?.name || c.id}</p>
                      <p className="text-xs text-gray-500 truncate">{c.lastMessage || 'No messages yet'}</p>
                    </div>
                    <div className="text-right">
                      {c.unreadCount > 0 && <Badge variant="warning">{c.unreadCount}</Badge>}
                      {orderLink(c) && <p className="text-[10px] text-gray-400 mt-1">Order #{orderLink(c)!.id.slice(0, 8)}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              {openConv ? (openConv.participants?.[0]?.name || 'Conversation') : 'Select a conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!openConv ? (
              <p className="text-center text-gray-400 py-12 italic">Select a thread on the left to view messages.</p>
            ) : loadMsgStatus === 'loading' ? (
              <p className="text-center text-gray-400 py-12">Loading messages…</p>
            ) : loadMsgStatus === 'error' ? (
              <p className="text-center text-rose-500 py-12">Unable to load messages. <Button size="sm" variant="outline" className="ml-2" onClick={() => openThread(openConv)}>Retry</Button></p>
            ) : messages.length === 0 ? (
              <p className="text-center text-gray-400 py-12 italic">No messages in this thread yet.</p>
            ) : (
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-2xl max-w-[75%] text-sm ${m.senderId === user?.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'}`}>
                      <p>{m.content}</p>
                      <p className={`text-[10px] mt-1 ${m.senderId === user?.id ? 'text-emerald-100' : 'text-gray-400'}`}>{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {openConv && (
              <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                <Button onClick={sendMessage} disabled={sending || !draft.trim()} size="sm"><Send className="w-4 h-4 mr-1" /> Send</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* USERS — full platform user directory */
export function AdminUsersPage() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const isSuper = user?.role === 'super-administrator';

  useEffect(() => {
    AdminService.getUsers().then(r => setUsers(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const toggleSuspend = async (u: any) => {
    try {
      await AdminService.updateUser(u.id, { isSuspended: !u.isSuspended });
      showToast('User Updated', `${u.email} ${u.isSuspended ? 'reactivated' : 'suspended'}.`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isSuspended: !u.isSuspended } : x));
    } catch (e: any) { showToast('Action Failed', e?.message || 'Could not update user.', 'warning'); }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Users} title="User Directory" description="Every account on the platform with its role and status." count={`${users.length} users`} />
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Created</th>
                  <th className="py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-400 py-10 italic">Loading users…</td></tr> : users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900 dark:text-white">{u.displayName || u.firstName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-6"><Badge variant="info">{u.role}</Badge></td>
                    <td className="py-3 px-6"><Badge variant={u.isSuspended ? 'danger' : 'success'}>{u.isSuspended ? 'Suspended' : 'Active'}</Badge></td>
                    <td className="py-3 px-6 text-sm">{fmtDate(u.createdAt)}</td>
                    <td className="py-3 px-6">
                      {!u.isSuspended ? (
                        <Button size="sm" variant="outline" className="text-amber-600" onClick={() => toggleSuspend(u)}><Ban className="w-3.5 h-3.5 mr-1" /> Suspend</Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => toggleSuspend(u)}><UserCheck className="w-3.5 h-3.5 mr-1" /> Reactivate</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}