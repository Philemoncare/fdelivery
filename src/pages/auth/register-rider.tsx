// ============================================================
// OmniMarket — Rider registration flow
// Multi-step guided onboarding:
//   Step 1  Account           (/register/rider — step 1)
//   Step 2  Personal information (/register/rider — step 2)
//   Step 3  Vehicle details   (/register/rider — step 3)
//   Step 4  Document upload   (/register/rider — step 4)
//   Step 5  Payout details    (/register/rider — step 5)
//   Step 6  Review            (/register/rider — step 6)
//   Completed: Application submitted (/rider/application-status)
// Draft is auto-saved locally; rider can resume where left off.
// On submit: POST /api/auth/register with role=rider →
//   server creates user without session → rider lands on
//   /rider/application-status showing "Application submitted"
// + next steps and a "Sign In" button.
// ============================================================

import { useState, type FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
User, Bike, Calendar, MapPin, ShieldCheck, FileText,
CreditCard, Eye, EyeOff, Camera, Loader2, CheckCircle2,
AlertCircle, X, Trash2, RefreshCw, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useApp } from '@/src/context/AppContext';
import { useToast } from '@/src/components/ui/toast';
import { Button } from '@/src/components/ui/button';
import {
  OptionCards, DocumentUploadCard, ReviewRow, ReviewSection,
  StepHeader, Stepper, ResumeBanner, ErrorBanner,
  formatGhanaPhone, toFullPhone, loadDraft, saveDraft,
  clearDraft, saveDraftStep, loadDraftStep, Field,
  TextField, TextArea, SelectField, PasswordField, PhoneField,
} from '@/src/components/auth/onboarding-ui';
import { RIDER_VEHICLE_OPTIONS, PAYOUT_METHODS } from '@/src/lib/partner-roles';
import { TAKORADI_LOCATIONS } from '@/src/lib/locations';

