import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings, ShieldCheck, Globe, CreditCard, Bell, Activity,
  Database, RefreshCw, ChevronRight, AlertTriangle, Loader2, Bike, TrendingUp,
  Flame, Gauge, History
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Switch } from '@/src/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge,
  AdminStatus, AdminLoading, AdminError, AdminModal
} from '@/src/components/super-admin/AdminDesignSystem';
import { cn } from '@/src/lib/utils';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';

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

// Mirrors server-side getFuelPriceInfo + computeFuelMultiplier exactly.
function fuelEngineFromState(f: any) {
  const none = { available: false, changePct: 0, adjustPct: 0, multiplier: 1, applied: false, paused: false, weight: 0 };
  if (!f || !f.info) return none;
  const info = f.info;
  const current = Number(info.current);
  const reference = Number(info.reference);
  const weight = Number(info.weight) || 0;
  const available = Number.isFinite(current) && current > 0;
  const changePct = reference > 0 && Number.isFinite(current) ? Math.round(((current - reference) / reference) * 10000) / 100 : 0;
  const adjustPct = Math.round(changePct * (weight / 100) * 100) / 100;
  if (!available || reference <= 0) return { ...none, available, changePct, adjustPct, weight };
  const maxInc = Number(f.maxAutoIncreasePct) || 10;
  const maxDec = Number(f.maxAutoDecreasePct) || 10;
  if (changePct > maxInc || changePct < -Math.abs(maxDec)) {
    return { available, changePct, adjustPct, multiplier: 1, applied: false, paused: true, weight };
  }
  return { available, changePct, adjustPct, multiplier: Math.max(0, 1 + adjustPct / 100), applied: true, paused: false, weight };
}

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

  // ---- Fuel price / delivery adjustment engine state ----
  const [fuel, setFuel] = useState<any>(null);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [fuelConfig, setFuelConfig] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridePrice, setOverridePrice] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePassword, setOverridePassword] = useState('');
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const [proposalFor, setProposalFor] = useState<'approve' | 'reject' | null>(null);
  const [proposalPassword, setProposalPassword] = useState('');
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

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

  const loadFuel = useCallback(async () => {
    setFuelLoading(true); setFuelError(null);
    try {
      const [f, v]: any[] = await Promise.all([
        AdminService.getFuelPrice(),
        AdminService.getPricingVersions({ page: 1, pageSize: 5 }).catch(() => ({ items: [] })),
      ]);
      setFuel(f);
      setVersions(Array.isArray(v?.items) ? v.items : []);
      setFuelConfig(prev => {
        const merged = {
          ...prev,
          current: String(f?.info?.current ?? prev.current ?? ''),
          reference: String(f?.info?.reference ?? prev.reference ?? ''),
          providerUrl: f?.fuelProviderUrl ?? prev.providerUrl ?? '',
          costWeight: String(f?.info?.weight ?? prev.costWeight ?? 40),
          mode: f?.fuelAdjustmentMode ?? prev.mode ?? 'automatic',
          maxIncrease: String(f?.maxAutoIncreasePct ?? prev.maxIncrease ?? 10),
          maxDecrease: String(f?.maxAutoDecreasePct ?? prev.maxDecrease ?? 10),
        };
        return merged;
      });
    } catch (e: any) {
      setFuelError(e?.message || 'Could not load fuel pricing data.');
    } finally {
      setFuelLoading(false);
    }
  }, []);

  useEffect(() => { loadFuel(); }, [loadFuel]);

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

  const saveFuelConfig = async () => {
    setSaving('fuel'); setSaveError(null);
    try {
      const updated = await AdminService.updatePlatformSettings({
        fuelPriceCurrent: num(fuelConfig.current, 0),
        fuelPriceReference: num(fuelConfig.reference, 0),
        fuelProviderUrl: fuelConfig.providerUrl.trim(),
        fuelCostWeight: num(fuelConfig.costWeight, 40),
        fuelAdjustmentMode: fuelConfig.mode,
        maxAutoIncreasePct: num(fuelConfig.maxIncrease, 10),
        maxAutoDecreasePct: num(fuelConfig.maxDecrease, 10),
      });
      setSettings(updated);
      showToast('Fuel Config Updated', 'Fuel pricing configuration committed and versioned.', 'success');
      loadFuel();
    } catch (e: any) {
      setSaveError(e?.message || 'Could not save fuel configuration.');
    } finally {
      setSaving(null);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const r: any = await AdminService.syncFuelPrice({ source: fuel?.info?.source || 'api' });
      if (r?.flagged) {
        showToast('Fuel Price Flagged', r.message || 'Large fuel change — approval required before fees move.', 'warning');
      } else {
        showToast('Fuel Price Synced', r?.message || 'Fuel price refreshed and applied automatically.', 'success');
      }
      loadFuel();
    } catch (e: any) {
      showToast('Sync Unavailable', e?.message || 'Fuel provider unreachable. Last verified price retained.', 'warning');
    } finally {
      setSyncing(false);
    }
  };

  const runOverride = async () => {
    setOverrideBusy(true); setOverrideError(null);
    try {
      const r: any = await AdminService.overrideFuelPrice({
        price: Number(overridePrice),
        reason: overrideReason.trim() || undefined,
        password: overridePassword,
      });
      showToast('Fuel Price Overridden', `Fuel price set to GH₵${Number(r?.newValue ?? 0).toFixed(2)} (pricing version ${r?.pricingVersion ?? '—'}).`, 'success');
      setOverrideOpen(false); setOverridePrice(''); setOverrideReason(''); setOverridePassword('');
      loadFuel();
    } catch (e: any) {
      const msg = e?.message || 'Override failed.';
      setOverrideError(/reauth|password|re-authenticate/i.test(msg) ? 'Current password is incorrect.' : msg);
    } finally {
      setOverrideBusy(false);
    }
  };

  const runProposal = async () => {
    if (!proposalFor || !proposalPassword) return;
    setProposalBusy(true); setProposalError(null);
    try {
      if (proposalFor === 'approve') {
        await AdminService.approveFuelProposal(proposalPassword);
        showToast('Proposal Approved', 'New fuel price applied with a new pricing version.', 'success');
      } else {
        await AdminService.rejectFuelProposal(proposalPassword);
        showToast('Proposal Rejected', 'Active fuel price unchanged.', 'warning');
      }
      setProposalFor(null); setProposalPassword('');
      loadFuel();
    } catch (e: any) {
      const msg = e?.message || 'Action failed.';
      setProposalError(/reauth|password|re-authenticate/i.test(msg) ? 'Current password is incorrect.' : msg);
    } finally {
      setProposalBusy(false);
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

  // Fuel engine mirror — identical math to the server's computeFuelMultiplier.
  const fuelCalc = useMemo(() => fuelEngineFromState(fuel), [fuel]);

  const feeFor = (km: number) => {
    if (maxDist > 0 && km > maxDist) return null;
    let fee = baseFee + km * perKm;
    if (fuelCalc.applied) fee = fee * fuelCalc.multiplier;
    if (minFee > 0) fee = Math.max(fee, minFee);
    if (maxFee > 0) fee = Math.min(fee, maxFee);
    if (freeThreshold > 0 && sampleSubtotal >= freeThreshold) fee = 0;
    return Math.round(fee * 100) / 100;
  };

  const fuelChangePct = fuelCalc.changePct;
  const fuelAdjustPct = fuelCalc.adjustPct;
  const fuelMultiplier = fuelCalc.multiplier;
  const fuelApplied = fuelCalc.applied;
  const fuelPaused = fuelCalc.paused;

  const samplePreFuel = sampleKm !== null ? baseFee + sampleKm * perKm : 0;
  const sampleFuelAdj = fuelApplied ? Math.round((samplePreFuel * (fuelMultiplier - 1)) * 100) / 100 : 0;

  const sampleFee = feeFor(sampleKm);

  const proposal = fuel?.pendingReview || null;

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

      {proposal && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-600">FLAG FOR SUPER ADMIN REVIEW — fuel price change pending approval</p>
              <p className="text-sm text-ink-2 mt-1">
                GH₵{Number(proposal.previousFuelPrice ?? 0).toFixed(2)} → GH₵{Number(proposal.newFuelPrice).toFixed(2)}{' '}
                ({proposal.fuelChangePct >= 0 ? '+' : ''}{proposal.fuelChangePct}%).{' '}
                {proposal.expectedImpact || 'Automatic delivery adjustment is paused pending approval.'}
              </p>
              {proposal.reason && <p className="text-xs text-ink-3 mt-0.5">Reason: {proposal.reason}</p>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setProposalFor('reject'); setProposalError(null); setProposalPassword(''); }}>Reject</Button>
            <Button size="sm" className="rounded-xl" onClick={() => { setProposalFor('approve'); setProposalError(null); setProposalPassword(''); }}>Approve &amp; Apply</Button>
          </div>
        </div>
      )}

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
                     <div className="rounded-xl border border-line divide-y divide-line text-[11px]">
                        <div className="flex items-center justify-between px-3 py-2 text-ink-2">
                           <span className="font-medium">Base + distance (${baseFee.toFixed(2)} + {sampleKm}km × ${perKm.toFixed(2)})</span>
                           <span className="font-bold text-ink">${samplePreFuel.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 text-ink-2">
                           <span className="flex items-center gap-1.5 font-medium"><Flame className="h-3 w-3 text-orange-500" /> Fuel adjustment (×{fuelMultiplier.toFixed(3)})</span>
                           {fuelPaused
                              ? <AdminBadge status="warning" label="Paused" />
                              : <span className={cn('font-black', fuelApplied ? 'text-ink' : 'text-ink-3')}>{fuelApplied ? `${sampleFuelAdj >= 0 ? '+' : ''}$${sampleFuelAdj.toFixed(2)}` : '(no fuel data)'}</span>}
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 bg-surface-2/40">
                           <span className="font-black uppercase tracking-wide text-ink-3">Final fee</span>
                           <span className="font-black text-ink">${sampleFee === null ? '—' : sampleFee.toFixed(2)}</span>
                        </div>
                     </div>
                     <div className="flex flex-wrap items-center gap-2">
                        <AdminBadge status={fuelApplied ? 'success' : fuelPaused ? 'warning' : 'info'} label={fuelApplied ? 'Fuel adjustment active' : fuelPaused ? 'Fuel adjustment paused — review' : 'No fuel data · 1× fee'} />
                        {fuelApplied && fuelChangePct !== 0 && (
                           <AdminBadge status="info" label={`${fuelChangePct >= 0 ? '+' : ''}${fuelChangePct}% fuel change → ${fuelAdjustPct >= 0 ? '+' : ''}${fuelAdjustPct}% fee`} />
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

             <AdminCard
               title="Fuel Price Engine"
               subtitle="Fuel-price data feeds the shared delivery-pricing engine used at checkout, order math and rider charts"
               icon={Flame}
               actions={
                 <div className="flex items-center gap-2">
                   {fuelLoading && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
                   <AdminBadge
                     status={fuelApplied ? 'success' : fuelPaused ? 'warning' : 'info'}
                     label={fuelApplied ? 'Adjusting fees' : fuelPaused ? 'Paused — review' : 'Source unavailable'}
                   />
                 </div>
               }
             >
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
<div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
                     <AnimatedTooltip variant="indis" content="Latest verified fuel price used by the delivery-pricing engine. A value of 0 means no fuel data is available and the fuel component stays at 1×." triggerClassName="px-1 py-0.5">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3">Current Price</p>
                     </AnimatedTooltip>
                     <p className="text-xl font-black text-ink mt-1">GH₵{Number(fuel?.info?.current ?? 0).toFixed(2)}</p>
                     <p className="text-[10px] text-ink-3 mt-0.5">Source: {(fuel?.info?.source || 'manual').toUpperCase()}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
                     <AnimatedTooltip variant="indis" content="The baseline fuel price that all change percentages are measured against. The reference is captured when fuel data is first committed." triggerClassName="px-1 py-0.5">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3">Reference</p>
                     </AnimatedTooltip>
                     <p className="text-xl font-black text-ink mt-1">GH₵{Number(fuel?.info?.reference ?? 0).toFixed(2)}</p>
                     <p className="text-[10px] text-ink-3 mt-0.5">Cost weight: {Number(fuel?.info?.weight ?? 0)}%</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
                     <AnimatedTooltip variant="indis" content="The percent change from the reference price. The fee adjustment = change% × cost weight, clamped to the automatic increase/decrease limits unless a Super Admin approves a larger move." triggerClassName="px-1 py-0.5">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3">Fuel Change</p>
                     </AnimatedTooltip>
                     <p className={cn('text-xl font-black mt-1', fuelChangePct > 0 ? 'text-ink' : fuelChangePct < 0 ? 'text-ink' : 'text-ink-3')}>{fuelChangePct === 0 ? '0%' : `${fuelChangePct >= 0 ? '+' : ''}${fuelChangePct}%`}</p>
                     <p className="text-[10px] text-ink-3 mt-0.5">Fee adjustment: {fuelAdjustPct === 0 ? '0%' : `${fuelAdjustPct >= 0 ? '+' : ''}${fuelAdjustPct}%`}</p>
                  </div>
<div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
                    <AnimatedTooltip variant="indis" content="The factor applied to the base delivery fee. 1× means no adjustment; larger changes pause automatically until a Super Admin approves them." triggerClassName="px-1 py-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3">Multiplier</p>
                    </AnimatedTooltip>
                    <p className="text-xl font-black text-ink mt-1">×{fuelMultiplier.toFixed(3)}</p>
                    <p className="text-[10px] text-ink-3 mt-0.5">
                      {fuelPaused ? `Beyond ±${Math.max(Number(fuel?.maxAutoIncreasePct ?? 10), Number(fuel?.maxAutoDecreasePct ?? 10))}% auto limit` : fuelApplied ? 'Auto-applying within limits' : 'Awaiting fuel data'}
                    </p>
                  </div>
               </div>
               <p className="text-[10px] text-ink-3 mt-3">
                 Last verified: {fuel?.fuelPriceLastVerifiedAt ? new Date(fuel.fuelPriceLastVerifiedAt).toLocaleString() : 'never'} · Status: {(fuel?.fuelPriceStatus || 'unavailable').toUpperCase()}
                 {' · '}Mode: {(fuel?.fuelAdjustmentMode || 'automatic').toUpperCase()}
               </p>

               <div className="pt-5 mt-5 border-t border-line grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="space-y-1.5">
                   <Label className="block text-[11px] font-semibold text-ink-3">Current Price (GH₵)</Label>
                   <Input type="number" value={fuelConfig.current} onChange={e => setFuelConfig({ ...fuelConfig, current: e.target.value })} className="h-10 rounded-xl text-sm" />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="block text-[11px] font-semibold text-ink-3">Reference Price (GH₵)</Label>
                   <Input type="number" value={fuelConfig.reference} onChange={e => setFuelConfig({ ...fuelConfig, reference: e.target.value })} className="h-10 rounded-xl text-sm" />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="block text-[11px] font-semibold text-ink-3">Fuel Cost Weight (%)</Label>
                   <Input type="number" value={fuelConfig.costWeight} onChange={e => setFuelConfig({ ...fuelConfig, costWeight: e.target.value })} className="h-10 rounded-xl text-sm" />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="block text-[11px] font-semibold text-ink-3">Adjustment Mode</Label>
                   <Select value={fuelConfig.mode} onValueChange={v => setFuelConfig({ ...fuelConfig, mode: v })}>
                     <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Mode" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="automatic">Automatic</SelectItem>
                       <SelectItem value="approval">Approval</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1.5">
                   <Label className="block text-[11px] font-semibold text-ink-3">Max Auto Increase (%)</Label>
                   <Input type="number" value={fuelConfig.maxIncrease} onChange={e => setFuelConfig({ ...fuelConfig, maxIncrease: e.target.value })} className="h-10 rounded-xl text-sm" />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="block text-[11px] font-semibold text-ink-3">Max Auto Decrease (%)</Label>
                   <Input type="number" value={fuelConfig.maxDecrease} onChange={e => setFuelConfig({ ...fuelConfig, maxDecrease: e.target.value })} className="h-10 rounded-xl text-sm" />
                 </div>
               </div>
               <div className="mt-4 space-y-1.5">
                 <Label className="block text-[11px] font-semibold text-ink-3">Fuel Provider URL</Label>
                 <Input value={fuelConfig.providerUrl} onChange={e => setFuelConfig({ ...fuelConfig, providerUrl: e.target.value })} placeholder="https://api.example.com/fuel-price" className="h-10 rounded-xl text-sm font-mono" />
                 <p className="text-[10px] text-ink-3 font-medium">When set, Sync pulls the latest price from this endpoint; a source failure retains the last verified price and surfaces SOURCE UNAVAILABLE — no number is invented.</p>
               </div>

               <div className="pt-5 mt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
                 <p className="text-[10px] text-ink-3 font-medium">Any committed change bumps the pricing version; historical orders keep the version active when they were created.</p>
                 <div className="flex flex-wrap gap-2">
                   <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={runSync} disabled={syncing}>
                     {syncing ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Syncing…</> : <><RefreshCw className="w-3.5 h-3.5 mr-2" /> Sync</>}
                   </Button>
                   <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={() => { setOverrideOpen(true); setOverrideError(null); }}>Manual Override</Button>
                   <Button size="sm" className="h-9 rounded-xl px-3 text-xs" onClick={saveFuelConfig} disabled={saving === 'fuel'}>
                     {saving === 'fuel' ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving…</> : 'Commit Config'}
                   </Button>
                 </div>
               </div>
               {fuelError && <p className="text-xs font-medium text-danger mt-3">{fuelError}</p>}
             </AdminCard>

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

            <AdminCard title="Pricing Versions" subtitle={`Historical snapshots — orders keep the version active at creation`} icon={History} noPadding>
               {versions.length === 0 ? (
                 <p className="px-6 py-8 text-center text-xs text-ink-3">No pricing versions recorded yet. Committing pricing or fuel changes creates versioned snapshots.</p>
               ) : (
                 <div className="divide-y divide-line">
                   {versions.map(v => (
                     <div key={v.version} className="px-6 py-3.5 flex items-center justify-between gap-4">
                       <div className="min-w-0">
                         <div className="flex items-center gap-2">
                           <span className="font-mono text-xs font-black text-ink">v{v.version}</span>
                           <AdminBadge status={fuel?.currentPricingVersion === v.version ? 'success' : 'info'} label={fuel?.currentPricingVersion === v.version ? 'Active' : 'Superseded'} />
                         </div>
                         <p className="text-[10px] text-ink-3 mt-0.5">{new Date(v.timestamp).toLocaleString()} · {v.changedBy}</p>
                       </div>
                       <div className="text-right shrink-0">
                         <p className="max-w-[260px] truncate text-[10px] font-medium text-ink-3">{v.reason || 'pricing update'}</p>
                         <p className="font-mono text-[11px] text-ink-2 mt-0.5">
                           {(v.before?.fuelPriceCurrent !== undefined ? `GH₵${Number(v.before.fuelPriceCurrent ?? 0).toFixed(2)}` : v.before?.deliveryBaseFee !== undefined ? `$${Number(v.before.deliveryBaseFee ?? 0).toFixed(2)}` : '—')}
                           {' → '}
                           {(v.after?.fuelPriceCurrent !== undefined ? `GH₵${Number(v.after.fuelPriceCurrent ?? 0).toFixed(2)}` : v.after?.deliveryBaseFee !== undefined ? `$${Number(v.after.deliveryBaseFee ?? 0).toFixed(2)}` : '—')}
                         </p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
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

      <AdminModal
        open={overrideOpen}
        onClose={() => !overrideBusy && setOverrideOpen(false)}
        icon={Flame}
        title="Manual Fuel Price Override"
        subtitle="Explicit operator confirmation — bypasses the automatic approval gate."
        footer={
          <>
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={overrideBusy} onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={!overridePrice || !overridePassword || overrideBusy} onClick={runOverride}>
              {overrideBusy ? 'Applying…' : 'Apply Override'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-2">Commit a verified fuel price in GH₵. The change is versioned and written to the audit trail with before/after values.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block text-xs font-semibold text-ink-3">New Fuel Price (GH₵)</Label>
              <Input type="number" value={overridePrice} onChange={e => setOverridePrice(e.target.value)} className="h-11 rounded-xl text-sm" autoFocus />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold text-ink-3">Current Password</Label>
              <Input type="password" value={overridePassword} onChange={e => setOverridePassword(e.target.value)} className="h-11 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-xs font-semibold text-ink-3">Reason (optional)</Label>
            <Input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="e.g. national fuel price adjustment" className="h-11 rounded-xl text-sm" />
          </div>
          {overrideError && <p className="text-xs font-medium text-danger">{overrideError}</p>}
        </div>
      </AdminModal>

      <AdminModal
        open={!!proposalFor}
        onClose={() => !proposalBusy && setProposalFor(null)}
        icon={AlertTriangle}
        title={proposalFor === 'approve' ? 'Approve Fuel Price Proposal?' : 'Reject Fuel Price Proposal?'}
        subtitle={`GH₵${Number(proposal?.previousFuelPrice ?? 0).toFixed(2)} → GH₵${Number(proposal?.newFuelPrice).toFixed(2)} (${proposal?.fuelChangePct >= 0 ? '+' : ''}${proposal?.fuelChangePct}%)`}
        danger={proposalFor === 'reject'}
        footer={
          <>
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={proposalBusy} onClick={() => setProposalFor(null)}>Cancel</Button>
            <Button variant={proposalFor === 'reject' ? 'danger' : 'primary'} className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={!proposalPassword || proposalBusy} onClick={runProposal}>
              {proposalBusy ? 'Confirming…' : proposalFor === 'approve' ? 'Approve & Apply' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-2">
            {proposalFor === 'approve'
              ? 'Approval applies the staged price with a new pricing version. Delivery fees move according to the shared fuel engine.'
              : 'Rejection keeps the last verified price active. No pricing version change occurs.'}
          </p>
          <div>
            <Label className="mb-2 block text-xs font-semibold text-ink-3">Current Password</Label>
            <Input type="password" value={proposalPassword} onChange={e => setProposalPassword(e.target.value)} className="h-11 rounded-xl text-sm" autoFocus />
          </div>
          {proposalError && <p className="text-xs font-medium text-danger">{proposalError}</p>}
        </div>
      </AdminModal>
    </div>
  );
}