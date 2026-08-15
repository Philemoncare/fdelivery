import React from 'react';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useApp } from '@/src/context/AppContext';
import { ShieldCheck, Hourglass, AlertTriangle, Home } from 'lucide-react';

interface Props {
  role: 'vendor' | 'rider';
}

export const ApplicationStatusPage: React.FC<Props> = ({ role }) => {
  const { user } = useAuth();
  const { showToast } = useApp();

  const isRider = role === 'rider';
  const title = isRider ? 'Rider Application Under Review' : 'Restaurant Application Under Review';
  const description = isRider
    ? 'Your rider profile, vehicle documents, and identity verification are being reviewed by our dispatch team. You will be able to start accepting delivery jobs once approved.'
    : 'Your restaurant license, business registration, and food safety documents are being reviewed by our onboarding team. You will be able to manage your menu and accept orders once approved.';

  const handleRefresh = () => {
    showToast('Checking Application', 'Refresh the page in a few minutes to see your latest approval status.');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-2xl p-8 sm:p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Hourglass className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-6">{title}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
          {description}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/60 p-4 space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Identity Check</p>
          </div>
          <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/60 p-4 space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{isRider ? 'Vehicle Docs' : 'Business Docs'}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/60 p-4 space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Approval</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 text-left mt-6">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
            You will receive an email and in-app notification as soon as your account is approved. This typically takes under 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={handleRefresh} className="h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all">
            Check Status
          </button>
          <a href="/" className="flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
            <Home className="w-4 h-4" /> Back Home
          </a>
        </div>

        {user && (
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">
            Account: {user.email}
          </p>
        )}
      </div>
    </div>
  );
};
