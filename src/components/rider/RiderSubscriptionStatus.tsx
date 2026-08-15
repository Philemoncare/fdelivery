import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crown, Gem, BadgeCheck, Check, X, Zap } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';

export const RIDER_PLANS = [
  {
    id: 'Free',
    price: 0,
    period: '/month',
    tagline: 'Get started with essential dispatch access.',
    perks: ['Standard job dispatch', 'GHS 2 per-delivery platform fee', 'Standard support', 'Basic earnings summary'],
    cta: 'Current Plan',
  },
  {
    id: 'Premium',
    price: 19,
    period: '/month',
    icon: Crown,
    popular: true,
    tagline: 'Best value for riders who deliver regularly.',
    perks: ['Priority job claiming', 'No per-delivery platform fee', 'Faster payouts (24h)', 'Priority support', 'Earnings analytics'],
    cta: 'Upgrade to Premium',
  },
  {
    id: 'Pro',
    price: 39,
    period: '/month',
    icon: Gem,
    tagline: 'For full-time riders maximizing every shift.',
    perks: ['Guaranteed minimum offers', 'Instant payouts on request', '0% platform fees', 'Dedicated account manager', 'Accident insurance cover', 'Free annual vehicle check'],
    cta: 'Upgrade to Pro',
  },
];

export const RIDER_PLAN_KEY = (userId?: string) => `omnimarket_rider_plan_${userId || 'guest'}`;

export function getRiderPlan(userId?: string) {
  return localStorage.getItem(RIDER_PLAN_KEY(userId)) || 'Free';
}

export function setRiderPlan(planId: string, userId?: string) {
  localStorage.setItem(RIDER_PLAN_KEY(userId), planId);
}

export function RiderSubscriptionStatus({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { user } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState(() => getRiderPlan(user?.id));
  const [open, setOpen] = useState(false);

  const current = RIDER_PLANS.find(p => p.id === currentPlan) || RIDER_PLANS[0];
  const subscribed = current.price > 0;

  const select = (planId: string) => {
    setRiderPlan(planId, user?.id);
    setCurrentPlan(planId);
    const plan = RIDER_PLANS.find(p => p.id === planId)!;
    showToast('Plan Updated', planId === 'Free' ? 'You are now on the free plan.' : `You are now on the ${planId} plan — billed monthly.`);
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
          onClick={() => navigate('/rider/subscription')}
          className={cn(
            'inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black uppercase tracking-widest shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all',
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
            'inline-flex items-center rounded-full border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:scale-105 active:scale-95 transition-all',
            sizeCls,
            className
          )}
        >
          Subscribe
        </button>
      )}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Choose your plan</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Unlock more earning power</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[52vh] overflow-y-auto p-4 sm:p-5 space-y-3">
                {RIDER_PLANS.map(plan => {
                  const isCurrent = plan.id === currentPlan;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => select(plan.id)}
                      className={cn(
                        'w-full text-left rounded-2xl p-4 border transition-all flex items-center gap-4',
                        plan.popular ? 'border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-900/10' : 'border-gray-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700',
                        isCurrent && 'ring-2 ring-emerald-500/40 border-emerald-300 dark:border-emerald-700'
                      )}
                    >
                      {plan.icon && (
                        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', plan.popular ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300')}>
                          <plan.icon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-gray-900 dark:text-white">{plan.id}</p>
                          {plan.popular && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-600 text-white px-2 py-0.5 rounded-full">Popular</span>
                          )}
                          {isCurrent && (
                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                              <BadgeCheck className="w-3 h-3" /> Current
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 line-clamp-1">{plan.tagline}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-gray-900 dark:text-white">GHS {plan.price}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{plan.period.slice(1)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-5 border-t border-gray-50 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 p-3">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    Paid plans remove the GHS 2 per-delivery platform fee, unlock priority jobs and faster payouts.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setOpen(false); navigate('/rider/subscription'); }}
                    className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors"
                  >
                    View Full Plans
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
