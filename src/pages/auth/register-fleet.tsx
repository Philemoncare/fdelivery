// ============================================================
// OmniMarket — Fleet Partner registration flow
// ============================================================

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useToast } from '@/src/components/ui/toast';
import { Button } from '@/src/components/ui/button';
import {
  OnboardingShell, StepHeader, Stepper, Field, TextField, PasswordField,
  PhoneField, ErrorBanner, toFullPhone
} from '@/src/components/auth/onboarding-ui';

export function FleetRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fleetName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    vehicleCount: '',
  });

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (step < 2) { setStep(2); return; }
    setLoading(true);
    try {
      const res = await register({ ...form, role: 'fleet', name: form.fleetName, phone: toFullPhone(form.phone) }, 'fleet' as any);
      if (res.success) {
        showToast('success', 'Application Submitted', 'Your fleet application is being reviewed.');
        setStep(3);
      } else {
        showToast('error', 'Error', res.error || 'Check your details.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not connect.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <OnboardingShell
        eyebrow="Fleet Partner"
        title="Application Received"
        description="We are reviewing your fleet partnership application."
        benefits={[{ icon: <CheckCircle2 />, text: 'Verification in progress' }]}
      >
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black mb-4">You're on the list!</h2>
          <p className="text-slate-500 mb-8">We'll be in touch shortly to finalize your fleet setup.</p>
          <Button onClick={() => navigate('/login')} className="w-full h-14 rounded-2xl">Return to Login</Button>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      eyebrow="Fleet Partner"
      title="Manage your fleet <br />with OmniMarket."
      description="Connect your riders and vehicles to our logistics network and grow your delivery business."
      benefits={[{ icon: <Truck />, text: 'Real-time fleet tracking' }]}
    >
      <StepHeader title={step === 1 ? "Fleet Details" : "Owner Information"} />
      <Stepper steps={['Fleet', 'Owner']} current={step} />

      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 1 ? (
          <>
            <Field label="Fleet / Business Name" required>
              <TextField value={form.fleetName} onChange={v => update('fleetName', v)} placeholder="e.g. Takoradi Express Logistics" />
            </Field>
            <Field label="Estimated Vehicle Count" required>
              <TextField value={form.vehicleCount} onChange={v => update('vehicleCount', v)} placeholder="e.g. 5" type="number" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Owner Full Name" required>
              <TextField value={form.ownerName} onChange={v => update('ownerName', v)} placeholder="Kwame Mensah" />
            </Field>
            <Field label="Business Email" required>
              <TextField value={form.email} onChange={v => update('email', v)} type="email" placeholder="owner@fleet.com" />
            </Field>
            <Field label="Phone Number" required>
              <PhoneField value={form.phone} onChange={v => update('phone', v)} />
            </Field>
            <Field label="Password" required>
              <PasswordField value={form.password} onChange={v => update('password', v)} />
            </Field>
          </>
        )}

        <div className="flex gap-3 pt-6">
          {step === 2 && <Button variant="outline" onClick={() => setStep(1)} className="h-14 rounded-2xl flex-1">Back</Button>}
          <Button type="submit" loading={loading} className="h-14 rounded-2xl bg-emerald-600 text-white font-black flex-1">
            {step === 1 ? 'Continue' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}
