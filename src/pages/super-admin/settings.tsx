import { useState, useEffect, useCallback } from 'react';
import {
  Settings, ShieldCheck, Globe, CreditCard, Bell, Activity,
  Database, RefreshCw, ChevronRight, AlertTriangle, Loader2, Bike, TrendingUp
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Switch } from '@/src/components/ui/switch';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge,
  AdminStatus, AdminLoading, AdminError, AdminModal
} from '@/src/components/super-admin/AdminDesignSystem';
import { cn } from '@/src/lib/utils';

const GATE_ITEMS = [
  { label: 'Maintenance Mode', key: 'maintenanceMode', risk: 'error' as AdminStatus },
  { label: 'Customer Enrollment', key: 'allowNewCustomers', risk: 'info' as AdminStatus },
  { label: 'Merchant Enrollment', key: 'allowNewVendors', risk: 'info' as AdminStatus },
  { label: 'Rider Enrollment', key: 'allowNewRiders', risk: 'info' as AdminStatus },
];

const PRICING_FIELDS: { key: string; label: string; desc: string; suffix: string }[] = [
  { key: 'deliveryBaseFee', label: 'Base Fee', desc: 'Charged on every delivery order', suffix: '$' },
  { key: 'distanceFeePerKm', label: 'Fee Per Km', desc: 'Added per kilometre travelled', suffix: '$/km' },
  { key: 'deliveryMinFee', label: 'Minimum Fee', desc: 'Floor — fee is never below this', suffix: '$' },
  { key: 'deliveryMaxFee', label: 'Maximum Fee', desc: 'Ceiling — fee is never above this', suffix: '$' },
  { key: 'freeDeliveryThreshold', label: 'Free Delivery Over', desc: 'Orders at/above this subtotal ship free (0 = never)', suffix: '$' },
  { key: 'maxDeliveryDistance', label: 'Max Delivery Distance', desc: 'Routes beyond this are not supported (0 = unlimited)', suffix: 'km' },
];

const PREVIEW_DISTANCES = [1, 3, 5, 10];

const num = (s: string, fb: number) => {
  const v = Number(s);
  return Number.isFinite(v) && String(s).trim() !== '' ? v : fb;
};

