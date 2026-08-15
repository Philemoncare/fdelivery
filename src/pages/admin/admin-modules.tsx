import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Store, Star, ScrollText, Shield, UserCog, Search,
  Phone, Mail, BadgeCheck, MessageSquare, XCircle, CheckCircle, Filter,
  UserRound, Gift
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService, ReferralService } from '@/src/services/api';
import { ROLE_LABELS, ROLE_PERMISSIONS, type Role } from '@/src/lib/auth/types';
import { cn } from '@/src/lib/utils';

function PageHeader({ title, description, icon: Icon, count }: { title: string; description: string; icon: any; count?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between flex-wrap gap-4">
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600')}>
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
 * ------------------------------------------------------------
 * RESTAURANT MANAGERS — derived from real vendor ownership
 * ------------------------------------------------------------
 */
export function AdminManagersPage() {
  const { vendors } = useApp();
  const [search, setSearch] = useState('');

  const managers = useMemo(() => {
    return vendors.map(v => ({
      id: v.ownerId,
      vendorId: v.id,
      name: v.ownerId === v.id ? v.name : v.name,
      email: v.email,
      phone: v.phone,
      store: v.name,
      status: v.status,
      verified: v.verificationStatus === 'verified',
      joinedDate: v.joinedDate,
      totalOrders: v.totalOrders,
      rating: v.rating,
    })).filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.store.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));
  }, [vendors, search]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Store} title="Restaurant Managers" description="Account owners responsible for each restaurant on the platform (real vendor data)." count={`${managers.length} managers`} />
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><UserRound className="w-5 h-5 text-indigo-500" /> Management Directory</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by name, store, or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {managers.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No restaurant managers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Manager</th>
                    <th className="py-4 px-6">Restaurant</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Orders</th>
                    <th className="py-4 px-6">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
                            <UserRound className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                              {m.name} {m.verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />}
                            </div>
                            <div className="text-xs text-gray-500">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">{m.store}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6"><Badge variant={m.status === 'active' ? 'success' : 'warning'}>{m.status}</Badge></td>
                      <td className="py-3 px-6 font-bold">{m.totalOrders}</td>
                      <td className="py-3 px-6 font-bold">{m.rating} ★</td>
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
 * REVIEWS — real review data from context
 * ------------------------------------------------------------
 */
export function AdminReviewsPage() {
  const { reviews } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = reviews.filter(r => {
    if (filter === 'all') return true;
    if (filter === '5') return r.rating === 5;
    if (filter === 'low') return r.rating <= 3;
    return false;
  }).filter(r => !search || r.userName.toLowerCase().includes(search.toLowerCase()) || r.comment.toLowerCase().includes(search.toLowerCase()));

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Star} title="Reviews" description="Customer reviews across restaurants and meals on the platform." count={`${reviews.length} reviews`} />
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Reviews</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{reviews.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Average Rating</p><p className="text-2xl font-bold text-amber-500">{avg} ★</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-5 h-5 text-amber-500" /> Review Queue</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by author or content…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="below">5 star only</SelectItem>
                <SelectItem value="low">3 star &amp; below</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No reviews matched your criteria.</p>
          ) : filtered.map(r => (
            <div key={r.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center font-bold">
                    {r.userName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{r.userName}</p>
                    <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-4 h-4 ${n <= r.rating ? 'fill-amber-400' : 'fill-gray-200 dark:fill-slate-600 text-gray-200 dark:text-slate-600'}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">{r.comment}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ADMINISTRATORS — real RBAC roles
 * ------------------------------------------------------------
 */
export function AdminAdministratorsPage() {
  const { user } = useAuth();
  const adminRoles = (Object.keys(ROLE_LABELS) as Role[]).filter(r => r === 'administrator' || r === 'super-administrator');
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Users} title="Administrators" description="Administrative staff and their assigned roles (source: RBAC config)." count={`${adminRoles.length} admin roles`} />
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Admin Roles</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{adminRoles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Signed-in Account</p><p className="text-2xl font-bold text-blue-600">{user?.displayName || user?.email || '—'}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> Roles &amp; Permissions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adminRoles.map(role => (
              <div key={role} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-900 dark:text-white">{ROLE_LABELS[role]}</p>
                  <Badge variant={role === 'super-administrator' ? 'brand' : 'default'}>{ROLE_PERMISSIONS[role].length} perms</Badge>
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
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * AUDIT LOG
 * ------------------------------------------------------------
 */
export function AdminAuditLogPage() {
  const [audit, setAudit] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    AdminService.getAudit().then(r => setAudit(Array.isArray(r) ? r : (r?.items || []))).catch(() => setAudit([]));
  }, []);
  const types = Array.from(new Set(audit.map(e => e.entity)));
  const filtered = audit.filter(e => filter === 'all' || e.entity === filter);
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={ScrollText} title="Audit Log" description="Trail of administrative and security actions recorded on the server." count={`${audit.length} events`} />
      <Card className="rounded-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2"><ScrollText className="w-5 h-5 text-blue-500" /> Event Trail</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {types.map(a => <SelectItem key={String(a)} value={String(a)}>{String(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No audit events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Action</th>
                    <th className="py-4 px-6">Actor</th>
                    <th className="py-4 px-6">Resource</th>
                    <th className="py-4 px-6">Resource ID</th>
                    <th className="py-4 px-6">Result</th>
                    <th className="py-4 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6 font-medium capitalize">{e.action.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-6 text-sm">{e.actorName || '—'}</td>
                      <td className="py-3 px-6"><Badge variant="outline">{e.entity}</Badge></td>
                      <td className="py-3 px-6 font-mono text-xs text-gray-500">{e.entityId || '—'}</td>
                      <td className="py-3 px-6"><Badge variant={e.result === 'success' ? 'success' : 'danger'}>{e.result}</Badge></td>
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
 * REFERRAL AUDIT — who introduced whom, from the server trail
 * ------------------------------------------------------------
 */
export function AdminReferralsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => {
    ReferralService.getAll()
      .then(r => setRecords(Array.isArray(r) ? r : []))
      .catch(() => setRecords([]));
  }, []);

  const total = records.length;
  const approved = records.filter(r => (r.referredStatus || '').toLowerCase() === 'approved').length;
  const roles: string[] = Array.from(new Set(records.map(r => r.referredRole).filter((x): x is string => !!x)));

  const filtered = records.filter(r => {
    if (roleFilter !== 'all' && r.referredRole !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.referredEmail || '').toLowerCase().includes(q) ||
      (r.referredName || '').toLowerCase().includes(q) ||
      (r.referrerEmail || '').toLowerCase().includes(q) ||
      (r.referralCode || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Gift} title="Referrals" description="Every account created with a referral code — full audit trail of who referred whom." count={`${total} records`} />
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total referrals</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Approved signups</p><p className="text-2xl font-bold text-emerald-500">{approved}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2"><Gift className="w-5 h-5 text-amber-500" /> Referral Audit Trail</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search email, name, or code…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg w-64" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r as Role] || r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 italic">No referral activity recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Code</th>
                    <th className="py-4 px-6">Referrer</th>
                    <th className="py-4 px-6">Referred User</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6 font-mono text-xs font-bold text-gray-900 dark:text-white">{r.referralCode}</td>
                      <td className="py-3 px-6">
                        <p className="font-medium text-gray-900 dark:text-white">{r.referrerName || '—'}</p>
                        <p className="text-xs text-gray-500">{r.referrerEmail}</p>
                      </td>
                      <td className="py-3 px-6">
                        <p className="font-medium">{r.referredName || '—'}</p>
                        <p className="text-xs text-gray-500">{r.referredEmail}</p>
                      </td>
                      <td className="py-3 px-6"><Badge variant="outline">{ROLE_LABELS[r.referredRole as Role] || r.referredRole}</Badge></td>
                      <td className="py-3 px-6"><Badge variant={(r.referredStatus || '') === 'approved' ? 'success' : 'warning'}>{r.referredStatus || '—'}</Badge></td>
                      <td className="py-3 px-6 text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
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
