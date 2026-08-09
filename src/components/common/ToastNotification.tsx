import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-slideUp">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start space-x-3">
        <div className="mt-0.5">{icons[toast.type || 'success']}</div>
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-bold text-white">{toast.title}</h5>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">{toast.desc}</p>
        </div>
      </div>
    </div>
  );
};
