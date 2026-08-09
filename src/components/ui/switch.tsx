import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/src/lib/utils';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'checked'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, id, ...props }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1',
          checked ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-slate-700',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';
