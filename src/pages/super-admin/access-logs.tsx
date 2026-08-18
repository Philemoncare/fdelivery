import { useState, useMemo } from 'react';
import { ShieldAlert, Search, KeyRound, UserCheck, RefreshCw, Fingerprint } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminEmptyState, AdminLoading, AdminError, AdminPagination
} from '@/src/components/super-admin/AdminDesignSystem';

function statusBadge(s: string): AdminStatus {
  if (s === 'success' || s === 'successful' || s === 'approved' || s === 'granted') return 'success';
  if (s === 'failed' || s === 'denied' || s === 'rejected' || s === 'blocked' || s === 'revoked') return 'failed';
  if (s === 'pending' || s === 'attempt' || s === 'warning') return 'pending';
  return 'info';
}

const fmtN = (n: number) => n.toLocaleString('en-US');

export function SuperAdminAccessLogsPage() {
  const [audit, setAudit] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [auditData, sessionData] = await Promise.all([
        AdminService.getAudit({}).catch(() => ({ events: [], logs: [] })),
        AdminService.getSessions().catch(() => ([] as any[])),
      ]);
      const all = auditData.events || auditData.logs || [];
      setAudit(all.filter((e: any) => ['auth', 'login', 'session', 'access'].includes(String(e.category || '').toLowerCase()) || ['login', 'logout', 'login_failed', '2fa', 'otp', 'session'].some(k => String(e.action || e.type || '').toLowerCase().includes(k))));
      setSessions(Array.isArray(sessionData) ? sessionData : (sessionData as any)?.sessions || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load access logs.');
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(); });

  const filtered = useMemo(() => audit.filter(e => {
    if (eventType !== 'all' && (e.action || e.type || '') !== eventType) return false;
    if (outcome !== 'all' && (e.outcome || e.status || '') !== outcome) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![e.id, e.userEmail, e.userName, e.action, e.type, e.ip, e.device].some(f => String(f || '').toLowerCase().includes(q))) return false;
    }
    return true;
  }), [audit, search, eventType, outcome]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const eventTypes: string[] = Array.from(new Set(audit.map(e => String((e.action || e.type) || '')).filter(Boolean)));
  const outcomes: string[] = Array.from(new Set(audit.map(e => String((e.outcome || e.status) || '')).filter(Boolean)));

  const successful = audit.filter(e => ['success', 'successful', 'approved', 'granted'].includes(e.outcome || e.status)).length;
  const failed = audit.filter(e => ['failed', 'denied', 'rejected', 'blocked'].includes(e.outcome || e.status)).length;
  const logins = audit.filter(e => String(e.action || e.type || '').toLowerCase().includes('login')).length;
  const activeSessions = sessions.filter(s => s.status === 'active' || !s.revokedAt).length;

  if (loading) return <AdminLoading message="Loading access logs…" />;
  if (error) return <AdminError message="Failed to load access logs" detail={error} retry={load} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={ShieldAlert}
        title="Access Logs"
        description="Authentication, login and session activity across the platform."
        stats={<AdminBadge status="info" label={`${fmtN(audit.length)} Events`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Successful" value={fmtN(successful)} icon={UserCheck} status="success" />
        <AdminStatCard label="Failed Attempts" value={fmtN(failed)} icon={ShieldAlert} status="error" />
        <AdminStatCard label="Login Events" value={fmtN(logins)} icon={KeyRound} status="info" />
        <AdminStatCard label="Active Sessions" value={fmtN(activeSessions)} icon={Fingerprint} status="info" />
      </div>

      <AdminCard
        title="Authentication Activity"
        subtitle="Login, logout, 2FA and session events"
        icon={ShieldAlert}
        noPadding
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <Input placeholder="Search user, action, IP…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-9 w-48 rounded-xl pl-9 text-xs lg:w-56" />
            </div>
            <Select value={eventType} onValueChange={v => { setEventType(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-40 rounded-xl text-xs"><SelectValue placeholder="Event" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {eventTypes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={outcome} onValueChange={v => { setOutcome(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue placeholder="Outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                {outcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <AdminEmptyState icon={ShieldAlert} title="No access events found" description="No authentication events match the current filters." />
        ) : (
          <>
            <AdminTable headers={['Event', 'User', 'Outcome', 'Source', 'When']}>
              {rows.map((e: any, i: number) => (
                <tr key={e.id || i} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <KeyRound className="h-3.5 w-3.5 text-ink-3" /> {e.action || e.type || 'access'}
                    </p>
                    <p className="text-[10px] text-ink-3">{e.details || e.message || ''}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-ink">{e.userName || e.userEmail || 'Anonymous'}</p>
                    <p className="text-[10px] text-ink-3">{e.userEmail}</p>
                  </td>
                  <td className="px-5 py-3"><AdminBadge status={statusBadge(e.outcome || e.status)} label={e.outcome || e.status || '—'} /></td>
                  <td className="px-5 py-3 text-[10px] text-ink-3">{e.ip || '—'}{e.device ? ` · ${e.device}` : ''}</td>
                  <td className="px-5 py-3 text-[10px] text-ink-3">{e.timestamp || e.createdAt ? new Date(e.timestamp || e.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </AdminTable>
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