import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, ShieldCheck, ShieldAlert, KeyRound, Lock, Users, Search,
  XCircle, UserCog, ChevronRight, CheckCircle2, Layers
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import {
  PERMISSION_DOMAINS, ROLE_ORDER, ROLE_LABELS, ROLE_DESCRIPTIONS,
  isAdminRole, type Role
} from '@/src/lib/auth/types';
import { cn } from '@/src/lib/utils';
import {
  AdminPageHeader, AdminCard, AdminBadge,
  AdminStatCard, AdminLoading, AdminModal, AdminError
} from '@/src/components/super-admin/AdminDesignSystem';

/*
 * ------------------------------------------------------------
 * PERMISSIONS MATRIX
 * ------------------------------------------------------------
 */
export function SuperAdminPermissionsPage() {
  const { showToast } = useApp();
  const [roles, setRoles] = useState<any[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('ALL');
  const [grant, setGrant] = useState<{ perm: string; role: string; add: boolean } | null>(null);
  const [grantPassword, setGrantPassword] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      AdminService.getRoles(),
      AdminService.getPermissions(),
    ]).then(([r, p]) => {
      setRoles(r?.roles || []);
      setUserCounts(r?.userCounts || {});
      setPerms(p?.permissions || []);
    }).catch((e: any) => { setRoles([]); setPerms([]); setLoadError(e?.message || 'Could not load the authorization matrix.'); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rolePermsOf = (roleId: string): string[] => roles.find(r => r.id === roleId)?.permissions || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return perms.filter(p =>
      (domain === 'ALL' || p.domain === domain) &&
      (!q || p.id.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
    );
  }, [perms, search, domain]);

  const grouped = useMemo(() => {
    return PERMISSION_DOMAINS.map(d => ({
      ...d,
      permissions: filtered.filter(p => p.domain === d.id),
    })).filter(g => g.permissions.length > 0);
  }, [filtered]);

  const openGrant = (perm: string, role: string, add: boolean) => {
    if (role === 'super-administrator') {
      showToast('Protected Access', 'The Super Admin policy is immutable.', 'warning');
      return;
    }
    setGrant({ perm, role, add });
    setGrantPassword('');
    setGrantError(null);
  };

  const confirmGrant = async () => {
    if (!grant) return;
    setGrantBusy(true);
    try {
      const current = new Set(rolePermsOf(grant.role));
      if (grant.add) current.add(grant.perm); else current.delete(grant.perm);
      await AdminService.updateRolePermissions(grant.role, Array.from(current), grantPassword);
      showToast('Policy Updated', 'Authorization levels modified successfully.', 'success');
      setGrant(null);
      load();
    } catch (e: any) {
      setGrantError(e?.message || 'Access denied.');
    } finally {
      setGrantBusy(false);
    }
  };

  if (loading) return <AdminLoading message="Reading authorization matrices..." />;
  if (loadError && !roles.length && !perms.length) return <AdminError message="Unable to load the authorization matrix." detail={loadError} retry={load} />;

  const displayRoles = ROLE_ORDER.filter(r => roles.some(x => x.id === r));

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={KeyRound}
        title="Permission Governance"
        description="Unified RBAC matrix for governing management access and cross-domain operational permissions."
        stats={<AdminBadge status="info" label={`${perms.length} Auth Nodes`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <AdminStatCard label="Governance Roles" value={roles.length} icon={Shield} status="info" />
         <AdminStatCard label="Auth Gateways" value={perms.length} icon={Lock} status="success" />
         <AdminStatCard label="Privileged Root" value={userCounts['super-administrator'] || 0} icon={UserCog} status="error" />
         <AdminStatCard label="Active Policies" value={displayRoles.length} icon={Layers} status="info" />
      </div>

      <AdminCard title="Authorization Matrix" icon={ShieldCheck} noPadding>
         <div className="p-4 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-2/30">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
              <Input placeholder="Search gateways..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-xs rounded-xl" />
            </div>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="h-10 text-xs rounded-xl w-48"><SelectValue placeholder="Domain" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Domains</SelectItem>
                {PERMISSION_DOMAINS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-line bg-surface-2/50">
                     <th className="px-6 py-4 text-[10px] font-black text-ink-3 uppercase tracking-widest sticky left-0 bg-surface z-10 min-w-[240px]">Permission Gateway</th>
                     {displayRoles.map(r => (
                        <th key={r} className="px-4 py-4 text-[9px] font-black text-ink-3 uppercase text-center">{ROLE_LABELS[r]}</th>
                     ))}
                  </tr>
               </thead>
               <tbody className="divide-y divide-line">
                  {grouped.map(g => (
                    <Fragment key={g.id}>
                       <tr className="bg-surface-2/40">
                          <td colSpan={displayRoles.length + 1} className="px-6 py-2 text-[9px] font-black text-ink-3 uppercase tracking-[0.2em]">{g.label}</td>
                       </tr>
                       {g.permissions.map(p => (
                         <tr key={p.id} className="group hover:bg-surface-2/20 transition-colors">
                            <td className="px-6 py-3 sticky left-0 bg-surface group-hover:bg-surface-2 transition-colors">
                               <div className="text-[10px] font-mono font-bold text-ink uppercase">{p.id}</div>
                               <div className="text-[9px] text-ink-3 font-bold uppercase truncate max-w-xs">{p.label}</div>
                            </td>
                            {displayRoles.map(r => {
                               const allowed = rolePermsOf(r).includes(p.id);
                               return (
                                 <td key={r} className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => openGrant(p.id, r, !allowed)}
                                      disabled={r === 'super-administrator'}
                                      className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all',
                                        allowed ? 'text-emerald-500 bg-emerald-50' : 'text-surface-3 bg-surface-2',
                                        r !== 'super-administrator' && 'hover:scale-110 active:scale-95'
                                      )}
                                    >
                                       {allowed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    </button>
                                 </td>
                               );
                            })}
                         </tr>
                       ))}
                    </Fragment>
                  ))}
               </tbody>
            </table>
         </div>
      </AdminCard>

      {grant && (
         <AdminModal
            open
            onClose={() => !grantBusy && setGrant(null)}
            icon={ShieldAlert}
            title="Policy Amendment"
            subtitle={grant.add ? 'Granting Access' : 'Revoking Access'}
            footer={
               <>
                  <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={grantBusy} onClick={() => setGrant(null)}>Abort</Button>
                  <Button onClick={confirmGrant} disabled={grantBusy} className="flex-1 h-11 rounded-xl text-xs font-semibold">
                     {grantBusy ? 'Applying…' : 'Confirm Change'}
                  </Button>
               </>
            }
         >
            <p className="text-xs text-ink-3 leading-relaxed font-medium">
               You are modifying authorization for <b className="text-ink">{ROLE_LABELS[grant.role as Role]}</b>. This change will be applied to all accounts with this role immediately.
            </p>
            <div className="p-4 rounded-2xl bg-surface-2 border border-line font-mono text-[10px] text-ink uppercase font-bold">
               {grant.perm}
            </div>
            <div className="space-y-2">
               <Label className="block text-xs font-semibold text-ink-3">Identity Authorization</Label>
               <Input type="password" value={grantPassword} onChange={e => setGrantPassword(e.target.value)} className="h-11 rounded-xl text-sm" placeholder="Enter your password" />
            </div>
            {grantError && <p className="text-[10px] font-bold text-danger uppercase">{grantError}</p>}
         </AdminModal>
      )}
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ROLES & PERMISSIONS (combined)
 * ------------------------------------------------------------
 */
export function SuperAdminRolesPermissionsPage() {
  const [tab, setTab] = useState<'roles' | 'permissions'>('roles');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <AdminPageHeader
          icon={ShieldCheck}
          title="Roles & Permissions"
          description="Manage role definitions and the authorization matrix from one place."
        />
      </div>
      <div className="flex rounded-xl border border-line bg-surface-2/60 p-0.5 w-fit">
        {(['roles', 'permissions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-[10px] px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${tab === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}>
            {t === 'roles' ? 'Roles' : 'Permissions'}
          </button>
        ))}
      </div>
      {tab === 'roles' ? <SuperAdminRolesPage /> : <SuperAdminPermissionsPage />}
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ROLES
 * ------------------------------------------------------------
 */
export function SuperAdminRolesPage() {
  const { showToast } = useApp();
  const [roles, setRoles] = useState<any[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([AdminService.getRoles(), AdminService.getUsers()])
      .then(([r, u]) => {
        setRoles(r?.roles || []);
        setUserCounts(r?.userCounts || {});
        setUsers(Array.isArray(u) ? u : []);
      })
      .catch((e: any) => { setRoles([]); setUsers([]); setLoadError(e?.message || 'Could not load the role registry.'); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <AdminLoading message="Retrieving role registry..." />;
  if (loadError && !roles.length) return <AdminError message="Unable to load the role registry." detail={loadError} retry={load} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={UserCog}
        title="Role Registry"
        description="Unified management of system roles, hierarchical scopes, and user assignment policies."
        stats={<AdminBadge status="info" label={`${roles.length} Active Roles`} />}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
         {ROLE_ORDER.map(role => {
           const r = roles.find(x => x.id === role);
           const isAdmin = isAdminRole(role);
           return (
             <AdminCard key={role} title={ROLE_LABELS[role]} subtitle={role} icon={isAdmin ? ShieldCheck : Users}>
                <div className="space-y-4">
                   <p className="text-xs text-ink-3 leading-relaxed font-medium line-clamp-2">{ROLE_DESCRIPTIONS[role]}</p>
                   <div className="flex items-center justify-between pt-4 border-t border-line">
                      <div className="flex items-center gap-4">
                         <div className="text-center">
                            <p className="text-sm font-black text-ink">{userCounts[role] || 0}</p>
                            <p className="text-[9px] font-black text-ink-3 uppercase tracking-widest">Users</p>
                         </div>
                         <div className="text-center">
                            <p className="text-sm font-black text-ink">{r?.permissionCount || 0}</p>
                            <p className="text-[9px] font-black text-ink-3 uppercase tracking-widest">Nodes</p>
                         </div>
                      </div>
                      <Link to="/super-admin/permissions">
                         <Button size="sm" variant="ghost" className="h-8 text-[11px] font-semibold tracking-widest">Manage <ChevronRight className="w-3 h-3 ml-1" /></Button>
                      </Link>
                   </div>
                </div>
             </AdminCard>
           );
         })}
      </div>

      <AdminCard title="Identity Assignment" icon={UserCog}>
         <div className="p-4 rounded-2xl bg-surface-2 border border-line flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Users className="w-6 h-6" /></div>
               <div>
                  <h3 className="text-xs font-black text-ink uppercase tracking-widest">Reassign Platform Roles</h3>
                  <p className="text-[10px] text-ink-3 font-medium">Modify authorization levels for individual platform identities.</p>
               </div>
            </div>
<Link to="/super-admin/users">
                  <Button className="h-10 px-6 rounded-xl text-sm font-semibold bg-primary text-white shadow-lg shadow-primary/20">Go to Directory</Button>
               </Link>
         </div>
      </AdminCard>
    </div>
  );
}
