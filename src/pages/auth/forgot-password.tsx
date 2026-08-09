import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useToast } from '@/src/components/ui/toast';
import { useAuth } from '@/src/lib/auth/auth-store';

type Step = 'email' | 'otp' | 'reset' | 'success';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { requestPasswordReset, completePasswordReset } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Enter your email'); return; }
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setStep('otp');
        showToast('success', 'Code sent!', 'Check your email for the verification code');
      } else {
        setError(result.error || 'Failed to send reset code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setStep('reset');
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('At least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords must match'); return; }

    setLoading(true);
    try {
      const result = await completePasswordReset(email, otp.join(''), password);
      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Reset failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-emerald-600 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            OmniMarket
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Forgot password?</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6">No worries, we'll send you reset instructions.</p>
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <Input label="Email" type="email" placeholder="you@omnimarket.com" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full" size="lg" loading={loading}>Send Reset Code</Button>
                </form>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Check your email</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6">We sent a 6-digit code to <strong className="text-gray-700 dark:text-gray-300">{email}</strong></p>
                <div className="flex justify-center gap-2 mb-6">
                  {otp.map((d, i) => (
                    <input key={i} type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => { const n = [...otp]; n[i] = e.target.value.slice(-1); setOtp(n); if (e.target.value && i < 5) document.getElementById(`otp-${i+1}`)?.focus(); }}
                      onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) document.getElementById(`otp-${i-1}`)?.focus(); }}
                      id={`otp-${i}`} className="otp-input" />
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={handleVerifyOtp} loading={loading} disabled={otp.join('').length !== 6}>Verify Code</Button>
                <p className="text-center text-sm text-gray-500 mt-4">Didn't get it? <button className="text-emerald-600 font-medium">Resend</button></p>
              </motion.div>
            )}

            {step === 'reset' && (
              <motion.div key="reset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set new password</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6">Must be at least 8 characters.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <Input label="New Password" type="password" placeholder="Enter new password" value={password} onChange={e => setPassword(e.target.value)} icon={<Lock className="w-4 h-4" />} />
                  <Input label="Confirm Password" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} icon={<Lock className="w-4 h-4" />} />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full" size="lg" loading={loading}>Reset Password</Button>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Password reset!</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6">Your password has been successfully reset.</p>
                <Button className="w-full" size="lg" onClick={() => navigate('/login')}>Back to Sign In</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step !== 'success' && (
          <div className="text-center mt-4">
            <button onClick={() => step === 'email' ? navigate('/login') : setStep('email')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1 mx-auto">
              <ArrowLeft className="w-4 h-4" /> Back to {step === 'email' ? 'sign in' : 'reset email'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}