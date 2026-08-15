import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Megaphone, Send, CalendarClock, RefreshCw, Plus, Mail, Bell, Smartphone,
  Search, ChevronLeft, ChevronRight, Inbox, Eye, Users
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
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

const GROUPS = ['all', 'customers', 'vendors', 'riders', 'administrators'];
const GROUP_LABELS: Record<string, string> = {
  all: 'All users', customers: 'Customers', vendors: 'Vendors', riders: 'Riders', administrators: 'Admins',
};
const CHANNELS = ['In-app', 'Email', 'Push', 'SMS'];
const PRIORITIES = ['NORMAL', 'IMPORTANT', 'CRITICAL'];

function fmt(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: any }> = {
    scheduled: { label: 'Scheduled', variant: 'info' },
    processing: { label: 'Processing', variant: 'warning' },
    sent: { label: 'Sent', variant: 'success' },
    partially_sent: { label: 'Partially Sent', variant: 'warning' },
    failed: { label: 'Failed', variant: 'danger' },
  };
  const m = map[status] || { label: status, variant: 'default' };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function ChannelChip({ c }: { c: string; key?: string | number }) {
  const icon = c === 'Email' ? <Mail className="w-3 h-3" /> : c === 'In-app' ? <Bell className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />;
  const configured = c === 'In-app' || c === 'Email';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
      configured ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20' : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-slate-800 dark:border-slate-700')}
      title={configured ? `${c} channel available` : `${c} not configured`}>
      {icon}{c}
      {!configured && <span className="normal-case text-[9px]">· not configured</span>}
    </span>
  );
}

