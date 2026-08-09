import { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Loader2, ShieldCheck, Chrome, Apple, Facebook } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { PasswordStrength } from '@/src/components/ui/password-strength';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useToast } from '@/src/components/ui/toast';
import { resolvePostLoginRoute } from '@/src/lib/auth/types';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithOtp, sendLoginOtp, user } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Once a session is created (OTP verified), head to the correct dashboard.
  useEffect(() => {
    if (user) {
      const target = resolvePostLoginRoute(user);
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (!captchaVerified) { setError('Please verify you are human'); return; }
    setLoading(true);
    try {
      const result = await login(email, password, 'public', remember);
      if (result.requires2FA || result.requiresOtp) {
        setShowOtp(true);
      } else if (result.success) {
        showToast('success', 'Welcome!', 'Signed in successfully');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch {
      setError('Invalid credentials. Please try again.');
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
    const result = await loginWithOtp(email, code, 'public');
    setLoading(false);
    if (result.success) {
      showToast('success', 'Verified!', 'Redirecting to your dashboard');
    } else {
      showToast('error', 'Invalid code', result.error || 'Please try again');
    }
  };

  const handleResendOtp = async () => {
    setError('');
    const result = await sendLoginOtp(email, 'email');
    if (result.success) {
      showToast('info', 'Code sent', 'A new code has been sent to your email');
    } else {
      setError(result.error || 'Could not resend code');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-black dark:text-white mb-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              OmniMarket
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6">Welcome back</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Sign in to your account</p>
          </div>

          <AnimatePresence mode="wait">
            {!showOtp ? (
              <motion.form key="login" onSubmit={handleLogin} className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Input
                  label="Email or Phone Number"
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                />
                <div>
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    icon={<Lock className="w-4 h-4" />}
                  />
                  <PasswordStrength password={password} />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div
                          className={`w-9 h-5 rounded-full cursor-pointer transition-colors duration-200 ${remember ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                          onClick={() => setRemember(!remember)}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${remember ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                    </div>
                    <Link to="/auth/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Forgot password?</Link>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700/50">
                  <ShieldCheck className={`w-5 h-5 ${captchaVerified ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {captchaVerified ? 'Verified — you\'re human' : 'Verify you\'re human'}
                  </span>
                  {!captchaVerified && (
                    <button type="button" onClick={() => setCaptchaVerified(true)} className="text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                      I'm human
                    </button>
                  )}
                </div>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Sign In
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-slate-700" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-3 text-gray-400 dark:text-slate-500">Or continue with</span></div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Chrome className="w-5 h-5" />, label: 'Google' },
                    { icon: <Apple className="w-5 h-5" />, label: 'Apple' },
                    { icon: <Facebook className="w-5 h-5" />, label: 'Facebook' },
                  ].map(social => (
                    <button key={social.label} type="button" className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all text-sm text-gray-700 dark:text-gray-300">
                      {social.icon}
                    </button>
                  ))}
                </div>

                <p className="text-center text-sm text-gray-500 dark:text-slate-400">
                  Don't have an account?{' '}
                  <Link to="/auth/register" className="text-emerald-600 hover:text-emerald-700 font-medium">Create one</Link>
                </p>
              </motion.form>
            ) : (
              <motion.div key="otp" className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400">Enter the 6-digit code sent to</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{email}</p>
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 inline-block px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-widest">Demo Code: 123456</p>
                </div>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Backspace' && !digit && i > 0) otpRefs.current[i - 1]?.focus(); }}
                      className="otp-input"
                    />
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={handleOtpSubmit} loading={loading} disabled={otp.join('').length !== 6}>
                  Verify Code
                </Button>
                <p className="text-center text-sm text-gray-500 dark:text-slate-400">
                  Didn't get a code?{' '}
                  <button type="button" onClick={handleResendOtp} className="text-emerald-600 hover:text-emerald-700 font-medium">Resend</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 relative overflow-hidden auth-gradient">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 border border-white/20">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Secure & Seamless</h2>
            <p className="text-white/70 max-w-md text-lg leading-relaxed">
              Enterprise-grade authentication with multi-factor security, device recognition, and real-time session monitoring.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 max-w-sm mx-auto">
              {['2FA Protection', 'OTP Verification', 'Device Tracking', 'Session Control'].map(f => (
                <div key={f} className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 text-sm text-white/80">{f}</div>
              ))}
            </div>
          </motion.div>
          <div className="absolute bottom-8 left-0 right-0 text-center text-white/30 text-xs">OmniMarket Security Layer v2.0</div>
        </div>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
            style={{ top: `${20 + i * 30}%`, left: `${10 + i * 20}%` }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i }}
          />
        ))}
      </div>
    </div>
  );
}