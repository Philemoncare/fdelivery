// ============================================================
// OmniMarket — Onboarding UI Kit
// Shared primitives for every registration / application flow:
// shell layout, stepper, fields, document upload, draft storage.
// ============================================================

import { useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Eye, EyeOff, Upload,
  FileText, ImageIcon, Trash2, RefreshCw, AlertCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import omniLogo from '@/assets/omni-logo.png';

/* ------------------------------------------------------------------ */
/* Draft persistence — multi-step applications resume where you left   */
/* ------------------------------------------------------------------ */

export function loadDraft<T extends Record<string, unknown>>(key: string): Partial<T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDraft(key: string, value: Record<string, unknown>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or unavailable */ }
}

export function clearDraft(key: string) {
  localStorage.removeItem(key);
  localStorage.removeItem(`${key}:step`);
}

export function saveDraftStep(key: string, step: number) {
  try { localStorage.setItem(`${key}:step`, String(step)); } catch { /* ignore */ }
}

export function loadDraftStep(key: string): number {
  const raw = localStorage.getItem(`${key}:step`);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/* ------------------------------------------------------------------ */
/* Shell — desktop two-column brand panel + form, mobile single column */
/* ------------------------------------------------------------------ */

export interface OnboardingShellProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  benefits: { icon: ReactNode; text: string }[];
  /** Right-hand form column */
  children: ReactNode;
  /** Sticky top-left back action target */
  backTo?: string;
  backLabel?: string;
  tone?: 'green' | 'navy';
}

export function OnboardingShell({
  eyebrow, title, description, benefits, children, backTo = '/', backLabel = 'Back to home', tone = 'green',
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      <header className="h-[72px] flex items-center justify-between px-5 sm:px-10 relative z-20 border-b border-slate-100 dark:border-slate-800/60">
        <Link to="/" className="flex items-center shrink-0" aria-label="OmniMarket home">
          <img
            src={omniLogo}
            alt="OmniMarket"
            className="object-contain h-[40px] w-auto max-w-[130px] dark:invert dark:hue-rotate-180"
          />
        </Link>
        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Secure registration
        </span>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Brand panel */}
        <aside className="hidden lg:flex lg:w-[42%] xl:w-[46%] relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-white"
          style={{ background: tone === 'navy' ? 'linear-gradient(160deg,#0b1f16 0%,#123527 55%,#0e2a1f 100%)' : 'linear-gradient(160deg,#065f46 0%,#059669 60%,#047857 100%)' }}
        >
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '26px 26px' }} />
          <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 mt-10">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-200/90">{eyebrow}</p>
            <h2 className="mt-4 text-4xl xl:text-[44px] font-heading font-black leading-[1.05] tracking-tight">{title}</h2>
            <p className="mt-5 text-base leading-relaxed text-white/75 max-w-md">{description}</p>

            <ul className="mt-10 space-y-5">
              {benefits.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-4"
                >
                  <span className="w-10 h-10 rounded-xl bg-white/12 border border-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px]">
                    {b.icon}
                  </span>
                  <span className="text-sm font-bold text-white/90">{b.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <div className="relative z-10">
            <p className="text-sm font-semibold text-white/85 leading-relaxed max-w-md">
              “OmniMarket connects your business to customers across Takoradi — orders, delivery and payments in one place.”
            </p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">OmniMarket Ghana · Takoradi</p>
          </div>
        </aside>

        {/* Form column */}
        <div className="flex-1 relative">
          <div className="max-w-xl w-full mx-auto px-5 sm:px-8 py-10 sm:py-14">
            <Link
              to={backTo}
              className="group inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              {backLabel}
            </Link>
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 dark:border-slate-800/60 py-6 px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="text-[11px] font-bold text-slate-400">&copy; {new Date().getFullYear()} OmniMarket · Takoradi</span>
        {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Help', '/faq']].map(([label, to]) => (
          <Link key={to} to={to} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">{label}</Link>
        ))}
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stepper                                                             */
/* ------------------------------------------------------------------ */

