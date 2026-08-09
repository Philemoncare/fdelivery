import { useState, type FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, User, Bike, ArrowRight, ArrowLeft, Check, Clock,
  Mail, Lock, Phone, UserCircle, MapPin, Building, Utensils,
  Image as ImageIcon, FileText, CreditCard, ShieldCheck, Globe,
  ChevronDown, ChevronUp, Upload, X
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { PasswordStrength } from '@/src/components/ui/password-strength';
import { useToast } from '@/src/components/ui/toast';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/auth/auth-store';
import { resolvePostLoginRoute } from '@/src/lib/auth/types';
import { Chrome, Apple as AppleIcon } from 'lucide-react';
import { TAKORADI_LOCATIONS } from '@/src/lib/locations';
import { ImageCropModal } from '@/src/components/common/ImageCropModal';

const TIME_OPTIONS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
  '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'
];

// Parse "8:00 AM" -> minutes of the day (for range validation)
function timeToMinutes(t: string): number {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

// First option strictly later than the given time (whole-hour list)
function nextTimeAfter(t: string): string | undefined {
  const base = timeToMinutes(t);
  const later = TIME_OPTIONS
    .filter(o => timeToMinutes(o) > base)
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  return later[0];
}

// Modern inline time stepper (up/down wheel — no dropdown, no overlap)
function TimeStepper({ value, onChange }: { value: string; onChange: (v: string) => void; color?: string }) {
  const idx = value ? TIME_OPTIONS.indexOf(value) : -1;
  const go = (dir: 1 | -1) => {
    if (idx === -1) return onChange(dir === 1 ? TIME_OPTIONS[0] : TIME_OPTIONS[TIME_OPTIONS.length - 1]);
    onChange(TIME_OPTIONS[(idx + dir + TIME_OPTIONS.length) % TIME_OPTIONS.length]);
  };
  return (
    <div className="flex items-center h-10 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-gray-100 dark:ring-slate-800 border border-transparent shadow-sm overflow-hidden focus-within:ring-emerald-500/40 transition-all">
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Increase time"
        className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <span className={cn("flex-1 text-center text-[11px] font-bold truncate select-none", value ? "text-gray-900 dark:text-white" : "text-gray-400")}>
        {value || '—:—'}
      </span>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Decrease time"
        className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const roles = [
  { id: 'customer', title: 'Customer', desc: 'Order meals from local restaurants and track deliveries', icon: User, color: 'from-emerald-500 to-emerald-600', gradient: 'hover:from-emerald-50 hover:to-emerald-100 dark:hover:from-emerald-900/20 dark:hover:to-emerald-900/30' },
  { id: 'vendor', title: 'Restaurant Partner', desc: 'Manage your restaurant, menu, orders, and riders', icon: Store, color: 'from-violet-500 to-violet-600', gradient: 'hover:from-violet-50 hover:to-violet-100 dark:hover:from-violet-900/20 dark:hover:to-violet-900/30' },
  { id: 'rider', title: 'Dispatch Rider', desc: 'Accept deliveries and earn on your schedule', icon: Bike, color: 'from-amber-500 to-amber-600', gradient: 'hover:from-amber-50 hover:to-amber-100 dark:hover:from-amber-900/20 dark:hover:to-amber-900/30' },
];

type Field = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'select' | 'multi-select' | 'location' | 'time-range' | 'image';
  placeholder?: string;
  icon?: any;
  options?: string[];
  optional?: boolean;
};

type Step = { title: string; subtitle: string; fields: Field[] };

const customerSteps: Step[] = [
  {
    title: 'Account Creation',
    subtitle: 'Your personal ordering account',
    fields: [
      { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Kwabena Mensah', icon: UserCircle },
      { key: 'email', label: 'Email Address', type: 'email', placeholder: 'kwabena@gmail.com', icon: Mail },
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+233 2X XXX XXXX', icon: Phone },
      { key: 'password', label: 'Password', type: 'password', icon: Lock },
      { key: 'confirmPassword', label: 'Confirm Password', type: 'password', icon: Lock },
    ],
  },
];

const restaurantSteps: Step[] = [
  {
    title: 'Account Owner',
    subtitle: 'Your administrative details',
    fields: [
      { key: 'ownerName', label: 'Restaurant Owner Name', type: 'text', placeholder: 'Full name', icon: UserCircle },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'restaurant@gmail.com', icon: Mail },
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+233 2X XXX XXXX', icon: Phone },
      { key: 'password', label: 'Password', type: 'password', icon: Lock },
      { key: 'confirmPassword', label: 'Confirm Password', type: 'password', icon: Lock },
    ],
  },
  {
    title: 'Restaurant Setup',
    subtitle: 'Tell us about your kitchen',
    fields: [
      { key: 'businessName', label: 'Restaurant Name', type: 'text', placeholder: 'e.g. Takoradi Grill House', icon: Building },
      { key: 'category', label: 'Cuisine Type', type: 'multi-select', icon: Utensils, options: ['African', 'Jollof', 'Waakye', 'Fufu & Soup', 'Banku & Tilapia', 'Kenkey & Fish', 'Pizza', 'Chinese', 'Fast Food', 'Breakfast', 'Grill & BBQ', 'Desserts', 'Pastries', 'Drinks & Smoothies', 'Other'] },
      { key: 'businessAddress', label: 'Location', type: 'location', placeholder: 'Search Takoradi locations...', icon: MapPin },
      { key: 'openingHours', label: 'Opening Hours', type: 'time-range', icon: Clock },
      { key: 'logoUrl', label: 'Restaurant Logo', type: 'image', icon: ImageIcon, optional: true },
      { key: 'coverUrl', label: 'Cover Banner', type: 'image', icon: ImageIcon, optional: true },
    ],
  },
  {
    title: 'Verification',
    subtitle: 'Business documents for approval',
    fields: [
      { key: 'regNumber', label: 'Business ID Number', type: 'text', placeholder: 'e.g. GHA-12345678', icon: FileText },
      { key: 'documents', label: 'Business ID / Incorporation Doc', type: 'image', icon: Globe, optional: true },
    ],
  },
];

const riderSteps: Step[] = [
  {
    title: 'Profile Info',
    subtitle: 'Your personal rider account',
    fields: [
      { key: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Yaw Boateng', icon: UserCircle },
      { key: 'email', label: 'Email Address', type: 'email', placeholder: 'yaw.boateng@gmail.com', icon: Mail },
      { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+233 2X XXX XXXX', icon: Phone },
      { key: 'password', label: 'Password', type: 'password', icon: Lock },
      { key: 'confirmPassword', label: 'Confirm Password', type: 'password', icon: Lock },
    ],
  },
  {
    title: 'Vehicle Details',
    subtitle: 'Your delivery machine',
    fields: [
      { key: 'vehicleType', label: 'Vehicle Type', type: 'select', icon: Bike, options: ['Motorcycle', 'Scooter', 'Bicycle', 'Van', 'Car'] },
      { key: 'vehicleNumber', label: 'Registration Plate', type: 'text', placeholder: 'e.g. WR-123-24', icon: CreditCard },
      { key: 'location', label: 'Delivery Zone', type: 'location', placeholder: 'Search delivery zones...', icon: MapPin },
    ],
  },
  {
    title: 'Documents',
    subtitle: 'IDs for verification',
    fields: [
      { key: 'driverLicense', label: 'Driver License Number', type: 'text', placeholder: 'Number on your card', icon: FileText },
      { key: 'nationalId', label: 'Ghana Card Number', type: 'text', placeholder: 'e.g. GHA-000000000-0', icon: ShieldCheck },
    ],
  },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    return localStorage.getItem('om_registration_role');
  });

  const handleSetRole = (role: string | null) => {
    setSelectedRole(role);
    try {
      if (role) {
        localStorage.setItem('om_registration_role', role);
      } else {
        localStorage.removeItem('om_registration_role');
        localStorage.removeItem('om_registration_draft');
        localStorage.removeItem('om_registration_step');
      }
    } catch (e) {
      console.error('Failed to update registration storage:', e);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      <header className="h-20 flex items-center px-6 sm:px-12 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
            <Bike className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="hidden sm:block">
            <span className="block font-heading font-black text-xl text-black dark:text-white leading-none">OmniMarket</span>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Takoradi Express</span>
          </div>
        </Link>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Visual Sidebar */}
        <div className="hidden lg:flex w-[40%] relative overflow-hidden bg-[#0b1120] text-white p-16 flex-col justify-between">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-[100px]" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
            <h2 className="text-5xl font-black leading-tight mb-8">
              Grow your <br />
              <span className="text-emerald-400">Business</span> with <br />
              OmniMarket.
            </h2>
            <div className="space-y-6">
              {[
                { icon: ShieldCheck, text: 'Verified partner ecosystem' },
                { icon: Globe, text: 'Reach customers across the Western Region' },
                { icon: Clock, text: 'Manage everything in real-time' }
              ].map(item => (
                <div key={item.text} className="flex items-center gap-4 text-slate-300">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="relative z-10 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-sm text-slate-400 italic mb-4 leading-relaxed">
              "Since joining OmniMarket, our restaurant sales in Takoradi have increased by 40%. The rider network is incredibly reliable."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold">M</div>
              <div>
                <p className="text-xs font-bold">Market Circle Kitchen</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Verified Vendor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 flex justify-center px-4 py-6 sm:px-12 sm:py-12">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl">
            {!selectedRole ? (
              <div className="space-y-8">
                <div className="text-center sm:text-left">
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white">Select account type</h1>
                  <p className="text-gray-500 mt-2">How would you like to join the ecosystem?</p>
                </div>
                <div className="space-y-4">
                  {roles.map(role => (
                    <motion.button
                      key={role.id}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSetRole(role.id)}
                      className="w-full flex items-center gap-6 p-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all group text-left"
                    >
                      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br", role.color)}>
                        <role.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-lg text-gray-900 dark:text-white leading-tight">{role.title}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{role.desc}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 pt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-black">Sign in</Link>
                </p>
              </div>
            ) : (
              <RegistrationForm
                role={selectedRole}
                onBack={() => handleSetRole(null)}
                navigate={navigate}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function RegistrationForm({ role, onBack, navigate }: { role: string; onBack: () => void; navigate: ReturnType<typeof useNavigate> }) {
  const { register, loginWithGoogle, loginWithApple } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('om_registration_draft');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropKey, setCropKey] = useState<string>('logoUrl');

  // Location autocomplete state
  const [locationResults, setLocationResults] = useState<string[]>([]);
  const [activeLocationField, setActiveLocationField] = useState<string | null>(null);

  const steps = role === 'customer' ? customerSteps : role === 'vendor' ? restaurantSteps : riderSteps;
  const current = steps[step - 1];
  const isLastStep = step === steps.length;
  const isVendor = role === 'vendor';
  const isRider = role === 'rider';

  // Persist form and step to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('om_registration_draft', JSON.stringify(form));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // If storage is full (likely due to images), try saving text fields only
        const minifiedForm: Record<string, string> = {};
        Object.entries(form).forEach(([key, value]) => {
          // Exclude anything that looks like a long base64 string
          if (typeof value === 'string' && value.length < 1000) {
            minifiedForm[key] = value;
          }
        });
        try {
          localStorage.setItem('om_registration_draft', JSON.stringify(minifiedForm));
        } catch {
          console.error('Failed to save even minified form draft');
        }
      }
    }
  }, [form]);

  useEffect(() => {
    try {
      localStorage.setItem('om_registration_step', step.toString());
    } catch { /* ignore */ }
  }, [step]);

  useEffect(() => {
    const savedStep = localStorage.getItem('om_registration_step');
    if (savedStep && parseInt(savedStep) <= steps.length) {
      setStep(parseInt(savedStep));
    }
  }, [steps.length]);

  const update = (key: string, value: string) => {
    let finalValue = value;
    if (key === 'phone') {
      // Force +233 prefix and prevent editing it
      if (!value.startsWith('+233')) {
        finalValue = '+233';
      }

      // Only allow digits after the prefix
      const suffix = value.substring(4);
      const digitsOnly = suffix.replace(/\D/g, '');
      finalValue = '+233' + digitsOnly;
    }

    setForm(p => {
      const next = { ...p, [key]: finalValue };

      // Smart time-range: auto-disallow close <= open and auto-suggest a valid close
      if (key.endsWith('_open') || key.endsWith('_close')) {
        const baseKey = key.includes('_open') ? key.replace('_open', '') : key.replace('_close', '');
        const open = next[`${baseKey}_open`];
        const close = next[`${baseKey}_close`];

        // When only opening is set, prefill a valid closing time
        if (open && !close) {
          const suggested = nextTimeAfter(open);
          if (suggested) next[`${baseKey}_close`] = suggested;
        }

        // Never allow close to be at or before open
        if (open && close && timeToMinutes(close) <= timeToMinutes(open)) {
          const nextClose = nextTimeAfter(open);
          next[`${baseKey}_close`] = nextClose || next[`${baseKey}_open`];
        }

        const finalOpen = next[`${baseKey}_open`];
        const finalClose = next[`${baseKey}_close`];
        if (finalOpen && finalClose) {
          next[baseKey] = `${finalOpen} - ${finalClose}`;
        }
      }

      return next;
    });

    // Clear error for this field when updated
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      if (key.endsWith('_open') || key.endsWith('_close')) {
        const baseKey = key.includes('_open') ? key.replace('_open', '') : key.replace('_close', '');
        delete next[baseKey];
      }
      return next;
    });
  };

  const handleLocationSearch = (key: string, val: string) => {
    update(key, val);
    if (!val.trim()) {
      setLocationResults([]);
      return;
    }
    const filtered = TAKORADI_LOCATIONS.filter(loc =>
      loc.toLowerCase().includes(val.toLowerCase())
    );
    setLocationResults(filtered);
    setActiveLocationField(key);
  };

  const selectLocation = (key: string, loc: string) => {
    update(key, loc);
    setLocationResults([]);
    setActiveLocationField(null);
  };

  const handleImageUpload = (key: string) => {
    // real file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (!src) return;
        // Logos and banners get an interactive crop; documents are just
        // resized so the full page stays legible.
        if (key === 'logoUrl' || key === 'coverUrl') {
          setCropKey(key);
          setCropSrc(src);
        } else {
          compressImage(src).then(base64 => {
            update(key, base64);
            showToast('success', 'Image Processed', 'Document attached and optimized.');
          });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const compressImage = (src: string) =>
    new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // Max dimensions for modern forms (Optimized for speed/stability)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 0.4 quality for maximum reliability
        resolve(canvas.toDataURL('image/jpeg', 0.4));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });

  const validateStep = (idx: number) => {
    const e: Record<string, string> = {};
    steps[idx].fields.forEach(f => {
      let val = (form[f.key] || '').trim();

      // Ensure time-range validation checks the internal parts if the combined one is missing
      if (f.type === 'time-range' && !val) {
        if (form[`${f.key}_open`] && form[`${f.key}_close`]) {
          val = `${form[`${f.key}_open`]} - ${form[`${f.key}_close`]}`;
        }
      }

      if (f.key === 'password') {
        if (!val) e.password = 'Password is required';
        else if (val.length < 8) e.password = 'At least 8 characters';
      } else if (f.key === 'confirmPassword') {
        if (!val) e.confirmPassword = 'Please confirm your password';
        else if (val !== form.password) e.confirmPassword = 'Passwords must match';
      } else if (!val && !f.optional) {
        e[f.key] = `${f.label} is required`;
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(step - 1)) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(step - 1)) return;
    setLoading(true);

    try {
      const result = await register({ ...form, role }, role as any);
      setLoading(false);

      if (result.success) {
        localStorage.removeItem('om_registration_draft');
        localStorage.removeItem('om_registration_step');
        localStorage.removeItem('om_registration_role');

        if (isVendor) {
          showToast('success', 'Restaurant registered!', 'Welcome to the partner network.');
        } else if (isRider) {
          showToast('success', 'Rider profile submitted!', 'Welcome to the dispatch team.');
        } else {
          showToast('success', 'Account created!', 'Welcome to OmniMarket.');
        }

        // Navigate based on the newly created user's status and role
        if (result.user) {
          const dash = resolvePostLoginRoute(result.user);
          navigate(dash, { replace: true });
        } else {
          navigate('/login');
        }
      } else {
        showToast('error', 'Registration failed', result.error || 'An error occurred during registration.');
      }
    } catch (err: any) {
      setLoading(false);
      showToast('error', 'Error', err.message || 'Connection failed.');
    }
  };

  const submitLabel = isVendor ? 'Submit Restaurant Application' : isRider ? 'Complete Rider Profile' : 'Create My Account';

  const renderField = (f: Field) => (
    <div key={f.key} className={cn("space-y-1.5 relative", f.key === 'category' ? "md:col-span-2" : (f.key === 'businessName' && "md:col-span-1"))}>
      <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
        {f.label}
        {f.optional && <span className="text-gray-400 font-medium italic lowercase"> (optional)</span>}
      </label>

      <div className="relative group">
        {f.icon && f.type !== 'time-range' && f.type !== 'image' && f.type !== 'multi-select' && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10">
            <f.icon className="w-5 h-5" />
          </div>
        )}

        {f.type === 'multi-select' ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {f.options?.map(o => {
              const selected = (form[f.key] || '').split(',').map(s => s.trim()).filter(Boolean).includes(o);
              const toggleSelect = () => {
                const current = (form[f.key] || '').split(',').map(s => s.trim()).filter(Boolean);
                const next = selected ? current.filter(c => c !== o) : [...current, o];
                update(f.key, next.join(', '));
              };
              return (
                <button
                  key={o}
                  type="button"
                  onClick={toggleSelect}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border-2 text-left",
                    selected
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                      : "border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:border-emerald-500/40"
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors", selected ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-slate-600")}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="leading-tight">{o}</span>
                </button>
              );
            })}
          </div>
        ) : f.type === 'select' ? (
          <div className="relative">
            <select
              value={form[f.key] || ''}
              onChange={e => update(f.key, e.target.value)}
              className={cn(
                "w-full bg-white dark:bg-slate-900 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 shadow-sm transition-all appearance-none outline-none ring-1 ring-gray-100 dark:ring-slate-800",
                f.icon && "pl-12",
                !form[f.key] && "text-gray-400"
              )}
            >
              <option value="" disabled>Select {f.label}</option>
              {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        ) : f.type === 'location' ? (
          <div className="relative">
            <input
              type="text"
              placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={e => handleLocationSearch(f.key, e.target.value)}
              onFocus={() => activeLocationField === null && setLocationResults([])}
              className={cn(
                "w-full bg-white dark:bg-slate-900 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 placeholder:text-gray-300 dark:placeholder:text-slate-700 shadow-sm transition-all outline-none ring-1 ring-gray-100 dark:ring-slate-800 pl-12",
              )}
            />
            <AnimatePresence>
              {activeLocationField === f.key && locationResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto"
                >
                  {locationResults.map(loc => (
                    <button
                      key={loc} type="button"
                      onClick={() => selectLocation(f.key, loc)}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-colors border-b border-gray-50 dark:border-slate-800 last:border-0"
                    >
                      {loc}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : f.type === 'time-range' ? (
          <div
            className={cn(
              "rounded-2xl bg-white dark:bg-slate-900 border-2 border-transparent ring-1 ring-gray-100 dark:ring-slate-800 shadow-sm",
              form[f.key] && "ring-emerald-500/40"
            )}
          >
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center p-3.5">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center">Opens</p>
                <TimeStepper
                  value={form[`${f.key}_open`] || ''}
                  onChange={v => update(`${f.key}_open`, v)}
                />
              </div>
              <div className="flex items-center justify-center pt-4">
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest text-center">Closes</p>
                <TimeStepper
                  value={form[`${f.key}_close`] || ''}
                  onChange={v => update(`${f.key}_close`, v)}
                />
              </div>
            </div>
            <div className="border-t border-gray-50 dark:border-slate-800 px-3.5 py-2">
              {form[f.key] ? (
                <p className="text-[10px] font-black text-gray-700 dark:text-gray-200">
                  <span className="text-emerald-600 dark:text-emerald-400">Open hours:</span> {form[f.key]}
                </p>
              ) : (
                <p className="text-[10px] text-gray-400 font-medium">Select opening and closing times</p>
              )}
            </div>
          </div>
        ) : f.type === 'image' ? (
          <div className="group">
            <div onClick={() => handleImageUpload(f.key)} className={cn(
              "relative flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-[2rem] cursor-pointer hover:bg-emerald-50/10 hover:border-emerald-500/40 transition-all overflow-hidden bg-white dark:bg-slate-900 shadow-sm",
              f.key === 'logoUrl' ? "w-28 h-28" : "w-full h-32"
            )}>
              {form[f.key] ? (
                <div className="relative w-full h-full">
                  <img src={form[f.key]} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <X className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <Upload className={cn("text-gray-400 mb-1", f.key === 'logoUrl' ? "w-5 h-5" : "w-6 h-6")} />
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center px-2">
                    {f.label}
                  </p>
                </div>
              )}
            </div>
            {form[f.key] && (
               <button type="button" onClick={() => update(f.key, '')} className="mt-2 text-[8px] font-black text-rose-500 uppercase tracking-widest hover:underline ml-1">Remove Document</button>
            )}
          </div>
        ) : (
          <input
            type={f.type}
            placeholder={f.placeholder}
            value={form[f.key] || ''}
            onChange={e => update(f.key, e.target.value)}
            onFocus={(e) => {
              if (f.key === 'phone' && !form[f.key]) {
                update('phone', '+233');
              }
            }}
            onKeyDown={(e) => {
              if (f.key === 'phone') {
                // Prevent backspacing into the prefix
                const target = e.target as HTMLInputElement;
                if ((e.key === 'Backspace' || e.key === 'Delete') && target.selectionStart !== null && target.selectionStart <= 4) {
                  e.preventDefault();
                }
              }
            }}
            className={cn(
              "w-full bg-white dark:bg-slate-900 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 placeholder:text-gray-300 dark:placeholder:text-slate-700 shadow-sm transition-all outline-none ring-1 ring-gray-100 dark:ring-slate-800",
              f.icon && "pl-12"
            )}
          />
        )}
      </div>
      {f.key === 'password' && <PasswordStrength password={form.password || ''} />}
      {errors[f.key] && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1 ml-1">{errors[f.key]}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <button type="button" onClick={onBack} className="text-[10px] font-black text-gray-400 hover:text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to role selection
      </button>

      {/* Modern Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < step - 1;
          const active = i === step - 1;
          return (
            <div key={s.title} className="flex-1 flex items-center gap-2">
              <div className={cn(
                "h-1.5 rounded-full flex-1 transition-all duration-500",
                active ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" : done ? "bg-emerald-200 dark:bg-emerald-900/40" : "bg-gray-200 dark:bg-slate-800"
              )} />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-white shadow-lg shadow-emerald-500/20">
            {step}
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{current.title}</h2>
            <p className="text-sm text-gray-500 font-medium">{current.subtitle}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.form
          key={step}
          onSubmit={isLastStep ? handleSubmit : handleNext}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className={cn("grid gap-x-6 gap-y-4", isVendor && step === 2 ? "md:grid-cols-2" : "grid-cols-1")}>
            {current.fields.map(renderField)}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-slate-800" /></div>
                <div className="relative flex justify-center"><span className="bg-gray-50 dark:bg-slate-950 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Or social registration</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => loginWithGoogle(role)} className="flex items-center justify-center gap-3 h-14 rounded-2xl border-2 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 transition-all group">
                  <Chrome className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">Google</span>
                </button>
                <button type="button" onClick={() => loginWithApple(role)} className="flex items-center justify-center gap-3 h-14 rounded-2xl border-2 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 transition-all group">
                  <AppleIcon className="w-5 h-5 text-gray-900 dark:text-white" />
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">Apple</span>
                </button>
              </div>
            </div>
          )}

          {isLastStep && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {(isVendor || isRider) && (
                <div className="p-5 rounded-[2rem] bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-900/30 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Verification Required</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 font-medium leading-relaxed mt-1">
                      Our Takoradi team will review your {isVendor ? 'restaurant details' : 'driver credentials'} within 24 hours.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 py-1 px-1">
                <div className="relative flex items-center cursor-pointer mt-0.5">
                  <input type="checkbox" id="terms" required className="w-4 h-4 rounded-md border-2 border-gray-200 dark:border-slate-800 text-emerald-500 focus:ring-emerald-500 transition-all cursor-pointer" />
                </div>
                <label htmlFor="terms" className="text-[10px] text-gray-400 font-bold leading-tight cursor-pointer select-none">
                  I agree to the <Link to="/terms" className="text-emerald-600 underline">Terms</Link> & <Link to="/privacy" className="text-emerald-600 underline">Privacy Policy</Link>.
                </label>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {step > 1 && (
              <Button type="button" variant="outline" className="w-full sm:w-24 h-14 sm:h-16 rounded-2xl font-black text-xs border-gray-200" onClick={() => setStep(s => s - 1)}>
                BACK
              </Button>
            )}
            <Button type="submit" className="w-full sm:flex-1 h-14 sm:h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-black text-sm shadow-xl shadow-emerald-500/20 tracking-widest" loading={loading}>
              {isLastStep ? submitLabel.toUpperCase() : "CONTINUE TO NEXT STEP"}
              {!isLastStep && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </motion.form>
      </AnimatePresence>

      <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Security: 256-bit AES</p>
         <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-20" />
            <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-10" />
         </div>
      </div>

      <ImageCropModal
        open={!!cropSrc}
        imageSrc={cropSrc || ''}
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => {
          update(cropKey, dataUrl);
          showToast('success', 'Image Processed', 'Image ready and optimized.');
          setCropSrc(null);
        }}
        aspect={cropKey === 'logoUrl' ? 1 : 16 / 6}
        maxOutputSize={cropKey === 'logoUrl' ? 500 : 1400}
        title={cropKey === 'logoUrl' ? 'Crop Restaurant Logo' : 'Crop Cover Banner'}
      />
    </div>
  );
}
