import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserRound, KeyRound, ShieldCheck, Monitor, Mail, RefreshCw, Loader2, Lock, Smartphone
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Input } from '@/src/components/ui/input';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AdminService } from '@/src/services/api';
import { AuthApiService } from '@/src/services/auth-api';
import { ROLE_LABELS } from '@/src/lib/auth/types';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminStatus,
  AdminLoading, AdminError, AdminEmptyState, AdminDrawer
} from '@/src/components/super-admin/AdminDesignSystem';
import { cn } from '@/src/lib/utils';

export function SuperAdminAccountSettingsPage() {
  const { showToast } = useApp();
  const { user } = useAuth();

  const [profile, setProfile] = useState({ firstName: '', lastName: '', displayName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadSessions = useCallback(() => {
    if (!user) return;
    setLoadingSessions(true);
    setSessionsError(null);
    AuthApiService.getSessions(user.id)
      .then(s => setSessions(Array.isArray(s) ? s : []))
      .catch(e => setSessionsError(e?.message || 'Could not load sessions.'))
      .finally(() => setLoadingSessions(false));
  }, [user]);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        displayName: user.displayName || '',
        phone: user.phone || '',
      });
    }
    loadSessions();
  }, [user, loadSessions]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await AdminService.updateUser(user.id, {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        displayName: profile.displayName.trim(),
        phone: profile.phone.trim(),
      });
      showToast('Profile Updated', 'Your account details were saved.', 'success');
    } catch (e: any) {
      showToast('Update Failed', e?.message || 'Could not save your profile.', 'warning');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setPwdError(null);
    if (pwd.newPassword.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    if (pwd.newPassword !== pwd.confirmPassword) { setPwdError('New password and confirmation do not match.'); return; }
    setChangingPwd(true);
    try {
      const res = await AuthApiService.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      if (res?.success) {
        showToast('Password Changed', 'Your password has been updated.', 'success');
        setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwdError(res?.message || 'Password change failed.');
      }
    } catch (e: any) {
      setPwdError(e?.message || 'Password change failed.');
    } finally {
      setChangingPwd(false);
    }
  };

  const revokeSession = async () => {
    if (!user || !revokeTarget) return;
    setRevoking(true);
    try {
      await AuthApiService.revokeSession(user.id, revokeTarget.sessionId);
      showToast('Session Revoked', 'The session was terminated.', 'success');
      setRevokeTarget(null);
      loadSessions();
    } catch (e: any) {
      showToast('Error', e?.message || 'Could not revoke session.', 'warning');
    } finally {
      setRevoking(false);
    }
  };

  const revokeAll = async () => {
    if (!user) return;
    setRevoking(true);
    try {
      await AuthApiService.revokeAllSessions(user.id);
      showToast('Sessions Revoked', 'All other sessions were terminated.', 'success');
      loadSessions();
    } catch (e: any) {
      showToast('Error', e?.message || 'Could not revoke sessions.', 'warning');
    } finally {
      setRevoking(false);
    }
  };

  if (!user) return <AdminLoading message="Loading account…" />;

  const active = (sessions || []).filter(s => !s.revoked);

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={UserRound}
        title="Account Settings"
        description="Manage your administrator identity, password, authentication method and active sessions."
        stats={<AdminBadge status="active" label={ROLE_LABELS[user.role] || 'Account'} />}
      />

      <div className="grid lg:grid-cols-2 gap-8">
        <AdminCard title="Profile Information" icon={UserRound} actions={
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-semibold" onClick={loadSessions}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="block text-xs font-semibold text-ink-3">First Name</Label>
                <Input value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} className="h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-semibold text-ink-3">Last Name</Label>
                <Input value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} className="h-11 rounded-xl text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="block text-xs font-semibold text-ink-3">Display Name</Label>
              <Input value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })} className="h-11 rounded-xl text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="block text-xs font-semibold text-ink-3">Phone</Label>
              <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="h-11 rounded-xl text-sm" placeholder="+233…" />
            </div>
            <div className="space-y-2">
              <Label className="block text-xs font-semibold text-ink-3">Email (login identifier)</Label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink-2">
                <Mail className="h-4 w-4 text-ink-3" />
                <span className="truncate">{user.email}</span>
                <AdminBadge status={user.emailVerified ? 'success' : 'warning'} label={user.emailVerified ? 'Verified' : 'Unverified'} className="ml-auto" />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving…</> : 'Update Profile'}
              </Button>
            </div>
          </div>
        </AdminCard>

        <div className="space-y-8">
          <AdminCard title="Password & Authentication" icon={KeyRound}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="block text-xs font-semibold text-ink-3">Current Password</Label>
                <Input type="password" value={pwd.currentPassword} onChange={e => setPwd({ ...pwd, currentPassword: e.target.value })} className="h-11 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="block text-xs font-semibold text-ink-3">New Password</Label>
                  <Input type="password" value={pwd.newPassword} onChange={e => setPwd({ ...pwd, newPassword: e.target.value })} className="h-11 rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="block text-xs font-semibold text-ink-3">Confirm New Password</Label>
                  <Input type="password" value={pwd.confirmPassword} onChange={e => setPwd({ ...pwd, confirmPassword: e.target.value })} className="h-11 rounded-xl text-sm" />
                </div>
              </div>
              {pwdError && <p className="text-xs font-medium text-danger">{pwdError}</p>}
              <div className="flex justify-end">
                <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold" onClick={changePassword} disabled={changingPwd}>
                  {changingPwd ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Updating…</> : 'Change Password'}
                </Button>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Two-Factor Authentication" icon={ShieldCheck}>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-line">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-ink-3" />
                  <div>
                    <p className="text-[10px] font-black text-ink uppercase tracking-widest">Email OTP Verification</p>
                    <p className="text-[10px] text-ink-3">One-time codes are sent to your email on sign-in.</p>
                  </div>
                </div>
                <AdminBadge status={user.twoFactorEnabled ? 'success' : 'info'} label={user.twoFactorEnabled ? 'Enabled' : 'Active on login'} />
              </div>
              <Link to="/super-admin/security" className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-line hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-ink-3" />
                  <span className="text-[10px] font-black text-ink uppercase tracking-widest">Security Preferences</span>
                </div>
                <span className="text-xs font-semibold text-primary">Open Security Center →</span>
              </Link>
            </div>
          </AdminCard>
        </div>
      </div>

      <AdminCard title="Active Sessions" icon={Monitor} noPadding actions={
        active.length > 1 && (
          <Button size="sm" variant="outline" className="h-8 px-3 border-danger/30 text-xs font-semibold text-danger" onClick={revokeAll} disabled={revoking}>
            {revoking ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Revoking…</> : 'Revoke All Others'}
          </Button>
        )
      }>
        {loadingSessions ? (
          <div className="p-6"><AdminLoading /></div>
        ) : sessionsError ? (
          <div className="p-6"><AdminError message="Unable to load sessions." detail={sessionsError} retry={loadSessions} /></div>
        ) : active.length === 0 ? (
          <AdminEmptyState icon={Monitor} title="No active sessions" description="Your active login sessions will appear here." />
        ) : (
          <div className="divide-y divide-line">
            {active.map((s: any) => (
              <div key={s.sessionId} className="p-4 flex items-center justify-between">
                <div>
                  <p className={cn('text-xs font-black uppercase tracking-tight', s.isCurrent ? 'text-primary' : 'text-ink')}>
                    {s.deviceName || 'Internal API'}
                    {s.isCurrent && <AdminBadge status="success" label="Current" className="ml-2" />}
                  </p>
                  <p className="text-[10px] text-ink-3 font-mono mt-1">
                    {s.ipAddress} · {s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleString() : '—'}
                  </p>
                </div>
                {!s.isCurrent && (
                  <Button size="sm" variant="outline" className="h-8 border-danger/30 px-2.5 text-xs font-semibold text-danger" onClick={() => setRevokeTarget(s)}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminDrawer
        open={!!revokeTarget}
        onClose={() => !revoking && setRevokeTarget(null)}
        icon={Monitor}
        title="Revoke session?"
        subtitle={revokeTarget?.deviceName || 'Device session'}
        footer={
          <>
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={revoking} onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1 h-11 rounded-xl text-xs font-semibold" disabled={revoking} onClick={revokeSession}>
              {revoking ? 'Revoking…' : 'Revoke Session'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-2">
          This device will be signed out immediately and must re-authenticate. The action is recorded in the audit trail.
        </p>
      </AdminDrawer>
    </div>
  );
}