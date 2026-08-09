import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, CreditCard, Mail, Shield, Lock, Activity, Save, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';

export function SuperAdminSettingsPage() {
  const { vendors, riders, orders, products, formatPrice, showToast } = useApp();
  const { user, sessions, refreshSessions } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    AdminService.getPlatformSettings().then(setSettings).catch(() => setSettings(null));
    AdminService.getPaymentGateways().then(r => setGateways(Array.isArray(r) ? r : [])).catch(() => setGateways([]));
    AdminService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
  };
  useEffect(() => { load(); }, []);

  const orderValue = useMemo(() => (orders.length ? orders.reduce((s, o) => s + o.totalAmount, 0) / orders.length : 0), [orders]);

  const stats = [
    { label: 'Restaurants', value: vendors.length.toString() },
    { label: 'Active Riders', value: riders.filter(r => r.isOnline).length.toString() },
    { label: 'Live Orders', value: orders.filter(o => !['delivered', 'completed', 'cancelled', 'refunded', 'failed'].includes(o.status)).length.toString() },
    { label: 'Menu Items', value: products.length.toString() },
    { label: 'Avg Order', value: formatPrice(orderValue) },
    { label: 'Active Sessions', value: sessions.length.toString() },
  ];

  const toggle = (key: string) => {
    if (!settings) return;
    setSaving(true);
    AdminService.updatePlatformSettings({ [key]: !settings[key] })
      .then(s => { setSettings(s); showToast('Settings Saved', 'Platform setting updated in the database.'); })
      .catch((e: any) => showToast('Save Failed', e?.message || 'Could not save setting.', 'warning'))
      .finally(() => setSaving(false));
  };

  const toggleGateway = (gw: any) => {
    setSaving(true);
    AdminService.updatePaymentGateway(gw.id, { enabled: !gw.enabled })
      .then(r => { setGateways(Array.isArray(r) ? r : []); showToast('Gateway Updated', `${gw.name} ${gw.enabled ? 'disabled' : 'enabled'}.`); })
      .catch((e: any) => showToast('Update Failed', e?.message || 'Could not update gateway.', 'warning'))
      .finally(() => setSaving(false));
  };

  const saveGeneral = (changes: any) => {
    if (!settings) return;
    setSaving(true);
    AdminService.updatePlatformSettings({ ...settings, ...changes })
      .then(s => { setSettings(s); showToast('Settings Saved', 'Platform configuration saved.'); })
      .catch((e: any) => showToast('Save Failed', e?.message || 'Could not save settings.', 'warning'))
      .finally(() => setSaving(false));
  };

  const row = (title: string, desc: string, value: boolean, key: string) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <button disabled={saving} onClick={() => toggle(key)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'} cursor-pointer`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Real operational configuration for the OmniMarket platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { load(); refreshSessions(); }}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
          <Button onClick={() => saveGeneral({})} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save Changes'}</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"><CreditCard className="w-5 h-5 text-blue-500" /></div>
              Payment Methods
            </CardTitle>
            <Badge variant="default">{gateways.filter(g => g.enabled).length}/{gateways.length} enabled</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {gateways.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center italic">Loading payment gateways…</p>
            ) : gateways.map(g => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{g.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{g.type} {g.configured ? '· configured' : '· not configured'}</p>
                </div>
                <button disabled={saving} onClick={() => toggleGateway(g)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${g.enabled ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'} cursor-pointer`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${g.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20"><Globe className="w-5 h-5 text-violet-500" /></div>
              Platform Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {row('Notifications Enabled', 'Send system and order notifications to users', !!settings?.notificationsEnabled, 'notificationsEnabled')}
            {row('New Customers', 'Allow new customer registrations', !!settings?.allowNewCustomers, 'allowNewCustomers')}
            {row('New Restaurant Applications', 'Allow restaurants to register on the platform', !!settings?.allowNewVendors, 'allowNewVendors')}
            {row('New Rider Applications', 'Allow riders to register on the platform', !!settings?.allowNewRiders, 'allowNewRiders')}
            {row('Maintenance Mode', 'Take the marketplace offline for updates', !!settings?.maintenanceMode, 'maintenanceMode')}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Approval Mode</p>
                <p className="text-xs text-gray-400 mt-0.5">Vendor &amp; rider applications require manual review</p>
              </div>
              <Badge variant="info">{settings?.vendorApprovalMode || 'manual'}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Commission Rate</p>
                <p className="text-xs text-gray-400 mt-0.5">Platform commission applied per subtotal</p>
              </div>
              <Input type="number" defaultValue={settings?.defaultCommissionRate ?? 10} onBlur={(e) => saveGeneral({ defaultCommissionRate: Number(e.target.value) || 10 })} className="w-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20"><Shield className="w-5 h-5 text-red-500" /></div>
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">2FA</p>
                <p className="text-xs text-gray-400 mt-0.5">{user?.twoFactorEnabled ? 'Enabled for current account' : 'Not enabled on current account'}</p>
              </div>
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">RBAC Enforcement</p>
                <p className="text-xs text-gray-400 mt-0.5">Server-side role middleware protects admin modules</p>
              </div>
              <Badge variant="success">On</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Audit Logging</p>
                <p className="text-xs text-gray-400 mt-0.5">Every privileged action is written to the server audit log</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20"><Mail className="w-5 h-5 text-emerald-500" /></div>
              Notifications & Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5 block">Support Email</Label>
              <Input defaultValue={settings?.supportEmail || ''} onBlur={(e) => saveGeneral({ supportEmail: e.target.value })} className="rounded-lg" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5 block">SMS Sender ID</Label>
              <Input defaultValue={settings?.smsSenderId || ''} onBlur={(e) => saveGeneral({ smsSenderId: e.target.value })} className="rounded-lg" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">API Health</p>
                <p className="text-xs text-gray-400 mt-0.5">Uptime {health?.uptime ? `${Math.floor(health.uptime / 60)}m` : '—'} · {health?.realtime?.activeConnections ?? 0} live connections · Memory {health?.memory?.used ?? 0}MB</p>
              </div>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}