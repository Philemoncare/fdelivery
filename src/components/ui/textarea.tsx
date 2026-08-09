import { type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/src/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-4 py-2.5 bg-white dark:bg-slate-800/80 border rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200',
        'border-gray-200 dark:border-slate-700',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';
