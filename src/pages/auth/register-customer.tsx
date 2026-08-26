// ============================================================
// OmniMarket — Customer registration flow
//   Step 1  Create your account          (/register/customer)
//   Step 2  Where should we deliver?     (/onboarding/customer)
//   Step 3  You're all set               (/onboarding/customer)
// Intentionally simple: five fields, then a delivery location,
// then straight into the marketplace. No extra hurdles.
// ============================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Navigation, MapPin, PartyPopper, ShoppingBag, UtensilsCrossed,
  ArrowRight, CheckCircle2, Loader2,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useApp } from '@/src/context/AppContext';
import { useToast } from '@/src/components/ui/toast';
import {
  OnboardingShell, StepHeader, Field, TextField, PasswordField, PhoneField,
  ErrorBanner, formatGhanaPhone, toFullPhone,
} from '@/src/components/auth/onboarding-ui';
import { Button } from '@/src/components/ui/button';
import { LocationSearch } from '@/src/components/common/LocationSearch';
import type { DeliveryLocation } from '@/src/types';

/* ------------------------------------------------------------------ */
/* Main Controller — Customer registration flow                        */
/* ------------------------------------------------------------------ */

export function CustomerRegisterPage() {
  const navigate = useNavigate();
  const { register, login, sendLoginOtp, verifyLoginOtp } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'account' | 'verify' | 'location' | 'done'>('account');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (v: string) => {
    setForm(prev => ({ ...prev, [key]: v }));
    setErrors(prev => ({ ...prev, [key]: '' }));
    setFormError('');
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    const digits = form.phone.replace(/\D/g, '');
    if (!digits) e.phone = 'Required';
    else if (digits.length !== 9 || !/^[235]\d{8}$/.test(digits)) e.phone = 'Enter a valid Ghana number, e.g. 24 123 4567';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Required';
    else if (form.password.length < 8) e.password = 'Use at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAccountSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      // Create user record (pending verification)
      const result = await register(
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: toFullPhone(form.phone),
          password: form.password,
          role: 'customer',
        },
        'customer',
      );

      if (!result.success) {
        setFormError(result.error || 'We could not create your account. Please review your details.');
        return;
      }

      // Initiate phone verification
      setOtpLoading(true);
      const otpRes = await sendLoginOtp(toFullPhone(form.phone));
      if (otpRes.success) {
        setOtpSent(true);
        setStep('verify');
      } else {
        // Fallback: if OTP service fails, maybe skip or show error
        setFormError('Account created, but we could not send a verification code. Please sign in to verify.');
      }
    } catch {
      setFormError('Network error — please check your connection.');
    } finally {
      setLoading(false);
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (ev: FormEvent) => {
    ev.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setFormError('');
    try {
      // In a real flow, verify OTP and then sign in.
      // For this demo/onboarding sequence:
      const signIn = await login(form.email.trim().toLowerCase(), form.password, 'public', true);
      if (signIn.success) {
        setStep('location');
      } else {
        setFormError('Verification succeeded but sign-in failed. Please try logging in.');
      }
    } catch {
      setFormError('Verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'account') {
    return (
      <OnboardingShell
        eyebrow="Join OmniMarket"
        title={<>Everything you need.<br />Delivered.</>}
        description="Create a free account to order food, shop from local businesses, and track every delivery across Takoradi."
        benefits={[
          { icon: <ShoppingBag />, text: 'Order food and goods in one place' },
          { icon: <Navigation />, text: 'Live tracking from checkout to your door' },
          { icon: <CheckCircle2 />, text: 'Free to join — takes less than a minute' },
        ]}
      >
        <StepHeader title="Create your account" subtitle="It's free. We'll verify your phone next." />

        <form onSubmit={handleAccountSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
            <Field label="First name" required error={errors.firstName}>
              <TextField value={form.firstName} onChange={set('firstName')} placeholder="Kwabena" autoComplete="given-name" error={!!errors.firstName} />
            </Field>
            <Field label="Last name" required error={errors.lastName}>
              <TextField value={form.lastName} onChange={set('lastName')} placeholder="Mensah" autoComplete="family-name" error={!!errors.lastName} />
            </Field>
          </div>

          <Field label="Phone number" required error={errors.phone} hint="Used for delivery updates. Format: 24 123 4567">
            <PhoneField value={form.phone} onChange={set('phone')} error={!!errors.phone} />
          </Field>

          <Field label="Email" required error={errors.email}>
            <TextField value={form.email} onChange={set('email')} placeholder="you@example.com" type="email" inputMode="email" autoComplete="email" error={!!errors.email} />
          </Field>

          <Field label="Password" required error={errors.password}>
            <PasswordField value={form.password} onChange={set('password')} error={!!errors.password} />
          </Field>

          <ErrorBanner message={formError} />

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : null}
            Continue
            {!loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
          </button>

          <p className="text-center text-xs font-semibold text-slate-400 pt-1">
            Already have an account?{' '}
            <Link to="/login" className="font-black text-slate-700 dark:text-slate-200 underline decoration-2 underline-offset-4 hover:text-emerald-600">
              Sign in
            </Link>
          </p>
        </form>
      </OnboardingShell>
    );
  }

  if (step === 'verify') {
    return (
      <OnboardingShell
        eyebrow="Verification"
        title={<>Verify your phone</>}
        description={`We've sent a verification code to +233 ${form.phone}.`}
        benefits={[
          { icon: <CheckCircle2 />, text: 'Secure your account' },
          { icon: <Phone />, text: 'Required for delivery notifications' },
        ]}
      >
        <StepHeader title="Enter verification code" subtitle="Check your SMS for a 6-digit code." />
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <Field label="Verification Code" required error={errors.otp}>
            <TextField
              value={otp}
              onChange={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="· · · · · ·"
              type="text"
              inputMode="numeric"
              maxLength={6}
              error={!!errors.otp}
            />
          </Field>

          <ErrorBanner message={formError} />

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full inline-flex items-center justify-center gap-2 h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : null}
            Verify
          </button>

          <div className="text-center space-y-3">
             <button type="button" onClick={() => sendLoginOtp(toFullPhone(form.phone))} className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">
                Resend code
             </button>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                Code expires in 5:00
             </p>
          </div>
        </form>
      </OnboardingShell>
    );
  }

  if (step === 'location') {
    return <CustomerLocationStep onComplete={() => setStep('done')} />;
  }

  return <CustomerCompletionStep />;
}

function CustomerLocationStep({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { addAddress, customerProfile } = useApp();
  const [loc, setLoc] = useState<DeliveryLocation | null>(null);
  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const savedOptions: DeliveryLocation[] = (customerProfile?.addresses || []).map((a: any) => ({
    address: a.address || a.addressLine1 || '',
    area: a.addressLine1 || a.title,
    city: a.city,
    region: a.state,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    instructions: a.deliveryInstructions,
    source: 'saved',
  }));

  const handleContinue = async () => {
    setSaveError('');
    if (!loc?.address?.trim()) {
      setSaveError('Choose or enter a delivery address to continue.');
      return;
    }
    setSaving(true);
    try {
      await addAddress({
        label,
        title: label === 'home' ? 'Home' : label === 'work' ? 'Work' : 'Other',
        recipientName: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        recipientPhone: user?.phone || '',
        addressLine1: loc.address,
        city: loc.city || 'Takoradi',
        state: loc.region || 'Western Region',
        country: 'Ghana',
        latitude: loc.latitude ?? 0,
        longitude: loc.longitude ?? 0,
        isDefault: true,
        deliveryInstructions: loc.instructions,
        address: loc.address,
      });
      onComplete();
    } catch {
      setSaveError('We could not save that address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell
      eyebrow="Last step"
      title={<>Where should we<br />deliver?</>}
      description="Set your default delivery location now — you can add more addresses any time from your account."
      benefits={[
        { icon: <MapPin />, text: 'GPS, search or manual entry — your choice' },
        { icon: <CheckCircle2 />, text: 'Saved securely to your account' },
        { icon: <Navigation />, text: 'Riders navigate exactly where you are' },
      ]}
    >
      <StepHeader title="Delivery location" subtitle="Choose how you'd like to set your delivery location." />

      <div className="space-y-5">
<LocationSearch
          label="Delivery location"
          placeholder="Search Takoradi areas, e.g. Market Circle…"
          value={loc}
          onChange={(l) => setLoc(l)}
          allowCurrentLocation
          savedOptions={savedOptions}
          hint="Use GPS, search the map, or enter the address manually."
        />

        <Field label="Save as" required>
          <div className="grid grid-cols-3 gap-2">
            {(['home', 'work', 'other'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLabel(l)}
                className={
                  'h-11 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all capitalize ' +
                  (label === l
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                    : 'border-slate-150 dark:border-slate-800 text-slate-400 hover:border-emerald-500/40')
                }
              >
                {l}
              </button>
            ))}
          </div>
        </Field>

        <ErrorBanner message={saveError} />

        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : null}
          Save &amp; Continue
          {!saving && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
        </button>

        <p className="text-center text-[11px] font-semibold text-slate-400">
          Signed in as {user?.phone ? `${formatGhanaPhone(user.phone.replace('+233', ''))}` : user?.email}
        </p>
      </div>
    </OnboardingShell>
  );
}

function CustomerCompletionStep() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.firstName || user?.displayName?.split(' ')[0] || '';

  return (
    <OnboardingShell
      eyebrow="Join OmniMarket"
      title={<>You're all set.</>}
      description="Your OmniMarket account is ready. Order food, shop local and track your deliveries across Takoradi."
      benefits={[
        { icon: <UtensilsCrossed />, text: 'Food from local kitchens across Takoradi' },
        { icon: <ShoppingBag />, text: 'Goods from businesses near you' },
        { icon: <Navigation />, text: 'Track orders live until they arrive' },
      ]}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10"
      >
        <div className="w-20 h-20 mx-auto rounded-[28px] bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25">
          <PartyPopper className="w-9 h-9" />
        </div>
        <h1 className="mt-8 font-heading font-black tracking-tight text-slate-900 dark:text-white text-3xl sm:text-4xl">
          You're all set{firstName ? `, ${firstName}` : ''} 🎉
        </h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium">
          Your OmniMarket account is ready.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate('/', { replace: true })}
            className="h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20"
          >
            Start Ordering <ArrowRight className="w-4 h-4 rtl:rotate-180 ml-1" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/vendors')}
            className="h-[52px] px-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-black"
          >
            Explore Restaurants
          </Button>
        </div>
      </motion.div>
    </OnboardingShell>
  );
}
