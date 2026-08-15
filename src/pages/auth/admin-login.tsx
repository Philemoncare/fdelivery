import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, KeyRound, ArrowLeft, Zap } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useToast } from '@/src/components/ui/toast';
import { checkRateLimit } from '@/src/lib/auth/security';
import { resolvePostAuthenticationRoute } from '@/src/lib/auth/types';

type Step = 'login' | 'otp';

export function AdminLoginPage({ variant = 'admin' }: { variant?: 'admin' | 'super-admin' }) {
  const { login, loginWithOtp, user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuper = variant === 'super-admin';

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'administrator' && user.role !== 'super-administrator') {
      const dash = resolvePostAuthenticationRoute(user);
      navigate(dash, { replace: true });
      return;
    }
    if (isSuper && user.role !== 'super-administrator') {
      setError('This portal is restricted to Super Administrators.');
      logout();
      return;
    }
    if (step === 'login' && location.pathname.includes('/login')) {
      const dash = resolvePostAuthenticationRoute(user);
      navigate(dash, { replace: true });
    }
  }, [user, navigate, isSuper, logout, location.pathname, step]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Enter your email or phone.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    const rate = checkRateLimit(`admin:${email.trim().toLowerCase()}`);
    if (!rate.allowed) { setError('Too many attempts. Account temporarily locked.'); return; }
    setLoading(true);
    const result = await login(email, password, 'admin');
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Authentication failed.');
      return;
    }

    if (result.requiresOtp) {
      setStep('otp');
      showToast('info', 'Verification Required', 'A verification code has been sent to your admin email.');
      return;
    }

    showToast('success', 'Welcome', 'Signed in successfully.');
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length !== 6) return;

    setLoading(true);
    const result = await loginWithOtp(email, code, 'admin');
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid verification code.');
      return;
    }

    showToast('success', 'Verified!', 'Welcome to the console.');
  };

  useEffect(() => {
    if (user && step === 'otp') {
      const dash = resolvePostAuthenticationRoute(user);
      navigate(dash, { replace: true });
    }
  }, [user, step, navigate]);

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-100 flex overflow-hidden">
      <div className="fixed top-0 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-tight">{isSuper ? 'OmniMarket Super Admin' : 'OmniMarket Admin'}</p>
              <p className="text-xs text-slate-400">{isSuper ? 'Super Administration Console' : 'Administration Console'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
            {step === 'login' ? (
              <div key="login">
                <h1 className="text-xl font-bold text-white mb-1">Sign in</h1>
                <p className="text-sm text-slate-400 mb-6">Enter your credentials to continue.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@gmail.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-slate-300">Password</label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
                        className="w-full pl-10 pr-11 py-3 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all" />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
                    {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Sign In'}
                  </button>
                </form>
              </div>
            ) : (
              <div key="otp">
                <button onClick={() => setStep('login')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </button>

                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6 text-cyan-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Admin Verification</h2>
                <p className="text-sm text-slate-400 mb-4">
                  An OTP has been sent to your registered admin email. Enter it below to authorize this session.
                </p>

                <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <KeyRound className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300 font-medium">
                    Demo build — no email is sent. Use the demo code <span className="font-black text-emerald-200">123456</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        id={`otp-admin-${i}`}
                        onChange={e => {
                          const val = e.target.value.slice(-1);
                          if (val && !/^\d$/.test(val)) return;
                          const n = [...otp];
                          n[i] = val;
                          setOtp(n);
                          if (val && i < 5) document.getElementById(`otp-admin-${i + 1}`)?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !otp[i] && i > 0) {
                            document.getElementById(`otp-admin-${i - 1}`)?.focus();
                          }
                        }}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-slate-800/70 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-red-400 text-center font-medium">{error}</p>
                  )}

                  <button type="submit" disabled={loading || otp.join('').length !== 6}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
                    {loading ? <Zap className="w-4 h-4 animate-spin" /> : 'Verify Access'}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    If you have trouble receiving the code, please contact the System Super Admin.
                  </p>
                </form>
              </div>
            )}
          </div>

          <p className="text-center mt-6 text-xs text-slate-500">
            {isSuper
              ? <>Return to <Link to="/admin/login" className="text-slate-400 hover:text-white transition-colors">Admin Console</Link></>
              : <>Not an administrator? <Link to="/login" className="text-slate-400 hover:text-white transition-colors">Use the public portal</Link></>}
          </p>
        </div>
      </div>
    </div>
  );
}
