import { useState } from 'react';
import { Store, Search, Star, Phone, Mail, Clock, MapPin, Ban, CheckCircle2, XCircle } from 'lucide-react';
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

export function SuperAdminRestaurantsPage() {
  const { vendors, showToast, updateVendorProfile } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [action, setAction] = useState<{ vendor: any; kind: 'suspend' | 'activate' | 'approve' | 'reject' } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = vendors
    .filter(v => status === 'all' || v.status === status)
    .filter(v => !search || [v.name, v.email, v.phone, v.category].some(f => String(f || '').toLowerCase().includes(search.toLowerCase())));

  const runAction = async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === 'suspend') {
        await updateVendorProfile(action.vendor.id, { status: 'suspended' } as any);
        showToast('Restaurant Suspended', `${action.vendor.name} is no longer accepting orders.`, 'warning');
      } else if (action.kind === 'activate') {
        await updateVendorProfile(action.vendor.id, { status: 'active', verificationStatus: 'verified' } as any);
        showToast('Restaurant Activated', `${action.vendor.name} is live on the marketplace.`, 'success');
      } else if (action.kind === 'approve') {
        await updateVendorProfile(action.vendor.id, { status: 'active', verificationStatus: 'verified' } as any);
        showToast('Restaurant Approved', `${action.vendor.name} was approved and went live.`, 'success');
      } else {
        await updateVendorProfile(action.vendor.id, { status: 'rejected', verificationStatus: 'rejected' } as any);
        showToast('Restaurant Rejected', `${action.vendor.name} was rejected.`, 'warning');
      }
      setAction(null);
    } catch {
      showToast('Action Failed', 'Could not update restaurant status.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const actionMeta = action ? {
    title: action.kind === 'suspend' ? 'Suspend this restaurant?' : action.kind === 'activate' ? 'Activate this restaurant?' : action.kind === 'approve' ? 'Approve this restaurant?' : 'Reject this restaurant?',
    description: action.kind === 'suspend'
      ? <>{action.vendor.name} will stop accepting new orders immediately until reactivated.</>
      : action.kind === 'activate'
        ? <>{action.vendor.name} will go live and accept new orders again.</>
        : action.kind === 'approve'
          ? <>{action.vendor.name} will be approved and go live on the marketplace.</>
          : <>{action.vendor.name} will be rejected and removed from the marketplace.</>,
    confirmLabel: action.kind === 'suspend' ? 'Suspend Restaurant' : action.kind === 'activate' ? 'Activate Restaurant' : action.kind === 'approve' ? 'Approve Restaurant' : 'Reject Restaurant',
    tone: action.kind === 'reject' || action.kind === 'suspend' ? ('danger' as const) : ('primary' as const),
    icon: action.kind === 'reject' || action.kind === 'suspend' ? ('alert' as const) : ('shield' as const),
  } : null;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Store}
        title="Restaurants"
        description="Complete directory of merchant restaurants across the marketplace."
        stats={<AdminBadge status="info" label={`${vendors.length} Restaurants`} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Active" value={vendors.filter(v => v.status === 'active').length} icon={CheckCircle2} status="success" />
        <AdminStatCard label="Pending" value={vendors.filter(v => v.status === 'pending' || v.verificationStatus === 'pending').length} icon={Clock} status="warning" />
        <AdminStatCard label="Suspended" value={vendors.filter(v => v.status === 'suspended').length} icon={Ban} status="error" />
        <AdminStatCard label="Rejected" value={vendors.filter(v => v.status === 'rejected').length} icon={XCircle} status="info" />
      </div>

      <AdminCard
        title="Restaurant Directory"
        subtitle="All merchant accounts"
        icon={Store}
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
          <AdminEmptyState icon={Store} title="No restaurants found" description="No restaurants match the current filters or search." />
        ) : (
          <AdminTable headers={['Restaurant', 'Contact', 'Rating', 'Status', 'Commission', 'Actions']}>
            {filtered.map(v => (
              <tr key={v.id} className="group hover:bg-surface-2/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <img src={v.logo} alt="" className="h-9 w-9 rounded-xl border border-line object-cover" />
                    <div>
                      <button onClick={() => setSelected(v)} className="text-left text-xs font-black text-ink uppercase tracking-tight hover:text-primary">{v.name}</button>
                      <p className="text-[10px] text-ink-3 uppercase tracking-widest">{v.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="flex items-center gap-1.5 text-xs text-ink-2"><Mail className="h-3 w-3 text-ink-3" /> {v.email}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-3"><Phone className="h-3 w-3 text-ink-3" /> {v.phone}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="flex items-center gap-1 text-xs font-bold text-ink"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {v.rating ?? '—'}</p>
                  <p className="text-[10px] text-ink-3">{(v.reviewsCount ?? v.totalReviews ?? 0)} reviews</p>
                </td>
                <td className="px-5 py-3.5">
                  <AdminBadge status={statusBadge(v.status)} label={v.status} />
                  {v.isOpen === false && <AdminBadge status="disabled" label="closed" className="ml-1" />}
                </td>
                <td className="px-5 py-3.5 text-xs font-black text-ink">{v.commissionRate}%</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    {v.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 border-emerald-200 px-2.5 text-xs font-semibold text-emerald-600" onClick={() => setAction({ vendor: v, kind: 'approve' })}>Approve</Button>
                        <Button size="sm" variant="outline" className="h-8 border-rose-200 px-2.5 text-xs font-semibold text-rose-600" onClick={() => setAction({ vendor: v, kind: 'reject' })}>Reject</Button>
                      </>
                    )}
                    {v.status === 'active' && (
                      <Button size="sm" variant="outline" className="h-8 border-amber-200 px-2.5 text-xs font-semibold text-amber-600" onClick={() => setAction({ vendor: v, kind: 'suspend' })}><Ban className="h-3.5 w-3.5" /> Suspend</Button>
                    )}
                    {v.status === 'suspended' && (
                      <Button size="sm" variant="outline" className="h-8 border-emerald-200 px-2.5 text-xs font-semibold text-emerald-600" onClick={() => setAction({ vendor: v, kind: 'activate' })}>Reactivate</Button>
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
          icon={Store}
          title={selected.name}
          subtitle={selected.id}
          footer={<Button variant="outline" className="w-full rounded-xl" onClick={() => setSelected(null)}>Close</Button>}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <AdminBadge status={statusBadge(selected.status)} label={selected.status} />
              <AdminBadge status={selected.isOpen ? 'success' : 'disabled'} label={selected.isOpen ? 'Open' : 'Closed'} />
              <AdminBadge status={selected.isKitchenOpen === false ? 'disabled' : 'success'} label={selected.isKitchenOpen === false ? 'Kitchen closed' : 'Kitchen open'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Category</p>
                <p className="text-sm text-ink">{selected.category || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Commission</p>
                <p className="text-sm font-bold text-ink">{selected.commissionRate}%</p>
              </div>
              <div className="col-span-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Address</p>
                <p className="flex items-start gap-2 text-sm text-ink"><MapPin className="mt-0.5 h-4 w-4 text-ink-3" /> {selected.address || '—'}{selected.city ? `, ${selected.city}` : ''}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Delivery Time</p>
                <p className="flex items-center gap-1.5 text-sm text-ink"><Clock className="h-4 w-4 text-ink-3" /> {selected.deliveryTime || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Open Hours</p>
                <p className="text-sm text-ink">{selected.openHours || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Products</p>
                <p className="text-sm text-ink">{selected.totalProducts ?? '—'}</p>
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