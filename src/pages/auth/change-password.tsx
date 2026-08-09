import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useToast } from '@/src/components/ui/toast';
import { useAuth } from '@/src/lib/auth/auth-store';
import { AuthApiService } from '@/src/services/auth-api';
import { validatePassword, evaluatePasswordStrength } from '@/src/lib/auth/security';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = evaluatePasswordStrength(newPassword);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) { setError('Current password is required'); return; }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthApiService.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setSuccess(true);
        showToast('success', 'Password Changed', 'Your password has been updated. Please sign in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 3000);
      } else {
        setError(res.message || 'Failed to update password');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Success!</h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">Your password has been changed. Redirecting to login...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Secure your account with a new password.</p>
            </div>
          </div>

          {user?.mustChangePassword && (
            <div className="mb-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Password Reset Required:</strong> An administrator has requested that you change your password before continuing.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />

            <div className="space-y-2">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase font-black text-gray-400">Strength: {strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${strength.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: strength.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button type="submit" className="w-full h-12 rounded-xl" loading={loading}>
              Update Password
            </Button>

            {!user?.mustChangePassword && (
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}
