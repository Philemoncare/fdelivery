import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';

const CONSENT_KEY = 'omnimarket_cookie_consent';

export const CookieConsent: React.FC = () => {
  const { t } = useApp();
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'accepted';
    } catch {
      return false;
    }
  });

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {}
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-[60] max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-start space-x-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-gray-900 dark:text-white uppercase tracking-widest text-[10px]">{t('cookie.title')}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {t('cookie.desc')}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleAccept}
          className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-black text-[10px] px-5 py-2.5 rounded-xl transition cursor-pointer uppercase tracking-widest active:scale-95 shadow-lg"
        >
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  );
};
