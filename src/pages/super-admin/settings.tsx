import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useBlocker, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { Switch } from '@/src/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import { CheckCircle2, Loader2 } from 'lucide-react';

type Risk = 'low' | 'medium' | 'high';

interface NumericSettingProps {
  value: string;
  onChange: (v: string) => void;
  current: number | null | undefined;
  suffix: string;
  saving: boolean;
  error?: string;
  saved?: string;
  onApply: () => void;
}

// Inline numeric field with real per-control saving/loading/success/error state.
// Shows the current server value, prevents negatives, and only shows a success
// marker after the backend confirms the change. No fake optimistic success.
function NumericSetting({ value, onChange, current, suffix, saving, error, saved, onApply }: NumericSettingProps) {
  // The current server value shown next to the field, converted to a readable
  // string (0 stays visible; null/undefined/empty are rendered as a dash).
  const currentText = current === null || current === undefined || Number.isNaN(current) ? '—' : String(current) + suffix;
  return (
    <div className="flex flex-col gap-1.5 min-w-[230px]">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="0.00"
            className={cnNumeric(error ? 'border-rose-400 focus:border-rose-500' : '')}
          />
        </div>
        <Button variant="outline" size="sm" className="h-9 rounded-lg min-w-[86px]" onClick={() => onApply()} disabled={saving}>
          {saving ? (
            <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</span>
          ) : 'Apply'}
        </Button>
        {saved && !error && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />{saved}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-500 font-medium">Current: {currentText}</p>
      {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
    </div>
  );
}

// Tailwind helper: merge a conditional class (keeps imports light here).
function cnNumeric(extra?: string) {
  return ['w-28 rounded-lg', extra || ''].filter(Boolean).join(' ');
}

interface SettingDef {
  section: string;
  title: string;
  desc: string;
  status?: string;
  risk?: Risk;
  render: () => ReactNode;
}

const TITLE_BY_KEY: Record<string, { enable: string; disable: string }> = {
  maintenanceMode: { enable: 'Enable maintenance mode', disable: 'Disable maintenance mode' },
  allowNewCustomers: { enable: 'Enable new customer registration', disable: 'Disable new customer registration' },
  allowNewVendors: { enable: 'Enable restaurant applications', disable: 'Disable restaurant applications' },
  allowNewRiders: { enable: 'Enable rider applications', disable: 'Disable rider applications' },
  notificationsEnabled: { enable: 'Enable system notifications', disable: 'Disable system notifications' },
};

const READABLE_BY_KEY: Record<string, string> = {
  maintenanceMode: 'Maintenance mode',
  allowNewCustomers: 'New customer registration',
  allowNewVendors: 'Restaurant applications',
  allowNewRiders: 'Rider applications',
  notificationsEnabled: 'System notifications',
};

interface ConfirmState {
  title: string;
  description: string;
  current?: string;
  next?: string;
  risk: Risk;
  requiresAuth: boolean;
  confirmLabel: string;
  busyLabel?: string;
  action: (password?: string) => Promise<void>;
}

interface SwitchMeta {
  risk: Risk;
  enableLabel: string;
  disableLabel: string;
  enableDesc: string;
  disableDesc: string;
}

const SWITCH_META: Record<string, SwitchMeta> = {
  maintenanceMode: {
    risk: 'high',
    enableLabel: 'Enable',
    disableLabel: 'Disable',
    enableDesc: 'Customers and other non-administrative users will be prevented from accessing normal marketplace operations until maintenance mode is turned off again.',
    disableDesc: 'The marketplace returns to normal operation for customers and partners.',
  },
  allowNewCustomers: {
    risk: 'high',
    enableLabel: 'Enable',
    disableLabel: 'Disable',
    enableDesc: 'New customer accounts can be registered again.',
    disableDesc: 'New customers will no longer be able to create accounts until this is enabled again. Existing accounts keep working.',
  },
  allowNewVendors: {
    risk: 'high',
    enableLabel: 'Enable',
    disableLabel: 'Disable',
    enableDesc: 'Restaurants can submit new applications again.',
    disableDesc: 'Restaurants will no longer be able to submit applications until this is enabled again.',
  },
  allowNewRiders: {
    risk: 'high',
    enableLabel: 'Enable',
    disableLabel: 'Disable',
    enableDesc: 'Riders can submit new applications again.',
    disableDesc: 'Riders will no longer be able to submit applications until this is enabled again.',
  },
  notificationsEnabled: {
    risk: 'high',
    enableLabel: 'Enable',
    disableLabel: 'Disable',
    enableDesc: 'System and order notifications are permitted again.',
    disableDesc: 'Non-critical system and order notifications are suppressed. Critical security alerts (account suspension, password resets, session revocation) remain mandatory.',
  },
};

function riskBadge(risk: Risk) {
  if (risk === 'high') return <Badge variant="danger">High risk</Badge>;
  if (risk === 'medium') return <Badge variant="warning">Medium risk</Badge>;
  return <Badge variant="default">Low risk</Badge>;
}

function SettingRow({ title, desc, risk, status, control }: { key?: string | number; title: string; desc: string; risk?: Risk; status?: string; control: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          {risk && riskBadge(risk)}
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>
        {status && <p className="text-xs mt-1 font-medium text-gray-600 dark:text-slate-300">{status}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

function Section({ title, blurb, children }: { key?: string | number; title: string; blurb: string; children: ReactNode }) {
  return (
    <Card className="rounded-2xl" hover={false}>
      <CardHeader>
        <CardTitle className="text-base text-gray-900 dark:text-white">{title}</CardTitle>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{blurb}</p>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const passwordValid = !state.requiresAuth || password.trim().length > 0;

  const confirm = async () => {
    if (state.requiresAuth && !password.trim()) { setError('Current password is required.'); return; }
    setError('');
    setBusy(true);
    // Re-authentication is verified server-side by the high-risk mutation itself
    // (the backend checks `password` against the current user's hash before
    // applying the change and writes the audit event). No separate pre-flight
    // call is made, so the mutation is never skipped by a redundant earlier step.
    try {
      await state.action(state.requiresAuth ? password : undefined);
      setPassword('');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Unable to apply this change. No changes were made.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="flex items-center justify-between mb-1">
          <h2 id="confirm-title" className="font-bold text-gray-900 dark:text-white">{state.title}</h2>
          {riskBadge(state.risk)}
        </div>
        <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">{state.description}</p>

        {(state.current !== undefined || state.next !== undefined) && (
          <div className="grid grid-cols-2 gap-2 my-4">
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Current</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mt-0.5">{state.current}</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
              <p className="text-[10px] uppercase tracking-wide text-amber-500">New</p>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mt-0.5">{state.next}</p>
            </div>
          </div>
        )}

        {state.requiresAuth && (
          <div className="mb-4">
            <Label htmlFor="reauth-password" className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
              Re-authentication required — enter your current password
            </Label>
            <Input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your current password"
              className="rounded-lg"
              disabled={busy}
              autoFocus
            />
          </div>
        )}

        {error && <p className="text-xs text-rose-600 dark:text-rose-400 mb-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2" role="alert">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button className="rounded-xl" disabled={busy || !passwordValid} onClick={confirm}>
            {busy ? (state.busyLabel || 'Applying…') : state.confirmLabel}
          </Button>
        </div>
        {state.requiresAuth && !passwordValid && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2" role="alert">Current password is required to continue.</p>
        )}
      </div>
    </div>
  );
}

export function SuperAdminSettingsPage() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [backupCount, setBackupCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // Grouped (low-risk) text edits are staged and saved together via review.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [generalErrors, setGeneralErrors] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Numeric fields keep their own working values before confirmation.
  const [commission, setCommission] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [distanceFee, setDistanceFee] = useState<string>('');
  const [platformFee, setPlatformFee] = useState<string>('');
  // Per-field numeric-save state: loading, real error, real success (only after
  // the server confirms). The server is always the source of truth.
  const [savingNumericKey, setSavingNumericKey] = useState<string | null>(null);
  const [numericError, setNumericError] = useState<Record<string, string>>({});
  const [numericSaved, setNumericSaved] = useState<Record<string, string>>({});

  // Apply a fully-fetched server payload to every control. This is the single
  // place that turns backend truth into page state, so both initial load and
  // "Refresh from server" stay consistent. Stale local edits are discarded when
  // the server is explicitly re-fetched (server is authoritative).
  const applyServerData = (s: any, g: any, h: any | null, b: any[]) => {
    setSettings(s);
    setGateways(Array.isArray(g) ? g : []);
    setHealth(h);
    setBackupCount(Array.isArray(b) ? b.length : null);
    setCommission(s ? String(s.defaultCommissionRate ?? '') : '');
    setDeliveryFee(s ? String(s.defaultDeliveryFee ?? '') : '');
    setDistanceFee(s ? String(s.distanceFeePerKm ?? '') : '');
    setPlatformFee(s ? String(s.platformFee ?? '') : '');
    setNumericError({});
    setNumericSaved({});
    setDraft({});
  };

  // Fetch the authoritative configuration from the real backend. The platform
  // settings + payment gateways are required; health/backups are best-effort so
  // their failure can never wipe the settings that matter.
  const fetchServerData = useCallback(async () => {
    const s = await AdminService.getPlatformSettings();
    const g = await AdminService.getPaymentGateways();
    const [h, b] = await Promise.all([
      AdminService.getSystemHealth().catch(() => null),
      AdminService.getBackups().catch(() => [] as any[]),
    ]);
    applyServerData(s, g, h, b);
    return s;
  }, []);

  useEffect(() => {
    let active = true;
    fetchServerData()
      .catch((err: any) => {
        console.error('[PlatformSettings] initial load failed:', err);
        if (active) setSettings(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchServerData]);

  // User-initiated resync with the backend. Shows real loading on the button,
  // blocks duplicate in-flight requests, and never replaces the current UI with
  // null on failure — the previous state is preserved and the error surfaced.
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const s = await fetchServerData();
      if (!s) throw new Error('Platform settings response was empty.');
      showToast('Settings refreshed', 'Settings refreshed from server.');
    } catch (err: any) {
      console.error('[PlatformSettings] refresh failed:', err);
      showToast('Refresh Failed', 'Unable to refresh settings. Please try again.', 'warning');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchServerData, showToast]);

  // Drafted value (falls back to the server value).
  const fieldValue = (key: string) => (key in draft ? draft[key] : settings ? String(settings[key] ?? '') : '');
  const pendingGeneral = useMemo(
    () => ['platformName', 'currency', 'supportEmail', 'smsSenderId'].filter(k => settings && (k in draft) && draft[k] !== String(settings[k] ?? '')).length,
    [draft, settings],
  );

  // Warn before leaving with unsaved grouped edits.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    pendingGeneral > 0 && currentLocation.pathname !== nextLocation.pathname,
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  useEffect(() => {
    if (blocker.state === 'blocked') setLeaveOpen(true);
  }, [blocker.state]);

  const validateField = (key: string, value: string): string | null => {
    if (key === 'platformName') {
      const v = value.trim();
      if (v.length < 2 || v.length > 60) return 'Platform name must be between 2 and 60 characters.';
    }
    if (key === 'currency') {
      if (!/^[A-Z]{3}$/.test(value.trim().toUpperCase())) return 'Currency must be a 3-letter code (e.g. GHS).';
    }
    if (key === 'supportEmail') {
      const v = value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Support email must be a valid email address.';
    }
    if (key === 'smsSenderId') {
      if (value.length > 20) return 'SMS sender id must be 20 characters or fewer.';
    }
    return null;
  };

  const setDraftField = (key: string, value: string) => {
    setDraft(d => ({ ...d, [key]: value }));
    setGeneralErrors(e => ({ ...e, [key]: validateField(key, value) || '' }));
  };

  const requestToggle = (key: string, next: boolean) => {
    if (!settings) return;
    const meta = SWITCH_META[key];
    const label = (v: boolean) => (v ? 'Enabled' : 'Disabled');
    setConfirm({
      title: next ? TITLE_BY_KEY[key].enable : TITLE_BY_KEY[key].disable,
      description: next ? meta.enableDesc : meta.disableDesc,
      current: label(settings[key]),
      next: label(next),
      risk: meta.risk,
      requiresAuth: meta.risk === 'high',
      confirmLabel: next ? meta.enableLabel : meta.disableLabel,
      busyLabel: next ? 'Enabling…' : 'Disabling…',
      action: async (pw?: string) => {
        const s = await AdminService.updatePlatformSettings({ [key]: next }, pw);
        setSettings(s);
        showToast('Setting Applied', `${READABLE_BY_KEY[key]} ${next ? 'enabled' : 'disabled'} and audited.`);
      },
    });
  };

  const requestApprovalMode = (key: 'vendorApprovalMode' | 'riderApprovalMode', next: 'manual' | 'automatic') => {
    if (!settings) return;
    const isVendor = key === 'vendorApprovalMode';
    const current = settings[key] === 'automatic' ? 'Automatic' : 'Manual';
    setConfirm({
      title: `Change ${isVendor ? 'restaurant' : 'rider'} approval mode`,
      description: next === 'automatic'
        ? `${isVendor ? 'Restaurant' : 'Rider'} applications will be approved automatically at signup instead of waiting for manual review.`
        : `${isVendor ? 'Restaurant' : 'Rider'} applications will wait for manual review in the Approvals console.`,
      current,
      next: next === 'automatic' ? 'Automatic' : 'Manual',
      risk: 'high',
      requiresAuth: true,
      confirmLabel: next === 'automatic' ? 'Switch to Automatic' : 'Switch to Manual',
      action: async (pw?: string) => {
        const s = await AdminService.updatePlatformSettings({ [key]: next }, pw);
        setSettings(s);
        showToast('Setting Applied', `${isVendor ? 'Restaurant' : 'Rider'} approval mode changed to ${next} and audited.`);
      },
    });
  };

  const editNumeric = (key: string, setter: (v: string) => void, v: string) => {
    setter(v);
    setNumericError(e => { const n = { ...e }; delete n[key]; return n; });
    setNumericSaved(s => { const n = { ...s }; delete n[key]; return n; });
  };

  // Applies a numeric platform setting through the real backend and refreshes
  // from the returned server state. Validation happens here before any request;
  // success UI only appears after the server confirms.
  const NUMERIC_LABELS: Record<string, string> = {
    defaultCommissionRate: 'Commission rate',
    defaultDeliveryFee: 'Default delivery fee',
    distanceFeePerKm: 'Distance fee (per km)',
    platformFee: 'Platform fee (PACKAGE/PASS)',
  };

  const saveNumeric = async (key: string, raw: string, setter: (v: string) => void, max?: number) => {
    const value = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(value) || value < 0 || (max !== undefined && value > max)) {
      setNumericError(e => ({ ...e, [key]: max !== undefined ? `Enter a number between 0 and ${max}.` : 'Enter a non-negative number (decimals allowed).' }));
      setNumericSaved(s => { const n = { ...s }; delete n[key]; return n; });
      return;
    }
    setNumericError(e => { const n = { ...e }; delete n[key]; return n; });
    setSavingNumericKey(key);
    try {
      const s = await AdminService.updatePlatformSettings({ [key]: value });
      setSettings(s);
      setCommission(String(s.defaultCommissionRate ?? ''));
      setDeliveryFee(String(s.defaultDeliveryFee ?? ''));
      setDistanceFee(String(s.distanceFeePerKm ?? ''));
      setPlatformFee(String(s.platformFee ?? ''));
      setNumericSaved(n => ({ ...n, [key]: 'Saved' }));
      showToast('Setting Applied', `${NUMERIC_LABELS[key] || key} saved as ${value}.`);
    } catch (err: any) {
      setNumericError(e => ({ ...e, [key]: err?.message || 'Failed to save. No changes were applied.' }));
      setNumericSaved(s => { const n = { ...s }; delete n[key]; return n; });
      showToast('Save Failed', err?.message || 'Unable to save this setting.', 'warning');
    } finally {
      setSavingNumericKey(null);
    }
  };

  const saveGeneral = async () => {
    const errors = Object.values(generalErrors).filter(Boolean);
    if (errors.length) return;
    const changes: Record<string, string> = {};
    ['platformName', 'currency', 'supportEmail', 'smsSenderId'].forEach(k => {
      if (k in draft && draft[k] !== String(settings[k] ?? '')) changes[k] = k === 'currency' ? draft[k].trim().toUpperCase() : k === 'platformName' ? draft[k].trim() : draft[k].trim();
    });
    if (Object.keys(changes).length === 0) { setReviewOpen(false); return; }
    setSavingGeneral(true);
    try {
      const s = await AdminService.updatePlatformSettings(changes);
      setSettings(s);
      setDraft({});
      setGeneralErrors({});
      setReviewOpen(false);
      showToast('Settings Saved', 'Platform configuration updated and audited.');
    } catch (e: any) {
      showToast('Save Failed', e?.message || 'Unable to save. No changes were applied.', 'warning');
    } finally {
      setSavingGeneral(false);
    }
  };

  const requestGatewayToggle = (gw: any) => {
    const next = !gw.enabled;
    const label = (v: boolean) => (v ? 'Enabled' : 'Disabled');
    setConfirm({
      title: `${next ? 'Enable' : 'Disable'} ${gw.name}`,
      description: next
        ? 'Customers will be able to pay with this method at checkout. This requires valid backend configuration — a method without configuration cannot be enabled.'
        : `Customers will no longer be offered ${gw.name} at checkout. Existing orders are unaffected.`,
      current: label(gw.enabled),
      next: label(next),
      risk: 'high',
      requiresAuth: true,
      confirmLabel: next ? 'Enable Method' : 'Disable Method',
      action: async (pw?: string) => {
        const g = await AdminService.updatePaymentGateway(gw.id, { enabled: next }, pw);
        setGateways(Array.isArray(g) ? g : []);
        showToast('Payment Method Updated', `${gw.name} ${next ? 'enabled' : 'disabled'} and audited.`);
      },
    });
  };

  const gatewayStatus = (g: any) => {
    if (!g.configured) return { text: 'Not Configured', tone: 'danger' as const };
    if (g.enabled) return { text: 'Configured + Enabled', tone: 'success' as const };
    return { text: 'Configured · Disabled', tone: 'default' as const };
  };
  const operationalGateways = gateways.filter(g => g.configured && g.enabled).length;

  const settingDefs = useMemo<SettingDef[]>(() => {
    if (!settings) return [];
    const maintenance = !!settings.maintenanceMode;
    return [
      {
        section: 'PLATFORM',
        title: 'Platform name',
        desc: 'The name shown to customers and partners across the platform.',
        render: () => (
          <div className="w-48">
            <Input aria-label="Platform name" value={fieldValue('platformName')} onChange={e => setDraftField('platformName', e.target.value)} className="rounded-lg" />
            {generalErrors.platformName && <p className="text-[11px] text-rose-600 mt-1">{generalErrors.platformName}</p>}
          </div>
        ),
      },
      {
        section: 'PLATFORM',
        title: 'Default currency',
        desc: 'Three-letter ISO currency code used for platform money values.',
        render: () => (
          <div className="w-48">
            <Input aria-label="Default currency" value={fieldValue('currency')} maxLength={3} onChange={e => setDraftField('currency', e.target.value.toUpperCase())} className="rounded-lg uppercase" />
            {generalErrors.currency && <p className="text-[11px] text-rose-600 mt-1">{generalErrors.currency}</p>}
          </div>
        ),
      },
      {
        section: 'PLATFORM',
        title: 'Marketplace availability',
        desc: 'Live operational state enforced by the backend.',
        status: maintenance ? 'In maintenance — non-admin access rejected' : 'Online — accepting customers and partners',
        render: () => <Badge variant={maintenance ? 'danger' : 'success'}>{maintenance ? 'Maintenance' : 'Online'}</Badge>,
      },
      {
        section: 'PLATFORM',
        title: 'Maintenance mode',
        desc: 'Blocks non-administrative access to marketplace operations. High risk.',
        risk: 'high',
        render: () => (
          <Switch aria-label="Maintenance mode" checked={!!settings.maintenanceMode} onCheckedChange={v => requestToggle('maintenanceMode', v)} />
        ),
      },
      {
        section: 'REGISTRATION',
        title: 'New customer registration',
        desc: 'Controls whether new customer accounts can be created. Enforced at the registration endpoint.',
        risk: 'high',
        render: () => (
          <Switch aria-label="New customer registration" checked={!!settings.allowNewCustomers} onCheckedChange={v => requestToggle('allowNewCustomers', v)} />
        ),
      },
      {
        section: 'REGISTRATION',
        title: 'Restaurant applications',
        desc: 'Controls whether restaurants can submit new applications.',
        risk: 'high',
        render: () => (
          <Switch aria-label="Restaurant applications" checked={!!settings.allowNewVendors} onCheckedChange={v => requestToggle('allowNewVendors', v)} />
        ),
      },
      {
        section: 'REGISTRATION',
        title: 'Rider applications',
        desc: 'Controls whether riders can submit new applications.',
        risk: 'high',
        render: () => (
          <Switch aria-label="Rider applications" checked={!!settings.allowNewRiders} onCheckedChange={v => requestToggle('allowNewRiders', v)} />
        ),
      },
      {
        section: 'REGISTRATION',
        title: 'Restaurant approval mode',
        desc: 'How restaurant applications are accepted once submitted.',
        risk: 'high',
        render: () => (
          <Select value={settings.vendorApprovalMode} onValueChange={v => requestApprovalMode('vendorApprovalMode', v as 'manual' | 'automatic')}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual" label="Manual">Manual — reviewed in Approvals</SelectItem>
              <SelectItem value="automatic" label="Automatic">Automatic — approved at signup</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        section: 'REGISTRATION',
        title: 'Rider approval mode',
        desc: 'How rider applications are accepted once submitted.',
        risk: 'high',
        render: () => (
          <Select value={settings.riderApprovalMode} onValueChange={v => requestApprovalMode('riderApprovalMode', v as 'manual' | 'automatic')}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual" label="Manual">Manual — reviewed in Approvals</SelectItem>
              <SelectItem value="automatic" label="Automatic">Automatic — approved at signup</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        section: 'ORDERS & DELIVERY',
        title: 'Commission rate',
        desc: 'Platform commission applied per subtotal on new completed orders. Historical orders keep their original figures.',
        risk: 'medium',
        render: () => (
          <NumericSetting
            value={commission}
            onChange={v => editNumeric('defaultCommissionRate', setCommission, v)}
            current={settings.defaultCommissionRate}
            suffix=" %"
            saving={savingNumericKey === 'defaultCommissionRate'}
            error={numericError.defaultCommissionRate}
            saved={numericSaved.defaultCommissionRate}
            onApply={() => saveNumeric('defaultCommissionRate', commission, setCommission, 100)}
          />
        ),
      },
      {
        section: 'ORDERS & DELIVERY',
        title: 'Default delivery fee',
        desc: 'Authoritative default delivery fee applied to new deliveries. Historical deliveries are not rewritten.',
        risk: 'medium',
        render: () => (
          <NumericSetting
            value={deliveryFee}
            onChange={v => editNumeric('defaultDeliveryFee', setDeliveryFee, v)}
            current={settings.defaultDeliveryFee}
            suffix=" GHS"
            saving={savingNumericKey === 'defaultDeliveryFee'}
            error={numericError.defaultDeliveryFee}
            saved={numericSaved.defaultDeliveryFee}
            onApply={() => saveNumeric('defaultDeliveryFee', deliveryFee, setDeliveryFee)}
          />
        ),
      },
      {
        section: 'ORDERS & DELIVERY',
        title: 'Distance fee (per km)',
        desc: 'Applied to PACKAGE/PASS bookings that carry valid pickup and destination coordinates. Set 0 to disable distance pricing.',
        risk: 'medium',
        render: () => (
          <NumericSetting
            value={distanceFee}
            onChange={v => editNumeric('distanceFeePerKm', setDistanceFee, v)}
            current={settings.distanceFeePerKm}
            suffix=" GHS/km"
            saving={savingNumericKey === 'distanceFeePerKm'}
            error={numericError.distanceFeePerKm}
            saved={numericSaved.distanceFeePerKm}
            onApply={() => saveNumeric('distanceFeePerKm', distanceFee, setDistanceFee)}
          />
        ),
      },
      {
        section: 'ORDERS & DELIVERY',
        title: 'Platform fee (PACKAGE/PASS)',
        desc: 'Flat per-booking platform fee for PACKAGE/PASS deliveries. Set 0 for none.',
        risk: 'medium',
        render: () => (
          <NumericSetting
            value={platformFee}
            onChange={v => editNumeric('platformFee', setPlatformFee, v)}
            current={settings.platformFee}
            suffix=" GHS"
            saving={savingNumericKey === 'platformFee'}
            error={numericError.platformFee}
            saved={numericSaved.platformFee}
            onApply={() => saveNumeric('platformFee', platformFee, setPlatformFee)}
          />
        ),
      },
      ...gateways.map(g => {
        const st = gatewayStatus(g);
        return {
          section: 'PAYMENTS',
          title: g.name,
          desc: `${g.type}${g.configured ? ' — backend configuration present' : ' — no valid backend configuration, cannot be enabled'}`,
          status: st.text,
          render: () => (
            <Switch
              aria-label={`${g.name} payment method`}
              checked={!!g.enabled}
              disabled={!g.configured && !g.enabled}
              onCheckedChange={() => requestGatewayToggle(g)}
            />
          ),
        };
      }),
      {
        section: 'COMMUNICATION',
        title: 'System notifications',
        desc: 'Master switch for non-critical system and order notifications. Critical security alerts always remain mandatory.',
        risk: 'high',
        render: () => (
          <Switch aria-label="System notifications" checked={!!settings.notificationsEnabled} onCheckedChange={v => requestToggle('notificationsEnabled', v)} />
        ),
      },
      {
        section: 'COMMUNICATION',
        title: 'Email delivery',
        desc: 'Whether an SMTP transport is configured on the server for transactional email.',
        status: health?.email?.status === 'configured' ? 'Configured' : 'Not Configured',
        render: () => <Badge variant={health?.email?.status === 'configured' ? 'success' : 'default'}>{health?.email?.status === 'configured' ? 'Configured' : 'Not Configured'}</Badge>,
      },
      {
        section: 'COMMUNICATION',
        title: 'SMS delivery',
        desc: 'Whether an SMS provider is configured on the server.',
        status: health?.sms?.status === 'configured' ? 'Configured' : 'Not Configured',
        render: () => <Badge variant={health?.sms?.status === 'configured' ? 'success' : 'default'}>{health?.sms?.status === 'configured' ? 'Configured' : 'Not Configured'}</Badge>,
      },
      {
        section: 'COMMUNICATION',
        title: 'Support email',
        desc: 'Public contact address shown to users.',
        render: () => (
          <div className="w-48">
            <Input aria-label="Support email" value={fieldValue('supportEmail')} onChange={e => setDraftField('supportEmail', e.target.value)} className="rounded-lg" />
            {generalErrors.supportEmail && <p className="text-[11px] text-rose-600 mt-1">{generalErrors.supportEmail}</p>}
          </div>
        ),
      },
      {
        section: 'COMMUNICATION',
        title: 'SMS sender id',
        desc: 'Sender label for SMS messages (20 characters max).',
        render: () => (
          <div className="w-48">
            <Input aria-label="SMS sender id" value={fieldValue('smsSenderId')} maxLength={20} onChange={e => setDraftField('smsSenderId', e.target.value)} className="rounded-lg" />
            {generalErrors.smsSenderId && <p className="text-[11px] text-rose-600 mt-1">{generalErrors.smsSenderId}</p>}
          </div>
        ),
      },
      {
        section: 'SECURITY',
        title: 'Server-side RBAC',
        desc: 'Protected routes reject requests that lack the required role — URL access alone cannot reach them.',
        status: 'Enforced',
        render: () => <Badge variant="success">Enforced</Badge>,
      },
      {
        section: 'SECURITY',
        title: 'Immutable audit log',
        desc: 'Every privileged action writes an actor/action/result record that cannot be edited or deleted.',
        status: 'Active',
        render: () => <Badge variant="success">Active</Badge>,
      },
      {
        section: 'SECURITY',
        title: 'Session tracking & revocation',
        desc: 'Every login creates a real server session; logout and admin revocation terminate it immediately.',
        status: 'On',
        render: () => <Badge variant="success">On</Badge>,
      },
      {
        section: 'SECURITY',
        title: 'Re-authentication for high-risk changes',
        desc: 'Maintenance, registration, approval, notification and payment changes require your current password before they apply.',
        status: 'Required',
        render: () => <Badge variant="success">Required</Badge>,
      },
      {
        section: 'SYSTEM',
        title: 'Database',
        desc: 'Persistence status of the database file backing the API.',
        status: health?.database?.persisted ? `${health.database.records} records persisted` : 'Unknown',
        render: () => <Badge variant={health?.database?.status === 'operational' ? 'success' : 'danger'}>{health?.database?.status === 'operational' ? 'Persisted' : 'Unknown'}</Badge>,
      },
      {
        section: 'SYSTEM',
        title: 'API',
        desc: 'Live status of the core API server.',
        status: health?.uptime ? `Up ${Math.floor(health.uptime / 60)} min` : 'Unknown',
        render: () => <Badge variant={health?.api?.status === 'operational' ? 'success' : 'danger'}>{health?.api?.status === 'operational' ? 'Healthy' : 'Unknown'}</Badge>,
      },
      {
        section: 'SYSTEM',
        title: 'Realtime',
        desc: 'Live SSE connections for order and notification streaming.',
        status: health ? `${health.realtime?.activeConnections ?? 0} active connections` : 'Unknown',
        render: () => <Badge variant={health?.realtime?.status === 'operational' ? 'success' : 'danger'}>Operational</Badge>,
      },
      {
        section: 'SYSTEM',
        title: 'Backups',
        desc: 'Point-in-time database snapshots. Restoring replaces live data and requires explicit confirmation.',
        status: settings.lastBackupAt ? `Last backup ${new Date(settings.lastBackupAt).toLocaleString()}` : 'No backup recorded yet',
        render: () => (
          <div className="flex items-center gap-2">
            <Badge variant="default">{backupCount ?? '—'} snapshot{backupCount === 1 ? '' : 's'}</Badge>
            <Link to="/super-admin/backup" className="text-xs font-semibold text-emerald-600 hover:underline">Manage</Link>
          </div>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, gateways, health, backupCount, draft, generalErrors, commission, deliveryFee, pendingGeneral]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return settingDefs;
    return settingDefs.filter(s => (s.section + ' ' + s.title + ' ' + s.desc).toLowerCase().includes(q));
  }, [settingDefs, search]);

  const sections = useMemo(() => {
    const order = ['PLATFORM', 'REGISTRATION', 'ORDERS & DELIVERY', 'PAYMENTS', 'COMMUNICATION', 'SECURITY', 'SYSTEM'];
    const blurb: Record<string, string> = {
      'PLATFORM': 'Identity, currency and overall availability of the platform.',
      'REGISTRATION': 'Who can join, and whether applications need manual review.',
      'ORDERS & DELIVERY': 'Money-affecting rates applied to new transactions only.',
      'PAYMENTS': `${operationalGateways} of ${gateways.length} methods are operationally enabled (configured + enabled).`,
      'COMMUNICATION': 'Notification behavior and contact details.',
      'SECURITY': 'Operational security posture — real, enforced server behavior.',
      'SYSTEM': 'Live infrastructure health and backup state.',
    };
    return order
      .map(id => ({ id, blurb: blurb[id], items: filtered.filter(s => s.section === id) }))
      .filter(g => g.items.length > 0);
  }, [filtered, operationalGateways, gateways.length]);

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500 dark:text-slate-400">
        Loading platform configuration…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Every control below changes real, audited backend behavior. High-risk changes require re-authentication.</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}
          className="inline-flex items-center gap-2 min-w-[170px] justify-center transition-colors" aria-label="Refresh settings from server">
          {refreshing ? (<><Loader2 className="w-4 h-4 animate-spin" />Refreshing…</>) : 'Refresh from server'}
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Input
          aria-label="Search settings"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search settings by name, category or description…"
          className="max-w-md rounded-lg"
        />
        {pendingGeneral > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-amber-600">{pendingGeneral} unsaved change{pendingGeneral === 1 ? '' : 's'}</span>
            <Button className="rounded-xl" onClick={() => setReviewOpen(true)}>Review Changes</Button>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">No settings match “{search}”.</p>
      )}

      <div className="space-y-6">
        {sections.map(sec => (
          <Section key={sec.id} title={sec.id} blurb={sec.blurb}>
            {sec.items.map(item => (
              <SettingRow key={item.section + ':' + item.title} title={item.title} desc={item.desc} risk={item.risk} status={item.status} control={item.render()} />
            ))}
          </Section>
        ))}
      </div>

      {/* Confirm / re-authenticate dialog for single-setting and gateway changes */}
      {confirm && <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />}

      {/* Review-and-save dialog for grouped low-risk edits */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !savingGeneral && setReviewOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true" aria-labelledby="review-title">
            <h2 id="review-title" className="font-bold text-gray-900 dark:text-white">Review changes</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Confirm the pending platform settings before they are saved and audited.</p>
            <div className="my-4 space-y-2">
              {['platformName', 'currency', 'supportEmail', 'smsSenderId']
                .filter(k => k in draft && draft[k] !== String(settings?.[k] ?? ''))
                .map(k => (
                  <div key={k} className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">{k}</p>
                      <p className="text-xs text-gray-500 line-through">{settings?.[k]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-amber-500">New</p>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{draft[k]}</p>
                    </div>
                  </div>
                ))}
            </div>
            {Object.values(generalErrors).some(Boolean) && (
              <p className="text-xs text-rose-600 mb-4" role="alert">Fix the highlighted field errors before saving.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" disabled={savingGeneral} onClick={() => setReviewOpen(false)}>Cancel</Button>
              <Button className="rounded-xl" disabled={savingGeneral || Object.values(generalErrors).some(Boolean)} onClick={saveGeneral}>
                {savingGeneral ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved-changes leave guard */}
      {leaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-md w-full p-6" role="dialog" aria-modal="true" aria-labelledby="leave-title">
            <h2 id="leave-title" className="font-bold text-gray-900 dark:text-white">Discard unsaved changes?</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">You have {pendingGeneral} unsaved change{pendingGeneral === 1 ? '' : 's'}. Leaving now will discard them.</p>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" className="rounded-xl" onClick={() => { setLeaveOpen(false); blocker.reset(); }}>Stay</Button>
              <Button className="rounded-xl" onClick={() => { setDraft({}); setLeaveOpen(false); blocker.proceed(); }}>Discard & Leave</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