export function SuperAdminSettingsPage() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [branding, setBranding] = useState<{ platformName: string; currency: string }>({ platformName: '', currency: '' });
  const [commission, setCommission] = useState('');

  const [pricing, setPricing] = useState<Record<string, string>>({
    deliveryBaseFee: '', distanceFeePerKm: '', deliveryMinFee: '', deliveryMaxFee: '', freeDeliveryThreshold: '', maxDeliveryDistance: '',
  });
  const [previewDistance, setPreviewDistance] = useState('3');
  const [previewSubtotal, setPreviewSubtotal] = useState('0');

  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [gateTarget, setGateTarget] = useState<{ key: string; label: string; value: boolean } | null>(null);
  const [gatePassword, setGatePassword] = useState('');
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else { setLoading(true); setLoadError(null); }
    try {
      const s = await AdminService.getPlatformSettings();
      setSettings(s);
      setBranding({ platformName: s?.platformName || '', currency: s?.currency || '' });
      setCommission(String(s?.defaultCommissionRate ?? ''));
      setPricing({
        deliveryBaseFee: String(s?.deliveryBaseFee ?? s?.defaultDeliveryFee ?? ''),
        distanceFeePerKm: String(s?.distanceFeePerKm ?? ''),
        deliveryMinFee: String(s?.deliveryMinFee ?? ''),
        deliveryMaxFee: String(s?.deliveryMaxFee ?? ''),
        freeDeliveryThreshold: String(s?.freeDeliveryThreshold ?? ''),
        maxDeliveryDistance: String(s?.maxDeliveryDistance ?? ''),
      });
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load global configuration.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveBranding = async () => {
    setSaving('branding'); setSaveError(null);
    try {
      const updated = await AdminService.updatePlatformSettings({ platformName: branding.platformName.trim(), currency: branding.currency.trim() });
      setSettings(updated);
      showToast('Branding Updated', 'Marketplace identity saved.', 'success');
    } catch (e: any) {
      setSaveError(e?.message || 'Could not save branding.');
    } finally {
      setSaving(null);
    }
  };

  const saveEconomics = async () => {
    setSaving('economics'); setSaveError(null);
    try {
      const updated = await AdminService.updatePlatformSettings({ defaultCommissionRate: Number(commission) });
      setSettings(updated);
      showToast('Rates Committed', 'Merchant commission updated.', 'success');
    } catch (e: any) {
      setSaveError(e?.message || 'Could not commit rates.');
    } finally {
      setSaving(null);
    }
  };

  const savePricing = async () => {
    setSaving('pricing'); setSaveError(null);
    try {
      const updated = await AdminService.updatePlatformSettings({
        deliveryBaseFee: num(pricing.deliveryBaseFee, 3),
        distanceFeePerKm: num(pricing.distanceFeePerKm, 0),
        deliveryMinFee: num(pricing.deliveryMinFee, 3),
        deliveryMaxFee: num(pricing.deliveryMaxFee, 20),
        freeDeliveryThreshold: num(pricing.freeDeliveryThreshold, 0),
        maxDeliveryDistance: num(pricing.maxDeliveryDistance, 20),
      });
      setSettings(updated);
      showToast('Delivery Pricing Updated', 'Checkout delivery fees updated across the platform.', 'success');
    } catch (e: any) {
      setSaveError(e?.message || 'Could not save delivery pricing.');
    } finally {
      setSaving(null);
    }
  };

  const saveGate = async () => {
    if (!gateTarget) return;
    setGateBusy(true); setGateError(null);
    try {
      const updated = await AdminService.updatePlatformSettings({ [gateTarget.key]: gateTarget.value }, gatePassword);
      setSettings(updated);
      showToast('Setting Updated', `${gateTarget.label} ${gateTarget.value ? 'enabled' : 'disabled'}.`, 'success');
      setGateTarget(null); setGatePassword('');
    } catch (e: any) {
      setGateError(e?.message || 'Could not update this setting. Check your password or permission.');
    } finally {
      setGateBusy(false);
    }
  };

  // Live preview — mirrors the server-side computeDeliveryCharge logic.
  const baseFee = num(pricing.deliveryBaseFee, Number(settings?.deliveryBaseFee ?? settings?.defaultDeliveryFee ?? 3));
  const perKm = num(pricing.distanceFeePerKm, Number(settings?.distanceFeePerKm ?? 0));
  const minFee = num(pricing.deliveryMinFee, Number(settings?.deliveryMinFee ?? 3));
  const maxFee = num(pricing.deliveryMaxFee, Number(settings?.deliveryMaxFee ?? 20));
  const freeThreshold = num(pricing.freeDeliveryThreshold, Number(settings?.freeDeliveryThreshold ?? 0));
  const maxDist = num(pricing.maxDeliveryDistance, Number(settings?.maxDeliveryDistance ?? 20));
  const sampleKm = num(previewDistance, 3);
  const sampleSubtotal = num(previewSubtotal, 0);

  const feeFor = (km: number) => {
    if (maxDist > 0 && km > maxDist) return null;
    let fee = baseFee + km * perKm;
    if (minFee > 0) fee = Math.max(fee, minFee);
    if (maxFee > 0) fee = Math.min(fee, maxFee);
    if (freeThreshold > 0 && sampleSubtotal >= freeThreshold) fee = 0;
    return Math.round(fee * 100) / 100;
  };

  const sampleFee = feeFor(sampleKm);

  if (loading && !settings) return <AdminLoading message="Reading global configuration store..." />;
  if (loadError && !settings) return <AdminError message="Unable to load platform settings." detail={loadError} retry={() => load()} />;

  const sections = [
    { id: 'PLATFORM', label: 'Platform Core', icon: Globe },
    { id: 'ORDERS & DELIVERY', label: 'Economics & Delivery', icon: Activity },
    { id: 'REGISTRATION', label: 'Registration Flow', icon: ShieldCheck },
    { id: 'PAYMENTS', label: 'Financial Gateways', icon: CreditCard },
    { id: 'COMMUNICATION', label: 'Broadcast Logic', icon: Bell },
    { id: 'SYSTEM', label: 'Infrastructure', icon: Database },
  ];

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={Settings}
        title="Platform Governance"
        description="Global system configuration. Modify core economics, delivery pricing, infrastructure behavior, and authorization policies."
        stats={<AdminBadge status="operational" label="Operational" />}
        actions={
          <Button variant="outline" className="h-9 px-4 rounded-xl text-sm font-semibold" onClick={() => load(true)} disabled={refreshing}>
             <RefreshCw className={cn('w-3.5 h-3.5 mr-2', refreshing && 'animate-spin')} /> Reload
          </Button>
        }
      />

      <div className="grid lg:grid-cols-4 gap-8">
         <div className="lg:col-span-1 space-y-2 sticky top-24 h-fit">
            {sections.map(s => (
               <button
                  key={s.id}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-2 transition-colors text-left group"
                  onClick={() => {
                     const el = document.getElementById(`section-${s.id}`);
                     if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
               >
                  <div className="flex items-center gap-3">
                     <s.icon className="w-4 h-4 text-ink-3 group-hover:text-primary transition-colors" />
                     <span className="text-[10px] font-black text-ink uppercase tracking-widest">{s.label}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-ink-3 opacity-0 group-hover:opacity-100 transition-all" />
               </button>
            ))}
         </div>

         <div className="lg:col-span-3 space-y-8">
            <div id="section-PLATFORM">
            <AdminCard title="Identity & Branding" icon={Globe}>
               <div className="grid sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <Label className="block text-xs font-semibold text-ink-3">Marketplace Name</Label>
                     <Input value={branding.platformName} onChange={e => setBranding({ ...branding, platformName: e.target.value })} className="h-11 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                     <Label className="block text-xs font-semibold text-ink-3">Global Currency</Label>
                     <Input value={branding.currency} onChange={e => setBranding({ ...branding, currency: e.target.value.toUpperCase() })} className="h-11 rounded-xl text-sm uppercase" />
                  </div>
               </div>
               <div className="pt-6 mt-6 border-t border-line flex justify-end">
                  <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold" onClick={saveBranding} disabled={saving === 'branding'}>
                     {saving === 'branding' ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving…</> : 'Update Branding'}
                  </Button>
               </div>
            </AdminCard>
            </div>

            <div id="section-ORDERS & DELIVERY">
            <div className="grid lg:grid-cols-2 gap-6">
               <AdminCard title="Merchant Commission" icon={Activity}>
                  <div className="space-y-2">
                     <Label className="block text-xs font-semibold text-ink-3">Default Commission (%)</Label>
                     <Input type="number" value={commission} onChange={e => setCommission(e.target.value)} className="h-11 rounded-xl text-sm" />
                     <p className="text-[10px] text-ink-3 font-medium">Applied to new merchant accounts; existing stores keep their own rate.</p>
                  </div>
                  <div className="pt-6 mt-6 border-t border-line flex justify-end">
                     <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold" onClick={saveEconomics} disabled={saving === 'economics'}>
                        {saving === 'economics' ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving…</> : 'Commit Rate'}
                     </Button>
                  </div>
               </AdminCard>

               <AdminCard title="Delivery Pricing" subtitle="Live preview of the fee customers are charged at checkout" icon={Bike}>
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <Label className="block text-[11px] font-semibold text-ink-3">Sample Distance (km)</Label>
                           <Input type="number" value={previewDistance} onChange={e => setPreviewDistance(e.target.value)} className="h-10 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5">
                           <Label className="block text-[11px] font-semibold text-ink-3">Sample Subtotal ($)</Label>
                           <Input type="number" value={previewSubtotal} onChange={e => setPreviewSubtotal(e.target.value)} className="h-10 rounded-xl text-sm" />
                        </div>
                     </div>
                     <div className="rounded-xl border border-line bg-surface-2/60 px-4 py-3 flex items-center justify-between">
                        <div>
                           <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Calculated Fee</p>
                           <p className="text-xs text-ink-2">Free delivery if subtotal ≥ ${freeThreshold.toFixed(2)}{freeThreshold > 0 ? '' : ' (disabled)'}</p>
                        </div>
                        {sampleFee === null ? (
                           <AdminBadge status="error" label={`Over ${maxDist}km — unavailable`} />
                        ) : sampleFee === 0 ? (
                           <AdminBadge status="success" label="Free delivery" />
                        ) : (
                           <p className="text-2xl font-black text-ink">${sampleFee.toFixed(2)}</p>
                        )}
                     </div>
                     <div className="space-y-1.5">
                        {PREVIEW_DISTANCES.map(km => {
                           const f = feeFor(km);
                           return (
                              <div key={km} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5 text-xs">
                                 <span className="text-ink-3 font-medium">{km} km</span>
                                 {f === null
                                    ? <AdminBadge status="error" label="Unavailable" />
                                    : f === 0 ? <AdminBadge status="success" label="Free" />
                                    : <span className="font-black text-ink">${f.toFixed(2)}</span>}
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </AdminCard>
            </div>

            <AdminCard title="Delivery Pricing Formula" subtitle="Base + per-km, clamped between min and max" icon={TrendingUp} noPadding>
               <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6 py-5">
                  {PRICING_FIELDS.map(f => (
                     <div key={f.key} className="space-y-1.5">
                        <Label className="block text-[11px] font-semibold text-ink-3">{f.label} <span className="text-ink-3/60">({f.suffix})</span></Label>
                        <Input
                           type="number"
                           value={pricing[f.key]}
                           onChange={e => setPricing({ ...pricing, [f.key]: e.target.value })}
                           className="h-10 rounded-xl text-sm"
                           placeholder={String(f.suffix === 'km' || f.suffix === '$/km' ? 0 : 0)}
                        />
                        <p className="text-[10px] text-ink-3 leading-relaxed">{f.desc}</p>
                     </div>
                  ))}
               </div>
               <div className="px-6 py-4 border-t border-line flex items-center justify-between">
                  <p className="text-[10px] text-ink-3 font-medium">Changes apply to new checkout calculations immediately. Rider-assigned deliveries keep the rider&apos;s negotiated fee.</p>
                  <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold" onClick={savePricing} disabled={saving === 'pricing'}>
                     {saving === 'pricing' ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving…</> : 'Commit Pricing'}
                  </Button>
               </div>
            </AdminCard>
            </div>

            {saveError && <p className="text-xs font-medium text-danger">{saveError}</p>}

            <div id="section-REGISTRATION">
            <AdminCard title="Gating & Availability" icon={ShieldCheck} noPadding>
               <div className="divide-y divide-line">
                  {GATE_ITEMS.map(item => (
                    <div key={item.key} className="p-6 flex items-center justify-between hover:bg-surface-2/30 transition-colors">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <p className="text-xs font-black text-ink uppercase tracking-tight">{item.label}</p>
                             <AdminBadge status={item.risk} label="Sensitive" />
                          </div>
                          <p className="text-[10px] text-ink-3 font-medium uppercase tracking-widest">Master gate for platform ingress · requires re-auth</p>
                       </div>
                       <Switch
                         checked={!!settings?.[item.key]}
                         onCheckedChange={(v) => setGateTarget({ key: item.key, label: item.label, value: v })}
                         aria-label={`Toggle ${item.label}`}
                       />
                    </div>
                  ))}
               </div>
            </AdminCard>
            </div>
         </div>
      </div>

      <AdminModal
        open={!!gateTarget}
        onClose={() => !gateBusy && setGateTarget(null)}
        icon={AlertTriangle}
        title={gateTarget?.value ? `Enable ${gateTarget?.label}?` : `Disable ${gateTarget?.label}?`}
        subtitle="Sensitive platform gate — your password is required."
        danger
        footer={
          <>
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={gateBusy} onClick={() => setGateTarget(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={!gatePassword || gateBusy} onClick={saveGate}>
              {gateBusy ? 'Confirming…' : 'Confirm Change'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-2">This change takes effect immediately across the marketplace and is recorded in the immutable audit trail.</p>
          <div>
            <Label className="mb-2 block text-xs font-semibold text-ink-3">Current Password</Label>
            <Input type="password" value={gatePassword} onChange={e => setGatePassword(e.target.value)} className="h-11 rounded-xl text-sm" autoFocus />
          </div>
          {gateError && <p className="text-xs font-medium text-danger">{gateError}</p>}
        </div>
      </AdminModal>
    </div>
  );
}