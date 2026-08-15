import { type Attributes, type ReactNode, createContext, useContext, useState, useEffect, useRef } from 'react';
import { cn } from '@/src/lib/utils';

interface SelectContextValue {
  value: string | undefined;
  setValue: (v: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  labels: Record<string, string>;
  registerLabel: (value: string, label: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('Select subcomponents must be used within <Select>');
  return ctx;
}

interface SelectProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function Select({ children, value, onValueChange, className }: SelectProps) {
  const [controlled, setControlled] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setControlled(value); }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const registerLabel = (val: string, label: string) => {
    setLabels(prev => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  };

  const setValue = (v: string) => {
    setControlled(v);
    onValueChange?.(v);
    setIsOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: controlled, setValue, isOpen, setIsOpen, labels, registerLabel }}>
      <div className={cn("relative inline-block", className)} ref={containerRef}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const { isOpen, setIsOpen } = useSelect();
  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
      'flex items-center justify-between w-full px-3 py-2 text-sm bg-surface dark:bg-slate-900 border rounded-xl cursor-pointer select-none transition-all',
      'border-line dark:border-slate-700 hover:border-line-strong dark:hover:border-slate-600',
      isOpen && 'border-primary ring-2 ring-primary/10 dark:border-primary',
      className
    )}>
      <div className="flex-1 truncate mr-2 pointer-events-none text-left">
        {children}
      </div>
      <svg className={cn("w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useSelect();
  const label = value ? labels[value] : null;

  return (
    <span className={cn('block truncate', value ? 'text-ink dark:text-white font-medium' : 'text-ink-3')}>
      {label || value || placeholder || ''}
    </span>
  );
}

interface SelectItemProps extends Attributes {
  key?: string | number;
  children: ReactNode;
  value: string;
  label?: string;
}

export function SelectItem({ children, value, label }: SelectItemProps) {
  const { value: selected, setValue, registerLabel } = useSelect();
  const isActive = selected === value;

  useEffect(() => {
    const effectiveLabel = label || (typeof children === 'string' ? children : null);
    if (effectiveLabel) {
      registerLabel(value, effectiveLabel);
    }
  }, [value, children, label, registerLabel]);

  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={cn(
        'block w-full text-left px-3 py-2.5 text-sm transition-colors outline-none',
        isActive
          ? 'bg-primary-soft text-primary dark:bg-primary-soft font-semibold'
          : 'text-ink-2 dark:text-gray-300 hover:bg-surface-2 dark:hover:bg-slate-800 focus:bg-surface-2 dark:focus:bg-slate-800'
      )}
    >
      {children}
    </button>
  );
}

export function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
  const { isOpen } = useSelect();

  if (!isOpen) return null;

  return (
    <div className={cn(
      'absolute z-[100] mt-1.5 min-w-full w-max max-w-[18rem] rounded-xl border border-line dark:border-slate-700 bg-surface dark:bg-slate-900 shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top left-0',
      className
    )}>
      <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
        {children}
      </div>
    </div>
  );
}
