import { useEffect, useState } from 'react';
import { Wrench, Mail, Clock, CalendarClock, Server, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { AdminService } from '@/src/services/api';

function Countdown({ to }: { to?: string | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!to || isNaN(new Date(to).getTime()) || new Date(to).getTime() <= Date.now()) return;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [to]);
  if (!to || isNaN(new Date(to).getTime())) return null;
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const parts = d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  return <span className="tabular-nums tracking-wide">{parts}</span>;
}

function fmt(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
}

export function MaintenancePage() {
  const [view, setView] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AdminService.getMaintenanceStatus()
      .then(c => { if (active) setView(c); })
      .catch(() => {})
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const active = view?.status === 'active';
  const toTime = active ? view?.scheduledEnd : (view?.status === 'warning' || view?.status === 'scheduled') ? view?.scheduledStart : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <div className="text-center max-w-md space-y-8">
        <div className="w-20 h-20 mx-auto rounded-[2rem] bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
          <Wrench className="w-10 h-10 text-emerald-400 animate-pulse-subtle" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-heading font-black">{active ? 'We&apos;re right back' : 'Scheduled maintenance coming up'}</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {view?.description || (active
              ? 'OmniMarket is undergoing maintenance to improve performance and add new features. Thank you for your patience.'
              : 'OmniMarket will undergo maintenance soon. We appreciate your patience.')}
          </p>
          {toTime && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-lg font-bold">
              {active ? <Clock className="w-5 h-5 text-emerald-400" /> : <CalendarClock className="w-5 h-5 text-amber-400" />}
              <Countdown to={toTime} />
            </div>
          )}
          {view?.scheduledStart && view?.scheduledEnd && (
            <p className="text-xs text-slate-500">
              Expected {active ? 'to resume' : ''}: {fmt(view.scheduledStart)}{' '}
              {active && <> — {fmt(view.scheduledEnd)}</>}
              {!active && <> to {fmt(view.scheduledEnd)}</>}
            </p>
          )}
          {(!loaded || (!view)) && view === null && loaded && (
            <p className="text-xs text-slate-600"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Checking status…</p>
          )}
        </div>
        {(view?.affectedServices?.length > 0) && (
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <Server className="w-3.5 h-3.5" /> Affected: {view.affectedServices.join(', ')}
          </div>
        )}
        <Button
          variant="outline"
          className="rounded-xl border-white/20 text-white hover:bg-white/10 font-bold"
          onClick={() => window.location.href = 'mailto:support@omnimarket.gh'}
        >
          <Mail className="w-4 h-4 mr-2" /> Contact Support
        </Button>
      </div>
    </div>
  );
}
