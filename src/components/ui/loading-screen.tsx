import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = 'Loading...' }: LoadingScreenProps) {
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRetryCount(prev => prev + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [retryCount]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="text-center p-8">
        <div className="relative mx-auto w-16 h-16 mb-6">
          <motion.div
            className="absolute inset-0 rounded-2xl bg-emerald-500"
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-2 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center">
            <span className="text-lg font-black text-emerald-600">O</span>
          </div>
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{label}</p>
        <p className="text-xs text-gray-400">OmniMarket is preparing your experience...</p>

        {retryCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-3">
             <p className="text-xs text-amber-600 dark:text-amber-400 max-w-xs mx-auto leading-relaxed">
               Still waiting for the OmniMarket server. Please ensure the backend process is running in your terminal.
             </p>
             <button
               onClick={() => window.location.reload()}
               className="text-[10px] font-black uppercase tracking-widest text-emerald-600 underline"
             >
               Force Refresh
             </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
