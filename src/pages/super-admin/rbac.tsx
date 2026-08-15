import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, KeyRound, Lock, Users, Search,
  CheckCircle, XCircle, RefreshCw, UserCog, ArrowLeft, ArrowRight, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import {
  PERMISSION_DOMAINS, PERMISSION_META, ROLE_ORDER, ROLE_LABELS, ROLE_DESCRIPTIONS,
  ROLE_ACCOUNT_TYPES, isAdminRole, type Role, type Permission, type PermissionDomain, type PermissionRisk
} from '@/src/lib/auth/types';
import { cn } from '@/src/lib/utils';

const ROSE = 'from-rose-500 to-purple-700';

const RISK_STYLES: Record<PermissionRisk, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** Where each management permission is enforced in the backend (documentation
 *  shown in the permission detail view; the enforcement itself lives in
 *  server.ts `requirePermission` / handler gates). */
const PERMISSION_ENFORCEMENT: Record<string, string> = {
  'users:view': 'GET /api/users (requirePermission)',
  'users:create': 'POST /api/users (requirePermission)',
  'users:update': 'PATCH /api/users/:id (requirePermission)',
  'users:suspend': 'POST /api/admin/users/:id/account (requirePermission)',
  'users:delete': 'DELETE /api/users/:id (requirePermission)',
  'roles:view': 'GET /api/roles (requirePermission)',
  'roles:update': 'PATCH /api/roles/:id (requirePermission + re-auth)',
  'roles:assign': 'POST /api/users/:id/role (requirePermission + re-auth)',
  'permissions:view': 'GET /api/permissions (requirePermission)',
  'permissions:assign': 'PATCH /api/roles/:id (roles:update gateway)',
  'sessions:manage': 'GET /api/admin/sessions · DELETE /api/auth/sessions/:userId (requirePermission)',
  'restaurants:view': 'GET /api/vendors (admin path gate)',
  'restaurants:approve': 'PATCH /api/vendors/:id (admin status/verification gate)',
  'restaurants:suspend': 'PATCH /api/vendors/:id (admin status gate)',
  'restaurants:delete': 'DELETE /api/vendors/:id (requirePermission)',
  'riders:view': 'GET /api/riders (admin path gate)',
  'riders:approve': 'PATCH /api/riders/:id (admin gate)',
  'orders:view': 'GET /api/orders (admin path gate)',
  'orders:manage': 'PATCH /api/orders/:id/status (admin gate)',
  'deliveries:view': 'GET /api/orders (admin path gate)',
  'deliveries:assign': 'POST /api/orders/:id/assign-rider (admin gate)',
  'announcements:publish': 'POST /api/announcements (requirePermission)',
  'payments:view': 'GET /api/transactions · GET /api/payments (requirePermission)',
  'payments:configure': 'PATCH /api/payment-gateways/:id (requirePermission + re-auth)',
  'database:view': 'GET /api/system/backups (requirePermission)',
  'database:backup': 'POST /api/system/backup (requirePermission)',
  'database:restore': 'POST /api/system/restore (requirePermission)',
  'api:view': 'GET /api/system/health (requirePermission)',
  'reports:view': 'GET /api/admin/reports · GET /api/rider-earnings (requirePermission)',
  'settings:update': 'PUT /api/platform/settings (requirePermission + re-auth)',
  'security:view': 'GET /api/audit/summary (requirePermission)',
  'security:manage': 'POST /api/auth/admin/* (requirePermission)',
  'audit:view': 'GET /api/audit (requirePermission)',
};

/** Human consequence sentence used in grant/revoke confirmations. */
function permissionConsequence(perm: string, granted: boolean): string {
  const meta = PERMISSION_META[perm as Permission];
  const action = granted ? 'will be able to' : 'will no longer be able to';
  return `Users with this role ${action} ${(meta?.description || 'perform this action').toLowerCase().replace(/\.$/, '')}.`;
}

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

function RiskBadge({ risk }: { risk: PermissionRisk }) {
  return <Badge variant="outline" className={cn('text-[9px] font-black uppercase px-2', RISK_STYLES[risk] || RISK_STYLES.low)}>{risk} risk</Badge>;
}

