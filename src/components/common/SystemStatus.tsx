import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AdminService } from '@/src/services/api';

export type SystemHealthState = 'nominal' | 'degraded' | 'partial' | 'offline';

interface SubsystemStatus {
  key: string;
  label: string;
  status: string;
}

function deriveState(health: any): { state: SystemHealthState; label: string; subsystems: SubsystemStatus[] } {
  const apiStatus = health?.api?.status;
  const subsystems: SubsystemStatus[] = [
    { key: 'api', label: 'Core API', status: apiStatus || 'unknown' },
    { key: 'database', label: 'Database', status: health?.database?.status || 'unknown' },
    { key: 'auth', label: 'Auth', status: health?.auth?.status || 'unknown' },
    { key: 'realtime', label: 'Realtime', status: health?.realtime?.status || 'unknown' },
    { key: 'payments', label: 'Payments', status: health?.payments?.status || 'unknown' },
    { key: 'notifications', label: 'Notifications', status: health?.notifications?.status || 'unknown' },
  ];

  const failed = subsystems.filter(s => s.status === 'failed');
  const degraded = subsystems.filter(s => s.status === 'degraded');

  if (apiStatus !== 'operational') {
    return { state: 'offline', label: 'Offline', subsystems };
  }
  if (failed.length > 0) {
    return { state: 'partial', label: 'Partial Outage', subsystems };
  }
  if (degraded.length > 0) {
    return { state: 'degraded', label: 'Degraded', subsystems };
  }
  return { state: 'nominal', label: 'Systems Nominal', subsystems };
}

const STATE_STYLES: Record<SystemHealthState, string> = {
  nominal: 'bg-ok-soft text-ok border-ok/30 dark:border-ok/30',
  degraded: 'bg-warn-soft text-warn border-warn/30 dark:border-warn/30',
  partial: 'bg-danger-soft text-danger border-danger/30 dark:border-danger/30',
  offline: 'bg-danger-soft text-danger border-danger/40 dark:border-danger/40',
};

const DOT_COLORS: Record<SystemHealthState, string> = {
  nominal: 'bg-ok',
  degraded: 'bg-warn',
  partial: 'bg-danger',
  offline: 'bg-danger',
};

const POLL_MS = 30000;

export function SystemStatus({ className, compact }: { className?: string; compact?: boolean }) {
  const [state, setState] = useState<SystemHealthState>('nominal');
  const [label, setLabel] = useState('Systems Nominal');
  const [subsystems, setSubsystems] = useState<SubsystemStatus[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const check = async () => {
      try {
        const health = await AdminService.getSystemHealth();
        if (!mountedRef.current) return;
        const derived = deriveState(health);
        setState(derived.state);
        setLabel(derived.label);
        setSubsystems(derived.subsystems);
      } catch {
        if (!mountedRef.current) return;
        setState('offline');
        setLabel('Offline');
        setSubsystems([]);
      }
    };
    check();
    timerRef.current = setInterval(check, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(v => !v)}
        onBlur={(e) => {
          // Allow clicking inside the popover; close when focus leaves the whole region.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        title={subsystems.length ? subsystems.map(s => `${s.label}: ${s.status}`).join(' · ') : 'System health'}
        aria-label={`System status: ${label}`}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-colors',
          STATE_STYLES[state],
          compact && 'hidden sm:flex'
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[state], state !== 'offline' && 'animate-pulse')} />
        {label}
      </button>

      {open && subsystems.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 z-40 rounded-2xl bg-surface dark:bg-slate-900 border border-line shadow-2xl p-3">
            <div className="flex items-center gap-2 px-1 pb-2">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-wider text-ink-2">System Health</p>
              <span className="ml-auto text-[10px] text-ink-3">polled 30s</span>
            </div>
            <div className="space-y-1">
              {subsystems.map(s => {
                const ok = s.status === 'operational' || s.status === 'configured';
                const bad = s.status === 'failed';
                return (
                  <div key={s.key} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-2">
                    <span className="text-xs font-medium text-ink-2">{s.label}</span>
                    <span className={cn('text-[11px] font-semibold capitalize', bad ? 'text-danger' : ok ? 'text-ok' : 'text-warn')}>
                      <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', bad ? 'bg-danger' : ok ? 'bg-ok' : 'bg-warn')} />
                      {s.status.replace('-', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
