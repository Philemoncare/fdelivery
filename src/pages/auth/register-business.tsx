// ============================================================
// OmniMarket — Business Account registration flow
// ============================================================

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useToast } from '@/src/components/ui/toast';
import { Button } from '@/src/components/ui/button';
import {
  OnboardingShell, StepHeader, Field, TextField, PasswordField,
  PhoneField, toFullPhone
} from '@/src/components/auth/onboarding-ui';

export function BusinessRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    contactPerson: '',
    email: '',
    phone: '',
    password: '',
  });

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const res = await register({ ...form, role: 'business', name: form.businessName, phone: toFullPhone(form.phone) }, 'business' as any);
      if (res.success) {
        showToast('success', 'Account Created', 'Welcome to OmniMarket Business.');
        navigate('/login');
      } else {
        showToast('error', 'Error', res.error || 'Check your details.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not connect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      eyebrow="Business Account"
      title="Scale your corporate <br />logistics."
      description="Manage business deliveries, employee orders, and corporate billing through one unified dashboard."
      benefits={[{ icon: <BriefcaseBusiness />, text: 'Monthly consolidated billing' }]}
    >
      <StepHeader title="Create Business Account" subtitle="Fill in your company details to get started." />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Company Name" required>
          <TextField value={form.businessName} onChange={v => update('businessName', v)} placeholder="e.g. Acme Corp" />
        </Field>
        <Field label="Contact Person" required>
          <TextField value={form.contactPerson} onChange={v => update('contactPerson', v)} placeholder="Full Name" />
        </Field>
        <Field label="Business Email" required>
          <TextField value={form.email} onChange={v => update('email', v)} type="email" placeholder="billing@acme.com" />
        </Field>
        <Field label="Phone Number" required>
          <PhoneField value={form.phone} onChange={v => update('phone', v)} />
        </Field>
        <Field label="Password" required>
          <PasswordField value={form.password} onChange={v => update('password', v)} />
        </Field>

        <Button type="submit" loading={loading} className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black mt-6 shadow-lg shadow-emerald-600/20">
          Create Business Account
        </Button>
      </form>
    </OnboardingShell>
  );
}
