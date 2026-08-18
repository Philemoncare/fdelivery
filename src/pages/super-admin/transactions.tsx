import { useState, useMemo } from 'react';
import { ArrowLeftRight, Search, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminEmptyState, AdminLoading, AdminError, AdminPagination, AdminDrawer
} from '@/src/components/super-admin/AdminDesignSystem';

function statusBadge(s: string): AdminStatus {
  if (s === 'completed' || s === 'succeeded') return 'success';
  if (s === 'pending' || s === 'processing') return 'pending';
  if (s === 'failed' || s === 'cancelled' || s === 'refunded') return 'failed';
  return 'info';
}

const PAGE_SIZE = 15;

export function SuperAdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data: any = await AdminService.getTransactions({});
      setTransactions(data.transactions || data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(); });

  const filtered = useMemo(() => transactions.filter(t => {
    if (category !== 'all' && t.category !== category) return false;
    if (status !== 'all' && t.status !== status) return false;
    if (type !== 'all' && t.type !== type) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![t.id, t.userName, t.userEmail, t.method, t.reference].some(f => String(f || '').toLowerCase().includes(q))) return false;
    }
    return true;
  }), [transactions, search, category, status, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const categories: string[] = Array.from(new Set(transactions.map(t => String(t?.category || '')).filter(Boolean)));
  const statuses: string[] = Array.from(new Set(transactions.map(t => String(t?.status || '')).filter(Boolean)));
  const types: string[] = Array.from(new Set(transactions.map(t => String(t?.type || '')).filter(Boolean)));

  const totalVolume = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const inflow = transactions.filter(t => (t.direction || t.type) === 'credit').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const outflow = transactions.filter(t => (t.direction || t.type) === 'debit').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const failedCount = transactions.filter(t => t.status === 'failed').length;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <AdminLoading message="Loading transactions…" />;
  if (error) return <AdminError message="Failed to load transactions" detail={error} retry={load} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={ArrowLeftRight}
        title="Transactions"
        description="All money movements across wallets, payments, commissions and payouts."
        stats={<AdminBadge status="info" label={`${transactions.length} Transactions`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Completed Volume" value={`$${fmt(totalVolume)}`} icon={ArrowUpRight} status="success" />
        <AdminStatCard label="Credit Inflow" value={`$${fmt(inflow)}`} icon={ArrowDownRight} status="info" />
        <AdminStatCard label="Debit Outflow" value={`$${fmt(outflow)}`} icon={ArrowDownRight} status="warning" />
        <AdminStatCard label="Failed" value={failedCount} icon={ArrowLeftRight} status="error" />
      </div>

      <AdminCard
        title="Transaction Ledger"
        subtitle="Searchable, filterable money movements"
        icon={ArrowLeftRight}
        noPadding
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <Input placeholder="Search ID, user, method…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 w-52 rounded-xl pl-9 text-xs lg:w-64" />
            </div>
            <Select value={category} onValueChange={v => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-32 rounded-xl text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={v => { setType(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-32 rounded-xl text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-32 rounded-xl text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={() => { setSearch(''); setCategory('all'); setType('all'); setStatus('all'); setPage(1); }}>
              <Filter className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <AdminEmptyState icon={ArrowLeftRight} title="No transactions found" description="No transactions match the current filters." />
        ) : (
          <>
            <AdminTable headers={['Transaction', 'User', 'Category', 'Type', 'Amount', 'Status', 'Date']}>
              {rows.map(t => (
                <tr key={t.id} className="group cursor-pointer hover:bg-surface-2/40 transition-colors" onClick={() => setSelected(t)}>
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-[11px] font-bold text-ink">{t.id}</p>
                    <p className="text-[10px] text-ink-3">{t.method || t.paymentMethod || '—'}{t.reference ? ` · ${t.reference}` : ''}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-ink">{t.userName || 'System'}</p>
                    <p className="text-[10px] text-ink-3">{t.userEmail}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs capitalize text-ink-2">{t.category || '—'}</td>
                  <td className="px-5 py-3.5 text-xs capitalize text-ink-2">{t.type || '—'}</td>
                  <td className="px-5 py-3.5 text-xs font-black text-ink">${fmt(Number(t.amount) || 0)}</td>
                  <td className="px-5 py-3.5"><AdminBadge status={statusBadge(t.status)} label={t.status} /></td>
                  <td className="px-5 py-3.5 text-[10px] text-ink-3">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'} {t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : ''}</td>
                </tr>
              ))}
            </AdminTable>
            {filtered.length > PAGE_SIZE && (
              <div className="border-t border-line px-5 py-3">
                <AdminPagination page={safePage} totalPages={pageCount} showingFrom={(safePage - 1) * PAGE_SIZE + 1} showingTo={Math.min(safePage * PAGE_SIZE, filtered.length)} total={filtered.length} onPrev={() => setPage(safePage - 1)} onNext={() => setPage(safePage + 1)} />
              </div>
            )}
          </>
        )}
      </AdminCard>

      {selected && (
        <AdminDrawer
          open
          onClose={() => setSelected(null)}
          icon={ArrowLeftRight}
          title={selected.id}
          subtitle={`${selected.category || 'transaction'} · ${selected.type || ''}`}
          footer={<Button variant="outline" className="w-full rounded-xl" onClick={() => setSelected(null)}>Close</Button>}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <AdminBadge status={statusBadge(selected.status)} label={selected.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Amount</p>
                <p className="text-lg font-black text-ink">${fmt(Number(selected.amount) || 0)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Method</p>
                <p className="text-sm text-ink">{selected.method || selected.paymentMethod || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">User</p>
                <p className="text-sm text-ink">{selected.userName || 'System'}</p>
                <p className="text-[11px] text-ink-3">{selected.userEmail}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Reference</p>
                <p className="text-sm text-ink">{selected.reference || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Created</p>
                <p className="text-sm text-ink">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Fee</p>
                <p className="text-sm text-ink">{selected.fee ? `$${fmt(Number(selected.fee))}` : '—'}</p>
              </div>
              {selected.notes && (
                <div className="col-span-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Notes</p>
                  <p className="text-sm text-ink-2">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </AdminDrawer>
      )}
    </div>
  );
}