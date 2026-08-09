import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, Chrome, Apple, Smartphone,
  AlertCircle, ArrowRight, Store, Bike, ShoppingBag, Zap, KeyRound, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useToast } from '@/src/components/ui/toast';
import { checkRateLimit } from '@/src/lib/auth/security';
import { cn } from '@/src/lib/utils';
import { resolvePostLoginRoute } from '@/src/lib/auth/types';

type IdentifierTab = 'email' | 'phone';
type Step = 'login' | 'otp';

export function PublicLoginPage() {
  const { login, loginWithGoogle, loginWithApple, loginWithOtp, sendLoginOtp, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<Step>('login');
  const [tab, setTab] = useState<IdentifierTab>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const expired = params.get('expired');
    if (expired) {
      showToast('warning', 'Session expired', 'Please sign in again to continue.');
      const newSearch = new URLSearchParams(location.search);
      newSearch.delete('expired');
      const searchStr = newSearch.toString();
      navigate(location.pathname + (searchStr ? '?' + searchStr : ''), { replace: true });
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
      showToast('error', 'Sign in failed', result.error);
      return;
    }

    if (result.requiresOtp) {
      setStep('otp');
      showToast('info', 'Verification Required', 'A verification code has been sent to your email.');
      return;
    }

    showToast('success', 'Welcome back!', 'Redirecting to your dashboard...');
    setTimeout(() => {
      if (result.user) {
        const dash = resolvePostLoginRoute(result.user);
        navigate(dash, { replace: true });
      }
    }, 500);
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
      return;
    }

    showToast('success', 'Verified!', 'Welcome back.');
  };

  useEffect(() => {
    if (user && step === 'otp') {
      const dash = resolvePostLoginRoute(user);
      navigate(dash, { replace: true });
    }
  }, [user, step, navigate]);

  const floatShapes = [
    { className: 'w-72 h-72 bg-emerald-400/20 blur-3xl', top: '10%', left: '5%', delay: 0 },
    { className: 'w-96 h-96 bg-teal-400/20 blur-3xl', top: '50%', left: '30%', delay: 1 },
    { className: 'w-64 h-64 bg-emerald-500/20 blur-3xl', top: '20%', left: '70%', delay: 2 },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left: form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute inset-0 auth-gradient-light dark:bg-slate-950" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-left">
                <span className="block font-heading font-extrabold text-2xl text-black dark:text-white leading-tight">OmniMarket</span>
                <span className="block text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider -mt-1">Takoradi Express</span>
              </div>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h1>
                <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Sign in to shop, sell, or deliver.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email or Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="you@gmail.com or +233 2X XXX XXXX"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                      <Link to="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Lock className="w-4 h-4" /></div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-11 py-3 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setRemember(r => !r)} className="flex items-center gap-2">
                      <div className={cn('relative w-9 h-5 rounded-full transition-colors duration-200', remember ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600')}>
                        <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200', remember ? 'left-4' : 'left-0.5')} />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                    </button>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </motion.div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {loading ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <>Login <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-slate-700" /></div>
                    <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-950 px-3 text-xs text-gray-400 dark:text-slate-500">or continue with</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => loginWithGoogle()}
                      className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                      <Chrome className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Continue with Google</span>
                    </button>
                    <button type="button" onClick={() => loginWithApple()}
                      className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                      <Apple className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Continue with Apple</span>
                    </button>
                  </div>

                  <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-6">
                    Don't have an account? <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">Create Account</Link>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep('login')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 mb-6 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>

                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Verify your email</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-8">
                  We've sent a 6-digit code to your email. Please enter it below to verify your identity.
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        id={`otp-${i}`}
                        onChange={e => {
                          const val = e.target.value.slice(-1);
                          if (val && !/^\d$/.test(val)) return;
                          const n = [...otp];
                          n[i] = val;
                          setOtp(n);
                          if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !otp[i] && i > 0) {
                            document.getElementById(`otp-${i - 1}`)?.focus();
                          }
                        }}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 text-center font-medium">{error}</p>
                  )}

                  <button type="submit" disabled={loading || otp.join('').length !== 6}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {loading ? <Zap className="w-4 h-4 animate-spin" /> : 'Verify & Sign In'}
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    Didn't receive the code? <button type="button" onClick={() => sendLoginOtp(identifier, 'email')} className="text-emerald-600 font-medium hover:underline">Resend</button>
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right: visual panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden auth-gradient">
        <div className="absolute inset-0 bg-grid opacity-20" />
        {floatShapes.map((s, i) => (
          <motion.div key={i} className={cn('absolute rounded-full', s.className)} style={{ top: s.top, left: s.left }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 6 + i, repeat: Infinity, delay: s.delay }} />
        ))}
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm mb-6">
              <Zap className="w-4 h-4 text-emerald-400" /> One account for the whole ecosystem
            </div>
            <h2 className="text-4xl font-bold mb-6">Shop. Sell. Deliver.</h2>
            <p className="text-white/70 max-w-md text-lg leading-relaxed mb-10">
              Your role is detected automatically. Whether you're a customer, restaurant
              partner, or dispatch rider - we'll route you to the right dashboard.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { icon: ShoppingBag, label: 'Customers', desc: 'Order meals & more' },
                { icon: Store, label: 'Restaurants', desc: 'Grow your business' },
                { icon: Bike, label: 'Riders', desc: 'Deliver & earn' },
              ].map(f => (
                <div key={f.label} className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all">
                  <f.icon className="w-8 h-8 text-emerald-400 mb-3 mx-auto" />
                  <p className="font-semibold">{f.label}</p>
                  <p className="text-xs text-white/60 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="absolute bottom-8 left-0 right-0 text-center text-white/30 text-xs">
            Protected by JWT | 2FA | Rate limiting | Device recognition
          </div>
        </div>
      </div>
    </div>
  );
}
