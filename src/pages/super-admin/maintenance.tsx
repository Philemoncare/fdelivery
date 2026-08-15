import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, CalendarClock, PlayCircle, XCircle, CheckCircle2, Clock,
  Timer, RefreshCw, Plus, Send, Server, Users, Loader2, Pencil, Trash2, ArrowLeftRight, ShieldCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Skeleton } from '@/src/components/ui/skeleton';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import { cn } from '@/src/lib/utils';

const SERVICES = ['Marketplace', 'Checkout', 'Orders', 'Rider Operations', 'Vendor Portal'];
const USER_GROUPS = ['all', 'customers', 'vendors', 'riders', 'administrators', 'super-administrators'];
const USER_GROUP_LABELS: Record<string, string> = {
  all: 'All users', customers: 'Customers', vendors: 'Vendors', riders: 'Riders',
  administrators: 'Admins', 'super-administrators': 'Super Admins',
};
const TIMING_OPTIONS = ['start', '1h', '6h', '12h', '24h', 'immediate'];
const TIMING_LABELS: Record<string, string> = {
  start: 'At start time', '1h': '1 hour before', '6h': '6 hours before',
  '12h': '12 hours before', '24h': '24 hours before', immediate: 'Immediate',
};

function fmt(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function toDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: any; dot: boolean }> = {
    scheduled: { label: 'Scheduled', variant: 'info', dot: true },
    warning: { label: 'Approaching', variant: 'warning', dot: true },
    active: { label: 'Active', variant: 'danger', dot: true },
    completed: { label: 'Completed', variant: 'success', dot: false },
    cancelled: { label: 'Cancelled', variant: 'default', dot: false },
  };
  const m = map[status] || { label: status, variant: 'default', dot: false };
  return <Badge variant={m.variant} dot={m.dot}>{m.label}</Badge>;
}

function Elapsed({ iso }: { iso?: string | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!iso || isNaN(new Date(iso).getTime())) return;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso || isNaN(new Date(iso).getTime())) return <span className="text-gray-400">—</span>;
  const ms = Math.max(0, Date.now() - new Date(iso).getTime());
  const m2 = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return <span className="tabular-nums text-emerald-600 font-semibold">{m2}:{String(s).padStart(2, '0')}</span>;
}

function Countdown({ to }: { to?: string | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!to || isNaN(new Date(to).getTime()) || new Date(to).getTime() <= Date.now()) return;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [to]);
  if (!to || isNaN(new Date(to).getTime())) return <span>—</span>;
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return <span className="text-gray-400">Now</span>;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m2 = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return <span className="tabular-nums text-warn font-semibold">{d}d {h}h {m2}m {s}s</span>;
}

interface ReauthDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  requiresAuth: boolean;
  current?: string;
  next?: string;
  busy: boolean;
  error?: string;
  children?: ReactNode;
  onConfirm: (password?: string) => void;
  onClose: () => void;
}

function ReauthDialog({ open, title, description, confirmLabel, busyLabel, requiresAuth, current, next, busy, error, children, onConfirm, onClose }: ReauthDialogProps) {
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) setPassword(''); }, [open]);
  if (!open) return null;
  const passwordValid = !requiresAuth || password.trim().length > 0;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true">
        <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">{description}</p>

        {(current !== undefined || next !== undefined) && (
          <div className="grid grid-cols-2 gap-2 my-4">
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Current</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mt-0.5">{current}</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
              <p className="text-[10px] uppercase tracking-wide text-amber-500">New</p>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mt-0.5">{next}</p>
            </div>
          </div>
        )}

        {children && <div className="mb-4">{children}</div>}

        {requiresAuth && (
          <div className="mb-4">
            <Label htmlFor="reauth-password-maint" className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
              Re-authentication required — enter your current password
            </Label>
            <Input id="reauth-password-maint" type="password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} placeholder="Your current password"
              className="rounded-lg" disabled={busy} autoFocus />
          </div>
        )}

        {error && <p className="text-xs text-rose-600 dark:text-rose-400 mb-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl" disabled={busy || !passwordValid} onClick={() => onConfirm(requiresAuth ? password : undefined)}>
            {busy ? (busyLabel || 'Applying…') : confirmLabel}
          </Button>
        </div>
        {requiresAuth && !passwordValid && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2">Current password is required to continue.</p>
        )}
      </div>
    </div>
  );
}


