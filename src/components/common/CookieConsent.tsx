import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export const CookieConsent: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-40 max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
      <div className="flex items-start space-x-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-gray-900 dark:text-white">Privacy & Cookie Preferences</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            We use essential cookies to deliver real-time rider tracking, multi-restaurant cart persistence, and secure wallet transactions.
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsDismissed(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          Accept
        </button>
      </div>
    </div>
  );
};
