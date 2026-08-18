import { useCallback, useEffect, useState } from 'react';
import {
  Wrench, CalendarClock, Clock, Plus, ShieldCheck,
  X, Activity, AlertTriangle, Loader2
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge,
  AdminSectionHeading, AdminLoading, AdminEmptyState,
  AdminModal, AdminError
} from '@/src/components/super-admin/AdminDesignSystem';
import { cn } from '@/src/lib/utils';

export function SuperAdminMaintenancePage() {
  const { showToast } = useApp();
  const [windows, setWindows] = useState<any[]>([]);
  const [publicView, setPublicView] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ kind: 'complete' | 'extend'; window: any } | null>(null);
  const [extendEnd, setExtendEnd] = useState('');
  const [actionPassword, setActionPassword] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [wRes, pub] = await Promise.all([
        AdminService.getMaintenanceWindows(),
        AdminService.getMaintenanceStatus(),
      ]);
      setWindows(wRes?.items || []);
      setPublicView(pub);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load maintenance schedules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = async () => {
    if (!actionTarget) return;
    setActionBusy(true); setActionError(null);
    try {
      if (actionTarget.kind === 'complete') {
        await AdminService.completeMaintenanceWindow(actionTarget.window.id, actionPassword);
        showToast('Maintenance Completed', 'Services are back online for all users.', 'success');
      } else {
        await AdminService.extendMaintenanceWindow(actionTarget.window.id, new Date(extendEnd).toISOString(), actionPassword);
        showToast('Window Extended', 'Maintenance end time updated.', 'success');
      }
      setActionTarget(null); setActionPassword(''); setExtendEnd('');
      load();
    } catch (e: any) {
      setActionError(e?.message || 'Could not complete that action. Check your password.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading && !windows.length) return <AdminLoading message="Querying maintenance schedules..." />;
  if (loadError && !windows.length) return <AdminError message="Unable to load maintenance schedules." detail={loadError} retry={load} />;

  const active = windows.find(w => w.status === 'active');

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Wrench}
        title="Maintenance Center"
        description="Schedule platform downtime, manage service interruptions, and dispatch maintenance advisories."
        stats={<AdminBadge status={active ? 'warning' : 'operational'} label={active ? 'Active Window' : 'Systems Nominal'} />}
        actions={
          <Button onClick={() => setFormOpen(true)} className="h-9 px-4 rounded-xl text-sm font-semibold">
             <Plus className="w-3.5 h-3.5 mr-2" /> Schedule Window
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            {active && (
               <AdminCard title="Active Maintenance" icon={Activity} className="border-rose-200 dark:border-rose-900 bg-rose-50/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="space-y-1">
                        <h3 className="text-sm font-black text-ink uppercase tracking-tight">{active.title}</h3>
                        <p className="text-xs text-ink-3 font-medium">Started at {new Date(active.scheduledStart).toLocaleTimeString()}</p>
                     </div>
                     <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl h-10 border-rose-200 text-rose-600 text-sm font-semibold"
                          onClick={() => { setActionTarget({ kind: 'complete', window: active }); setActionPassword(''); setActionError(null); }}
                        >
                          <X className="w-4 h-4 mr-2" /> Complete Early
                        </Button>
                        <Button
                          className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
                          onClick={() => { setActionTarget({ kind: 'extend', window: active }); setExtendEnd(new Date(active.scheduledEnd).toLocaleString('sv-SE').slice(0, 16)); setActionPassword(''); setActionError(null); }}
                        >
                          <Clock className="w-4 h-4 mr-2" /> Extend Timer
                        </Button>
                     </div>
                  </div>
               </AdminCard>
            )}

            <AdminCard title="Operational Windows" icon={CalendarClock} noPadding>
               <div className="divide-y divide-line">
                  {windows.length === 0 ? (
                     <AdminEmptyState
                        icon={CalendarClock}
                        title="No scheduled downtime"
                        description="All platform services are operating under normal conditions."
                     />
                  ) : (
                     windows.map(w => (
                        <div key={w.id} className="p-6 flex items-center justify-between hover:bg-surface-2/30 transition-colors">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-ink-3">
                                 <Clock className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-ink uppercase tracking-tight">{w.title}</p>
                                 <p className="text-[10px] text-ink-3 font-bold uppercase tracking-widest mt-1">
                                    {new Date(w.scheduledStart).toLocaleString()} — {new Date(w.scheduledEnd).toLocaleString()}
                                 </p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <AdminBadge status={w.status === 'active' ? 'warning' : 'info'} label={w.status} />
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </AdminCard>
         </div>

         <div className="space-y-8">
            <AdminCard title="Public Gating" icon={ShieldCheck}>
               <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-ink uppercase tracking-widest">Marketplace Gate</span>
                        <AdminBadge status={active ? 'warning' : 'success'} label={active ? 'Restricted' : 'Open'} />
                     </div>
                     <p className="text-[10px] text-ink-3 font-medium leading-relaxed">When maintenance is active, all non-administrative users are directed to a maintenance landing page.</p>
                  </div>

                  <div className="pt-2">
                     <AdminSectionHeading title="Impacted Services" />
                     <div className="flex flex-wrap gap-2">
                        {(active?.affectedServices && active.affectedServices.length
                          ? active.affectedServices
                          : ['Marketplace']
                        ).map((s: string) => (
                           <span key={s} className="px-2 py-1 rounded-lg bg-surface-2 border border-line text-[9px] font-black uppercase text-ink-3">{s}</span>
                        ))}
                     </div>
                  </div>
               </div>
            </AdminCard>
         </div>
      </div>

      {formOpen && <ScheduleFormModal onClose={() => setFormOpen(false)} onCreated={() => { setFormOpen(false); load(); }} />}

      <AdminModal
        open={!!actionTarget}
        onClose={() => !actionBusy && setActionTarget(null)}
        icon={AlertTriangle}
        title={actionTarget?.kind === 'complete' ? 'Complete maintenance early?' : 'Extend maintenance window?'}
        subtitle={actionTarget?.window?.title}
        danger
        footer={
          <>
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={actionBusy} onClick={() => setActionTarget(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={!actionPassword || actionBusy || (actionTarget?.kind === 'extend' && !extendEnd)} onClick={runAction}>
              {actionBusy ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Confirming…</> : actionTarget?.kind === 'complete' ? 'Complete Now' : 'Confirm Extension'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionTarget?.kind === 'extend' ? (
            <>
              <p className="text-sm leading-relaxed text-ink-2">Set the new end time for this maintenance window. Services remain restricted until the updated time.</p>
              <div>
                <Label className="mb-2 block text-xs font-semibold text-ink-3">New End Time</Label>
                <Input type="datetime-local" value={extendEnd} onChange={e => setExtendEnd(e.target.value)} className="h-11 rounded-xl text-xs" />
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink-2">Ending maintenance restores full marketplace access immediately and notifies affected users. This is recorded in the audit trail.</p>
          )}
          <div>
            <Label className="mb-2 block text-xs font-semibold text-ink-3">Current Password</Label>
            <Input type="password" value={actionPassword} onChange={e => setActionPassword(e.target.value)} className="h-11 rounded-xl text-sm" autoFocus />
          </div>
          {actionError && <p className="text-xs font-medium text-danger">{actionError}</p>}
        </div>
      </AdminModal>
    </div>
  );
}

function ScheduleFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
   const { showToast } = useApp();
   const [busy, setBusy] = useState(false);
   const [formError, setFormError] = useState<string | null>(null);
   const [form, setForm] = useState({ title: '', start: '', end: '', group: 'all', password: '' });

   const submit = async () => {
      setBusy(true); setFormError(null);
      try {
         await AdminService.createMaintenanceWindow({
            title: form.title,
            scheduledStart: form.start,
            scheduledEnd: form.end,
            affectedUserTypes: [form.group],
            affectedServices: ['Marketplace'],
            notificationTiming: 'start'
         }, form.password);
         showToast('Window Scheduled', 'Maintenance window locked in.', 'success');
         onCreated();
      } catch (e: any) {
         setFormError(e?.message || 'Could not schedule this window. Check your password.');
      } finally {
         setBusy(false);
      }
   };

   return (
      <AdminModal
         open
         onClose={onClose}
         icon={Wrench}
         title="Schedule Maintenance"
         subtitle="Lock the platform for an announced maintenance window"
         footer={
            <>
               <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" onClick={onClose}>Abort</Button>
               <Button onClick={submit} disabled={busy} className="flex-1 h-11 rounded-xl text-xs font-semibold">
                  {busy ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Scheduling…</> : 'Lock Window'}
               </Button>
            </>
         }
      >
         <div className="space-y-5">
            <div className="space-y-2">
               <Label className="block text-xs font-semibold text-ink-3">Maintenance Window Title</Label>
               <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-11 rounded-xl text-sm" placeholder="e.g. Infrastructure Upgrade" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="block text-xs font-semibold text-ink-3">Commences At</Label>
                  <Input type="datetime-local" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="h-11 rounded-xl text-xs" />
               </div>
               <div className="space-y-2">
                  <Label className="block text-xs font-semibold text-ink-3">Concludes At</Label>
                  <Input type="datetime-local" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className="h-11 rounded-xl text-xs" />
               </div>
            </div>
            <div className="space-y-2 border-t border-line pt-4">
               <Label className="block text-xs font-semibold text-danger">Administrative Password</Label>
               <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-11 rounded-xl border-danger/30 text-sm" placeholder="Required for lock operation" />
            </div>
            {formError && <p className="text-xs font-medium text-danger">{formError}</p>}
         </div>
      </AdminModal>
   );
}