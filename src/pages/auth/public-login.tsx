import { useState, useEffect, type FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, Chrome, Apple, Smartphone,
  AlertCircle, ArrowRight, Store, Bike, ShoppingBag, Zap, KeyRound, ArrowLeft, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useToast } from '@/src/components/ui/toast';
import { checkRateLimit } from '@/src/lib/auth/security';
import { APP_VERSION_LABEL } from '@/src/lib/app-version';
import { cn } from '@/src/lib/utils';
import { resolvePostLoginRoute } from '@/src/lib/auth/types';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useApp } from '@/src/context/AppContext';

type Step = 'login' | 'otp';

export function PublicLoginPage() {
  const { login, loginWithGoogle, loginWithApple, loginWithOtp, sendLoginOtp, user } = useAuth();
  const { showToast } = useToast();
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<Step>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const expired = params.get('expired');
    if (expired) {
      showToast('warning', 'Session expired', 'Please sign in again to continue.');
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, showToast, navigate, location.pathname]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError('Enter your email or phone number.'); return; }
    if (!password) { setError('Enter your password.'); return; }

    const rate = checkRateLimit(identifier);
    if (!rate.allowed) { setError('Too many attempts. Please wait.'); return; }

    setLoading(true);
    const result = await login(identifier, password, 'public', remember);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Login failed.');
      return;
    }

    if (result.requiresOtp) {
      setStep('otp');
      showToast('info', 'Verification Required', 'A verification code has been sent to your device.');
      return;
    }

    showToast('success', 'Welcome back!', 'Redirecting...');
    if (result.user) {
      navigate(resolvePostLoginRoute(result.user), { replace: true });
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    const result = await loginWithOtp(identifier, code, 'public');
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid verification code.');
    }
  };

  useEffect(() => {
    if (user) {
      navigate(resolvePostLoginRoute(user), { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950 font-sans">

      {/* Visual Panel (Desktop) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[url('/assets/auth/takoradi-food-delivery-auth.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/55 to-slate-950/10" />

        <div className="relative z-10 flex flex-col justify-between p-16 h-full text-white">
          <Link to="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl group-hover:scale-105 transition-transform">
              <Bike className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight">OmniMarket<span className="text-emerald-400">.</span></span>
          </Link>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mb-8 shadow-2xl">
              <Zap className="w-8 h-8 fill-current" />
            </div>
            <h2 className="text-5xl font-black mb-6 leading-[0.95] tracking-tighter">{t('auth.deliveryPromise')}</h2>
            <p className="text-lg text-white/80 font-medium leading-relaxed max-w-sm">{t('auth.deliveryCopy')}</p>
          </motion.div>

          <div className="flex items-center gap-4 text-white/55 text-[10px] font-black uppercase tracking-[0.2em]">
            <span>OmniMarket Ghana</span><div className="w-1 h-1 rounded-full bg-white/30" /><span>Takoradi</span>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950 px-6 py-12 sm:px-12 lg:px-20">
        <div className="absolute inset-0 auth-gradient-light opacity-50 dark:opacity-0 transition-opacity" />

        <div className="relative z-10 w-full max-w-md mx-auto my-auto">
          <div className="mb-12 text-center lg:hidden">
             <Link to="/" className="inline-flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                  <Bike className="w-6 h-6" />
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white">OmniMarket<span className="text-emerald-500">.</span></span>
             </Link>
          </div>

          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-10">
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3">{t('auth.welcome')}</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">{t('auth.signInPrompt')}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <Input
                    label={t('auth.emailOrPhone')}
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="you@gmail.com"
                    icon={<Smartphone className="w-5 h-5 text-slate-400" />}
                    className="rounded-2xl h-14 bg-gray-50 dark:bg-slate-900/50 border-none focus-visible:ring-emerald-500/50"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('auth.password')}</label>
                      <Link to="/forgot-password" title="Forgot Password" className="text-[10px] font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest">
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                    <div className="relative group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-14 bg-gray-50 dark:bg-slate-900/50 border-none rounded-2xl px-12 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setRemember(!remember)} className="flex items-center gap-2 group">
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                        remember ? "bg-emerald-500 border-emerald-500" : "border-slate-200 dark:border-slate-800"
                      )}>
                        {remember && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t('auth.remember')}</span>
                    </button>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                      {error}
                    </motion.div>
                  )}

                  <Button type="submit" loading={loading} className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black tracking-widest shadow-xl shadow-emerald-500/20">
                    {t('auth.signIn')} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <div className="flex items-center gap-4 py-4">
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Social Connect</span>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => loginWithGoogle()}
                      className="flex items-center justify-center gap-3 h-12 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all group">
                      <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button type="button" onClick={() => loginWithApple()}
                      className="flex items-center justify-center gap-3 h-12 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all group">
                      <Apple className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  <p className="text-center text-sm font-bold text-slate-500 mt-8">
                    {t('auth.noAccount')} <Link to="/register" className="text-slate-900 dark:text-white underline decoration-2 underline-offset-4 font-black ml-1">{t('auth.createAccount')}</Link>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-[2rem] bg-emerald-100 dark:bg-emerald-50/20 flex items-center justify-center text-emerald-600 mx-auto mb-6">
                    <KeyRound className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t('auth.forgot.checkEmail')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('auth.2fa.desc')} <br />
                    <span className="text-slate-900 dark:text-white font-bold">{identifier}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
                  <KeyRound className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Demo build — no email is sent. Use the demo code <span className="font-black">123456</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-between gap-2">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !d && i > 0) otpRefs.current[i - 1]?.focus();
                        }}
                        className="w-full h-16 text-center text-2xl font-black bg-gray-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white"
                      />
                    ))}
                  </div>

                  <Button type="submit" disabled={loading || otp.join('').length !== 6} className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-widest">
                    {t('auth.2fa.verify').toUpperCase()}
                  </Button>

                  <div className="text-center">
                    <button type="button" onClick={() => sendLoginOtp(identifier, 'email')} className="text-xs font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                      {t('auth.2fa.resend')}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative z-10 flex items-center justify-center gap-2 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {APP_VERSION_LABEL} · Stable
          </span>
        </div>
      </div>
    </div>
  );
}