/** Access indicator that never relies on color alone: ✓ Allowed / — Denied. */
function AccessIndicator({ allowed }: { allowed: boolean }) {
  if (allowed) {
    return <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400" aria-label="Allowed"><CheckCircle className="w-4 h-4" /><span className="text-[10px] font-bold">Yes</span></span>;
  }
  return <span className="inline-flex items-center gap-1 text-gray-300 dark:text-slate-600" aria-label="Denied"><XCircle className="w-4 h-4" /><span className="text-[10px] font-bold">No</span></span>;
}

function DomainBadge({ domain }: { domain: string }) {
  const d = PERMISSION_DOMAINS.find(x => x.id === domain);
  const color: Record<string, string> = {
    IDENTITY: 'bg-blue-50 text-blue-700 border-blue-200',
    MARKETPLACE: 'bg-violet-50 text-violet-700 border-violet-200',
    OPERATIONS: 'bg-amber-50 text-amber-700 border-amber-200',
    FINANCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SYSTEM: 'bg-purple-50 text-purple-700 border-purple-200',
    SECURITY: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return <Badge variant="outline" className={cn('text-[9px] font-black uppercase px-2', color[domain] || 'bg-gray-50')}>{d?.label || domain}</Badge>;
}

/*
 * ------------------------------------------------------------
 * SHARED RE-AUTH CONFIRM DIALOG for RBAC changes
 * ------------------------------------------------------------
 */
function RbacConfirmDialog({ open, onClose, title, body, onConfirm, busy, error }: {
  open: boolean; onClose: () => void; title: string;   body: ReactNode;
  onConfirm: () => void; busy: boolean; error: string | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="rbac-confirm-title">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-purple-700 flex items-center justify-center text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 id="rbac-confirm-title" className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button onClick={busy ? undefined : onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none" aria-label="Close">×</button>
        </div>
        <div className="text-sm text-gray-600 dark:text-slate-300">{body}</div>
        {error && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={onConfirm} disabled={busy} className="bg-gradient-to-r from-rose-500 to-purple-700 text-white hover:opacity-90">
            {busy ? 'Applying…' : 'Confirm Change'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * PERMISSIONS MATRIX — governance console
 * ------------------------------------------------------------
 */
export function SuperAdminPermissionsPage() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('ALL');
  const [mobileRole, setMobileRole] = useState<string>(ROLE_ORDER[0]);
  const [detailPerm, setDetailPerm] = useState<Permission | null>(null);
  const [grant, setGrant] = useState<{ perm: string; role: string; add: boolean } | null>(null);
  const [grantPassword, setGrantPassword] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [lastRbacChange, setLastRbacChange] = useState<{ action: string; at: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      AdminService.getRoles(),
      AdminService.getPermissions(),
      AdminService.getAudit({ limit: 200 }),
    ]).then(([r, p, a]) => {
      setRoles(r?.roles || []);
      setUserCounts(r?.userCounts || {});
      setPerms(p?.permissions || []);
      const items = Array.isArray(a?.items) ? a.items : [];
      const rbac = items.find((e: any) =>
        /Role permissions updated|Role assigned|Super Admin access (granted|revoked)|User deleted/i.test(String(e.action))
      );
      setLastRbacChange(rbac ? { action: String(rbac.action), at: rbac.timestamp } : null);
    }).catch(() => { setRoles([]); setPerms([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rolePermsOf = (roleId: string): string[] => roles.find(r => r.id === roleId)?.permissions || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return perms.filter(p =>
      (domain === 'ALL' || p.domain === domain) &&
      (!q || p.id.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    );
  }, [perms, search, domain]);

  const grouped = useMemo(() => {
    return PERMISSION_DOMAINS.map(d => ({
      ...d,
      permissions: filtered.filter(p => p.domain === d.id),
    })).filter(g => g.permissions.length > 0);
  }, [filtered]);

  const grantRole = roles.find(r => r.id === grant?.role);
  const grantMeta = grant ? PERMISSION_META[grant.perm as Permission] : null;

  const openGrant = (perm: string, role: string, add: boolean) => {
    if (role === 'super-administrator') {
      showToast('Protected Role', 'The Super Admin role is fixed and cannot be modified.', 'warning');
      return;
    }
    setGrant({ perm, role, add });
    setGrantPassword('');
    setGrantError(null);
  };

  const confirmGrant = async () => {
    if (!grant) return;
    setGrantBusy(true);
    setGrantError(null);
    try {
      const current = new Set(rolePermsOf(grant.role));
      if (grant.add) current.add(grant.perm); else current.delete(grant.perm);
      await AdminService.updateRolePermissions(grant.role, Array.from(current), grantPassword || undefined);
      showToast(grant.add ? 'Permission Granted' : 'Permission Revoked',
        `${PERMISSION_META[grant.perm as Permission]?.label || grant.perm} ${grant.add ? 'granted to' : 'revoked from'} ${ROLE_LABELS[grant.role as Role]}.`, 'success');
      setGrant(null);
      load();
    } catch (e: any) {
      const msg = e?.message || 'Could not apply the permission change.';
      if (String(msg).toLowerCase().includes('re-authentication') || String(msg).toLowerCase().includes('password')) {
        setGrantError(msg);
      } else {
        showToast('Change Failed', msg, 'warning');
        setGrant(null);
      }
    } finally {
      setGrantBusy(false);
    }
  };

  const displayRoles = useMemo(() => roles.length ? ROLE_ORDER.filter(r => roles.some(x => x.id === r)) : [], [roles]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={KeyRound} title="Permissions Matrix"
        description="Role × permission governance. Every permission shown is enforced by the backend — granting or revoking a permission changes real API authorization immediately."
        count={`${perms.length} permissions`} />

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Roles</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Management Permissions</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{perms.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Super Admin</p><p className="text-2xl font-bold text-rose-600">{userCounts['super-administrator'] ?? 0} accounts</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Last RBAC change</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{lastRbacChange ? `${lastRbacChange.action}` : 'No changes yet'}</p>
          <p className="text-[10px] text-gray-400">{lastRbacChange ? new Date(lastRbacChange.at).toLocaleString() : '—'}</p>
        </CardContent></Card>
      </div>

      {/* Controls */}
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5 text-rose-500" /> Permission Governance</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search permission…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-56" />
            </div>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="w-40 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All domains</SelectItem>
                {PERMISSION_DOMAINS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Mobile: role selector drill-down */}
          <div className="lg:hidden space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Label className="text-xs font-bold text-gray-500">Role:</Label>
              <Select value={mobileRole} onValueChange={setMobileRole}>
                <SelectTrigger className="w-52 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {displayRoles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {grouped.map(g => (
              <Card key={g.id} className="rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50 dark:bg-slate-800/50 py-2.5">
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-500">{g.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {g.permissions.map(p => {
                    const allowed = rolePermsOf(mobileRole).includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-50 dark:border-slate-800 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.label}</p>
                          <p className="text-[10px] font-mono text-gray-400 truncate">{p.id}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <AccessIndicator allowed={allowed} />
                          <button
                            onClick={() => openGrant(p.id, mobileRole, !allowed)}
                            className={cn('text-[10px] font-black uppercase px-2.5 py-1 rounded-full border transition',
                              allowed
                                ? 'text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100'
                                : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100')}
                            aria-label={allowed ? `Revoke ${p.id}` : `Grant ${p.id}`}
                          >
                            {allowed ? 'Revoke' : 'Grant'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
            {grouped.length === 0 && <p className="text-center text-gray-400 py-8 italic">No permissions match your filters.</p>}
          </div>

          {/* Desktop: full matrix */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4 sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[280px]">Permission</th>
                  {displayRoles.map(r => (
                    <th key={r} className="py-3 px-3 text-center whitespace-nowrap">{ROLE_LABELS[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(g => (
                  <Fragment key={g.id}>
                    <tr className="bg-gray-50 dark:bg-slate-800/60">
                      <td colSpan={displayRoles.length + 1} className="py-1.5 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">{g.label}</td>
                    </tr>
                    {g.permissions.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-2 px-4 sticky left-0 bg-white dark:bg-slate-900">
                          <button onClick={() => setDetailPerm(p.id)} className="text-left group flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-700 dark:text-slate-300 group-hover:text-rose-600">{p.id}</span>
                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-rose-400" />
                          </button>
                        </td>
                        {displayRoles.map(r => {
                          const allowed = rolePermsOf(r).includes(p.id);
                          return (
                            <td key={r} className="py-2 px-3 text-center">
                              <button
                                onClick={() => openGrant(p.id, r, !allowed)}
                                disabled={r === 'super-administrator'}
                                className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                                title={r === 'super-administrator' ? 'Super Admin role is protected' : `${allowed ? 'Revoke' : 'Grant'} ${p.id} for ${ROLE_LABELS[r]}`}
                                aria-label={`${allowed ? 'Revoke' : 'Grant'} ${p.id} for ${ROLE_LABELS[r]}`}
                              >
                                <AccessIndicator allowed={allowed} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {grouped.length === 0 && (
                  <tr><td colSpan={displayRoles.length + 1} className="py-10 text-center text-gray-400 italic">No permissions match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            ✓ = allowed by the backend · × = denied. Cells are toggles for editable roles; the Super Admin role is immutable. Every change is confirmed, re-authenticated and audited.
          </p>
        </CardContent>
      </Card>

      {/* Permission detail */}
      {detailPerm && <PermissionDetail perm={detailPerm} roles={roles} onClose={() => setDetailPerm(null)} onToggle={openGrant} />}

      {/* Grant / revoke confirm + re-auth */}
      <RbacConfirmDialog
        open={!!grant}
        onClose={() => { if (!grantBusy) setGrant(null); }}
        title={`${grant?.add ? 'Grant' : 'Revoke'} ${grantMeta?.label || ''}`}
        busy={grantBusy}
        error={grantError}
        onConfirm={confirmGrant}
        body={
          grant && grantMeta ? (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-black uppercase text-gray-400">Role</p>
                  <p className="font-bold text-gray-900 dark:text-white">{ROLE_LABELS[grant.role as Role]}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-black uppercase text-gray-400">Permission</p>
                  <p className="font-mono text-xs text-gray-900 dark:text-white">{grant.perm}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-gray-500">Current:</span>
                <AccessIndicator allowed={!grant.add} />
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-gray-500">New:</span>
                <AccessIndicator allowed={grant.add} />
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300">{permissionConsequence(grant.perm, grant.add)}</p>
              <div className="flex items-center gap-2">
                <RiskBadge risk={grantMeta.risk} />
                {grant.add && <span className="text-[10px] text-gray-400">Granting a permission expands what this role can do platform-wide.</span>}
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Label className="text-xs font-bold text-amber-700 dark:text-amber-300">Current password (re-authentication)</Label>
                <Input type="password" value={grantPassword} onChange={e => setGrantPassword(e.target.value)} placeholder="Enter your current password" className="mt-1.5 rounded-lg" autoFocus />
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Required for every RBAC change. The password is never stored.</p>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}

function PermissionDetail({ perm, roles, onClose, onToggle }: { perm: Permission; roles: any[]; onClose: () => void; onToggle: (perm: string, role: string, add: boolean) => void }) {
  const meta = PERMISSION_META[perm];
  const grantedRoles = roles.filter(r => (r.permissions || []).includes(perm));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-rose-600 dark:text-rose-400">{perm}</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{meta?.label}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none" aria-label="Close">×</button>
        </div>
        {meta && (
          <div className="flex flex-wrap items-center gap-2">
            <DomainBadge domain={meta.domain} />
            <RiskBadge risk={meta.risk} />
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-slate-300">{meta?.description}</p>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Granted to</p>
          <div className="flex flex-wrap gap-1.5">
            {grantedRoles.length === 0 && <span className="text-xs text-gray-400 italic">No role currently holds this permission</span>}
            {grantedRoles.map(r => (
              <button key={r.id} onClick={() => onToggle(perm, r.id, false)} title="Click to revoke"
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                {ROLE_LABELS[r.id as Role]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Backend enforcement</p>
          <p className="text-xs font-mono text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 break-words">{PERMISSION_ENFORCEMENT[perm] || 'Server-side requirePermission gate in server.ts'}</p>
        </div>
        {grantedRoles.filter(r => r.id !== 'super-administrator').length > 0 && (
          <Button variant="outline" className="w-full text-xs" onClick={() => { onToggle(perm, grantedRoles.find(r => r.id !== 'super-administrator')!.id, false); onClose(); }}>
            <XCircle className="w-4 h-4 mr-1.5" /> Revoke this permission from an editable role
          </Button>
        )}
      </div>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ROLES — role summary + detail + role assignment
 * ------------------------------------------------------------
 */
export function SuperAdminRolesPage() {
  const { showToast } = useApp();
  const [roles, setRoles] = useState<any[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [assign, setAssign] = useState<{ userId: string; role: string; password: string } | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [targetRole, setTargetRole] = useState<string>('administrator');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([AdminService.getRoles(), AdminService.getUsers()])
      .then(([r, u]) => {
        setRoles(r?.roles || []);
        setUserCounts(r?.userCounts || {});
        setUsers(Array.isArray(u) ? u : []);
      })
      .catch(() => { setRoles([]); setUsers([]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectedUser = assign ? users.find(u => u.id === assign.userId) : null;

  const confirmAssign = async () => {
    if (!assign) return;
    setAssignBusy(true);
    setAssignError(null);
    try {
      await AdminService.assignRole(assign.userId, assign.role, assign.password || undefined);
      showToast('Role Assigned', `${selectedUser?.displayName || selectedUser?.email || 'User'} changed to ${ROLE_LABELS[assign.role as Role]}.`, 'success');
      setAssign(null);
      load();
    } catch (e: any) {
      const msg = e?.message || 'Could not assign the role.';
      if (/re-auth|password/i.test(msg)) setAssignError(msg);
      else { showToast('Assignment Failed', msg, 'warning'); setAssign(null); }
    } finally {
      setAssignBusy(false);
    }
  };

  const accessLevel = (roleId: Role) => {
    if (roleId === 'super-administrator') return 'Global control';
    if (isAdminRole(roleId)) return 'Platform administration';
    if (roleId === 'rider') return 'Delivery operations';
    if (roleId === 'vendor' || roleId === 'vendor-staff' || roleId === 'store-manager') return 'Restaurant operations';
    return 'Marketplace customer';
  };

  const filteredUsers = users.filter(u =>
    !userSearch ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={UserCog} title="Roles" description="Every platform role, its scope, its effective permission set, and live user counts." count={`${roles.length} roles`} />

      {/* Role hierarchy summary */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5 text-rose-500" /> Role Hierarchy</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ROLE_ORDER.map(role => {
              const r = roles.find(x => x.id === role);
              return (
                <button key={role} onClick={() => r && setDetail(r)}
                  className="text-left p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition group">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900 dark:text-white">{ROLE_LABELS[role]}</p>
                    <Badge variant={role === 'super-administrator' ? 'brand' : 'outline'} className="text-[9px] font-black uppercase">{accessLevel(role)}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ROLE_DESCRIPTIONS[role]}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    <span>{userCounts[role] ?? 0} users</span>
                    <span className="flex items-center gap-0.5">{(r?.permissionCount ?? 0)} management perms</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 opacity-0 group-hover:opacity-100 transition">View details <ChevronRight className="w-3 h-3" /></span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">Restaurant Staff and Restaurant Manager are distinct roles with distinct permission sets — they share a display family but are never merged or duplicated.</p>
        </CardContent>
      </Card>

      {/* Role assignment */}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCog className="w-5 h-5 text-violet-500" /> Assign a Role</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
            <div>
              <Label className="text-xs font-bold text-gray-500">User</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search user…" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 rounded-lg" />
              </div>
              <div className="mt-1.5 max-h-40 overflow-y-auto border border-gray-100 dark:border-slate-700 rounded-lg">
                {filteredUsers.slice(0, 30).map(u => (
                  <button key={u.id} onClick={() => setAssign(a => ({ userId: u.id, role: a?.role ?? targetRole, password: a?.password ?? '' }))}
                    className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-800', assign?.userId === u.id && 'bg-rose-50 dark:bg-rose-900/20')}>
                    <span className="font-medium text-gray-800 dark:text-slate-200">{u.displayName || u.firstName || 'Unnamed'}</span>
                    <span className="text-gray-400"> · {ROLE_LABELS[u.role as Role] || u.role}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-500">New role</Label>
              <Select value={targetRole} onValueChange={v => { setTargetRole(v); setAssign(a => a ? { ...a, role: v } : a); }}>
                <SelectTrigger className="mt-1.5 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_ORDER.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button disabled={!assign?.userId} onClick={() => setAssign(a => ({ userId: a!.userId, role: targetRole, password: '' }))}
                className="rounded-lg bg-gradient-to-r from-rose-500 to-purple-700 text-white hover:opacity-90 w-full">
                Review Change
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-gray-400">{detail.id}</p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{ROLE_LABELS[detail.id as Role]}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[detail.id as Role]}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={detail.id === 'super-administrator' ? 'brand' : 'outline'}>{accessLevel(detail.id)}</Badge>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none" aria-label="Close">×</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-[10px] font-black uppercase text-gray-400">Account type</p>
                <p className="font-bold text-gray-900 dark:text-white">{ROLE_ACCOUNT_TYPES[detail.id as Role]}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-[10px] font-black uppercase text-gray-400">Users</p>
                <p className="font-bold text-gray-900 dark:text-white">{userCounts[detail.id] ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <p className="text-[10px] font-black uppercase text-gray-400">Status</p>
                <p className="font-bold text-gray-900 dark:text-white">{detail.isProtected ? 'Protected (fixed)' : 'Editable'}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Management permissions ({detail.permissions.length})</p>
              {detail.permissions.length === 0 ? (
                <p className="text-xs text-gray-400 italic">This role holds no management permissions. It operates within its own marketplace workflow only.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {(detail.permissions as string[]).map((p: string) => (
                    <div key={p} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                      <span className="font-mono text-[10px] text-gray-700 dark:text-slate-300">{p}</span>
                      <RiskBadge risk={PERMISSION_META[p as Permission]?.risk || 'low'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {detail.selfServicePermissions && detail.selfServicePermissions.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Marketplace self-service ({detail.selfServicePermissions.length})</p>
                <p className="text-xs text-gray-500">Self-service capabilities for the role's own workflow: <span className="font-mono">{detail.selfServicePermissions.join(', ')}</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role assignment confirm + re-auth */}
      <RbacConfirmDialog
        open={!!assign}
        onClose={() => { if (!assignBusy) setAssign(null); }}
        title="Change Role Assignment"
        busy={assignBusy}
        error={assignError}
        onConfirm={confirmAssign}
        body={
          assign ? (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-2 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-black uppercase text-gray-400">User</p>
                  <p className="font-bold text-gray-900 dark:text-white truncate">{selectedUser?.displayName || selectedUser?.email || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-black uppercase text-gray-400">Current role</p>
                  <p className="font-bold text-gray-900 dark:text-white">{ROLE_LABELS[selectedUser?.role as Role] || selectedUser?.role || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <p className="text-[10px] font-black uppercase text-rose-400">New role</p>
                  <p className="font-bold text-rose-600 dark:text-rose-300">{ROLE_LABELS[assign.role as Role]}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300">
                <span className="font-bold">{ROLE_LABELS[selectedUser?.role as Role] || 'Current'}</span> will become <span className="font-bold">{ROLE_LABELS[assign.role as Role]}</span>.
                The account type is synced to the role and all of the user's sessions will be terminated so the new role takes effect on next sign-in.
                {assign.role === 'super-administrator' && <span className="font-bold text-rose-600 dark:text-rose-400"> This grants unrestricted platform control — confirm carefully.</span>}
              </p>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Label className="text-xs font-bold text-amber-700 dark:text-amber-300">Current password (re-authentication)</Label>
                <Input type="password" value={assign.password} onChange={e => setAssign(a => a ? { ...a, password: e.target.value } : a)} placeholder="Enter your current password" className="mt-1.5 rounded-lg" autoFocus />
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Required for every role assignment. The password is never stored.</p>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