interface PwDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  busy: boolean;
  error?: string;
  onConfirm: (pw?: string) => void;
  onClose: () => void;
}
function PwDialog({ open, title, description, confirmLabel, busyLabel, busy, error, onConfirm, onClose }: PwDialogProps) {
  const [password, setPassword] = useState('');
  useEffect(() => { if (open) setPassword(''); }, [open]);
  if (!open) return null;
  const valid = password.trim().length > 0;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true">
        <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">{description}</p>
        <div className="mt-4">
          <Label htmlFor="pw-msg" className="text-xs font-semibold mb-1.5 block">Re-authentication required — enter your current password</Label>
          <Input id="pw-msg" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your current password" className="rounded-lg" disabled={busy} autoFocus />
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl" disabled={busy || !valid} onClick={() => onConfirm(password)}>
            {busy ? (busyLabel || 'Applying…') : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SuperAdminMessagesPage() {
  const { showToast } = useApp();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await AdminService.getPlatformMessages().catch(() => null);
    if (res) setList(res.items || []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => { try { await load(); } finally { if (active) setLoading(false); } })();
    return () => { active = false; };
  }, [load]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br bg-primary">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Platform Messaging</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">Send and schedule announcements to targeted user groups across in-app, email and other delivery channels.</p>
          </div>
        </div>
        <Button className="rounded-xl" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />New Message</Button>
      </motion.div>

      {loading ? (
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 w-full"><Skeleton className="h-24 w-full rounded-2xl" /></div>)}</div>
      ) : list.length === 0 ? (
        <Card className="rounded-2xl border-dashed" hover={false}>
          <CardContent className="py-12 text-center">
            <Inbox className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-slate-200">No platform messages yet</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Compose a message to reach customers, vendors or riders.</p>
            <Button className="rounded-xl mt-4" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />New Message</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map(m => (
            <Card key={m.id} className="rounded-2xl" hover={false}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-lg">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{m.subject}</h3>
                      {statusBadge(m.status)}
                      <Badge variant="brand">{m.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{m.message}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 opacity-70" />{GROUP_LABELS[m.recipientGroup] || m.recipientGroup}</span>
                      {m.scheduleAt && m.status === 'scheduled' && <span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 opacity-70" />Scheduled {fmt(m.scheduleAt)}</span>}
                      {m.sentAt && <span className="inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5 opacity-70" />Sent {fmt(m.sentAt)}</span>}
                      {typeof m.totalRecipients === 'number' && m.totalRecipients > 0 && <span><b>{m.totalRecipients}</b> recipients</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(m.deliveryChannels || ['In-app']).map((c: string) => <ChannelChip key={c} c={c} />)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MessageForm open={formOpen} onClose={() => setFormOpen(false)} onCreated={async () => { setFormOpen(false); await load(); }} showToast={showToast} />
    </div>
  );
}

const SEND_STEPS = [
  { key: 'verifying', label: 'Verifying access' },
  { key: 'preparing', label: 'Preparing message' },
  { key: 'processing', label: 'Processing recipients' },
  { key: 'inapp', label: 'Sending in-app notifications' },
  { key: 'email', label: 'Sending emails' },
  { key: 'auditing', label: 'Recording audit log' },
  { key: 'completed', label: 'Completed' },
];

function MessageForm({ open, onClose, onCreated, showToast }: { open: boolean; onClose: () => void; onCreated: () => void; showToast: (t: string, d: string, ty?: 'success' | 'info' | 'warning') => void; }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [group, setGroup] = useState('all');
  const [channels, setChannels] = useState<string[]>(['In-app', 'Email']);
  const [priority, setPriority] = useState('NORMAL');
  const [schedule, setSchedule] = useState('');
  const [preview, setPreview] = useState<{ recipients: number; channels: string[] } | null>(null);
  const [phase, setPhase] = useState<'form' | 'reauth' | 'progress'>('form');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pwError, setPwError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [op, setOp] = useState<{ id: string; correlation?: string; scheduled?: boolean } | null>(null);
  const [progressState, setProgressState] = useState<{ stage: string; startedAt?: string | null; completedAt?: string | null } | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [providers, setProviders] = useState<any>(null);
  const [finalStatus, setFinalStatus] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retryPwOpen, setRetryPwOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    setSubject(''); setMessage(''); setGroup('all'); setChannels(['In-app', 'Email']); setPriority('NORMAL');
    setSchedule(''); setPreview(null); setErrors({}); setErr(''); setPwError(''); setPhase('form');
    setBusy(false); setOp(null); setProgressState(null); setSummary(null); setProviders(null);
    setFinalStatus(null); setTimedOut(false); setRetryPwOpen(false); setRetrying(false);
  }, [open]);

  const toggleChannel = (c: string) => setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const runPreview = useCallback(async (g = group, ch = channels) => {
    try {
      const res = await AdminService.previewPlatformMessage({ recipientGroup: g, deliveryChannels: ch });
      setPreview({ recipients: res?.recipients ?? 0, channels: res?.channels || ch });
    } catch { setPreview({ recipients: 0, channels: ch }); }
  }, [group, channels]);

  useEffect(() => {
    if (open) { const t = setTimeout(() => runPreview(), 300); return () => clearTimeout(t); }
  }, [open, runPreview]);

  const buildPayload = () => {
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = 'Subject is required.';
    if (!message.trim()) e.message = 'Message content is required.';
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      subject: subject.trim(), message: message.trim(), recipientGroup: group,
      deliveryChannels: channels.length ? channels : ['In-app'], priority,
      scheduleAt: schedule || undefined,
    };
  };

  // Poll the real backend status until the send reaches a terminal state.
  // Returns the terminal status (or 'timeout') so callers can react accurately.
  const pollStatus = useCallback(async (id: string, attempts = 0): Promise<string | null> => {
    if (!mounted.current) return null;
    try {
      const s = await AdminService.getPlatformMessageStatus(id);
      if (!mounted.current) return null;
      const m = s?.message;
      setProgressState(s?.progress || m?.progress || { stage: 'processing' });
      setSummary(s?.summary || null);
      setProviders(s?.providers || null);
      const st = m?.status;
      if (st === 'sent' || st === 'partially_sent' || st === 'failed') {
        setFinalStatus(st); setBusy(false); return st;
      }
      if (attempts >= 200) { setTimedOut(true); setBusy(false); return 'timeout'; }
      await new Promise(r => setTimeout(r, 700));
      return pollStatus(id, attempts + 1);
    } catch (e: any) {
      if (!mounted.current) return null;
      if (e?.isTimeout || (e?.status && e.status >= 500)) {
        if (attempts >= 12) { setTimedOut(true); setBusy(false); return 'timeout'; }
      }
      await new Promise(r => setTimeout(r, 1000));
      return pollStatus(id, attempts + 1);
    }
  }, []);

  const submit = async (pw?: string) => {
    const payload = buildPayload();
    if (!payload) return;
    const clientRequestId = `pm-req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setErr(''); setPwError(''); setTimedOut(false); setFinalStatus(null); setSummary(null);
    setPhase('progress'); setProgressState({ stage: 'verifying' }); setBusy(true);
    try {
      const res = await AdminService.createPlatformMessage({ ...payload, clientRequestId }, pw);
      if (!mounted.current) return;
      const m = res?.message;
      const id = m?.id;
      if (res?.scheduled || m?.status === 'scheduled') {
        setOp({ id, scheduled: true }); setFinalStatus('scheduled'); setBusy(false);
        return;
      }
      if (!id) throw new Error('The server did not return a message id.');
      setOp({ id, correlation: res?.correlationId || clientRequestId });
      const st = await pollStatus(id);
      if (!mounted.current) return;
      if (st === 'timeout') setTimedOut(true);
    } catch (e: any) {
      if (!mounted.current) return;
      const msg = e?.message || 'Unable to send message.';
      if (e?.isTimeout) { setTimedOut(true); setBusy(false); return; }
      if (e?.status === 401 || /password|authentication|reauth/i.test(msg)) {
        setPwError(msg); setPhase('reauth'); setBusy(false); return;
      }
      if (e?.status === 409) {
        showToast('Duplicate Request', 'This message request is already being processed.', 'warning');
        onClose(); return;
      }
      setErr(msg); setPhase('form'); setBusy(false);
    }
  };

  const retryFailed = async (pw?: string) => {
    if (!op?.id || retrying) return;
    setRetrying(true); setRetryPwOpen(false); setTimedOut(false); setFinalStatus(null); setSummary(null);
    setPhase('progress'); setProgressState({ stage: 'verifying' }); setBusy(true);
    try {
      await AdminService.resendPlatformMessage(op.id, pw!);
      if (!mounted.current) return;
      const st = await pollStatus(op.id);
      if (!mounted.current) return;
      if (st === 'timeout') setTimedOut(true);
    } catch (e: any) {
      if (!mounted.current) return;
      const msg = e?.message || 'Unable to retry delivery.';
      if (e?.isTimeout) { setTimedOut(true); }
      else if (e?.status === 401 || /password|authentication|reauth/i.test(msg)) { setPwError(msg); setRetryPwOpen(true); }
      else showToast('Retry Failed', msg, 'warning');
      setBusy(false);
    } finally {
      setRetrying(false);
    }
  };

  const done = () => onCreated();
  const doneAndReport = () => { onCreated(); navigate('/super-admin/notifications'); };

  if (!open) return null;

  if (phase === 'reauth') {
    return (
      <PwDialog open title={schedule ? 'Schedule Message' : 'Send Message'} description={`${preview?.recipients ?? 0} recipient(s) will receive this via ${(channels.length ? channels : ['In-app']).join(', ')}. Re-authentication is required.`} confirmLabel={schedule ? 'Schedule Message' : 'Send Message'} busyLabel={schedule ? 'Scheduling…' : 'Sending…'} busy={busy} error={pwError || err} onConfirm={submit} onClose={() => !busy && setPhase('form')} />
    );
  }

  if (phase === 'progress') {
    const stage = progressState?.stage || 'processing';
    const stepIndex = SEND_STEPS.findIndex(s => s.key === stage);
    const running = !finalStatus && !timedOut;
    const delivered = summary?.delivered ?? 0;
    const failed = summary?.failed ?? 0;
    const total = summary?.totalRecipients ?? 0;
    const emailProv = providers?.email;

    if (running) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true">
            <h2 className="font-bold text-gray-900 dark:text-white">Sending Message</h2>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">Processing in real time — no artificial delays.</p>
            <ol className="mt-5 space-y-2.5">
              {SEND_STEPS.map((s, i) => {
                const done = stepIndex > i;
                const active = stepIndex === i;
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    {done ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">✓</span>
                    ) : active ? (
                      <span className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-gray-200 dark:border-slate-700" />
                    )}
                    <span className={cn('text-sm font-semibold', done ? 'text-emerald-600 dark:text-emerald-400' : active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500')}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 flex items-center justify-between gap-2">
              <button onClick={done} className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-slate-200">Close</button>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Do not refresh or resubmit</span>
            </div>
          </div>
        </div>
      );
    }

    if (timedOut) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true">
            <h2 className="font-bold text-amber-600 dark:text-amber-400">Request Timed Out</h2>
            <p className="text-sm text-gray-700 dark:text-slate-200 mt-2">Request timed out — the system could not confirm delivery.</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">The operation may still be running on the server. Check the delivery report or retry before sending again.</p>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="rounded-xl" onClick={done}>Close</Button>
              <Button className="rounded-xl" onClick={() => { setTimedOut(false); setBusy(true); pollStatus(op?.id || ''); }}>Retry</Button>
            </div>
          </div>
        </div>
      );
    }

    // Terminal states (success / partial / failed / scheduled)
    if (finalStatus === 'sent') {
      const emailSelected = channels.includes('Email');
      const emailNotCfg = (summary?.channels?.email?.notConfigured ?? 0) > 0 || providers?.email?.code === 'not_configured' || providers?.email?.code === 'disabled';
      return (
        <ResultDialog title="Message Sent Successfully" tone="success" onClose={done} onViewReport={doneAndReport}>
          <p className="text-sm text-gray-700 dark:text-slate-200">Recipients processed: <b className="text-gray-900 dark:text-white">{total}</b></p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {channels.includes('In-app') && <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">✓</span>In-app notifications delivered</li>}
            {emailSelected && !emailNotCfg && <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">✓</span>Emails delivered</li>}
            {emailSelected && emailNotCfg && <li className="flex items-center gap-2 text-amber-600 dark:text-amber-400"><span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-black">!</span>{providers?.email?.label === 'Disabled' ? 'Email is disabled' : 'Email is not configured'}</li>}
            <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">✓</span>Audit record created</li>
          </ul>
        </ResultDialog>
      );
    }

    if (finalStatus === 'scheduled') {
      return (
        <ResultDialog title="Message Scheduled" tone="success" onClose={done}>
          <p className="text-sm text-gray-700 dark:text-slate-200">The message was scheduled and will be sent automatically at the chosen time.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">✓</span>Audit record created</li>
          </ul>
        </ResultDialog>
      );
    }

    if (finalStatus === 'partially_sent') {
      return (
        <ResultDialog title="Message Partially Delivered" tone="warning" onClose={done} onViewReport={doneAndReport} extraActions={<Button className="rounded-xl" onClick={() => setRetryPwOpen(true)} disabled={retrying}><RefreshCw className="w-4 h-4 mr-1.5" />Retry Failed Deliveries</Button>}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Delivered</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{delivered} / {total}</p>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Failed</p>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{failed}</p>
            </div>
          </div>
          {(summary?.failedRecipients?.length > 0) && (
            <div className="mt-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Failed recipients</p>
              <div className="max-h-32 overflow-y-auto space-y-1.5">
                {summary.failedRecipients.map((f: any, i: number) => (
                  <div key={i} className="rounded-lg bg-gray-50 dark:bg-slate-800 px-3 py-2 text-xs">
                    <span className="font-bold text-gray-800 dark:text-slate-100">{f.name || f.email}</span>
                    <span className="text-gray-400 ml-2">— {f.reason || 'Delivery failed'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {emailProv?.code === 'not_configured' || emailProv?.code === 'disabled' ? (
            <p className="mt-4 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">Email is {emailProv.label.toLowerCase()}. In-app notifications were still delivered.</p>
          ) : null}
          {retryPwOpen && <PwDialog open title="Retry Failed Deliveries" description="Re-authentication is required to retry failed recipients." confirmLabel="Retry" busyLabel="Retrying…" busy={retrying} error={pwError} onConfirm={retryFailed} onClose={() => { if (!retrying) { setRetryPwOpen(false); setPwError(''); } }} />}
        </ResultDialog>
      );
    }

    return (
      <ResultDialog title="Message Failed" tone="danger" onClose={done} onViewReport={doneAndReport} extraActions={<Button className="rounded-xl" onClick={() => setRetryPwOpen(true)} disabled={retrying}><RefreshCw className="w-4 h-4 mr-1.5" />Retry</Button>}>
        <p className="text-sm text-gray-700 dark:text-slate-200"><b className="text-rose-600 dark:text-rose-400">{failed}</b> of <b>{total}</b> recipient(s) could not be reached.</p>
        {(summary?.failedRecipients?.length > 0) && (
          <div className="mt-4 max-h-32 overflow-y-auto space-y-1.5">
            {summary.failedRecipients.map((f: any, i: number) => (
              <div key={i} className="rounded-lg bg-gray-50 dark:bg-slate-800 px-3 py-2 text-xs">
                <span className="font-bold text-gray-800 dark:text-slate-100">{f.name || f.email}</span>
                <span className="text-gray-400 ml-2">— {f.reason || 'Delivery failed'}</span>
              </div>
            ))}
          </div>
        )}
        {retryPwOpen && <PwDialog open title="Retry Delivery" description="Re-authentication is required to retry failed recipients." confirmLabel="Retry" busyLabel="Retrying…" busy={retrying} error={pwError} onConfirm={retryFailed} onClose={() => { if (!retrying) { setRetryPwOpen(false); setPwError(''); } }} />}
      </ResultDialog>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white">New Platform Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold mb-1 block">Subject *</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Scheduled maintenance notice" className="rounded-lg" />
            {errors.subject && <p className="text-[11px] text-rose-600 mt-1">{errors.subject}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold mb-1 block">Message *</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Write your announcement…" className="rounded-lg" />
            {errors.message && <p className="text-[11px] text-rose-600 mt-1">{errors.message}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Recipient group</Label>
            <div className="flex flex-wrap gap-2">
              {GROUPS.map(g => (
                <button key={g} type="button" onClick={() => setGroup(g)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border', group === g ? 'bg-primary-soft text-primary border-primary/40' : 'bg-surface text-gray-500 border-line')}>
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Delivery channels</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(c => (
                <button key={c} type="button" onClick={() => toggleChannel(c)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border', channels.includes(c) ? (c === 'Push' || c === 'SMS' ? 'bg-warn-soft text-warn border-warn/40' : 'bg-primary-soft text-primary border-primary/40') : 'bg-surface text-gray-500 border-line')}>
                  {c}
                </button>
              ))}
            </div>
            {preview && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
                <b className="text-gray-700 dark:text-slate-200">{preview.recipients}</b> recipient(s) in scope
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Schedule (optional)</Label>
            <Input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} className="rounded-lg" />
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Leave empty to send immediately.</p>
          </div>
        </div>
        {err && <p className="text-xs text-rose-600 dark:text-rose-400 mt-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl" onClick={() => { if (buildPayload()) setPhase('reauth'); }}><Send className="w-4 h-4 mr-1.5" />{schedule ? 'Schedule' : 'Send'}</Button>
        </div>
      </div>
    </div>
  );
}

function ResultDialog({ title, tone, onClose, onViewReport, extraActions, children }: { title: string; tone: 'success' | 'warning' | 'danger'; onClose: () => void; onViewReport?: () => void; extraActions?: ReactNode; children: ReactNode }) {
  const toneColor = tone === 'success' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true">
        <h2 className={cn('font-bold', toneColor)}>{title}</h2>
        <div className="mt-3">{children}</div>
        <div className="flex justify-end gap-2 mt-6">
          {extraActions}
          {onViewReport && <Button variant="outline" className="rounded-xl" onClick={onViewReport}>View Delivery Report</Button>}
          <Button className="rounded-xl" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

const RECIPIENT_TYPES = ['all', 'customer', 'vendor', 'rider', 'administrator', 'super-administrator'];
const CHANNEL_FILTERS = ['all', 'In-app', 'Email', 'Push', 'SMS'];
const STATUS_FILTERS = ['all', 'sent', 'queued', 'failed', 'skipped'];

function deliveryStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: any }> = {
    sent: { label: 'Sent', variant: 'success' },
    queued: { label: 'Queued', variant: 'info' },
    failed: { label: 'Failed', variant: 'danger' },
    skipped: { label: 'Skipped', variant: 'default' },
  };
  const m = map[status] || { label: status, variant: 'default' };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function SuperAdminDeliveryLogPage() {
  const { showToast } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    const params: any = { limit, offset };
    if (q) params.q = q;
    if (channel !== 'all') params.channel = channel;
    if (status !== 'all') params.status = status;
    if (type !== 'all') params.recipientType = type;
    const res = await AdminService.getNotificationDeliveries(params).catch(() => null);
    if (res) { setRows(res.items || []); setTotal(res.total || 0); }
  }, [q, channel, status, type, limit, offset]);

  useEffect(() => {
    let active = true;
    (async () => { try { await load(); } finally { if (active) setLoading(false); } })();
    return () => { active = false; };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await load(); showToast('Refreshed', 'Delivery log refreshed.'); }
    catch { showToast('Refresh Failed', 'Unable to refresh delivery log.', 'warning'); }
    finally { setRefreshing(false); }
  }, [refreshing, load, showToast]);

  const applyQ = (v: string) => { setQ(v); setOffset(0); };
  const setFilter = (set: (v: string) => void, v: string) => { set(v); setOffset(0); };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br bg-primary">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Notification Deliveries</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">Inspect real delivery status for every notification sent across in-app, email and other channels — no fabricated results.</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />Refresh
        </Button>
      </motion.div>

      <Card className="rounded-2xl" hover={false}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input value={q} onChange={e => applyQ(e.target.value)} placeholder="Search name, email or title…" className="rounded-xl pl-9" />
            </div>
            <div>
              <Select value={type} onValueChange={v => setFilter(setType, v)}>
                <SelectTrigger><SelectValue placeholder="Recipient type" /></SelectTrigger>
                <SelectContent>{RECIPIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'All recipient types' : t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Select value={channel} onValueChange={v => setFilter(setChannel, v)}>
                <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>{CHANNEL_FILTERS.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All channels' : c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Select value={status} onValueChange={v => setFilter(setStatus, v)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>{STATUS_FILTERS.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 w-full"><Skeleton className="h-16 w-full rounded-2xl" /></div>)}</div>
      ) : rows.length === 0 ? (
        <Card className="rounded-2xl border-dashed" hover={false}>
          <CardContent className="py-12 text-center">
            <Eye className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-slate-200">No delivery records</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Delivery records appear here as messages and maintenance notifications are sent.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-slate-500 border-b border-line dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Recipient</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-line/60 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">{r.name || '—'}</div>
                      {r.email && r.email !== r.name && <div className="text-[11px] text-gray-500 dark:text-slate-400">{r.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-300">{r.role || r.recipientType}</td>
                    <td className="px-4 py-3"><ChannelChip c={r.channel} /></td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-300 max-w-[200px] truncate" title={r.refTitle || ''}>{r.refTitle || r.refId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {deliveryStatusBadge(r.status)}
                        {r.error && <span className="text-[10px] text-rose-500"><Eye className="w-3 h-3" /></span>}
                      </div>
                      {r.error && <div className="text-[10px] text-rose-500 max-w-[160px] truncate" title={r.error}>{r.error}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>{total} record{total === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-lg" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}><ChevronLeft className="w-4 h-4" /></Button>
              <span>{Math.floor(offset / limit) + 1}</span>
              <Button variant="outline" size="sm" className="rounded-lg" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
