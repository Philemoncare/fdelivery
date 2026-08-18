import { useState, useMemo } from 'react';
import { Activity, Server, Mail, AlertTriangle, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminEmptyState, AdminLoading, AdminError, AdminPagination
} from '@/src/components/super-admin/AdminDesignSystem';

function methodBadge(m: string): AdminStatus {
  if (m === 'GET') return 'success';
  if (m === 'POST') return 'info';
  if (m === 'PUT' || m === 'PATCH') return 'warning';
  if (m === 'DELETE') return 'failed';
  return 'info';
}

function statusBadge(s: string | number): AdminStatus {
  const n = Number(s);
  if (n >= 200 && n < 300) return 'success';
  if (n >= 400 && n < 500) return 'pending';
  if (n >= 500) return 'failed';
  return 'info';
}

const fmtN = (n: number) => n.toLocaleString('en-US');

export function SuperAdminSystemLogsPage() {
  const [api, setApi] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'api' | 'emails' | 'failures'>('api');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [apiData, emailData]: any[] = await Promise.all([
        AdminService.getApiConsole().catch(() => ({ endpoints: [], activity: [], requests: [] })),
        AdminService.getEmailLog().catch(() => ({ emails: [], logs: [] })),
      ]);
      setApi(apiData.endpoints || apiData.activity || apiData.requests || apiData || []);
      setEmails(emailData.emails || emailData.logs || emailData || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load system logs.');
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(); });

  const apiFailures = useMemo(() => api.filter(a => (Number(a.statusCode || a.status) || 0) >= 400), [api]);
  const emailFailures = useMemo(() => emails.filter(e => e.status === 'failed' || e.failed), [emails]);

  const filtered = useMemo(() => {
    const list = view === 'api' ? api : view === 'emails' ? emails : apiFailures;
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((e: any) => [e.id, e.endpoint, e.method, e.email, e.to, e.subject, e.status, String(e.statusCode || '')].some(f => String(f || '').toLowerCase().includes(q)));
  }, [view, api, emails, apiFailures, search]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalRequests = api.length;
  const failureCount = apiFailures.length + emailFailures.length;
  const avgLatency = api.length ? Math.round(api.reduce((s, a) => s + (Number(a.latency || a.responseTime || 0)), 0) / api.length) : 0;
  const emailCount = emails.length;

  if (loading) return <AdminLoading message="Loading system logs…" />;
  if (error) return <AdminError message="Failed to load system logs" detail={error} retry={load} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Activity}
        title="System Logs"
        description="API request activity, email delivery logs and system failures."
        stats={<AdminBadge status="info" label={`${fmtN(totalRequests)} Requests`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="API Requests" value={fmtN(totalRequests)} icon={Server} status="info" />
        <AdminStatCard label="Emails Sent" value={fmtN(emailCount)} icon={Mail} status="success" />
        <AdminStatCard label="Failures" value={fmtN(failureCount)} icon={AlertTriangle} status="error" />
        <AdminStatCard label="Avg Latency" value={avgLatency ? `${avgLatency}ms` : '—'} icon={Activity} status="info" />
      </div>

      <AdminCard
        title="Activity Logs"
        subtitle="API, email and failure records"
        icon={Activity}
        noPadding
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line bg-surface-2/60 p-0.5">
              {(['api', 'emails', 'failures'] as const).map(v => (
                <button key={v} onClick={() => { setView(v); setPage(1); }} className={`rounded-[10px] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${view === v ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}>
                  {v}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <Input placeholder="Search logs…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 w-48 rounded-xl pl-9 text-xs lg:w-56" />
            </div>
            <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <AdminEmptyState icon={Activity} title="No logs found" description={view === 'failures' ? 'No failures recorded. Everything is healthy.' : 'No logs match the current search.'} />
        ) : (
          <>
            {view === 'api' && (
              <AdminTable headers={['Endpoint', 'Method', 'Status', 'Latency', 'User', 'When']}>
                {rows.map((a: any, i: number) => (
                  <tr key={a.id || i} className="hover:bg-surface-2/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-mono text-[11px] font-bold text-ink">{a.endpoint || a.path || a.route || '—'}</p>
                      <p className="text-[10px] text-ink-3">{a.ip || ''}</p>
                    </td>
                    <td className="px-5 py-3"><AdminBadge status={methodBadge(a.method)} label={a.method || '—'} /></td>
                    <td className="px-5 py-3"><AdminBadge status={statusBadge(a.statusCode ?? a.status)} label={String(a.statusCode ?? a.status ?? '—')} /></td>
                    <td className="px-5 py-3 text-xs text-ink-2">{a.latency ?? a.responseTime ?? '—'}{a.latency || a.responseTime ? 'ms' : ''}</td>
                    <td className="px-5 py-3 text-xs text-ink-2">{a.userEmail || a.userName || a.userId || '—'}</td>
                    <td className="px-5 py-3 text-[10px] text-ink-3">{a.timestamp || a.createdAt ? new Date(a.timestamp || a.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </AdminTable>
            )}
            {view === 'emails' && (
              <AdminTable headers={['To', 'Subject', 'Status', 'Channel', 'When']}>
                {rows.map((e: any, i: number) => (
                  <tr key={e.id || i} className="hover:bg-surface-2/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-ink">{e.to || e.email || '—'}</p>
                      <p className="text-[10px] text-ink-3">{e.id || ''}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-2">{e.subject || e.type || '—'}</td>
                    <td className="px-5 py-3"><AdminBadge status={statusBadge(e.status)} label={String(e.status || '—')} /></td>
                    <td className="px-5 py-3 text-xs text-ink-2">{e.channel || e.smtp || 'email'}</td>
                    <td className="px-5 py-3 text-[10px] text-ink-3">{e.timestamp || e.createdAt ? new Date(e.timestamp || e.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </AdminTable>
            )}
            {view === 'failures' && (
              <AdminTable headers={['Source', 'Detail', 'Status', 'When']}>
                {rows.map((f: any, i: number) => (
                  <tr key={`${f.id || i}-${i}`} className="hover:bg-surface-2/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                        {f.endpoint || f.path ? (f.endpoint || f.path) : 'Email'}
                      </p>
                      <p className="text-[10px] text-ink-3">{f.method || (f.to || '')}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-2">{f.error || f.message || f.subject || '—'}</td>
                    <td className="px-5 py-3"><AdminBadge status={statusBadge(f.statusCode ?? f.status)} label={String(f.statusCode ?? f.status ?? 'failed')} /></td>
                    <td className="px-5 py-3 text-[10px] text-ink-3">{f.timestamp || f.createdAt ? new Date(f.timestamp || f.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </AdminTable>
            )}
            {filtered.length > pageSize && (
              <div className="border-t border-line px-5 py-3">
                <AdminPagination page={safePage} totalPages={pageCount} showingFrom={(safePage - 1) * pageSize + 1} showingTo={Math.min(safePage * pageSize, filtered.length)} total={filtered.length} onPrev={() => setPage(safePage - 1)} onNext={() => setPage(safePage + 1)} />
              </div>
            )}
          </>
        )}
      </AdminCard>
    </div>
  );
}