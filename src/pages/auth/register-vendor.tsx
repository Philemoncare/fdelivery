// ============================================================
// OmniMarket — Vendor registration flow
// Multi-step guided onboarding:
//   Step 1  Business Type     (/register/vendor — step 1)
//   Step 2  Business Details  (/register/vendor — step 2)
//   Step 3  Owner Details     (/register/vendor — step 3)
//   Step 4  Location           (/register/vendor — step 4)
//   Step 5  Documents          (/register/vendor — step 5)
//   Step 6  Store Setup        (/register/vendor — step 6)
//   Step 7  Payment            (/register/vendor — step 7)
//   Step 8  Review             (/register/vendor — step 8)
//   Completed: Application submitted
// ============================================================

import { useState, type FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, User, MapPin, ShieldCheck, FileText,
  CreditCard, LayoutGrid, Camera, Loader2, CheckCircle2,
  AlertCircle, ArrowRight, UtensilsCrossed, ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useApp } from '@/src/context/AppContext';
import { useToast } from '@/src/components/ui/toast';
import { Button } from '@/src/components/ui/button';
import {
  OnboardingShell, StepHeader, Stepper, Field, TextField, PasswordField,
  PhoneField, TextArea, SelectField, OptionCards, DocumentUploadCard,
  ReviewRow, ResumeBanner, ErrorBanner, toFullPhone, loadDraft, saveDraft,
  clearDraft, saveDraftStep, loadDraftStep,
} from '@/src/components/auth/onboarding-ui';
import { VENDOR_BUSINESS_TYPES, PAYOUT_METHODS } from '@/src/lib/partner-roles';
import { LocationSearch } from '@/src/components/common/LocationSearch';
import type { DeliveryLocation } from '@/src/types';

