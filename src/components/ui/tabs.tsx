import { type ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { cn } from '@/src/lib/utils';

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs subcomponents must be used within <Tabs>');
  return ctx;
}

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  className?: string;
}

export function Tabs({ children, defaultValue, value, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  useEffect(() => { if (value !== undefined) setInternal(value); }, [value]);
  const current = value ?? internal ?? '';
  return (
    <TabsContext.Provider value={{ value: current, setValue: setInternal }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex gap-1 p-1 bg-surface-3 dark:bg-slate-800 rounded-xl', className)}>{children}</div>;
}

export function TabsTrigger({ children, value, className }: { children: ReactNode; value: string; className?: string }) {
  const { value: active, setValue } = useTabs();
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-all',
        isActive ? 'bg-surface dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-ink-2 hover:text-ink',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, className }: { children: ReactNode; value: string; className?: string }) {
  const { value: active } = useTabs();
  if (active !== value) return null;
  return <div className={cn('mt-2', className)}>{children}</div>;
}