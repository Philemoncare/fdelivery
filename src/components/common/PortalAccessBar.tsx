import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { Package, ChevronDown } from 'lucide-react';
import type { CurrencyCode } from '@/src/types';
import { resolvePostAuthenticationRoute } from '@/src/lib/auth/types';

// The live-delivery statuses a customer can still act on. Derived from the
// backend status vocabulary (never hardcoded counts).
const LIVE_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'in_transit',
  'arriving',
  'awaiting_confirmation'
];

const CURRENCY_OPTIONS: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: 'GHS', symbol: '₵', label: 'Ghana Cedi' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'Pound' },
  { code: 'NGN', symbol: '₦', label: 'Naira' }
];

export const PortalAccessBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currency,
    setCurrency,
    orders,
    t
  } = useApp();

  const [ordersOpen, setOrdersOpen] = useState(false);
  const ordersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ordersRef.current && !ordersRef.current.contains(e.target as Node)) setOrdersOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Authoritative live-order count for THIS authenticated user (own records only).
  const myOrders = (orders || []).filter(o => o.customerId === user?.id);
  const liveOrders = myOrders.filter(o => LIVE_ORDER_STATUSES.includes(String(o.status || '')));
  const activeOrdersCount = liveOrders.length;

  const isCustomer = user?.role === 'customer';

  return (
    <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Account / auth */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none">
          {user ? (
            <button
              onClick={() => navigate(isCustomer ? '/customer/settings' : resolvePostAuthenticationRoute(user))}
              className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition whitespace-nowrap px-2 py-1 rounded-full hover:bg-slate-800"
              title="Manage your account"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                {isCustomer ? (
                  <>
                    {t('portal.account')}: <span className="font-bold text-slate-200">{user.firstName || 'You'}</span>
                  </>
                ) : (
                  <>
                    {t('portal.welcomeBack')}, <span className="font-bold text-slate-200">{user.firstName || 'there'}</span>
                  </>
                )}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/login')}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition whitespace-nowrap px-2 py-1 rounded-full hover:bg-slate-800"
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => navigate('/register')}
                className="text-slate-300 hover:text-white font-medium transition whitespace-nowrap px-2 py-1 rounded-full hover:bg-slate-800"
              >
                {t('auth.createAccount')}
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Orders, Currency */}
        <div className="flex items-center space-x-3 text-slate-300">
          {/* Live Orders — real count + real active-order list for this customer */}
          {isCustomer && liveOrders.length > 0 && (
            <div ref={ordersRef} className="relative">
              <button
                onClick={() => setOrdersOpen(v => !v)}
                className="flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-[11px] hover:bg-emerald-900/80 transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{t('portal.liveOrder')} ({activeOrdersCount})</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {ordersOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-2 z-50 animate-scale-in">
                  <p className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {t('portal.activeDeliveries')}
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {liveOrders.map(o => (
                      <button
                        key={o.id}
                        onClick={() => { setOrdersOpen(false); navigate(`/track-order?order=${o.id}`); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-emerald-500" />
                            #{o.orderNumber}
                          </span>
                          <span className="text-[9px] font-bold uppercase text-emerald-600">{t(`status.${o.status}`) || o.status.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                          {o.vendorName || t('nav.deliver')} · {new Date(o.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Currency Selector — one supported value visible at a time */}
          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 overflow-hidden" title="Display currency">
            <span className="pl-2 pr-1 text-slate-400">{(() => (CURRENCY_OPTIONS.find(c => c.code === currency) || CURRENCY_OPTIONS[0]).symbol)()}</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              aria-label="Display currency"
              className="bg-transparent text-white text-[11px] font-bold focus:outline-none cursor-pointer py-1 pr-2 [&>option]:bg-slate-900 [&>option]:text-white"
            >
              {CURRENCY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.code} · {c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};