export function Stepper({ steps, current, onStepClick }: {
  steps: string[];
  current: number; // 1-based
  onStepClick?: (step: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2 mb-9" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const clickable = !!onStepClick && done;
        return (
          <li key={label} className="flex-1 min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(n)}
              className={cn('w-full text-start group', clickable ? 'cursor-pointer' : 'cursor-default')}
              title={clickable ? `Edit ${label}` : label}
            >
              <span className={cn(
                'block h-1.5 rounded-full transition-all duration-400',
                done ? 'bg-emerald-500' : active ? 'bg-emerald-500 ring-4 ring-emerald-500/15' : 'bg-slate-100 dark:bg-slate-800',
              )} />
              <span className={cn(
                'hidden sm:block mt-2 text-[10px] font-black uppercase tracking-wider truncate',
                active ? 'text-emerald-600' : done ? 'text-slate-500' : 'text-slate-300 dark:text-slate-600',
              )}>
                {done && <Check className="inline w-3 h-3 -mt-0.5 mr-0.5" />}
                {label}
              </span>
              <span className="sm:hidden sr-only">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Step header + nav                                                   */
/* ------------------------------------------------------------------ */

export function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl sm:text-[28px] font-heading font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function StepNav({
  onBack, backLabel = 'Back', nextLabel = 'Continue', loading, disabled, onNext,
}: {
  onBack?: () => void;
  backLabel?: string;
  nextLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onNext?: (e: FormEvent) => void;
}) {
  if (onNext) {
    return (
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
        {onBack && (
          <Buttonish variant="outline" onClick={onBack} className="sm:w-36">{backLabel}</Buttonish>
        )}
        <Buttonish type="submit" loading={loading} disabled={disabled} className="flex-1" arrow>{nextLabel}</Buttonish>
      </div>
    );
  }
  return (
    <div className="flex gap-3 pt-4">
      {onBack && <Buttonish variant="outline" onClick={onBack} className="sm:w-36">{backLabel}</Buttonish>}
      {nextLabel && <Buttonish loading={loading} disabled={disabled} onClick={(onNext as unknown) as undefined} className="flex-1" arrow>{nextLabel}</Buttonish>}
    </div>
  );
}

/** Local button so this kit has zero dependency on app Button variants. */
function Buttonish({
  children, variant = 'primary', type = 'button', onClick, className, loading, disabled, arrow,
}: {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
  type?: 'button' | 'submit';
  onClick?: any;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  arrow?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-13 min-h-[52px] px-6 rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        variant === 'primary' && 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20',
        variant === 'outline' && 'border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5',
        variant === 'ghost' && 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-100',
        className,
      )}
    >
      {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : null}
      <span>{children}</span>
      {arrow && !loading && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

const fieldBase = 'w-full h-13 min-h-[52px] rounded-2xl bg-slate-50 dark:bg-slate-900 border border-transparent px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all';

export function Field({
  label, required, optional, error, hint, children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}{' '}
          {required && <span className="text-rose-500">*</span>}
          {optional && <span className="normal-case font-semibold text-slate-400 tracking-normal">(optional)</span>}
        </label>
        {error && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
            <AlertCircle className="w-3 h-3" />{error}
          </span>
        )}
      </div>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400 font-medium px-1">{hint}</p>}
    </div>
  );
}

export function TextField({
  value, onChange, placeholder, type = 'text', error, autoComplete, inputMode, maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      className={cn(fieldBase, error && 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10')}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className={cn(fieldBase, 'h-auto py-3 resize-none')}
    />
  );
}

export function SelectField({ value, onChange, options, placeholder, error }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(fieldBase, 'appearance-none pr-10 cursor-pointer', !value && 'text-slate-400 font-medium', error && 'border-rose-300')}
      >
        <option value="" disabled>{placeholder || 'Select an option'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
}

export function PasswordField({ value, onChange, placeholder = 'At least 8 characters', error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className={cn(fieldBase, 'pr-12', error && 'border-rose-300')}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
}

export function PhoneField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  return (
    <div className="relative flex">
      <span className="inline-flex items-center gap-2 pl-4 pr-3 rounded-l-2xl bg-slate-100 dark:bg-slate-800 border border-transparent text-sm font-black text-slate-600 dark:text-slate-300 select-none">
        🇬🇭 +233
      </span>
      <input
        type="tel"
        inputMode="tel"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
        placeholder="24 123 4567"
        autoComplete="tel-national"
        className={cn(fieldBase, 'rounded-l-none border-l-0', error && 'border-rose-300')}
      />
    </div>
  );
}

/** Formats a stored 9-digit local number as +233 XX XXX XXXX for display. */
export function formatGhanaPhone(local: string): string {
  const d = local.replace(/\D/g, '');
  if (d.length < 3) return `+233 ${d}`;
  if (d.length <= 5) return `+233 ${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 8) return `+233 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `+233 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

/** Converts a local Ghana number to full E.164-ish format for the API. */
export function toFullPhone(local: string): string {
  const d = local.replace(/\D/g, '');
  return d ? `+233${d}` : '';
}

/* ------------------------------------------------------------------ */
/* Choice cards (vehicle type, business type, payout method...)         */
/* ------------------------------------------------------------------ */

export function OptionCards<T extends string>({ value, onChange, options, columns = 2 }: {
  value: T | '';
  onChange: (v: T) => void;
  options: { value: T; label: string; icon: ReactNode; note?: string }[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={cn('grid gap-3', columns === 1 && 'grid-cols-1', columns === 2 && 'grid-cols-1 xs:grid-cols-2', columns === 3 && 'grid-cols-2 sm:grid-cols-3')}>
      {options.map(o => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'relative text-start rounded-2xl border-2 p-4 transition-all duration-200 group',
              selected
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 shadow-md shadow-emerald-600/5'
                : 'border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/40 hover:shadow-sm',
            )}
          >
            {selected && (
              <span className="absolute top-3 end-3 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3" />
              </span>
            )}
            <span className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors [&>svg]:w-5 [&>svg]:h-5',
              selected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300',
            )}>
              {o.icon}
            </span>
            <span className="block text-sm font-black text-slate-900 dark:text-white">{o.label}</span>
            {o.note && <span className="block mt-1 text-[11px] font-medium text-slate-400 leading-snug">{o.note}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Document upload card                                                */
/* ------------------------------------------------------------------ */

export interface UploadedDoc {
  name: string;
  dataUrl: string;
  sizeKb: number;
  kind: 'image' | 'pdf';
}

const MAX_DOC_KB = 5120; // 5 MB

export function DocumentUploadCard({ label, description, doc, onChange, error }: {
  label: string;
  description?: string;
  doc: UploadedDoc | null;
  onChange: (doc: UploadedDoc | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const pick = () => inputRef.current?.click();

  const handleFile = (file: File | undefined | null) => {
    setLocalError('');
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      setLocalError('Only images (JPG, PNG) or PDF files are accepted.');
      return;
    }
    if (file.size > MAX_DOC_KB * 1024) {
      setLocalError(`File is too large (${Math.round(file.size / 1024)} KB). Maximum is 5 MB.`);
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      // Give the UI a frame to show its uploading state.
      setTimeout(() => {
        onChange({
          name: file.name,
          dataUrl: String(reader.result || ''),
          sizeKb: Math.round(file.size / 1024),
          kind: isPdf ? 'pdf' : 'image',
        });
        setBusy(false);
      }, 350);
    };
    reader.onerror = () => {
      setLocalError('Could not read that file. Please try again.');
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  const shownError = localError || error;

  return (
    <div className={cn(
      'rounded-2xl border-2 p-4 transition-colors',
      shownError ? 'border-rose-200 dark:border-rose-500/30' : doc ? 'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/40 dark:bg-emerald-500/5' : 'border-dashed border-slate-200 dark:border-slate-700',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
          {description && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{description}</p>}
        </div>
        {doc && (
          <span className="inline-flex items-center gap-1 shrink-0 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wide">
            <Check className="w-3 h-3" /> Uploaded
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        capture={undefined}
        className="hidden"
        onChange={e => { handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
      />

      {!doc ? (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="mt-4 w-full rounded-xl border-2 border-slate-150 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-600 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {busy ? 'Uploading…' : 'Choose file'}
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-white dark:bg-slate-900 border border-line p-2.5">
          <span className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            {doc.kind === 'image' ? (
              <img src={doc.dataUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <FileText className="w-5 h-5 text-slate-400" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{doc.name}</p>
            <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              {doc.kind === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              {doc.sizeKb} KB · {doc.kind.toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={pick}
            title="Replace document"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Remove document"
            className="w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {shownError && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-[11px] font-bold text-rose-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{shownError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Review section block                                                */
/* ------------------------------------------------------------------ */

export function ReviewSection({ title, onEdit, children }: {
  title: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</h3>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-[11px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-500 transition-colors">
            Edit
          </button>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function ReviewRow({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || String(value).trim() === '';
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-slate-400 font-semibold shrink-0">{label}</span>
      <span className={cn('font-bold text-end min-w-0 break-words', empty ? 'text-slate-300 dark:text-slate-600 italic font-medium' : 'text-slate-800 dark:text-slate-100')}>
        {empty ? 'Not provided' : value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error banner                                                        */
/* ------------------------------------------------------------------ */

export function ErrorBanner({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-rose-600 dark:text-rose-300 leading-relaxed">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Resume banner                                                       */
/* ------------------------------------------------------------------ */

export function ResumeBanner({ completed, total, onResume, onDiscard }: {
  completed: number;
  total: number;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-500/10 p-5"
    >
      <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">Continue your application</p>
      <p className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-300/80 mt-1">
        You have completed {completed - 1} of {total} steps. Pick up right where you left off.
      </p>
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={onResume}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-colors"
        >
          Continue <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70 hover:bg-emerald-100/60 dark:hover:bg-emerald-500/10 transition-colors"
        >
          Start over
        </button>
      </div>
    </motion.div>
  );
}
