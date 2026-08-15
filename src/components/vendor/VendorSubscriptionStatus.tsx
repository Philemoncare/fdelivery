import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crown, Gem, BadgeCheck, Check, X, Zap } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';

export const VENDOR_PLANS = [
  {
    id: 'Starter',
    price: 0,
    period: '/month',
    tagline: 'Free forever. Perfect for new restaurants finding their feet.',
    perks: ['Unlimited menu items', '2% per-order commission', 'Standard support', 'Basic analytics'],
    cta: 'Current Plan',
  },
  {
    id: 'Standard',
    price: 99,
    period: '/month',
    icon: Crown,
    popular: true,
    tagline: 'Best value for growing kitchens that deliver daily.',
    perks: ['0% commission on all orders', 'Priority rider dispatch', 'Designated account manager', 'Advanced analytics + reports', 'Promotion toolkit'],
    cta: 'Upgrade to Standard',
  },
  {
    id: 'Enterprise',
    price: 249,
    period: '/month',
    icon: Gem,
    tagline: 'For multi-brand kitchens and high-volume operations.',
    perks: ['0% commission on all orders', 'Multiple staff accounts', 'Custom branding & API access', '24/7 dedicated support', 'On-site hardware setup'],
    cta: 'Upgrade to Enterprise',
  },
];

export const VENDOR_PLAN_KEY = (vendorId?: string) => `omnimarket_vendor_plan_${vendorId || 'guest'}`;

export function getVendorPlan(vendorId?: string) {
  return localStorage.getItem(VENDOR_PLAN_KEY(vendorId)) || 'Starter';
}

export function setVendorPlan(planId: string, vendorId?: string) {
  localStorage.setItem(VENDOR_PLAN_KEY(vendorId), planId);
}

export function VendorSubscriptionStatus({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { vendorId } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState(() => getVendorPlan(vendorId));
  const [open, setOpen] = useState(false);

  const current = VENDOR_PLANS.find(p => p.id === currentPlan) || VENDOR_PLANS[0];
  const subscribed = current.price > 0;

  const select = (planId: string) => {
    setVendorPlan(planId, vendorId);
    setCurrentPlan(planId);
    const plan = VENDOR_PLANS.find(p => p.id === planId)!;
    showToast('Plan Updated', planId === 'Starter' ? 'You are now on the free Starter plan.' : `You are now on the ${planId} plan — billed monthly.`);
    setOpen(false);
  };

  const sizeCls = size === 'sm'
    ? 'px-2.5 py-1 text-[9px] gap-1'
    : size === 'lg'
      ? 'px-4 py-2 text-xs gap-1.5'
      : 'px-3 py-1.5 text-[10px] gap-1.5';

  return (
    <>
      {subscribed ? (
        <button
          onClick={() => navigate('/restaurant/subscription')}
          className={cn(
            'inline-flex items-center rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black uppercase tracking-widest shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all',
            sizeCls,
            className
          )}
        >
          <Crown className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          {current.id}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex items-center rounded-full border border-violet-400/60 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-black uppercase tracking-widest hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:scale-105 active:scale-95 transition-all',
            sizeCls,
            className
          )}
        >
          Subscribe
        </button>
      )}

      <AnimatePresence>
        {open && createPortal(
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Choose your plan</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Remove commissions and unlock growth tools</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-6 sm:p-8 space-y-4">
                {VENDOR_PLANS.map(plan => {
                  const isCurrent = plan.id === currentPlan;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => select(plan.id)}
                      className={cn(
                        'w-full text-left rounded-3xl p-5 border-2 transition-all flex items-center gap-5 group relative overflow-hidden',
                        plan.popular ? 'border-violet-500/50 bg-violet-50/30 dark:bg-violet-500/5' : 'border-gray-50 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-500/30',
                        isCurrent && 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/5'
                      )}
                    >
                      {plan.icon && (
                        <div className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110',
                          plan.popular ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
                        )}>
                          <plan.icon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{plan.id}</p>
                          {plan.popular && (
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-violet-500 text-white px-2 py-0.5 rounded-full shadow-sm">Popular</span>
                          )}
                          {isCurrent && (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                              <BadgeCheck className="w-3 h-3" /> Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{plan.tagline}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xs font-bold text-gray-400 uppercase">GHS</span>
                          <span className="text-2xl font-black text-gray-900 dark:text-white">{plan.price}</span>
                        </div>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{plan.period.slice(1)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-8 border-t border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/50 space-y-5">
                <div className="flex items-center gap-4 rounded-[1.5rem] bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    Keep <span className="font-black text-gray-900 dark:text-white">100% of your earnings</span> with a paid plan. Includes priority dispatch and enhanced marketing.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => { setOpen(false); navigate('/restaurant/subscription'); }}
                    className="flex-1 h-14 rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 hover:border-violet-500 hover:text-violet-600 transition-all"
                  >
                    View Full Plans
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}
