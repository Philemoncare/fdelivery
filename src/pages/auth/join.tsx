// ============================================================
// OmniMarket — /register : "Join OmniMarket"
// The registration entry experience. Instead of one generic
// form, visitors first choose what they want to do and are
// guided into a role-specific onboarding flow.
// ============================================================

import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import omniLogo from '@/assets/omni-logo.png';
import { JOIN_ROLES } from '@/src/lib/partner-roles';
import { useAuth } from '@/src/lib/auth/auth-store';

export function JoinOmniMarketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Already signed in? Registration pages are not where they belong —
  // PublicOnlyRoute handles the guarded parents; this covers deep links.
  if (user) {
    window.location.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      <header className="h-[72px] flex items-center justify-between px-5 sm:px-10 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950">
        <Link to="/" className="flex items-center shrink-0" aria-label="OmniMarket home">
          <img
            src={omniLogo}
            alt="OmniMarket"
            className="object-contain h-[40px] w-auto max-w-[130px] dark:invert dark:hue-rotate-180"
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs font-bold text-slate-400">Already have an account?</span>
          <Link
            to="/login"
            className="inline-flex items-center h-10 px-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-black text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 hover:text-emerald-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600">Join OmniMarket</p>
          <h1 className="mt-3 font-heading font-black tracking-tight text-slate-900 dark:text-white leading-[1.05] text-[clamp(30px,5vw,44px)]">
            What would you like to do?
          </h1>
          <p className="mt-4 text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            Choose the account that fits you and we'll guide you through exactly what's needed.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {JOIN_ROLES.map((role, i) => (
            <motion.button
              key={role.id}
              type="button"
              onClick={() => navigate(role.route)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className={
                'group relative text-start rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-2xl hover:border-emerald-500/30 transition-all duration-300 overflow-hidden' +
                (role.id === 'customer' ? ' sm:col-span-2' : '')
              }
            >
              {/* hover accent glow */}
              <span className="absolute -top-24 -end-24 w-64 h-64 rounded-full bg-emerald-500/0 blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none" />

              <span className="flex items-start justify-between gap-4">
                <span className={cnIcon(role.id)}>
                  {role.icon}
                </span>
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </span>

              <div className="mt-8">
                <h3 className="text-xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {role.blurb}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-600 group-hover:gap-3 transition-all">
                <span>{role.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.button>
          ))}
        </div>

        <p className="mt-10 text-center text-xs font-semibold text-slate-400 leading-relaxed max-w-md mx-auto">
          Are you a restaurant or store team member?
          Your vendor invites you through the partner portal — ask them for an account on their dashboard.
        </p>
      </main>

      <footer className="py-6 px-6 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="text-[11px] font-bold text-slate-400">&copy; {new Date().getFullYear()} OmniMarket · Takoradi</span>
        {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Help', '/faq']].map(([label, to]) => (
          <Link key={to} to={to} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">{label}</Link>
        ))}
      </footer>
    </div>
  );
}

function cnIcon(id: string): string {
  const base = 'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 [&>svg]:w-[22px] [&>svg]:h-[22px]';
  switch (id) {
    case 'customer': return `${base} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`;
    case 'rider': return `${base} bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400`;
    case 'vendor': return `${base} bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400`;
    case 'fleet': return `${base} bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400`;
    default: return `${base} bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`;
  }
}
