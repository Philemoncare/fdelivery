import { useState, useMemo } from 'react';
import { Activity, Server, Search, RefreshCw, AlertTriangle, Info, Trash2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminEmptyState, AdminLoading, AdminError, AdminPagination
} from '@/src/components/super-admin/AdminDesignSystem';

function levelBadge(level: string): AdminStatus {
  if (level === 'error') return 'failed';
  if (level === 'warn') return 'warning';
  if (level === 'debug') return 'info';
  return 'success';
}

const fmtN = (n: number) => n.toLocaleString('en-US');

// System Logs = technical events (API error, DB error, worker failure, service
// restart, integration error). Distinct from Audit Logs (human admin actions),
// Access Logs (auth/session activity) and Security Events. Every record here is
// authored by the backend — never fabricated personnel activity.
export function SuperAdminSystemLogsPage() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [source, setSource] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [applied, setApplied] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [clearing, setClearing] = useState(false);

  const load = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const r = await AdminService.getSystemLogs({
        page,
        pageSize,
        search: search || undefined,
        level: level === 'all' ? undefined : level,
        source: source === 'all' ? undefined : source,
        from: from || undefined,
        to: to || undefined,
        sort: 'newest'
      });
      setLogs(Array.isArray(r?.items) ? r.items : []);
      setTotal(r?.total ?? 0);
      setTotalPages(r?.totalPages ?? 1);
      setSummary(r?.summary ?? null);
      const src = r?.sources || [];
      if (src.length) setSources(src);
    } catch (e: any) {
      setError(e?.message || 'Failed to load system logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useMemo(() => { load(); /* initial + when filters or page change */ return undefined; }, [applied, page]);

  const runClear = async () => {
    if (!clearPassword) return;
    setClearing(true);
    try {
      await AdminService.clearSystemLogs(clearPassword);
      showToast('System Logs Cleared', 'The technical event log has been cleared.', 'success');
      setClearOpen(false);
      setClearPassword('');
      setPage(1);
      load(true);
    } catch (e: any) {
      const msg = e?.message || 'Failed to clear system logs.';
      if (/reauth|password|re-authenticate/i.test(msg)) showToast('Re-authentication required', 'Enter your current password to clear system logs.', 'info');
      else showToast('Clear Failed', msg, 'error');
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <AdminLoading message="Loading technical event log…" />;
  if (error && !logs.length) return <AdminError message="Failed to load system logs" detail={error} retry={() => load(true)} />;

  const totalCount = summary?.total ?? total;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Activity}
        title="System Logs"
        description="Technical events recorded by the backend — API errors, database failures, worker and integration errors, service restarts."
        stats={<AdminBadge status="info" label={`${fmtN(totalCount)} Events`} />}
        actions={
          <Button variant="outline" className="h-9 px-4 rounded-xl text-sm font-semibold" onClick={() => load(true)}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-2', refreshing && 'animate-spin')} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Events" value={fmtN(totalCount)} icon={Server} status="info" />
        <AdminStatCard label="Errors" value={fmtN(summary?.errors ?? 0)} icon={AlertTriangle} status="error" />
        <AdminStatCard label="Warnings" value={fmtN(summary?.warnings ?? 0)} icon={Info} status="warning" />
        <AdminStatCard label="Errors (24h)" value={fmtN(summary?.errors24h ?? 0)} icon={CheckCircle2} status={summary?.errors24h ? 'error' : 'success'} />
      </div>

      <AdminCard
        title="Technical Event Log"
        subtitle="Errors, warnings and lifecycle events from the platform services"
        icon={Activity}
        noPadding
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <Input placeholder="Search events…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 w-44 rounded-xl pl-9 text-xs lg:w-52" />
            </div>
            <Select value={level} onValueChange={v => { setLevel(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-28"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">ERROR</SelectItem>
                <SelectItem value="warn">WARNING</SelectItem>
                <SelectItem value="info">INFO</SelectItem>
                <SelectItem value="debug">DEBUG</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={v => { setSource(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-36"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-36 rounded-xl text-xs" aria-label="From date" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-36 rounded-xl text-xs" aria-label="To date" />
            <Button size="sm" className="h-9 rounded-xl px-3 text-xs" onClick={() => setApplied(x => x + 1)}>Apply</Button>
            <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={() => setClearOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        }
      >
        {logs.length === 0 ? (
          <AdminEmptyState icon={Activity} title="No system events" description="No technical events match the current filters. The service is healthy." />
        ) : (
          <>
            <AdminTable headers={['Event', 'Level', 'Source', 'Message', 'When']}>
              {logs.map((l: any) => (
                <tr key={l.id} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-mono text-[11px] font-bold text-ink">{l.event || '—'}</p>
                    <p className="text-[10px] text-ink-3">{l.id || ''}</p>
                  </td>
                  <td className="px-5 py-3"><AdminBadge status={levelBadge(l.level)} label={String(l.level || 'info').toUpperCase()} /></td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-2">{l.source}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs text-ink-2 max-w-[420px]">{l.message || '—'}</p>
                    {l.meta && typeof l.meta === 'object' && (
                      <p className="text-[10px] text-ink-3 font-mono mt-0.5">{JSON.stringify(l.meta).slice(0, 140)}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[10px] text-ink-3">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </AdminTable>
            {total > pageSize && (
              <div className="border-t border-line px-5 py-3">
                <AdminPagination page={page} totalPages={totalPages} showingFrom={(page - 1) * pageSize + 1} showingTo={Math.min(page * pageSize, total)} total={total} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => Math.min(totalPages, p + 1))} />
              </div>
            )}
          </>
        )}
      </AdminCard>

      {clearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-line shadow-2xl p-6">
            <h3 className="text-sm font-black text-ink">Clear System Logs</h3>
            <p className="mt-1 text-xs text-ink-3">This permanently removes all technical events. The clear action itself is written to the audit log.</p>
            <Input type="password" placeholder="Confirm with current password" value={clearPassword} onChange={e => setClearPassword(e.target.value)} className="mt-4 h-10 rounded-xl text-xs" />
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setClearOpen(false); setClearPassword(''); }}>Cancel</Button>
              <Button size="sm" className="rounded-xl" disabled={!clearPassword || clearing} onClick={runClear}>
                {clearing ? 'Clearing…' : 'Clear Logs'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(' ');
}