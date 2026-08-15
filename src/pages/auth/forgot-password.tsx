import { useState, type FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Lock,
  KeyRound,
  Bike,
  ShieldCheck,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useToast } from '@/src/components/ui/toast';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';

type Step = 'email' | 'otp' | 'reset' | 'success';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { requestPasswordReset, completePasswordReset } = useAuth();
  const { t } = useApp();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email address'); return; }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setStep('otp');
        showToast('success', 'Reset Code Sent', 'Check your email inbox for instructions.');
      } else {
        setError(result.error || 'Account not found or service unavailable');
      }
    } catch (err: any) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    // In a real app, you might verify the OTP here via API.
    // For this flow, we move to reset.
    setStep('reset');
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const result = await completePasswordReset(email, otp.join(''), password);
      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Password reset failed. Please try again.');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 overflow-hidden font-sans">

      {/* Visual Side (Similar to Login) */}
      <div className="hidden lg:block relative w-[40%] overflow-hidden">
        <div className="absolute inset-0 bg-slate-900">
           <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
           <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30" />
           <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-between p-16 text-white">
          <Link to="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Bike className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight">OmniMarket<span className="text-emerald-500">.</span></span>
          </Link>

          <div>
            <div className="w-16 h-16 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-8">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-4xl font-black mb-6 leading-tight">Secure Account Recovery</h2>
            <p className="text-lg text-white/50 font-medium leading-relaxed max-w-sm">
              We take your security seriously. Follow the steps to safely regain access to your account.
            </p>
          </div>

          <div className="flex items-center gap-4 text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
            <span>&copy; 2024 OmniMarket Inc</span>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <span>Secure Access Layer</span>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 px-6 py-12 sm:px-12 lg:px-20 overflow-y-auto relative">
        <div className="absolute inset-0 auth-gradient-light opacity-30 dark:opacity-0 transition-opacity" />

        <div className="max-w-md w-full mx-auto my-auto relative z-10">
          {step !== 'success' && (
            <button
              onClick={() => step === 'email' ? navigate('/login') : setStep('email')}
              className="group flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-emerald-500 uppercase tracking-widest transition-colors mb-12"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              {step === 'email' ? t('auth.forgot.backToLogin') : t('common.back')}
            </button>
          )}

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3">{t('auth.forgot.title')}</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('auth.forgot.desc')}
                  </p>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-6">
                  <Input
                    label={t('settings.email')}
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="rounded-2xl h-14 bg-gray-50 dark:bg-slate-900/50 border-none focus-visible:ring-emerald-500/50"
                    icon={<Mail className="w-5 h-5 text-slate-400" />}
                  />

                  {error && (
                    <p className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black tracking-widest shadow-xl shadow-emerald-500/20"
                    loading={loading}
                  >
                    {t('auth.forgot.send').toUpperCase()}
                  </Button>
                </form>

                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Check your spam folder if you don't receive the email within 2 minutes. The code will expire in 15 minutes.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-[2rem] bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto mb-6">
                    <KeyRound className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t('auth.forgot.checkEmail')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('auth.2fa.desc')} <br />
                    <span className="text-slate-900 dark:text-white font-bold">{email}</span>
                  </p>
                </div>

                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !digit && i > 0) {
                          otpRefs.current[i - 1]?.focus();
                        }
                      }}
                      className="w-full h-16 text-center text-2xl font-black bg-gray-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white shadow-sm"
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-widest"
                    onClick={handleVerifyOtp}
                    loading={loading}
                    disabled={otp.join('').length !== 6}
                  >
                    {t('auth.2fa.verify').toUpperCase()}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="w-full text-center text-xs font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                  >
                    {t('auth.2fa.resend')}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'reset' && (
              <motion.div
                key="reset-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t('settings.newPassword')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('settings.appearanceDesc')}
                  </p>
                </div>

                <form onSubmit={handleReset} className="space-y-5">
                  <Input
                    label={t('settings.newPassword')}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="rounded-2xl h-14 bg-gray-50 dark:bg-slate-900/50 border-none focus-visible:ring-emerald-500/50"
                    icon={<Lock className="w-5 h-5 text-slate-400" />}
                  />
                  <Input
                    label={t('settings.confirmPassword')}
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="rounded-2xl h-14 bg-gray-50 dark:bg-slate-900/50 border-none focus-visible:ring-emerald-500/50"
                    icon={<Lock className="w-5 h-5 text-slate-400" />}
                  />

                  {error && (
                    <p className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black tracking-widest shadow-xl shadow-emerald-500/20"
                    loading={loading}
                  >
                    {t('settings.updatePassword').toUpperCase()}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success-step"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="w-24 h-24 rounded-[3rem] bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
                  <CheckCircle className="w-12 h-12" />
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t('checkout.success')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {t('auth.register.success')}
                  </p>
                </div>

                <Button
                  className="w-full h-16 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-[0.2em] group"
                  onClick={() => navigate('/login')}
                >
                  <span className="flex items-center justify-center gap-2">
                    {t('auth.forgot.backToLogin').toUpperCase()} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
