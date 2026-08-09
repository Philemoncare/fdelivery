import { useMemo } from 'react';
import { cn } from '@/src/lib/utils';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500', width: '16%' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-500', width: '40%' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500', width: '65%' };
    return { score, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500', width: '100%' };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-300', strength.color)} style={{ width: strength.width }} />
      </div>
      <p className={cn('text-xs font-medium', strength.textColor)}>{strength.label}</p>
    </div>
  );
}