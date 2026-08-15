import { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  Chrome,
  Apple,
  Facebook,
  Bike,
  ArrowRight,
  Fingerprint,
  Phone
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { PasswordStrength } from '@/src/components/ui/password-strength';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useApp } from '@/src/context/AppContext';
import { AuthApiService } from '@/src/services/auth-api';
import { useToast } from '@/src/components/ui/toast';
import { resolvePostLoginRoute } from '@/src/lib/auth/types';
import { cn } from '@/src/lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithOtp, sendLoginOtp, user } = useAuth();
  const { t } = useApp();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user) {
      const target = resolvePostLoginRoute(user);
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please enter your email/phone and password');
      return;
    }

    if (!captchaVerified) {
      setError('Please complete the security verification');
      return;
    }

    setLoading(true);
    try {
      // Unified login for all roles
      const result = await login(identifier, password, 'public', remember);

      if (result.requires2FA || result.requiresOtp) {
        setShowOtp(true);
        showToast('info', 'Security Verification', 'Please enter the code sent to your device');
      } else if (result.success) {
        showToast('success', 'Welcome back!', 'Successfully signed in');
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('A connection error occurred. Please try again later.');
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

  const handleOtpSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    const result = await loginWithOtp(identifier, code, 'public');
    setLoading(false);

    if (result.success) {
      showToast('success', 'Verified!', 'Redirecting to your dashboard');
    } else {
      showToast('error', 'Invalid code', result.error || 'The code you entered is incorrect');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 overflow-hidden font-sans">

      {/* Left Column: Auth Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-6 sm:p-12 relative z-10 bg-white dark:bg-slate-950">

        {/* Header/Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Bike className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              OmniMarket<span className="text-emerald-500">.</span>
            </span>
          </Link>
        </motion.div>

        {/* Form Container */}
        <div className="max-w-md w-full mx-auto py-12">
          <AnimatePresence mode="wait">
            {!showOtp ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t('auth.welcome')}</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('auth.signInPrompt')}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Input
                      label={t('auth.emailOrPhone')}
                      type="text"
                      placeholder="name@example.com"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="rounded-2xl h-12 bg-gray-50 dark:bg-slate-900 border-none focus-visible:ring-emerald-500/50"
                      icon={<Mail className="w-4 h-4 text-slate-400" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('auth.password')}</label>
                      <Link to="/auth/forgot-password" title={t('auth.forgotPassword')} className="text-xs font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest">
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                    <div className="relative group">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="rounded-2xl h-12 bg-gray-50 dark:bg-slate-900 border-none focus-visible:ring-emerald-500/50 pe-12"
                        icon={<Lock className="w-4 h-4 text-slate-400" />}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password.length > 0 && <PasswordStrength password={password} />}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRemember(!remember)}
                      className="flex items-center gap-2 group"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                        remember ? "bg-emerald-500 border-emerald-500" : "border-gray-200 dark:border-slate-800"
                      )}>
                        {remember && <ShieldCheck className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t('auth.remember')}</span>
                    </button>
                  </div>

                  {/* Anti-Bot Verification */}
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300",
                    captchaVerified
                      ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20"
                      : "bg-gray-50 dark:bg-slate-900 border-transparent"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      captchaVerified ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-slate-800 text-slate-400"
                    )}>
                      {captchaVerified ? <ShieldCheck className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Security Check</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {captchaVerified ? "Identity Verified" : "Human Verification"}
                      </p>
                    </div>
                    {!captchaVerified && (
                      <button
                        type="button"
                        onClick={() => setCaptchaVerified(true)}
                        className="px-4 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm hover:shadow-md transition-all active:scale-95"
                      >
                        Verify
                      </button>
                    )}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-100 dark:border-rose-500/20"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm tracking-widest shadow-xl shadow-emerald-500/20 group"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        {t('auth.signIn').toUpperCase()} <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>

                  <div className="flex items-center gap-4 py-4">
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Social Connect</span>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button type="button" onClick={() => AuthApiService.loginWithGoogle()}
                      className="flex items-center justify-center h-12 border border-gray-100 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all group">
                      <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button type="button" onClick={() => AuthApiService.loginWithApple()}
                      className="flex items-center justify-center h-12 border border-gray-100 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all group">
                      <Apple className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button type="button" className="flex items-center justify-center h-12 border border-gray-100 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all group">
                      <Facebook className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t('auth.noAccount')}{' '}
                    <Link to="/register" className="text-emerald-500 hover:text-emerald-400 underline decoration-2 underline-offset-4">
                      {t('auth.createAccount')}
                    </Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-[2rem] bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 mx-auto mb-6">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t('auth.2fa.title')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('auth.2fa.desc')} <span className="text-slate-900 dark:text-white font-bold">{identifier}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Demo build — no email is sent. Use the demo code <span className="font-black">123456</span>.
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
                      className="w-12 h-16 sm:w-14 sm:h-20 text-center text-2xl font-black bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all dark:text-white"
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-widest"
                    onClick={handleOtpSubmit}
                    loading={loading}
                    disabled={otp.join('').length !== 6}
                  >
                    {t('auth.2fa.verify').toUpperCase()}
                  </Button>

                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-bold text-slate-400">{t('auth.2fa.noCode')}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await sendLoginOtp(identifier, 'email');
                        if(res.success) showToast('info', 'Code Resent', 'Check your inbox');
                      }}
                      className="text-xs font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                    >
                      {t('auth.2fa.resend')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="text-center lg:text-start">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            &copy; 2024 OmniMarket Inc. &bull; Secure Portal
          </p>
        </div>
      </div>

      {/* Right Column: Visual Side */}
      <div className="hidden lg:block relative flex-1 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-slate-900">
           <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
           <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/80 to-emerald-950/40" />

           {/* Animated blobs */}
           <motion.div
             animate={{
               scale: [1, 1.2, 1],
               rotate: [0, 90, 0],
               x: [0, 50, 0],
               y: [0, -30, 0]
             }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             className="absolute -top-20 -end-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"
           />
           <motion.div
             animate={{
               scale: [1, 1.3, 1],
               x: [0, -80, 0],
               y: [0, 40, 0]
             }}
             transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
             className="absolute -bottom-20 -start-20 w-[30rem] h-[30rem] bg-emerald-900/20 rounded-full blur-[120px]"
           />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-20 text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-lg"
          >
            <div className="mb-10 inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Next-Gen Marketplace</span>
            </div>

            <h2 className="text-5xl font-black mb-6 leading-tight tracking-tight">
              Scale your business with <span className="text-emerald-400 italic">OmniMarket</span>
            </h2>

            <p className="text-xl text-white/60 font-medium leading-relaxed mb-12">
              Join thousands of vendors and riders delivering joy across the city every single day.
            </p>

            <div className="grid grid-cols-2 gap-6">
               <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 text-start hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-sm mb-1 uppercase tracking-widest">Enterprise Security</h4>
                  <p className="text-xs text-white/40">Bank-grade encryption for all your transactions.</p>
               </div>
               <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 text-start hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-sm mb-1 uppercase tracking-widest">24/7 Support</h4>
                  <p className="text-xs text-white/40">Dedicated priority support for all account types.</p>
               </div>
            </div>
          </motion.div>

          <div className="absolute bottom-12 start-12 end-12 flex items-center justify-between">
            <div className="flex -space-x-3 rtl:space-x-reverse">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center text-[10px] font-black">+10k</div>
            </div>
            <p className="text-xs font-bold text-white/40">Trusted by over 10,000+ businesses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