export function SuperAdminMaintenancePage() {
  const { showToast } = useApp();  const [windows, setWindows] = useState<any[]>([]);
  const [publicView, setPublicView] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{ title: string; description: ReactNode; confirmLabel: string; busyLabel?: string; requiresAuth: boolean; current?: string; next?: string; children?: ReactNode; action: (pw?: string) => Promise<void> } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const load = useCallback(async () => {
    const [wRes, pub] = await Promise.all([
      AdminService.getMaintenanceWindows().catch(() => null),
      AdminService.getMaintenanceStatus().catch(() => null),
    ]);
    setWindows(wRes?.items || []); setPublicView(pub);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try { await load(); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await load(); showToast('Refreshed', 'Maintenance windows refreshed from server.'); }
    catch { showToast('Refresh Failed', 'Unable to refresh maintenance windows.', 'warning'); }
    finally { setRefreshing(false); }
  }, [refreshing, load, showToast]);

  const ask = (cfg: { title: string; description: ReactNode; confirmLabel?: string; busyLabel?: string; requiresAuth?: boolean; current?: string; next?: string; children?: ReactNode; action: (pw?: string) => Promise<void> }) => {
    setConfirmError('');
    setConfirm({ title: cfg.title, description: cfg.description, confirmLabel: cfg.confirmLabel || 'Confirm', busyLabel: cfg.busyLabel, requiresAuth: cfg.requiresAuth !== false, current: cfg.current, next: cfg.next, children: cfg.children, action: cfg.action });
  };

  const confirmSubmit = async (pw?: string) => {
    if (!confirm) return;
    setConfirmBusy(true); setConfirmError('');
    try {
      await confirm.action(pw);
      setConfirm(null);
      await load();
    } catch (e: any) {
      setConfirmError(e?.message || 'Unable to apply this change. No changes were made.');
    } finally { setConfirmBusy(false); }
  };

  const doNotify = async (w: any) => {
    setBusyId(w.id);
    try {
      const res = await AdminService.resendMaintenanceNotification(w.id, 'scheduled');
      showToast('Notification', res.already ? 'Notification already sent — no duplicates.' : `Notification sent to ${res.sent} user${res.sent === 1 ? '' : 's'}.`);
      await load();
    } catch (e: any) { showToast('Error', e?.message || 'Unable to send notification.', 'warning'); }
    finally { setBusyId(null); }
  };

  const active = windows.find(w => w.status === 'active');

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br bg-primary">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Maintenance Management</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">Schedule, run and notify users about planned or emergency maintenance across OmniMarket services.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />Refresh
          </Button>
          <Button className="rounded-xl" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Schedule Maintenance
          </Button>
        </div>
      </motion.div>

      <Card className="rounded-2xl" hover={false}>
        <CardContent className="pt-5">
          {loading ? (
            <div className="flex flex-wrap gap-4"><Skeleton className="h-10 w-40" /><Skeleton className="h-10 w-64" /></div>
          ) : publicView ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                publicView.status === 'active' ? 'bg-danger-soft text-danger' : publicView.status === 'warning' ? 'bg-warn-soft text-warn' : 'bg-info-soft text-info')}>
                {publicView.status === 'active' ? <ShieldCheck className="w-4 h-4" /> : publicView.status === 'warning' ? <Clock className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
                {publicView.status === 'active' ? 'Maintenance ACTIVE — marketplace gated' : publicView.status === 'warning' ? 'Maintenance approaching' : 'Maintenance scheduled next'}
              </div>
              <div className="text-sm text-gray-700 dark:text-slate-200 font-medium">{publicView.title}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">{fmt(publicView.scheduledStart)} → {fmt(publicView.scheduledEnd)}</div>
              {publicView.status === 'active' && (
                <div className="text-xs text-gray-500 dark:text-slate-400">Active for <Elapsed iso={(windows.find(w => w.id === publicView.id) as any)?.activatedAt || (windows.find(w => w.id === publicView.id) as any)?.scheduledStart} /></div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> No scheduled or active maintenance — platform fully operational.
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 w-full"><Skeleton className="h-32 w-full rounded-2xl" /></div>)}</div>
      ) : windows.length === 0 ? (
        <Card className="rounded-2xl border-dashed" hover={false}>
          <CardContent className="py-12 text-center">
            <CalendarClock className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-slate-200">No maintenance windows</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Schedule one to plan downtime and notify affected users in advance.</p>
            <Button className="rounded-xl mt-4" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Schedule Maintenance</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {windows.map(w => (
            <Card key={w.id} className="rounded-2xl" hover={false}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{w.title}</h3>
                      {statusBadge(w.status)}
                    </div>
                    {w.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{w.description}</p>}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-gray-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 opacity-70" />Start: <b>{fmt(w.scheduledStart)}</b></span>
                      <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 opacity-70" />End: <b>{fmt(w.scheduledEnd)}</b></span>
                      {w.status === 'warning' && <span className="inline-flex items-center gap-1.5"><Timer className="w-3.5 h-3.5 opacity-70" />Starts in <Countdown to={w.scheduledStart} /></span>}
                      {w.status === 'active' && <span className="inline-flex items-center gap-1.5"><Timer className="w-3.5 h-3.5 opacity-70" />Ends in <Countdown to={w.scheduledEnd} /></span>}
                      <span className="inline-flex items-center gap-1.5"><Server className="w-3.5 h-3.5 opacity-70" />{(w.affectedServices || []).join(', ')}</span>
                    </div>
                    <p className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                      <Users className="w-3.5 h-3.5 opacity-70" />Notify: {(w.affectedUserTypes || []).map(t => USER_GROUP_LABELS[t] || t).join(', ')} · {TIMING_LABELS[w.notificationTiming] || w.notificationTiming || 'At start time'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {(w.status === 'scheduled' || w.status === 'warning') && (
                      <>
                        <Button variant="outline" size="sm" className="rounded-lg" title="Edit scheduled maintenance" onClick={() => setFormOpen(true)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" className="rounded-lg" disabled={busyId === w.id} onClick={() => ask({ title: 'Start Maintenance Now', description: 'Maintenance mode will be enabled immediately and marketplace access gated for non-administrative users. A start notification is sent to affected users.', confirmLabel: 'Start Now', busyLabel: 'Starting…', requiresAuth: true, action: async (pw) => { await AdminService.activateMaintenanceWindow(w.id, pw!); } })}>
                          <PlayCircle className="w-3.5 h-3.5 mr-1.5" />Start
                        </Button>
                      </>
                    )}
                    {w.status === 'active' && (
                      <>
                        <Button variant="outline" size="sm" className="rounded-lg" disabled={busyId === w.id} onClick={() => ask({ title: 'Extend Maintenance', description: 'Choose a new end time later than the current end. Affected users are not re-notified.', confirmLabel: 'Extend', busyLabel: 'Extending…', requiresAuth: true, current: fmt(w.scheduledEnd), action: async (pw) => { const d = new Date(); d.setHours(d.getHours() + 1); await AdminService.extendMaintenanceWindow(w.id, d.toISOString(), pw!); } })}>
                          <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />Extend
                        </Button>
                        <Button size="sm" className="rounded-lg" disabled={busyId === w.id} onClick={() => ask({ title: 'Complete Maintenance', description: 'Mark this maintenance as complete. Marketplace access is restored immediately and a completion notification is sent.', confirmLabel: 'Complete', busyLabel: 'Completing…', requiresAuth: true, action: async (pw) => { await AdminService.completeMaintenanceWindow(w.id, pw!); } })}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />End
                        </Button>
                      </>
                    )}
                    {(w.status === 'scheduled' || w.status === 'warning' || w.status === 'active') && (
                      <Button variant="outline" size="sm" className="rounded-lg" disabled={busyId === w.id} onClick={() => doNotify(w)}><Send className="w-3.5 h-3.5 mr-1.5" /></Button>
                    )}
                    {(w.status === 'scheduled' || w.status === 'warning') && (
                      <Button variant="danger" size="sm" className="rounded-lg" disabled={busyId === w.id} title="Cancel maintenance" onClick={() => ask({ title: 'Cancel Maintenance', description: 'This maintenance window will be cancelled. Affected users are notified and any active maintenance mode is lifted.', confirmLabel: 'Cancel', busyLabel: 'Cancelling…', requiresAuth: true, action: async (pw) => { await AdminService.cancelMaintenanceWindow(w.id, pw!); } })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScheduleForm open={formOpen} onClose={() => setFormOpen(false)} onCreated={async () => { setFormOpen(false); await load(); showToast('Scheduled', 'Maintenance window scheduled and audited.'); }} showToast={showToast} />

      <ReauthDialog
        open={!!confirm}
        title={confirm?.title || ''}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel || 'Confirm'}
        busyLabel={confirm?.busyLabel}
        requiresAuth={!!confirm?.requiresAuth}
        current={confirm?.current}
        next={confirm?.next}
        children={confirm?.children}
        busy={confirmBusy}
        error={confirmError}
        onConfirm={confirmSubmit}
        onClose={() => !confirmBusy && setConfirm(null)}
      />
    </div>
  );
}

function ScheduleForm({ open, onClose, onCreated, showToast }: { open: boolean; onClose: () => void; onCreated: () => void; showToast: (title: string, desc: string, type?: 'success' | 'info' | 'warning') => void; }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [services, setServices] = useState<string[]>(['Marketplace', 'Checkout', 'Orders']);
  const [userTypes, setUserTypes] = useState<string[]>(['all']);
  const [timing, setTiming] = useState('start');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwOpen, setPwOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(''); setDescription(''); setStart(''); setEnd('');
    setServices(['Marketplace', 'Checkout', 'Orders']); setUserTypes(['all']); setTiming('start');
    setErrors({}); setErr(''); setPwOpen(false); setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const d = new Date(); d.setHours(d.getHours() + 1); d.setMinutes(0, 0, 0);
    if (!start) setStart(toDatetimeLocal(d));
  }, [open, start]);

  const toggle = (list: string[], set: (v: string[]) => void, val: string) => set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const buildPayload = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!start) e.start = 'A start date/time is required.';
    if (!end) e.end = 'An end date/time is required.';
    if (start && end && new Date(end).getTime() <= new Date(start).getTime()) e.end = 'End time must be after start time.';
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      title: title.trim(), description: description.trim(),
      scheduledStart: start, scheduledEnd: end, timezone: 'UTC',
      affectedServices: services.length ? services : SERVICES.slice(),
      affectedUserTypes: userTypes.length ? userTypes : ['all'],
      notificationTiming: timing,
    };
  };

  const submit = async (pw?: string) => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true); setErr('');
    try {
      await AdminService.createMaintenanceWindow(payload, pw);
      onCreated();
    } catch (e: any) { setErr(e?.message || 'Unable to schedule maintenance.'); }
    finally { setBusy(false); setPwOpen(false); }
  };

  if (!open && !pwOpen) return null;

  if (pwOpen) {
    return (
      <ReauthDialog open title="Schedule Maintenance" description="This schedules a new maintenance window and will notify the selected users. Re-authentication is required." confirmLabel="Schedule Window" busyLabel="Scheduling…" requiresAuth busy={busy} error={err} onConfirm={submit} onClose={() => !busy && setPwOpen(false)} />
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => onClose()} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white">Schedule Maintenance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="m-title" className="text-xs font-semibold mb-1 block">Title *</Label>
            <Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scheduled database upgrade" className="rounded-lg" />
            {errors.title && <p className="text-[11px] text-rose-600 mt-1">{errors.title}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="m-desc" className="text-xs font-semibold mb-1 block">Description / reason</Label>
            <Textarea id="m-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What users should know…" className="rounded-lg" />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Start date/time *</Label>
            <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="rounded-lg" />
            {errors.start && <p className="text-[11px] text-rose-600 mt-1">{errors.start}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">End date/time *</Label>
            <Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="rounded-lg" />
            {errors.end && <p className="text-[11px] text-rose-600 mt-1">{errors.end}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Affected services</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(s => (
                <button key={s} type="button" onClick={() => toggle(services, setServices, s)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border',
                    services.includes(s) ? 'bg-primary-soft text-primary border-primary/40' : 'bg-surface text-gray-500 border-line')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Notify user groups</Label>
            <div className="flex flex-wrap gap-2">
              {USER_GROUPS.map(g => (
                <button key={g} type="button" onClick={() => toggle(userTypes, setUserTypes, g)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border',
                    userTypes.includes(g) ? 'bg-primary-soft text-primary border-primary/40' : 'bg-surface text-gray-500 border-line')}>
                  {USER_GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center gap-4 flex-wrap">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Timing notification</Label>
              <Select value={timing} onValueChange={setTiming}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {TIMING_OPTIONS.map(t => <SelectItem key={t} value={t}>{TIMING_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl" onClick={() => { if (buildPayload()) setPwOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Continue</Button>
        </div>
      </div>
    </div>
  );
}
