import { useState } from 'react';
import { Bike, Search, Star, Phone, Mail, Ban, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { ConfirmDialog } from '@/src/components/common/ConfirmDialog';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminEmptyState, AdminDrawer
} from '@/src/components/super-admin/AdminDesignSystem';

function statusBadge(s: string): AdminStatus {
  if (s === 'active') return 'success';
  if (s === 'suspended') return 'suspended';
  if (s === 'rejected') return 'failed';
  if (s === 'pending') return 'pending';
  return 'info';
}

export function SuperAdminRidersPage() {
  const { riders, showToast, updateRiderProfile } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [action, setAction] = useState<{ rider: any; kind: 'suspend' | 'activate' | 'approve' | 'reject' } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = riders
    .filter(r => status === 'all' || r.status === status)
    .filter(r => !search || [r.name, r.email, r.phone].some(f => String(f || '').toLowerCase().includes(search.toLowerCase())));

  const runAction = async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === 'suspend') {
        await updateRiderProfile(action.rider.id, { status: 'suspended' } as any);
        showToast('Rider Suspended', `${action.rider.name} is no longer available for dispatch.`, 'warning');
      } else if (action.kind === 'activate') {
        await updateRiderProfile(action.rider.id, { status: 'active', verificationStatus: 'verified' } as any);
        showToast('Rider Activated', `${action.rider.name} is available for dispatch again.`, 'success');
      } else if (action.kind === 'approve') {
        await updateRiderProfile(action.rider.id, { status: 'active', verificationStatus: 'verified' } as any);
        showToast('Rider Approved', `${action.rider.name} was approved and added to the fleet.`, 'success');
      } else {
        await updateRiderProfile(action.rider.id, { status: 'rejected', verificationStatus: 'rejected' } as any);
        showToast('Rider Rejected', `${action.rider.name} was rejected.`, 'warning');
      }
      setAction(null);
    } catch {
      showToast('Action Failed', 'Could not update rider status.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const actionMeta = action ? {
    title: action.kind === 'suspend' ? 'Suspend this rider?' : action.kind === 'activate' ? 'Activate this rider?' : action.kind === 'approve' ? 'Approve this rider?' : 'Reject this rider?',
    description: action.kind === 'suspend'
      ? <>{action.rider.name} will stop receiving dispatch requests immediately until reactivated.</>
      : action.kind === 'activate'
        ? <>{action.rider.name} will become available for dispatch again.</>
        : action.kind === 'approve'
          ? <>{action.rider.name} will be approved and added to the delivery fleet.</>
          : <>{action.rider.name} will be rejected and removed from the delivery fleet.</>,
    confirmLabel: action.kind === 'suspend' ? 'Suspend Rider' : action.kind === 'activate' ? 'Activate Rider' : action.kind === 'approve' ? 'Approve Rider' : 'Reject Rider',
    tone: action.kind === 'reject' || action.kind === 'suspend' ? ('danger' as const) : ('primary' as const),
    icon: action.kind === 'reject' || action.kind === 'suspend' ? ('alert' as const) : ('shield' as const),
  } : null;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Bike}
        title="Riders"
        description="Delivery fleet roster and availability."
        stats={<AdminBadge status="info" label={`${riders.length} Riders`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Active" value={riders.filter(r => r.status === 'active').length} icon={CheckCircle2} status="success" />
        <AdminStatCard label="Pending" value={riders.filter(r => r.status === 'pending').length} icon={Clock} status="warning" />
        <AdminStatCard label="Suspended" value={riders.filter(r => r.status === 'suspended').length} icon={Ban} status="error" />
        <AdminStatCard label="Rejected" value={riders.filter(r => r.status === 'rejected').length} icon={XCircle} status="info" />
      </div>

      <AdminCard
        title="Rider Directory"
        subtitle="All delivery fleet accounts"
        icon={Bike}
        noPadding
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <Input placeholder="Search name, email, phone…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 rounded-xl pl-9 text-xs lg:w-64" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <AdminEmptyState icon={Bike} title="No riders found" description="No riders match the current filters or search." />
        ) : (
          <AdminTable headers={['Rider', 'Contact', 'Rating', 'Status', 'Deliveries', 'Actions']}>
            {filtered.map(r => (
              <tr key={r.id} className="group hover:bg-surface-2/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={r.avatar} alt="" className="h-9 w-9 rounded-xl border border-line object-cover" />
                    <div>
                      <button onClick={() => setSelected(r)} className="text-left text-xs font-black text-ink uppercase tracking-tight hover:text-primary">{r.name}</button>
                      <p className="text-[10px] text-ink-3 uppercase tracking-widest">{r.vehicleType || 'Motorcycle'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="flex items-center gap-1.5 text-xs text-ink-2"><Mail className="h-3 w-3 text-ink-3" /> {r.email}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-3"><Phone className="h-3 w-3 text-ink-3" /> {r.phone}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="flex items-center gap-1 text-xs font-bold text-ink"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating ?? '—'}</p>
                  <p className="text-[10px] text-ink-3">{(r.reviewsCount ?? r.totalReviews ?? 0)} reviews</p>
                </td>
                <td className="px-5 py-3.5">
                  <AdminBadge status={statusBadge(r.status)} label={r.status} />
                  {r.isOnline === false && <AdminBadge status="disabled" label="offline" className="ml-1" />}
                </td>
                <td className="px-5 py-3.5 text-xs font-black text-ink">{r.totalDeliveries ?? r.deliveriesCount ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 border-emerald-200 px-2.5 text-xs font-semibold text-emerald-600" onClick={() => setAction({ rider: r, kind: 'approve' })}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-8 border-rose-200 px-2.5 text-xs font-semibold text-rose-600" onClick={() => setAction({ rider: r, kind: 'reject' })}>Reject</Button>
                      </>
                    )}
                    {r.status === 'active' && (
                      <Button size="sm" variant="outline" className="h-8 border-amber-200 px-2.5 text-xs font-semibold text-amber-600" onClick={() => setAction({ rider: r, kind: 'suspend' })}><Ban className="h-3.5 w-3.5" /> Suspend</Button>
                    )}
                    {r.status === 'suspended' && (
                      <Button size="sm" variant="outline" className="h-8 border-emerald-200 px-2.5 text-xs font-semibold text-emerald-600" onClick={() => setAction({ rider: r, kind: 'activate' })}>Reactivate</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>

      {action && actionMeta && (
        <ConfirmDialog
          open
          tone={actionMeta.tone}
          icon={actionMeta.icon}
          title={actionMeta.title}
          description={actionMeta.description}
          confirmLabel={actionMeta.confirmLabel}
          busy={busy}
          busyLabel="Processing…"
          onConfirm={runAction}
          onCancel={() => setAction(null)}
        />
      )}

      {selected && (
        <AdminDrawer
          open
          onClose={() => setSelected(null)}
          icon={Bike}
          title={selected.name}
          subtitle={selected.id}
          footer={<Button variant="outline" className="w-full rounded-xl" onClick={() => setSelected(null)}>Close</Button>}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <AdminBadge status={statusBadge(selected.status)} label={selected.status} />
              <AdminBadge status={selected.isOnline ? 'success' : 'disabled'} label={selected.isOnline ? 'Online' : 'Offline'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Vehicle</p>
                <p className="text-sm text-ink">{selected.vehicleType || 'Motorcycle'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Vehicle Number</p>
                <p className="text-sm text-ink">{selected.vehicleNumber || selected.vehicleReg || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Deliveries</p>
                <p className="text-sm text-ink">{selected.totalDeliveries ?? selected.deliveriesCount ?? '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Rating</p>
                <p className="flex items-center gap-1 text-sm font-bold text-ink"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {selected.rating ?? '—'} <span className="text-ink-3 font-normal">({selected.totalReviews ?? 0})</span></p>
              </div>
            </div>
          </div>
        </AdminDrawer>
      )}
    </div>
  );
}