export function RiderRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { register, login, sendLoginOtp, loginWithOtp } = useAuth();
  const { vendors } = useApp();

  // ---- draft handling ----
  const draftKey = 'om_rider_application';
  const [draftStep, setDraftStep] = useState(() => loadDraftStep(draftKey) || 1);
  const [draftForm, setDraftForm] = useState(() => loadDraft<Record<string, any>>(draftKey) || {});
  useEffect(() => {
    saveDraftStep(draftKey, draftStep);
  }, [draftStep]);

  // local storage draft changes as we go (simplifies resume)
  const saveDraftNow = (f: Record<string, any>) => {
    setDraftForm(f);
    saveDraft(draftKey, f);
  };

  const steps = [
    { title: 'Account', subtitle: 'Enter your name, contact and password.' },
    { title: 'Personal', subtitle: 'Add your date of birth, address and emergency contact.' },
    { title: 'Vehicle', subtitle: 'How will you deliver? Tell us your vehicle type.' },
    { title: 'Documents', subtitle: 'Upload Government ID and any required vehicle paperwork.' },
    { title: 'Payment', subtitle: 'Set up where your approved earnings will be sent.' },
    { title: 'Review', subtitle: 'Confirm everything is correct then submit your application.' },
  ];

  const step = draftStep;
  const isLast = step === steps.length;
  const current = steps[step - 1];

  /* ---------- helpers that also persist drafts ---------- */

  const update = (key: string, value: any) => {
    setDraftForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n });
  };

  const phoneToE164 = (v: string) => v.replace(/\D/g, '').slice(0, 9);
  const updatePhone = (v: string) => update('phone', phoneToE164(v));

  /* ---------- form state - fields that compose the final register payload - */
  const fields = [
    'firstName', 'lastName', 'phone', 'email', 'password',
    'dateOfBirth', 'residenceAddress', 'city', 'emergencyName',
    'emergencyPhone', 'vehicleType', 'vehicleNumber',
    'driverLicense', 'nationalId',
    'govIdType', 'govIdFrontUrl', 'govIdFrontDataUrl',
    'paymentMethod', 'paymentBankAccount', 'paymentMomoNumber',
    'insuranceNumber', 'insuranceProvider',
  ];

  // init defaults from what rider registration server already reads
  // (vehicleType, vehicleNumber already exist on the db model; others we'll include
  // as payload fields the server ignores but we store locally + admin can see).
  const initForm = () => {
    const d = { ...draftForm };
    // ensure these exist and are strings
    const ensure = (k: string, dv: string = '') => { if (!d[k]) d[k] = dv; };
    ensure('firstName');
    ensure('lastName');
    ensure('phone', '');
    ensure('email', '');
    ensure('password', '');
    ensure('dateOfBirth', '');
    ensure('residenceAddress', '');
    ensure('city', '');
    ensure('emergencyName', '');
    ensure('emergencyPhone', '');
    ensure('vehicleType', 'Motorcycle');
    ensure('vehicleNumber', '');
    ensure('driverLicense', '');
    ensure('nationalId', '');
    ensure('govIdType', 'National ID');
    ensure('govIdFrontUrl', '');
    ensure('paymentMethod', 'momo');
    ensure('paymentBankAccount', '');
    ensure('paymentMomoNumber', '');
    ensure('insuranceNumber', '');
    ensure('insuranceProvider', '');
    return d;
  };

  const form = initForm();

  // ---------- validation ----------
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const validate = (): boolean => {
    setErrors({});
    const e: Record<string, string> = {};
    // Per-step validation
    if (step === 1) {
      if (!form.firstName?.trim()) e.firstName = 'Required';
      if (!form.lastName?.trim()) e.lastName = 'Required';
      if (!form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Required / valid email';
      if (!form.phone?.replace(/\D/g, '').length) e.phone = 'Required';
      if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
    }
    if (step === 2) {
      if (!form.dateOfBirth?.trim()) e.dateOfBirth = 'Required';
      if (!form.residenceAddress?.trim()) e.residenceAddress = 'Required';
      if (!form.city?.trim()) e.city = 'Required';
      if (!form.emergencyName?.trim()) e.emergencyName = 'Required';
      if (!form.emergencyPhone?.replace(/\D/g, '').length) e.emergencyPhone = 'Required';
    }
    if (step === 3) {
      if (!form.vehicleType) e.vehicleType = 'Required';
      if (['Motorcycle', 'Car'].includes(form.vehicleType!) && !form.vehicleNumber?.trim()) e.vehicleNumber = 'Required';
    }
    if (step === 4) {
      if (!form.govIdFrontDataUrl) e.govIdFront = 'Required';
    }
    if (step === 5) {
      if (!form.paymentMethod) e.paymentMethod = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ---- when errors change, also reset/clean draft errors key ----
  useEffect(() => {
    if (Object.keys(errors).length > 0) setDraftForm(prev => ({ ...prev, errors }));
  }, [errors]);

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) setDraftStep(s => s + 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLast) {
      // final step — submit application
      if (!validate()) return;
      setLoading(true);
      try {
        const payload: Record<string, any> = {
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, phone: toFullPhone(form.phone),
          password: form.password, role: 'rider',
          dateOfBirth: form.dateOfBirth,
          residenceAddress: form.residenceAddress,
          city: form.city,
          emergencyName: form.emergencyName,
          emergencyPhone: toFullPhone(form.emergencyPhone),
          vehicleType: form.vehicleType,
          vehicleNumber: form.vehicleNumber,
          driverLicense: form.driverLicense,
          nationalId: form.nationalId,
          govIdType: form.govIdType,
          govIdFrontUrl: form.govIdFrontUrl,
          paymentMethod: form.paymentMethod,
          ...(form.paymentMethod === 'bank' && { paymentBankAccount: form.paymentBankAccount }),
          ...(form.paymentMethod === 'momo' && { paymentMomoNumber: form.paymentMomoNumber }),
          insuranceNumber: form.insuranceNumber,
          insuranceProvider: form.insuranceProvider,
        };
        const result = await register(payload, 'rider');
        if (result.success) {
          clearDraft(draftKey);
          saveDraftStep(draftKey, 1);
          setDraftStep(steps.length + 1); // Success state
          showToast('success', 'Application submitted', 'Your rider application is under review.');
        } else {
          showToast('error', 'Registration error', result.error || 'Check your details.');
        }
      } catch {
        showToast('error', 'Network error', 'Could not reach the server. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
      return;
    }
    // not last step — advance
    if (validate()) setDraftStep(s => s + 1);
  };

  // When step changes via Next, also persist draft immediately for resume
  useEffect(() => {
    // Rebuild form from current init, but carry over any fields already filled
    const base = initForm();
    Object.keys(form).forEach(k => {
      if (k !== 'password' && form[k as any] !== undefined) base[k] = form[k as any];
    });
    saveDraftNow(base);
    setDraftStep(draftStep);
  }, [step, form]);

  // When step changes from navigation/back, rehydrate from draft
  useEffect(() => {
    const saved = loadDraft(draftKey);
    if (saved && saved.firstName) {
      Object.keys(saved).forEach(k => {
        if (form[k as any] === undefined || k === 'password') form[k as any] = saved[k];
      });
    }
    setDraftStep(loadDraftStep(draftKey) || 1);
  }, []);

  /* ---------- per-step render functions - */

  // Step 1: Account
  const renderAccount = () => (
    <div className="space-y-5">
      <Field label="First name" required error={errors.firstName}>
        <TextField value={form.firstName} onChange={v => update('firstName', v)} placeholder="Yaw" autoComplete="given-name" />
      </Field>
      <Field label="Last name" required error={errors.lastName}>
        <TextField value={form.lastName} onChange={v => update('lastName', v)} placeholder="Boateng" autoComplete="family-name" />
      </Field>
      <Field label="Phone number" required error={errors.phone}>
        <PhoneField value={form.phone} onChange={updatePhone} placeholder="24 123 4567" />
      </Field>
      <Field label="Email" required error={errors.email}>
        <TextField value={form.email} onChange={v => update('email', v)} placeholder="yaw.b@gmail.com" type="email" inputMode="email" />
      </Field>
      <Field label="Password" required error={errors.password}>
        <PasswordField value={form.password} onChange={v => update('password', v)} placeholder="At least 8 characters" />
      </Field>
    </div>
  );

  // Step 2: Personal
  const renderPersonal = () => (
    <div className="space-y-5">
      <Field label="Date of birth" required error={errors.dateOfBirth}>
        <TextField value={form.dateOfBirth} onChange={v => update('dateOfBirth', v)} placeholder="YYYY-MM-DD" type="text" inputMode="text" />
      </Field>
      <Field label="Residential address" required error={errors.residenceAddress}>
        <TextArea value={form.residenceAddress} onChange={v => update('residenceAddress', v)} placeholder="e.g. Fijai, Takoradi" rows={3} />
      </Field>
      <Field label="City" required error={errors.city}>
        <SelectField value={form.city} onChange={v => update('city', v)} options={[
          { value: 'Takoradi', label: 'Takoradi' },
          { value: 'Sekondi', label: 'Sekondi' },
          { value: 'Axim', label: 'Axim' },
        ]} placeholder="Select city" />
      </Field>
      <Field label="Emergency contact — name" required error={errors.emergencyName}>
        <TextField value={form.emergencyName} onChange={v => update('emergencyName', v)} placeholder="Yaa Boateng" />
      </Field>
      <Field label="Emergency contact — phone" required error={errors.emergencyPhone}>
        <PhoneField value={form.emergencyPhone} onChange={v => update('emergencyPhone', v)} placeholder="24 987 6543" />
      </Field>
    </div>
  );

  // Step 3: Vehicle
  const renderVehicle = () => (
    <div className="space-y-5">
      <Field label="How will you deliver?" required error={errors.vehicleType}>
        <OptionCards
          value={form.vehicleType}
          onChange={v => update('vehicleType', v)}
          options={RIDER_VEHICLE_OPTIONS}
          columns={1}
        />
        <div className="pt-2">
          {['Motorcycle', 'Car'].includes(form.vehicleType!) && (
            <Field label="Vehicle number" error={errors.vehicleNumber}>
              <TextField value={form.vehicleNumber} onChange={v => update('vehicleNumber', v)} placeholder="WR-1234-24" />
            </Field>
          )}
        </div>
      </Field>
      {['Motorcycle', 'Car'].includes(form.vehicleType!) && (
        <Field label="Documentation note" error={errors.vehicleNumber}>
          <p className="text-sm text-slate-400 font-medium">
            Valid licence and vehicle documentation may be required before approval.
          </p>
        </Field>
      )}
    </div>
  );

  // Step 4: Documents
  const renderDocuments = () => (
    <div className="space-y-5">
      <Field label="Government-issued ID (Front)" required error={errors.govIdFront}>
        <DocumentUploadCard
          label="Government ID front"
          description="Front side of your valid government ID (National ID, Driver's licence, Passport, etc.)"
          doc={form.govIdFrontDataUrl ? { name: 'National ID', dataUrl: form.govIdFrontDataUrl, sizeKb: 0, kind: 'image' } : null}
          onChange={(doc) => update('govIdFrontDataUrl', doc?.dataUrl || '')}
          error={errors.govIdFront}
        />
      </Field>
      {form.govIdFrontDataUrl && (
        <DocumentUploadCard
          label="Government ID back"
          description="Back side of your ID (where applicable)"
          doc={form.govIdBackDataUrl ? { name: 'National ID back', dataUrl: form.govIdBackDataUrl, sizeKb: 0, kind: 'image' } : null}
          onChange={(doc) => update('govIdBackDataUrl', doc?.dataUrl || '')}
          error={errors.govIdBack}
        />
      )}
      {['Motorcycle', 'Car'].includes(form.vehicleType!) && (
        <Field label="Vehicle documentation">
          <DocumentUploadCard
            label="Vehicle registration / logbook"
            description="Vehicle registration document or logbook"
            doc={form.vehicleDocDataUrl ? { name: 'Vehicle docs', dataUrl: form.vehicleDocDataUrl, sizeKb: 0, kind: 'image' } : null}
            onChange={(doc) => update('vehicleDocDataUrl', doc?.dataUrl || '')}
            error={errors.vehicleDoc}
          />
        </Field>
      )}
    </div>
  );

  // Step 5: Payment
  const renderPayment = () => (
    <div className="space-y-5">
      <Field label="Payout method" required error={errors.paymentMethod}>
        <OptionCards
          value={form.paymentMethod}
          onChange={v => update('paymentMethod', v)}
          options={PAYOUT_METHODS}
          columns={1}
        />
      </Field>
      {form.paymentMethod === 'momo' && (
        <Field label="Mobile Money number" error={errors.paymentMomoNumber}>
          <TextField value={form.paymentMomoNumber} onChange={v => update('paymentMomoNumber', v)} placeholder="+233 2X XXX XXXX" inputMode="tel" autoComplete="tel-national" />
        </Field>
      )}
      {form.paymentMethod === 'bank' && (
        <Field label="Bank account number" error={errors.paymentBankAccount}>
          <TextField value={form.paymentBankAccount} onChange={v => update('paymentBankAccount', v)} placeholder="e.g. 015 0012 3456" />
        </Field>
      )}
    </div>
  );

  // Step 6: Review
  const summaryRows = [
    { label: 'First name', value: form.firstName || '—' },
    { label: 'Last name', value: form.lastName || '—' },
    { label: 'Phone', value: user?.phone ? formatGhanaPhone(user.phone.replace('+233', '')) : (form.phone || '—') },
    { label: 'Email', value: form.email || '—' },
    { label: 'Date of birth', value: form.dateOfBirth || '—' },
    { label: 'Residential address', value: form.residenceAddress || '—' },
    { label: 'City', value: form.city || '—' },
    { label: 'Emergency contact', value: `${form.emergencyName || '—'} (${form.emergencyPhone || '—'})` },
    { label: 'Vehicle type', value: form.vehicleType || '—' },
    { label: 'Vehicle number', value: form.vehicleNumber || '—' },
    { label: 'Government ID', value: form.govIdFrontDataUrl ? 'Uploaded' : 'Not yet' },
    { label: 'Payout method', value: form.paymentMethod || '—' },
    { label: 'Mobile Money', value: form.paymentMethod === 'momo' ? (form.paymentMomoNumber ? 'Set' : '—') : form.paymentMethod === 'bank' ? (form.paymentBankAccount ? 'Set' : '—') : '—' },
  ];

  const renderReview = () => (
    <div className="space-y-5">
      {summaryRows.map((r, i) => (
        <ReviewRow key={i} label={r.label} value={r.value} />
      ))}
    </div>
  );

  /* ---------- top-level render ---------- */

  // Resume banner when returning after closing browser mid-flow
  const resumeBanner = draftForm?.firstName ? (
    <ResumeBanner
      completed={draftStep || 1}
      total={steps.length}
      onResume={() => setDraftStep(loadDraftStep(draftKey) || 1)}
      onDiscard={() => { clearDraft(draftKey); setDraftStep(1); setDraftForm(initForm()); }}
    />) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Resume banner */}
      {resumeBanner}

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Side brand panel */}
        <aside className="hidden lg:flex lg:w-[42%] xl:w-[48%] relative overflow-hidden flex-col justify-between p-12 xl:p-16"
          style={{ background: 'linear-gradient(160deg,#065f46 0%,#059669 60%,#047857 100%)' }}
        >
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-200/90">Become a Rider</p>
            <h2 className="mt-4 text-4xl xl:text-[44px] font-heading font-black leading-[1.05] tracking-tight text-slate-900 dark:text-white">
              Rider Application
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Join OmniMarket as a delivery rider and earn from completed deliveries across Takoradi.
            </p>
            <ul className="mt-10 space-y-5">
              {steps.map((s, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.08 }}>
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500 flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5 text-emerald-600" />
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{s.title}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          <div className="relative z-10 text-xs font-black uppercase tracking-[0.2em] text-slate-400/80">
            OmniMarket Ghana · Takoradi
          </div>
        </aside>

        {/* Form column */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 p-6 sm:p-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-xl mx-auto">
            <StepHeader title={current.title} subtitle={current.subtitle} />
            {resumeBanner}

            {/* Progress stepper */}
            <Stepper steps={steps.map(s => s.title)} current={step} onStepClick={n => setDraftStep(n)} />

            {/* Form */}
            <form onSubmit={isLast ? handleSubmit : handleNext} className="space-y-6 pt-6">
              {step === 1 && renderAccount()}
              {step === 2 && renderPersonal()}
              {step === 3 && renderVehicle()}
              {step === 4 && renderDocuments()}
              {step === 5 && renderPayment()}
              {step === 6 && renderReview()}

              {step <= steps.length && (
                <div className="flex flex-col sm:flex-row gap-3 pt-8">
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={() => setDraftStep(s => Math.max(s - 1, 1))} className="flex-1 h-12 rounded-2xl font-black text-xs tracking-widest">
                      BACK
                    </Button>
                  )}
                  <Button type="submit" loading={loading} className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-60">
                    {isLast ? "SUBMIT APPLICATION" : "CONTINUE TO NEXT STEP"}
                  </Button>
                </div>
              )}

              {step > steps.length && (
                <div className="mt-8 space-y-4">
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <div className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h2 className="mt-6 text-2xl font-heading font-black text-slate-900 dark:text-white">
                      Application submitted
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      Your application has been received and is awaiting review.
                    </p>
                    <p className="mt-3 font-black uppercase tracking-widest text-emerald-600">
                      Reference: OM-R-{Math.floor(10000 + Math.random() * 89999)}
                    </p>
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                      <strong>Under Review</strong> — Our team will verify your documents and payout details. This typically takes under 24 hours.
                    </p>
                    <Button
                      onClick={() => navigate('/rider/application-status', { replace: true })}
                      className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-[0.2em] transition-colors"
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </div>
              )}
            </form>

            {/* Draft resume hint if saved draft exists and we're not at step 1 */}
            {!isLast && draftForm?.firstName && draftStep > 1 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-4 text-center text-sm text-emerald-600">
                <p>Your progress is saved. You can resume from step {draftStep}.</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-slate-100 dark:border-slate-800/60 py-6 px-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="text-[11px] font-bold text-slate-400">&copy; {new Date().getFullYear()} OmniMarket · Takoradi</span>
        {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Help', '/faq']].map(([label, to]) => (
          <Link key={to} to={to} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">{label}</Link>
        ))}
      </footer>
    </div>
  );
}

// -------------------------------------------------------------------
// Helper: SelectField used above (re-exported for visibility).
// The onChange gives a plain string; OptionCards already calls it.
// -------------------------------------------------------------------