export function VendorRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const draftKey = 'om_vendor_application';
  const [draftStep, setDraftStep] = useState(() => loadDraftStep(draftKey) || 1);
  const [form, setForm] = useState(() => loadDraft<Record<string, any>>(draftKey) || {
    businessType: 'restaurant',
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    location: null,
    paymentMethod: 'momo',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    saveDraft(draftKey, form);
    saveDraftStep(draftKey, draftStep);
  }, [form, draftStep]);

  const steps = [
    { title: 'Business Type', subtitle: 'What type of business are you?' },
    { title: 'Details', subtitle: 'Tell us about your business.' },
    { title: 'Owner', subtitle: 'Who is the primary contact person?' },
    { title: 'Location', subtitle: 'Where is your business located?' },
    { title: 'Documents', subtitle: 'Upload business registration and ID.' },
    { title: 'Store Setup', subtitle: 'Configure your basic store profile.' },
    { title: 'Payment', subtitle: 'Set up your payout information.' },
    { title: 'Review', subtitle: 'Confirm your application details.' },
  ];

  const current = steps[draftStep - 1];
  const isLast = draftStep === steps.length;

  const update = (key: string, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (draftStep === 1 && !form.businessType) e.businessType = 'Required';
    if (draftStep === 2) {
      if (!form.businessName?.trim()) e.businessName = 'Required';
      if (!form.businessEmail?.trim()) e.businessEmail = 'Required';
      if (!form.businessPhone?.trim()) e.businessPhone = 'Required';
    }
    if (draftStep === 3) {
      if (!form.ownerName?.trim()) e.ownerName = 'Required';
      if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
    }
    if (draftStep === 4 && !form.location?.address) e.location = 'Required';
    if (draftStep === 5 && !form.businessRegDataUrl) e.businessReg = 'Required';
    if (draftStep === 7 && !form.paymentMethod) e.paymentMethod = 'Required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = (ev?: FormEvent) => {
    ev?.preventDefault();
    if (validate()) setDraftStep(s => s + 1);
  };

  const prev = () => setDraftStep(s => Math.max(1, s - 1));

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        role: 'vendor',
        phone: toFullPhone(form.businessPhone),
        email: form.businessEmail,
        name: form.businessName,
        category: form.businessType === 'restaurant' ? 'Restaurant' : 'Store',
        address: form.location?.address,
        latitude: form.location?.latitude,
        longitude: form.location?.longitude,
      };
      const res = await register(payload, 'vendor');
      if (res.success) {
        clearDraft(draftKey);
        setDraftStep(steps.length + 1); // Application submitted state
      } else {
        showToast('error', 'Registration Failed', res.error || 'Please check your information.');
      }
    } catch {
      showToast('error', 'Network Error', 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  if (draftStep > steps.length) {
    return (
      <OnboardingShell
        eyebrow="Application Pending"
        title="Your business application is under review."
        description="Our team is reviewing your documents and store setup. This typically takes 24-48 hours."
        benefits={[
          { icon: <CheckCircle2 />, text: 'Business Details Verified' },
          { icon: <ShieldCheck />, text: 'Documents in Review' },
          { icon: <Store />, text: 'Store Profile Pending' },
        ]}
      >
         <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
               <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="mt-8 text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Application Submitted</h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">We've received your application to become an OmniMarket partner. We'll notify you as soon as your account is approved.</p>
            <div className="mt-10 space-y-4">
               <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg">Under Review</span>
               </div>
               <Button onClick={() => navigate('/login')} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black tracking-widest">Sign In to Dashboard</Button>
            </div>
         </motion.div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      eyebrow="Become a Vendor"
      title={<>Scale your business <br />with OmniMarket.</>}
      description="Sell to thousands of customers across Takoradi. Manage orders, deliveries, and payments with ease."
      benefits={[
        { icon: <Store />, text: 'Dedicated partner dashboard' },
        { icon: <ShieldCheck />, text: 'Secure payments & fast payouts' },
        { icon: <LayoutGrid />, text: 'Advanced store management tools' },
      ]}
    >
      <StepHeader title={current.title} subtitle={current.subtitle} />
      <Stepper steps={steps.map(s => s.title)} current={draftStep} />

      <form onSubmit={isLast ? handleSubmit : next} className="space-y-6">
        {draftStep === 1 && (
          <OptionCards
            value={form.businessType}
            onChange={v => update('businessType', v)}
            options={VENDOR_BUSINESS_TYPES.map(t => ({ value: t.value, label: t.label, icon: t.icon, note: t.note }))}
            columns={1}
          />
        )}

        {draftStep === 2 && (
          <div className="space-y-5">
            <Field label="Business Name" required error={errors.businessName}>
              <TextField value={form.businessName} onChange={v => update('businessName', v)} placeholder="e.g. Market Circle Grill" />
            </Field>
            <Field label="Business Email" required error={errors.businessEmail}>
              <TextField value={form.businessEmail} onChange={v => update('businessEmail', v)} type="email" placeholder="contact@business.com" />
            </Field>
            <Field label="Business Phone" required error={errors.businessPhone}>
              <PhoneField value={form.businessPhone} onChange={v => update('businessPhone', v)} />
            </Field>
            <Field label="Description" optional>
              <TextArea value={form.description} onChange={v => update('description', v)} placeholder="Briefly describe what you sell..." />
            </Field>
          </div>
        )}

        {draftStep === 3 && (
          <div className="space-y-5">
            <Field label="Owner Full Name" required error={errors.ownerName}>
              <TextField value={form.ownerName} onChange={v => update('ownerName', v)} placeholder="Kwabena Mensah" />
            </Field>
            <Field label="Account Password" required error={errors.password}>
              <PasswordField value={form.password} onChange={v => update('password', v)} />
            </Field>
          </div>
        )}

        {draftStep === 4 && (
           <div className="space-y-5">
              <LocationSearch
                label="Business Location"
                value={form.location}
                onChange={l => update('location', l)}
                placeholder="Search Takoradi areas..."
                allowCurrentLocation
              />
              {errors.location && <p className="text-xs text-rose-500 font-bold">{errors.location}</p>}
           </div>
        )}

        {draftStep === 5 && (
          <div className="space-y-5">
            <Field label="Business Registration (Certificate)" required error={errors.businessReg}>
              <DocumentUploadCard
                label="Certificate of Incorporation"
                description="Upload a clear image or PDF of your business registration document."
                doc={form.businessRegDataUrl ? { name: 'BusinessReg', dataUrl: form.businessRegDataUrl, sizeKb: 0, kind: 'image' } : null}
                onChange={d => update('businessRegDataUrl', d?.dataUrl || '')}
              />
            </Field>
            <Field label="Owner ID" required>
              <DocumentUploadCard
                label="Government Issued ID"
                description="National ID, Driver's License, or Passport of the business owner."
                doc={form.ownerIdDataUrl ? { name: 'OwnerID', dataUrl: form.ownerIdDataUrl, sizeKb: 0, kind: 'image' } : null}
                onChange={d => update('ownerIdDataUrl', d?.dataUrl || '')}
              />
            </Field>
          </div>
        )}

        {draftStep === 6 && (
           <div className="space-y-5">
              <Field label="Store Logo" optional>
                 <DocumentUploadCard
                   label="Upload Logo"
                   doc={form.logoDataUrl ? { name: 'Logo', dataUrl: form.logoDataUrl, sizeKb: 0, kind: 'image' } : null}
                   onChange={d => update('logoDataUrl', d?.dataUrl || '')}
                 />
              </Field>
              <Field label="Operation Hours" optional>
                 <TextField value={form.hours} onChange={v => update('hours', v)} placeholder="e.g. Mon-Sat, 8:00 AM - 10:00 PM" />
              </Field>
           </div>
        )}

        {draftStep === 7 && (
          <div className="space-y-5">
            <Field label="Payout Method" required error={errors.paymentMethod}>
              <OptionCards
                value={form.paymentMethod}
                onChange={v => update('paymentMethod', v)}
                options={PAYOUT_METHODS}
                columns={1}
              />
            </Field>
            {form.paymentMethod === 'momo' && (
              <Field label="Mobile Money Number" required>
                <PhoneField value={form.payoutMomo} onChange={v => update('payoutMomo', v)} />
              </Field>
            )}
            {form.paymentMethod === 'bank' && (
               <div className="grid grid-cols-1 gap-4">
                  <Field label="Bank Name" required><TextField value={form.bankName} onChange={v => update('bankName', v)} /></Field>
                  <Field label="Account Number" required><TextField value={form.accountNumber} onChange={v => update('accountNumber', v)} /></Field>
               </div>
            )}
          </div>
        )}

        {draftStep === 8 && (
          <div className="space-y-4">
            <ReviewRow label="Business" value={form.businessName} />
            <ReviewRow label="Type" value={form.businessType?.toUpperCase()} />
            <ReviewRow label="Contact" value={form.businessPhone} />
            <ReviewRow label="Location" value={form.location?.address} />
            <ReviewRow label="Documents" value={form.businessRegDataUrl ? 'Uploaded' : 'Missing'} />
            <ReviewRow label="Payout" value={form.paymentMethod?.toUpperCase()} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-6">
          {draftStep > 1 && (
            <Button type="button" variant="outline" onClick={prev} className="flex-1 h-14 rounded-2xl font-black text-xs tracking-widest">BACK</Button>
          )}
          <Button
            type="submit"
            loading={loading}
            className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20"
          >
            {isLast ? 'SUBMIT APPLICATION' : 'CONTINUE'}
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}
