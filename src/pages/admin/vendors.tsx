import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store as StoreIcon, UserPlus, Search, Eye, CheckCircle, AlertCircle,
  XCircle, Edit3, Trash2, MapPin, Phone, Mail, Utensils, Clock as ClockIcon,
  FileText, Check, X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';
import type { Vendor } from '@/src/types';

const CUISINES = ['African', 'Jollof', 'Waakye', 'Fufu & Soup', 'Banku & Tilapia', 'Kenkey & Fish', 'Pizza', 'Chinese', 'Fast Food', 'Breakfast', 'Grill & BBQ', 'Desserts', 'Pastries', 'Drinks & Smoothies', 'Other'];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${h < 12 ? 'AM' : 'PM'}`;
});

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'pending': 'bg-amber-50 text-amber-700 border-amber-200',
    'suspended': 'bg-rose-50 text-rose-700 border-rose-200',
    'rejected': 'bg-gray-50 text-gray-700 border-gray-200'
  };
  return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
};

const getVerificationColor = (status: string) => {
  const colors: Record<string, string> = {
    'verified': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'pending': 'bg-amber-50 text-amber-700 border-amber-200',
    'rejected': 'bg-rose-50 text-rose-700 border-rose-200',
    'unverified': 'bg-gray-50 text-gray-700 border-gray-200'
  };
  return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
};

function CuisineChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const toggle = (c: string) => {
    const cur = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
    const next = cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c];
    onChange(next.join(', '));
  };
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  return (
    <div className="flex flex-wrap gap-1.5">
      {CUISINES.map(c => {
        const sel = selected.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
              sel
                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                : "bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400"
            )}
          >
            {sel && <Check className="w-3 h-3" />}
            {c}
          </button>
        );
      })}
    </div>
  );
}

const fieldClass = "rounded-xl h-10 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-sm focus:ring-emerald-500/40";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">{label}</Label>
      {children}
    </div>
  );
}

const emptyApp = {
  ownerName: '', businessName: '', email: '', phone: '', password: '',
  category: '', businessAddress: '', open: '', close: '', logoUrl: '',
  regNumber: '', commissionRate: '10', deliveryTime: '30-45 min', description: ''
};

export function AdminVendorsPage() {
  const { vendors = [], orders = [], products = [], formatPrice = (a: any) => `GHS ${a}`, updateVendorProfile = async () => {}, createVendor = async () => {}, deleteVendor = async () => {}, showToast = () => {} } = useApp() || {};
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorDetail, setShowVendorDetail] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [appForm, setAppForm] = useState({ ...emptyApp });
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const liveVendor = useMemo(
    () => (Array.isArray(vendors) ? vendors.find(v => v && v.id === selectedVendor?.id) : null) || null,
    [vendors, selectedVendor]
  );

  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    return vendors.filter(v => {
      if (!v) return false;
      if (filter === 'all') return true;
      if (filter === 'active') return v.status === 'active';
      if (filter === 'pending') return v.status === 'pending';
      if (filter === 'suspended') return v.status === 'suspended';
      if (filter === 'verified') return v.verificationStatus === 'verified';
      return false;
    }).filter(v => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (v.name || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q) ||
        (v.phone || '').toLowerCase().includes(q)
      );
    });
  }, [vendors, filter, search]);

  const setA = (k: string, v: string) => setAppForm(f => ({ ...f, [k]: v }));

  const run = async (fn: () => Promise<void>, fail: string) => {
    setSaving(true);
    try {
      await fn();
    } catch {
      showToast('Action Failed', fail, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const approve = (v: Vendor) => run(
    () => updateVendorProfile(v.id, { status: 'active', verificationStatus: 'verified' } as any),
    'Could not approve this restaurant.'
  );

  const suspend = (v: Vendor) => run(
    () => updateVendorProfile(v.id, { status: 'suspended' } as any),
    'Could not suspend this restaurant.'
  );

  const reject = (v: Vendor) => run(
    () => updateVendorProfile(v.id, { status: 'rejected', verificationStatus: 'rejected' } as any),
    'Could not reject this restaurant.'
  );

  const remove = async (v: Vendor) => {
    if (!window.confirm(`Delete "${v.name}" permanently? This removes its menu and cannot be undone.`)) return;
    await run(() => deleteVendor(v.id), 'Could not delete this restaurant.');
    if (selectedVendor?.id === v.id) {
      setShowVendorDetail(false);
      setShowEditModal(false);
    }
  };

  const openEdit = (v: Vendor) => {
    setSelectedVendor(v);
    setEditForm({
      name: v.name, category: v.category || '', email: v.email || '',
      phone: v.phone || '', address: v.address || '', description: v.description || '',
      openHours: v.openHours || '', commissionRate: String(v.commissionRate ?? 10),
      deliveryTime: v.deliveryTime || ''
    });
    setShowEditModal(true);
  };

  const saveEdit = () => run(async () => {
    if (!liveVendor) return;
    await updateVendorProfile(liveVendor.id, {
      name: editForm.name, category: editForm.category, email: editForm.email,
      phone: editForm.phone, address: editForm.address, description: editForm.description,
      openHours: editForm.openHours, deliveryTime: editForm.deliveryTime,
      commissionRate: Number(editForm.commissionRate) || 10
    } as any);
    setShowEditModal(false);
  }, 'Could not save changes.');

  const submitApplication = () => {
    if (!appForm.businessName.trim() || !appForm.email.trim()) {
      showToast('Missing Details', 'Restaurant name and email are required.', 'warning');
      return;
    }
    const openingHours = appForm.open && appForm.close ? `${appForm.open} - ${appForm.close}` : '08:00 AM - 10:00 PM';
    run(async () => {
      await createVendor({
        businessName: appForm.businessName, ownerName: appForm.ownerName,
        email: appForm.email, phone: appForm.phone, password: appForm.password,
        category: appForm.category || 'Local Dishes', businessAddress: appForm.businessAddress,
        openingHours, logoUrl: appForm.logoUrl, regNumber: appForm.regNumber,
        commissionRate: Number(appForm.commissionRate) || 10,
        deliveryTime: appForm.deliveryTime, description: appForm.description
      } as any);
      setAppForm({ ...emptyApp });
      setShowApplicationModal(false);
    }, 'Could not add the restaurant.');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Restaurant Management</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Approve, edit, suspend, or remove restaurant partners</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <StoreIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{vendors.length} Total Restaurants</span>
          </div>
          <Button
            onClick={() => setShowApplicationModal(true)}
            className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white h-10"
          >
            <UserPlus className="w-4 h-4 mr-2" /> New Vendor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Restaurants', value: vendors.filter(v => v && v.status === 'active').length, sub: 'Live in platform', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Pending Approval', value: vendors.filter(v => v && v.status === 'pending').length, sub: 'Awaiting review', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Suspended', value: vendors.filter(v => v && v.status === 'suspended').length, sub: 'Policy violations', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
          { label: 'Verified', value: vendors.filter(v => v && v.verificationStatus === 'verified').length, sub: 'Compliant', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
        ].map(s => (
          <Card key={s.label} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                </div>
                <div className={cn('p-3 rounded-xl', s.color)}>
                  <StoreIcon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl shadow-sm border-gray-100 dark:border-slate-800">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <StoreIcon className="w-5 h-5 text-blue-500" /> Restaurant Directory
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-lg w-64 h-10"
                />
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 focus:ring-emerald-500/40"
              >
                <option value="all">All Restaurants</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="verified">Verified</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <StoreIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No restaurants found</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/30 dark:bg-slate-800/30 border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Restaurant</th>
                    <th className="py-4 px-6">Contact</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Verification</th>
                    <th className="py-4 px-6">Rating</th>
                    <th className="py-4 px-6">Total Sales</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map(vendor => (
                    <tr key={vendor.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <img src={vendor.logo} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{vendor.name}</div>
                            <div className="text-xs text-gray-500">{vendor.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="text-sm text-gray-900 dark:text-white">{vendor.email}</div>
                        <div className="text-xs text-gray-500">{vendor.phone}</div>
                      </td>
                      <td className="py-3 px-6">
                        <Badge className={cn('text-[10px] font-black uppercase px-2 py-1', getStatusColor(vendor.status))} variant="outline">
                          {vendor.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-6">
                        <Badge className={cn('text-[10px] font-black uppercase px-2 py-1', getVerificationColor(vendor.verificationStatus))} variant="outline">
                          {vendor.verificationStatus || 'unverified'}
                        </Badge>
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-bold text-gray-900 dark:text-white">{vendor.rating || 0} ★</div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-bold text-emerald-600">{formatPrice(vendor.totalSales || 0)}</div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { setSelectedVendor(vendor); setShowVendorDetail(true); }}
                            className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          {vendor.status !== 'active' && (
                            <button onClick={() => approve(vendor)} disabled={saving}
                              className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {vendor.status !== 'suspended' && (
                            <button onClick={() => suspend(vendor)} disabled={saving}
                              className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition-colors" title="Suspend">
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(vendor)}
                            className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-violet-50 hover:text-violet-500 transition-colors" title="Edit">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => remove(vendor)}
                            className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- VENDOR DETAIL MODAL ---------- */}
      <AnimatePresence>
        {showVendorDetail && liveVendor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVendorDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <img src={liveVendor.logo} className="w-14 h-14 rounded-xl object-cover" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{liveVendor.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn('text-[9px] font-black uppercase px-2', getStatusColor(liveVendor.status))} variant="outline">{liveVendor.status}</Badge>
                      <Badge className={cn('text-[9px] font-black uppercase px-2', getVerificationColor(liveVendor.verificationStatus))} variant="outline">{liveVendor.verificationStatus || 'unverified'}</Badge>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowVendorDetail(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-2 gap-4">
                <Field label="Email"><p className="text-sm text-gray-900 dark:text-white flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{liveVendor.email || '—'}</p></Field>
                <Field label="Phone"><p className="text-sm text-gray-900 dark:text-white flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{liveVendor.phone || '—'}</p></Field>
                <Field label="Cuisine"><p className="text-sm text-gray-900 dark:text-white flex items-center gap-2"><Utensils className="w-4 h-4 text-gray-400" />{liveVendor.category || '—'}</p></Field>
                <Field label="Address"><p className="text-sm text-gray-900 dark:text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{liveVendor.address || '—'}</p></Field>
                <Field label="Hours"><p className="text-sm text-gray-900 dark:text-white flex items-center gap-2"><ClockIcon className="w-4 h-4 text-gray-400" />{liveVendor.openHours || '—'}</p></Field>
                <Field label="Commission"><p className="text-sm text-gray-900 dark:text-white">{liveVendor.commissionRate ?? 10}%</p></Field>
                <Field label="Rating"><p className="text-sm text-gray-900 dark:text-white">{liveVendor.rating || 0} ★</p></Field>
                <Field label="Joined"><p className="text-sm text-gray-900 dark:text-white">{liveVendor.joinedDate ? new Date(liveVendor.joinedDate).toLocaleDateString() : '—'}</p></Field>
                <Field label="Total Sales"><p className="text-sm text-emerald-600 font-bold">{formatPrice(liveVendor.totalSales || 0)}</p></Field>
                <Field label="Menu Items"><p className="text-sm text-gray-900 dark:text-white">{products.filter(p => p.vendorId === liveVendor.id).length} items</p></Field>
              </div>

              <div className="flex items-center gap-2.5 px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex-wrap">
                {liveVendor.status !== 'active' && (
                  <Button size="sm" className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white h-9" disabled={saving} onClick={() => approve(liveVendor)}>
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                )}
                <Button size="sm" variant="outline" className="rounded-lg h-9" disabled={saving} onClick={() => { setShowVendorDetail(false); openEdit(liveVendor); }}>
                  <Edit3 className="w-4 h-4 mr-1.5" /> Edit
                </Button>
                {liveVendor.status !== 'suspended' && (
                  <Button size="sm" variant="outline" className="rounded-lg h-9 text-amber-600 hover:bg-amber-50" disabled={saving} onClick={() => suspend(liveVendor)}>
                    <AlertCircle className="w-4 h-4 mr-1.5" /> Suspend
                  </Button>
                )}
                <Button size="sm" variant="outline" className="rounded-lg h-9 text-rose-600 hover:bg-rose-50" disabled={saving} onClick={() => { setShowVendorDetail(false); remove(liveVendor); }}>
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- EDIT VENDOR MODAL ---------- */}
      <AnimatePresence>
        {showEditModal && liveVendor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Restaurant</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <Field label="Restaurant Name">
                    <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={fieldClass} />
                  </Field>
                </div>
                <Field label="Email">
                  <Input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={fieldClass} />
                </Field>
                <Field label="Phone">
                  <Input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={fieldClass} />
                </Field>
                <div className="col-span-2">
                  <Field label="Cuisine Types">
                    <CuisineChips value={editForm.category || ''} onChange={v => setEditForm({ ...editForm, category: v })} />
                  </Field>
                </div>
                <Field label="Address">
                  <Input value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className={fieldClass} />
                </Field>
                <Field label="Opening Hours">
                  <Input value={editForm.openHours || ''} onChange={e => setEditForm({ ...editForm, openHours: e.target.value })} className={fieldClass} placeholder="e.g. 8:00 AM - 10:00 PM" />
                </Field>
                <Field label="Commission Rate (%)">
                  <Input type="number" value={editForm.commissionRate || ''} onChange={e => setEditForm({ ...editForm, commissionRate: e.target.value })} className={fieldClass} />
                </Field>
                <Field label="Delivery Time">
                  <Input value={editForm.deliveryTime || ''} onChange={e => setEditForm({ ...editForm, deliveryTime: e.target.value })} className={fieldClass} />
                </Field>
                <div className="col-span-2">
                  <Field label="Description">
                    <Textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="rounded-xl" rows={3} />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white h-10" disabled={saving} onClick={saveEdit}>
                  <Check className="w-4 h-4 mr-1.5" /> Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- NEW VENDOR APPLICATION MODAL ---------- */}
      <AnimatePresence>
        {showApplicationModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowApplicationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto p-5"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Restaurant</h2>
                <button onClick={() => setShowApplicationModal(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Add a restaurant partner — same details as the registration platform</p>

              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Restaurant Name *">
                  <Input value={appForm.businessName} onChange={e => setA('businessName', e.target.value)} placeholder="e.g. Takoradi Grill House" className={fieldClass} />
                </Field>
                <Field label="Owner Name">
                  <Input value={appForm.ownerName} onChange={e => setA('ownerName', e.target.value)} placeholder="Full name" className={fieldClass} />
                </Field>
                <Field label="Email *">
                  <Input type="email" value={appForm.email} onChange={e => setA('email', e.target.value)} placeholder="restaurant@omnimarket.com" className={fieldClass} />
                </Field>
                <Field label="Phone Number">
                  <Input type="tel" value={appForm.phone} onChange={e => setA('phone', e.target.value)} placeholder="+233 2X XXX XXXX" className={fieldClass} />
                </Field>
                <Field label="Temporary Password">
                  <Input type="password" value={appForm.password} onChange={e => setA('password', e.target.value)} placeholder="For owner login" className={fieldClass} />
                </Field>
                <Field label="Business ID Number">
                  <Input value={appForm.regNumber} onChange={e => setA('regNumber', e.target.value)} placeholder="e.g. GHA-12345678" className={fieldClass} />
                </Field>
                <div className="col-span-2">
                  <Field label="Cuisine Types">
                    <CuisineChips value={appForm.category} onChange={v => setA('category', v)} />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Business Address">
                    <Input value={appForm.businessAddress} onChange={e => setA('businessAddress', e.target.value)} placeholder="e.g. Market Circle, Takoradi" className={fieldClass} />
                  </Field>
                </div>
                <Field label="Opens">
                  <select value={appForm.open} onChange={e => setA('open', e.target.value)} className={fieldClass + " w-full"}>
                    <option value="">Select…</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Closes">
                  <select value={appForm.close} onChange={e => setA('close', e.target.value)} className={fieldClass + " w-full"}>
                    <option value="">Select…</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Commission Rate (%)">
                  <Input type="number" value={appForm.commissionRate} onChange={e => setA('commissionRate', e.target.value)} className={fieldClass} />
                </Field>
                <Field label="Delivery Time">
                  <Input value={appForm.deliveryTime} onChange={e => setA('deliveryTime', e.target.value)} className={fieldClass} />
                </Field>
                <Field label="Logo URL (optional)">
                  <Input value={appForm.logoUrl} onChange={e => setA('logoUrl', e.target.value)} placeholder="https://…" className={fieldClass} />
                </Field>
                <div className="col-span-2">
                  <Field label="Description">
                    <Textarea value={appForm.description} onChange={e => setA('description', e.target.value)} className="rounded-xl" rows={2} placeholder="Describe the restaurant and its offerings" />
                  </Field>
                </div>
              </div>

              {appForm.open && appForm.close && (
                <p className="mt-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ClockIcon className="w-3.5 h-3.5 inline mr-1" />Hours: {appForm.open} - {appForm.close}
                </p>
              )}

              <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={() => setShowApplicationModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-10" disabled={saving} onClick={submitApplication}>
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Add Restaurant
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
