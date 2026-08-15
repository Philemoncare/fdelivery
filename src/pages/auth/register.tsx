import { useState, type FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Store, User, Bike, ArrowRight, ArrowLeft, Check, Clock,
  Mail, Lock, Phone, UserCircle, MapPin, Building, Utensils,
  Image as ImageIcon, FileText, CreditCard, ShieldCheck, Globe,
  ChevronDown, ChevronUp, Upload, X, Chrome, Apple as AppleIcon,
  Zap, Heart, Target, Gift
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { PasswordStrength } from '@/src/components/ui/password-strength';
import { useToast } from '@/src/components/ui/toast';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/auth/auth-store';
import { resolvePostLoginRoute } from '@/src/lib/auth/types';
import { TAKORADI_LOCATIONS } from '@/src/lib/locations';
import { ImageCropModal } from '@/src/components/common/ImageCropModal';

const TIME_OPTIONS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
  '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'
];

function timeToMinutes(t: string): number {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

function nextTimeAfter(t: string): string | undefined {
  const base = timeToMinutes(t);
  const later = TIME_OPTIONS
    .filter(o => timeToMinutes(o) > base)
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  return later[0];
}

function TimeStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const currentIndex = TIME_OPTIONS.indexOf(value);

  const step = (dir: number) => {
    const next = TIME_OPTIONS[currentIndex + dir];
    if (next) onChange(next);
  };

  return (
    <div className="flex items-center bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 h-10 overflow-hidden">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={currentIndex <= 0}
        className="px-2 h-full hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      <div className="flex-1 px-2 text-[10px] font-black text-center min-w-[70px]">
        {value || '00:00'}
      </div>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={currentIndex >= TIME_OPTIONS.length - 1}
        className="px-2 h-full hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    return localStorage.getItem('om_registration_role');
  });

  const roles = [
    {
      id: 'customer',
      title: t('auth.register.customer'),
      desc: t('auth.register.desc'),
      image: 'https://img.freepik.com/premium-photo/3d-cartoon-character-buying-products-from-smartphone-online-shopping-concept_58466-14559.jpg',
      color: 'emerald',
      gradient: 'from-emerald-400 to-emerald-600',
      lightBg: 'bg-emerald-50 dark:bg-emerald-500/5'
    },
    {
      id: 'vendor',
      title: t('auth.register.vendor'),
      desc: t('partner.vendor.subtitle'),
      image: 'https://img.freepik.com/premium-photo/chef-cook-character-smiling-cartoon-3d-render_511066-559.jpg',
      color: 'violet',
      gradient: 'from-violet-400 to-violet-600',
      lightBg: 'bg-violet-50 dark:bg-violet-500/5'
    },
    {
      id: 'rider',
      title: t('auth.register.rider'),
      desc: t('partner.rider.subtitle'),
      image: 'https://img.freepik.com/premium-photo/3d-delivery-man-scooter-yellow-background_115990-1282.jpg',
      color: 'amber',
      gradient: 'from-amber-400 to-amber-600',
      lightBg: 'bg-amber-50 dark:bg-amber-500/5'
    },
  ];

  const handleSetRole = (role: string | null) => {
    setSelectedRole(role);
    if (role) localStorage.setItem('om_registration_role', role);
    else {
      localStorage.removeItem('om_registration_role');
      localStorage.removeItem('om_registration_draft');
      localStorage.removeItem('om_registration_step');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans">

      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] bg-indigo-500/5 rounded-full blur-[100px]"
        />
      </div>

      <header className="h-20 flex items-center justify-between px-6 sm:px-12 relative z-20">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <span className="block font-black text-xl text-slate-900 dark:text-white leading-none">OmniMarket<span className="text-emerald-500">.</span></span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Takoradi Express</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden xs:block">Secure Session</span>
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Visual Sidebar */}
        <div className="hidden lg:flex w-[40%] relative overflow-hidden bg-[#facc15] text-slate-900 p-16 flex-col justify-between">
          <div className="absolute inset-0 bg-grid opacity-10" />

          <motion.div
            key={selectedRole}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-0"
          >
            <img
              src={selectedRole === 'rider'
                ? "https://img.freepik.com/premium-photo/3d-delivery-man-scooter-yellow-background_115990-1282.jpg"
                : "https://img.freepik.com/premium-photo/3d-cartoon-character-buying-products-from-smartphone-online-shopping-concept_58466-14559.jpg"
              }
              alt="Background"
              className="w-full h-full object-cover mix-blend-overlay opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#facc15] via-transparent to-transparent" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
            <h2 className="text-5xl font-black leading-tight mb-8">
              {selectedRole === 'rider' ? (
                <>Deliver Joy. <br /><span className="text-white">Earn Fast.</span></>
              ) : (
                <>Scale your <br /><span className="text-white">Success</span> with <br />OmniMarket.</>
              )}
            </h2>
            <div className="space-y-6">
              {(selectedRole === 'rider' ? [
                { icon: Zap, text: 'Instant payouts per delivery' },
                { icon: Target, text: 'Flexible hours in Takoradi' },
                { icon: ShieldCheck, text: 'Full delivery insurance' }
              ] : [
                { icon: ShieldCheck, text: 'Verified partner ecosystem' },
                { icon: Globe, text: 'Reach customers across Ghana' },
                { icon: Clock, text: 'Manage everything in real-time' }
              ]).map(item => (
                <div key={item.text} className="flex items-center gap-4 text-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-black/5 border border-black/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-slate-900" />
                  </div>
                  <span className="font-bold">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="relative z-10 p-8 rounded-[2.5rem] bg-white/40 border border-white/40 backdrop-blur-xl shadow-2xl">
            <p className="text-sm text-slate-900 italic mb-4 leading-relaxed font-bold">
              {selectedRole === 'rider'
                ? "“The app makes it so easy to find jobs in Takoradi. I love being my own boss and the yellow scooter branding is iconic!”"
                : "“Since joining OmniMarket, our restaurant sales have increased by 40%. The logistics network is incredibly reliable.”"
              }
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">O</div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">{selectedRole === 'rider' ? 'Yaw Boateng' : 'Market Circle Grill'}</p>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">{selectedRole === 'rider' ? 'Verified Dispatcher' : 'Verified Merchant'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 flex justify-center px-4 py-6 sm:px-12 sm:py-12 relative">
          <div className="absolute inset-0 auth-gradient-light opacity-30 dark:opacity-0 pointer-events-none" />
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-xl relative z-10">
            {!selectedRole ? (
              <div className="space-y-12">
                <div className="text-center sm:text-left space-y-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]"
                  >
                    <Zap className="w-3.5 h-3.5" /> {t('auth.register.title')}
                  </motion.div>
                  <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[0.9]">
                    {t('auth.register.subtitle')}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                    {t('auth.register.desc')}
                  </p>
                </div>

                <div className="space-y-4">
                  {roles.map((role, i) => (
                    <motion.button
                      key={role.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSetRole(role.id)}
                      className="w-full flex items-center gap-6 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all group text-left relative overflow-hidden"
                    >
                      <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity rounded-full", `bg-${role.color}-500`)} />

                      <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-xl bg-gradient-to-br overflow-hidden shrink-0", role.gradient)}>
                        <img src={role.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>

                      <div className="flex-1">
                        <p className="font-black text-xl text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{role.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{role.desc}</p>
                      </div>

                      <ArrowRight className="w-6 h-6 text-slate-200 group-hover:text-emerald-500 transition-colors" />
                    </motion.button>
                  ))}
                </div>

                <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-500">
                    {t('auth.register.alreadyHaveAccount')}{' '}
                    <Link to="/login" className="text-slate-900 dark:text-white underline decoration-2 underline-offset-4 font-black">
                      {t('auth.signIn')}
                    </Link>
                  </p>
                </div>
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

      <footer className="h-20 flex items-center justify-center px-6 border-t border-slate-50 dark:border-slate-900 relative z-20">
         <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&copy; 2024 OmniMarket</span>
            <div className="flex gap-4">
              {[{label:'Privacy',to:'/privacy'},{label:'Terms',to:'/terms'},{label:'Help',to:'/faq'}].map(l => (
                <Link key={l.label} to={l.to} className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-white uppercase tracking-widest transition-colors">{l.label}</Link>
              ))}
            </div>
         </div>
      </footer>
    </div>
  );
}

type RegistrationField = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  optional?: boolean;
  options?: string[];
  icon: any;
};

type Step = {
  title: string;
  subtitle: string;
  fields: RegistrationField[];
};

function RegistrationForm({ role, onBack, navigate }: { role: string; onBack: () => void; navigate: ReturnType<typeof useNavigate> }) {
  const { register, loginWithGoogle, loginWithApple } = useAuth();
  const { t, formatPrice } = useApp();

  const customerSteps: Step[] = [
    {
      title: t('auth.register.personalInfo'),
      subtitle: t('auth.register.personalInfoSubtitle'),
      fields: [
        { key: 'name', label: t('auth.fullName'), type: 'text', placeholder: 'Kwabena Mensah', icon: UserCircle },
        { key: 'email', label: t('settings.email'), type: 'email', placeholder: 'kwabena@gmail.com', icon: Mail },
        { key: 'phone', label: t('auth.emailOrPhone'), type: 'tel', placeholder: '+233 2X XXX XXXX', icon: Phone },
        { key: 'password', label: t('auth.password'), type: 'password', icon: Lock },
        { key: 'confirmPassword', label: t('settings.confirmPassword'), type: 'password', icon: Lock },
      ],
    },
  ];

  const restaurantSteps: Step[] = [
    {
      title: t('auth.register.ownerIdentity'),
      subtitle: t('auth.register.ownerIdentitySubtitle'),
      fields: [
        { key: 'ownerName', label: t('partner.vendor.restaurantName'), type: 'text', placeholder: 'Full legal name', icon: UserCircle },
        { key: 'email', label: t('settings.email'), type: 'email', placeholder: 'restaurant@example.com', icon: Mail },
        { key: 'phone', label: t('partner.vendor.contact'), type: 'tel', placeholder: '+233 2X XXX XXXX', icon: Phone },
        { key: 'password', label: t('auth.password'), type: 'password', icon: Lock },
        { key: 'confirmPassword', label: t('settings.confirmPassword'), type: 'password', icon: Lock },
      ],
    },
    {
      title: t('auth.register.businessProfile'),
      subtitle: t('auth.register.businessProfileSubtitle'),
      fields: [
        { key: 'businessName', label: t('partner.vendor.restaurantName'), type: 'text', placeholder: 'e.g. Market Circle Grill', icon: Building },
        { key: 'category', label: t('partner.vendor.cuisineType'), type: 'multi-select', icon: Utensils, options: ['African', 'Jollof', 'Fast Food', 'Breakfast', 'Grill & BBQ', 'Continental', 'Desserts', 'Drinks'] },
        { key: 'businessAddress', label: t('partner.vendor.location'), type: 'location', placeholder: 'Search Takoradi locations...', icon: MapPin },
        { key: 'openingHours', label: t('common.open'), type: 'time-range', icon: Clock },
        { key: 'logoUrl', label: t('settings.profilePicture'), type: 'image', icon: ImageIcon, optional: true },
      ],
    },
    {
      title: t('auth.register.merchantVerification'),
      subtitle: t('auth.register.merchantVerificationSubtitle'),
      fields: [
        { key: 'regNumber', label: t('partner.rider.vehicleNumber'), type: 'text', placeholder: 'e.g. GHA-12345678', icon: FileText },
        { key: 'documents', label: t('deliver.packageDetails'), type: 'image', icon: Globe, optional: true },
      ],
    },
  ];

  const riderSteps: Step[] = [
    {
      title: t('auth.register.identity'),
      subtitle: t('auth.register.identitySubtitle'),
      fields: [
        { key: 'fullName', label: t('partner.rider.fullName'), type: 'text', placeholder: 'Yaw Boateng', icon: UserCircle },
        { key: 'email', label: t('settings.email'), type: 'email', placeholder: 'yaw.b@gmail.com', icon: Mail },
        { key: 'phone', label: t('partner.vendor.contact'), type: 'tel', placeholder: '+233 2X XXX XXXX', icon: Phone },
        { key: 'password', label: t('auth.password'), type: 'password', icon: Lock },
        { key: 'confirmPassword', label: t('settings.confirmPassword'), type: 'password', icon: Lock },
      ],
    },
    {
      title: t('auth.register.vehicleLogistics'),
      subtitle: t('auth.register.vehicleLogisticsSubtitle'),
      fields: [
        { key: 'vehicleType', label: t('partner.rider.vehicleType'), type: 'select', icon: Bike, options: ['Motorcycle', 'Bicycle', 'Scooter', 'Electric Bike', 'Car'] },
        { key: 'vehicleNumber', label: t('partner.rider.vehicleNumber'), type: 'text', placeholder: 'e.g. WR-1234-24', icon: CreditCard },
        { key: 'location', label: t('partner.vendor.location'), type: 'location', placeholder: 'Preferred area in Takoradi...', icon: MapPin },
      ],
    },
    {
      title: t('auth.register.compliance'),
      subtitle: t('auth.register.complianceSubtitle'),
      fields: [
        { key: 'nationalId', label: t('partner.rider.vehicleNumber'), type: 'text', placeholder: 'GHA-000000000-0', icon: ShieldCheck },
        { key: 'driverLicense', label: t('partner.rider.vehicleNumber'), type: 'text', placeholder: 'License number', icon: FileText, optional: true },
      ],
    },
  ];

  const { showToast } = useToast();
  const location = useLocation();
  const [referralCode, setReferralCode] = useState<string>(() => {
    const fromUrl = new URLSearchParams(location.search).get('ref');
    return (
      fromUrl ||
      localStorage.getItem('om_referral_code') ||
      ''
    );
  });

  useEffect(() => {
    if (referralCode) localStorage.setItem('om_referral_code', referralCode);
    else localStorage.removeItem('om_referral_code');
  }, [referralCode]);

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

  const [locationResults, setLocationResults] = useState<string[]>([]);
  const [activeLocationField, setActiveLocationField] = useState<string | null>(null);

  const steps = role === 'customer' ? customerSteps : role === 'vendor' ? restaurantSteps : riderSteps;
  const current = steps[step - 1];
  const isLastStep = step === steps.length;

  const roleColor = role === 'customer' ? 'emerald' : role === 'vendor' ? 'violet' : 'amber';

  useEffect(() => {
    localStorage.setItem('om_registration_draft', JSON.stringify(form));
  }, [form]);

  const update = (key: string, value: string) => {
    let finalValue = value;
    if (key === 'phone') {
      if (!value.startsWith('+233')) finalValue = '+233';
      const suffix = value.substring(4);
      finalValue = '+233' + suffix.replace(/\D/g, '');
    }

    setForm(p => {
      const next = { ...p, [key]: finalValue };
      if (key.endsWith('_open') || key.endsWith('_close')) {
        const baseKey = key.includes('_open') ? key.replace('_open', '') : key.replace('_close', '');
        const open = next[`${baseKey}_open`];
        const close = next[`${baseKey}_close`];
        if (open && !close) {
          const suggested = nextTimeAfter(open);
          if (suggested) next[`${baseKey}_close`] = suggested;
        }
        if (open && close && timeToMinutes(close) <= timeToMinutes(open)) {
          next[`${baseKey}_close`] = nextTimeAfter(open) || next[`${baseKey}_open`];
        }
        if (next[`${baseKey}_open`] && next[`${baseKey}_close`]) {
          next[baseKey] = `${next[`${baseKey}_open`]} - ${next[`${baseKey}_close`]}`;
        }
      }
      return next;
    });
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleLocationSearch = (key: string, val: string) => {
    update(key, val);
    if (!val.trim()) { setLocationResults([]); return; }
    const filtered = TAKORADI_LOCATIONS.filter(loc => loc.toLowerCase().includes(val.toLowerCase()));
    setLocationResults(filtered);
    setActiveLocationField(key);
  };

  const selectLocation = (key: string, loc: string) => {
    update(key, loc);
    setLocationResults([]);
    setActiveLocationField(null);
  };

  const handleImageUpload = (key: string) => {
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
        if (key === 'logoUrl') {
          setCropKey(key);
          setCropSrc(src);
        } else {
          update(key, src);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const validateStep = (idx: number) => {
    const e: Record<string, string> = {};
    steps[idx].fields.forEach(f => {
      let val = (form[f.key] || '').trim();
      if (f.key === 'password') {
        if (!val) e.password = 'Required';
        else if (val.length < 8) e.password = 'Min 8 characters';
      } else if (f.key === 'confirmPassword') {
        if (val !== form.password) e.confirmPassword = 'Mismatch';
      } else if (!val && !f.optional) {
        e[f.key] = 'Required';
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (validateStep(step - 1)) setStep(s => s + 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep(step - 1)) return;
    setLoading(true);
    try {
      if (referralCode) form.referralCode = referralCode;
      const result = await register({ ...form, role }, role as any);
      if (result.success) {
        localStorage.removeItem('om_registration_draft');
        showToast('success', 'Account Created', 'Welcome to the OmniMarket ecosystem.');
        navigate(resolvePostLoginRoute(result.user!), { replace: true });
      } else {
        showToast('error', 'Registration Error', result.error || 'Check your details.');
      }
    } catch (err: any) {
      showToast('error', 'Network Error', 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 sm:p-12 relative overflow-hidden">

      <button
        type="button"
        onClick={onBack}
        className="group flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-emerald-500 uppercase tracking-widest transition-colors mb-10"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> {t('auth.register.back')}
      </button>

      {/* Modern Stepper */}
      <div className="flex gap-2 mb-10">
        {steps.map((_, i) => (
          <div key={i} className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-500",
            i < step ? `bg-${roleColor}-500 shadow-lg shadow-${roleColor}-500/20` : "bg-slate-100 dark:bg-slate-800"
          )} />
        ))}
      </div>

      {referralCode && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
            <Gift className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
              Referral Code Applied
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono truncate">{referralCode}</p>
          </div>
          <button type="button" onClick={() => setReferralCode('')} className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Remove code">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-2 mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{current.title}</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">{current.subtitle}</p>
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
          <div className="grid grid-cols-1 gap-5">
            {current.fields.map(f => (
              <div key={f.key} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {f.label} {f.optional && <span className="opacity-50 italic lowercase font-medium">(optional)</span>}
                  </label>
                  {errors[f.key] && <span className="text-[10px] font-black text-rose-500 uppercase">{errors[f.key]}</span>}
                </div>

                <div className="relative group">
                  {f.icon && f.type !== 'time-range' && f.type !== 'image' && f.type !== 'multi-select' && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10">
                      <f.icon className="w-5 h-5" />
                    </div>
                  )}

                  {f.type === 'multi-select' ? (
                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                      {f.options?.map(o => {
                        const sel = (form[f.key] || '').includes(o);
                        return (
                          <button
                            key={o} type="button"
                            onClick={() => {
                              const cur = (form[f.key] || '').split(', ').filter(Boolean);
                              const next = sel ? cur.filter(c => c !== o) : [...cur, o];
                              update(f.key, next.join(', '));
                            }}
                            className={cn(
                              "px-3 py-3 rounded-2xl text-[10px] font-black text-center transition-all border-2",
                              sel ? "bg-emerald-500 border-emerald-500 text-white shadow-lg" : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-emerald-500/30"
                            )}
                          >
                            {o.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  ) : f.type === 'location' ? (
                    <div className="relative">
                      <input
                        type="text" placeholder={f.placeholder} value={form[f.key] || ''}
                        onChange={e => handleLocationSearch(f.key, e.target.value)}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-12 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      />
                      <AnimatePresence>
                        {activeLocationField === f.key && locationResults.length > 0 && (
                          <motion.div className="absolute z-[60] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                            {locationResults.map(loc => (
                              <button key={loc} type="button" onClick={() => selectLocation(f.key, loc)} className="w-full text-left px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-white transition-colors">{loc}</button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : f.type === 'time-range' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <TimeStepper value={form[`${f.key}_open`] || ''} onChange={v => update(`${f.key}_open`, v)} />
                      <TimeStepper value={form[`${f.key}_close`] || ''} onChange={v => update(`${f.key}_close`, v)} />
                    </div>
                  ) : f.type === 'image' ? (
                    <div
                      onClick={() => handleImageUpload(f.key)}
                      className="w-full h-32 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all overflow-hidden relative"
                    >
                      {form[f.key] ? (
                        <img src={form[f.key]} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-300 mb-2" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload {f.label}</span>
                        </>
                      )}
                    </div>
                  ) : f.type === 'select' ? (
                    <div className="relative">
                      <select
                        value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)}
                        className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-12 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none"
                      >
                        <option value="">Select {f.label}</option>
                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type={f.type} placeholder={f.placeholder} value={form[f.key] || ''}
                      onChange={e => update(f.key, e.target.value)}
                      className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-12 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 py-4">
                <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Social Connect</span>
                <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => loginWithGoogle(role)} className="h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group">
                  <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Google</span>
                </button>
                <button type="button" onClick={() => loginWithApple(role)} className="h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group">
                  <AppleIcon className="w-5 h-5 text-slate-900 dark:text-white group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Apple</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            {step > 1 && (
              <Button type="button" variant="outline" className="w-full sm:w-32 h-16 rounded-[2rem] font-black text-xs" onClick={() => setStep(s => s - 1)}>
                BACK
              </Button>
            )}
            <Button
              type="submit"
              className={cn(
                "w-full sm:flex-1 h-16 rounded-[2rem] font-black text-xs tracking-[0.2em] shadow-2xl transition-all",
                `bg-${roleColor}-500 hover:bg-${roleColor}-600 shadow-${roleColor}-500/20`
              )}
              loading={loading}
            >
              {isLastStep ? "COMPLETE REGISTRATION" : "CONTINUE TO NEXT STEP"}
            </Button>
          </div>
        </motion.form>
      </AnimatePresence>

      <ImageCropModal
        open={!!cropSrc} imageSrc={cropSrc || ''}
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => { update(cropKey, dataUrl); setCropSrc(null); }}
        aspect={1} maxOutputSize={500} title="Crop Logo"
      />
    </div>
  );
}
