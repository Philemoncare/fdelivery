import { useState, useMemo } from 'react';
import { Wallet, Search, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminEmptyState, AdminLoading, AdminError, AdminDrawer
} from '@/src/components/super-admin/AdminDesignSystem';

function roleBadge(role: string): AdminStatus {
  if (role === 'super-admin' || role === 'admin') return 'info';
  if (role === 'vendor') return 'warning';
  if (role === 'rider') return 'warning';
  return 'success';
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SuperAdminWalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data: any = await AdminService.getWallets();
      setWallets(Array.isArray(data) ? data : data.wallets || data.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load wallets.');
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(); });

  const filtered = useMemo(() => wallets.filter(w => {
    if (role !== 'all' && w.role !== role) return false;
    if (search && ![w.userName, w.userEmail, w.id].some(f => String(f || '').toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [wallets, search, role]);

  const totalBalance = wallets.reduce((s, w) => s + (Number(w.balance) || 0), 0);
  const totalInflow = wallets.reduce((s, w) => s + (Number(w.inflow) || 0), 0);
  const totalOutflow = wallets.reduce((s, w) => s + (Number(w.outflow) || 0), 0);
  const fundedCount = wallets.filter(w => Number(w.balance) > 0).length;
  const roles: string[] = Array.from(new Set(wallets.map(w => String(w?.role || '')).filter(Boolean)));

  if (loading) return <AdminLoading message="Loading wallets…" />;
  if (error) return <AdminError message="Failed to load wallets" detail={error} retry={load} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Wallet}
        title="Wallets"
        description="User and business wallets across the platform, with transaction inflows and outflows."
        stats={<AdminBadge status="info" label={`${wallets.length} Wallets`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Balance" value={`$${fmt(totalBalance)}`} icon={Wallet} status="info" />
        <AdminStatCard label="Total Inflow" value={`$${fmt(totalInflow)}`} icon={ArrowDownRight} status="success" />
        <AdminStatCard label="Total Outflow" value={`$${fmt(totalOutflow)}`} icon={ArrowUpRight} status="warning" />
        <AdminStatCard label="Funded Wallets" value={fundedCount} icon={RefreshCw} status="info" />
      </div>

      <AdminCard
        title="Wallet Directory"
        subtitle="All platform wallets sorted by balance"
        icon={Wallet}
        noPadding
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <Input placeholder="Search name, email, wallet ID…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 rounded-xl pl-9 text-xs lg:w-64" />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <AdminEmptyState icon={Wallet} title="No wallets found" description="No wallets match the current filters or search." />
        ) : (
          <AdminTable headers={['Wallet', 'Owner', 'Role', 'Balance', 'Inflow', 'Outflow', 'Transactions']}>
            {filtered.map(w => (
              <tr key={w.id} className="group cursor-pointer hover:bg-surface-2/40 transition-colors" onClick={() => setSelected(w)}>
                <td className="px-5 py-3.5">
                  <p className="font-mono text-[11px] font-bold text-ink">{w.id}</p>
                  <p className="text-[10px] text-ink-3">{w.updatedAt ? `Updated ${new Date(w.updatedAt).toLocaleDateString()}` : '—'}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-xs font-semibold text-ink">{w.userName || '—'}</p>
                  <p className="text-[10px] text-ink-3">{w.userEmail}</p>
                </td>
                <td className="px-5 py-3.5"><AdminBadge status={roleBadge(w.role)} label={w.role || 'user'} /></td>
                <td className="px-5 py-3.5 text-xs font-black text-ink">${fmt(Number(w.balance) || 0)}</td>
                <td className="px-5 py-3.5 text-xs font-semibold text-emerald-600">+${fmt(Number(w.inflow) || 0)}</td>
                <td className="px-5 py-3.5 text-xs font-semibold text-rose-500">-${fmt(Number(w.outflow) || 0)}</td>
                <td className="px-5 py-3.5 text-xs text-ink-2">{w.totalTransactions ?? 0}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>

      {selected && (
        <AdminDrawer
          open
          onClose={() => setSelected(null)}
          icon={Wallet}
          title={selected.userName || selected.id}
          subtitle={selected.id}
          footer={<Button variant="outline" className="w-full rounded-xl" onClick={() => setSelected(null)}>Close</Button>}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <AdminBadge status={roleBadge(selected.role)} label={selected.role || 'user'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Balance</p>
                <p className="text-lg font-black text-ink">${fmt(Number(selected.balance) || 0)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Transactions</p>
                <p className="text-sm text-ink">{selected.totalTransactions ?? 0}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Total Inflow</p>
                <p className="text-sm font-semibold text-emerald-600">+${fmt(Number(selected.inflow) || 0)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Total Outflow</p>
                <p className="text-sm font-semibold text-rose-500">-${fmt(Number(selected.outflow) || 0)}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Owner</p>
                <p className="text-sm text-ink">{selected.userName || '—'}</p>
                <p className="text-[11px] text-ink-3">{selected.userEmail}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Last Updated</p>
                <p className="text-sm text-ink">{selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : '—'}</p>
              </div>
            </div>
          </div>
        </AdminDrawer>
      )}
    </div>
  );
}