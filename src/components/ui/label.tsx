import { type LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/src/lib/utils';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn('block text-sm font-medium text-gray-700 dark:text-gray-300', className)} {...props} />
  )
);

Label.displayName = 'Label';
