import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin, Search, Loader2, Navigation, CornerDownLeft, Plus, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { TAKORADI_LOCATIONS } from '@/src/lib/locations';
import { LocationService } from '@/src/services/api';
import { requestGeoFix, describeGeoResult } from '@/src/lib/location/geolocation';
import { cn } from '@/src/lib/utils';
import type { DeliveryLocation } from '@/src/types';

import { useApp } from '@/src/context/AppContext';

const RECENT_KEY = 'omnimarket_recent_delivery_locations';
const RECENT_MAX = 5;

// Legitimate dev/test seed data — NOT the only possible destination source.
// The selector always also offers geocoded results and manual entry.
const seedLocations: DeliveryLocation[] = TAKORADI_LOCATIONS.map((label) => ({
  address: label,
  area: label.split(',')[0].trim(),
  city: (label.split(',')[1] || '').trim() || 'Takoradi',
  region: 'Western Region',
  source: 'seed',
}));

function loadRecent(): DeliveryLocation[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(loc: DeliveryLocation) {
  try {
    const list = [loc, ...loadRecent().filter((r) => r.address !== loc.address)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

interface LocationSearchProps {
  id?: string;
  label: string;
  placeholder: string;
  hint?: string;
  value: DeliveryLocation | null;
  onChange: (loc: DeliveryLocation | null) => void;
  accent?: 'emerald' | 'rose';
  allowCurrentLocation?: boolean;
  savedOptions?: DeliveryLocation[];
  allowSave?: boolean;
  onSave?: (loc: DeliveryLocation) => Promise<boolean>;
  ariaLabel?: string;
}

export function LocationSearch(props: LocationSearchProps) {
  const {
    id, label, placeholder, hint, value, onChange,
    accent = 'emerald', allowCurrentLocation = false,
    savedOptions = [], allowSave = false, onSave,
  } = props;

  const { t } = useApp();
  const [query, setQuery] = useState(value?.address || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [serverResults, setServerResults] = useState<DeliveryLocation[]>([]);
  const [serverOk, setServerOk] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [manual, setManual] = useState({ street: '', city: '', region: '', landmark: '', instructions: '' });

  useEffect(() => {
    setQuery(value?.address || '');
  }, [value?.address]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const localMatches = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return [];
    return seedLocations.filter((l) => normalize(l.address).includes(q));
  }, [query]);

  // Server search (debounced). Falls back to the seed list silently when the
  // geocoder is unreachable — manual entry always remains available.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setServerResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const res = await LocationService.searchPlaces(q);
        setServerOk(res?.ok !== false);
        setServerResults(res?.places || []);
      } catch (e: any) {
        setServerOk(false);
        setServerResults([]);
        setSearchError(t('address.noMatches'));
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const options = useMemo(() => {
    const q = normalize(query);
    const list: Array<{ loc: DeliveryLocation; tag: string }> = [];
    if (q.length < 2) {
      // Recent / saved first, then nearby seed areas.
      loadRecent().forEach((r) => list.push({ loc: r, tag: 'Recent' }));
      savedOptions.forEach((s) => list.push({ loc: s, tag: 'Saved' }));
      seedLocations.forEach((s) => list.push({ loc: s, tag: 'Takoradi' }));
    } else {
      serverOk && serverResults.length > 0
        ? serverResults.forEach((r) => list.push({ loc: r, tag: 'Search' }))
        : localMatches.forEach((l) => list.push({ loc: l, tag: 'Search' }));
      if (localMatches.length > 0 && serverOk && serverResults.length > 0) {
        localMatches.forEach((l) => {
          if (!serverResults.some((r) => normalize(r.address) === normalize(l.address))) {
            list.push({ loc: l, tag: 'Takoradi' });
          }
        });
      }
      loadRecent().forEach((r) => {
        if (!list.some((o) => normalize(o.loc.address) === normalize(r.address))) list.push({ loc: r, tag: 'Recent' });
      });
    }
    return list.slice(0, 10);
  }, [query, localMatches, serverResults, serverOk, savedOptions]);

  useEffect(() => {
    setHighlight(0);
  }, [options.length, query]);

  const select = (loc: DeliveryLocation) => {
    onChange({ ...loc, source: loc.source || 'seed' });
    saveRecent(loc);
    setQuery(loc.address);
    setOpen(false);
    setManualMode(false);
    // Best-effort coordinate resolution for seed/recent/saved addresses so the
    // pricing engine can include distance. Never blocks the selection itself.
    if (!loc.latitude || !loc.longitude) {
      void LocationService.searchPlaces(loc.address).then((res) => {
        const match = res?.places?.find((p) => p.latitude && p.longitude);
        if (match) onChange({ ...loc, latitude: match.latitude, longitude: match.longitude, source: 'geocoder' });
      }).catch(() => undefined);
    }
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setManualMode(false);
  };

  const useCurrentLocation = useCallback(async () => {
    setGeoBusy(true);
    setGeoError(null);
    setSearchError(null);
    const res = await requestGeoFix();
    if (!res.ok || !res.fix) {
      setGeoError(describeGeoResult(res));
      setGeoBusy(false);
      setOpen(true);
      return;
    }
    try {
      const geo = await LocationService.reverseGeocode(res.fix.latitude, res.fix.longitude);
      const loc: DeliveryLocation = {
        address: geo.address || geo.area || t('address.useCurrent'),
        area: geo.area,
        city: geo.city,
        region: geo.region,
        latitude: res.fix.latitude,
        longitude: res.fix.longitude,
        source: 'gps',
      };
      onChange(loc);
      saveRecent(loc);
      setQuery(loc.address);
      setOpen(false);
    } catch {
      // Reverse geocode failed: still use the raw GPS fix rather than pretending
      // we have a street name we don't.
      const loc: DeliveryLocation = {
        address: t('address.useCurrent'),
        area: t('address.useCurrent'),
        latitude: res.fix.latitude,
        longitude: res.fix.longitude,
        source: 'gps',
      };
      onChange(loc);
      setQuery(t('address.useCurrent'));
      setOpen(false);
    } finally {
      setGeoBusy(false);
    }
  }, [onChange, t]);

  const submitManual = () => {
    const street = manual.street.trim();
    const city = manual.city.trim();
    if (!street) return;
    const address = [street, manual.landmark.trim(), city].filter(Boolean).join(', ');
    const loc: DeliveryLocation = {
      address,
      area: street,
      city: city || undefined,
      region: manual.region.trim() || undefined,
      landmark: manual.landmark.trim() || undefined,
      instructions: manual.instructions.trim() || undefined,
      source: 'manual',
    };
    select(loc);
    setManual({ street: '', city: '', region: '', landmark: '', instructions: '' });
  };

  const handleSave = async (loc: DeliveryLocation) => {
    if (!allowSave || !onSave) return;
    setSaving(true);
    try {
      await onSave(loc);
    } finally {
      setSaving(false);
    }
  };

  const accentRing = accent === 'emerald' ? 'focus:border-emerald-500/70' : 'focus:border-rose-500/70';
  const accentText = accent === 'emerald' ? 'text-emerald-600' : 'text-rose-600';

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ms-1 mb-1.5" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Search className={cn("absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none")} />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "w-full bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 p-4 ps-11 pe-10 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none transition-all",
            accentRing
          )}
        />
        {value && query === value.address && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear location"
            className="absolute end-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {hint && <p className="text-[10px] text-gray-400 font-medium mt-1 ms-1">{hint}</p>}

      {geoError && (
        <p className="text-[11px] text-rose-500 font-bold mt-1.5 ms-1 flex items-start gap-1.5">
          <span className="mt-0.5">{'•'}</span>
          <span>{geoError}</span>
        </p>
      )}

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 overflow-hidden animate-scale-in">
          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 flex items-center gap-2 text-xs font-bold text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('address.searching')}
              </div>
            )}

            {allowCurrentLocation && (
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoBusy}
                className="w-full px-4 py-3 flex items-center gap-3 text-start hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", "bg-emerald-100 dark:bg-emerald-950/40", accentText)}>
                  <Navigation className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black text-gray-900 dark:text-white">
                    {geoBusy ? t('address.gettingLocation') : t('address.useCurrent')}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-medium">{t('address.gpsDesc')}</span>
                </span>
              </button>
            )}

            {!loading && !manualMode && options.length === 0 && query.trim().length >= 2 && (
              <div className="px-4 py-3 text-xs font-bold text-gray-400">
                {searchError || t('address.noMatches')}
              </div>
            )}

            {!loading && !manualMode && options.map((o, i) => (
              <button
                key={`${o.tag}-${o.loc.address}`}
                type="button"
                onClick={() => select(o.loc)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "w-full px-4 py-2.5 flex items-center gap-3 text-start transition-colors",
                  i === highlight ? "bg-emerald-50/70 dark:bg-emerald-950/30" : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
                )}
              >
                <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", i === highlight ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-gray-100 dark:bg-slate-800", accentText)}>
                  <MapPin className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-gray-900 dark:text-white truncate">{o.loc.address}</span>
                  <span className="block text-[10px] text-gray-400 font-medium capitalize">
                    {[o.loc.area, o.loc.city, o.loc.region].filter(Boolean).join(' · ') || o.tag}
                  </span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-600">{o.tag}</span>
              </button>
            ))}

            {!loading && !manualMode && (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="w-full px-4 py-3 flex items-center gap-3 text-start border-t border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <span>
                  <span className="block text-xs font-black text-gray-900 dark:text-white">{t('address.manual')}</span>
                  <span className="block text-[10px] text-gray-400 font-medium">{t('address.manualDesc')}</span>
                </span>
              </button>
            )}

            {!loading && manualMode && (
              <div className="p-4 space-y-3 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('address.manual')}</p>
                  <button type="button" onClick={() => setManualMode(false)} aria-label="Close manual entry" className="text-gray-400 hover:text-gray-600">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={manual.street}
                  onChange={(e) => setManual({ ...manual, street: e.target.value })}
                  placeholder={t('address.streetArea')}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={manual.city}
                    onChange={(e) => setManual({ ...manual, city: e.target.value })}
                    placeholder={t('address.city')}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={manual.region}
                    onChange={(e) => setManual({ ...manual, region: e.target.value })}
                    placeholder={t('address.region')}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <input
                  type="text"
                  value={manual.landmark}
                  onChange={(e) => setManual({ ...manual, landmark: e.target.value })}
                  placeholder={t('address.landmark')}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
                />
                <textarea
                  value={manual.instructions}
                  onChange={(e) => setManual({ ...manual, instructions: e.target.value })}
                  placeholder={t('address.directions')}
                  rows={2}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 resize-none"
                />
                <button
                  type="button"
                  onClick={submitManual}
                  disabled={!manual.street.trim()}
                  className="w-full rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-[11px] uppercase tracking-widest py-3 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <CornerDownLeft className="w-3.5 h-3.5 rtl:-scale-x-100" /> {t('address.useThis')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {allowSave && value && (
        <button
          type="button"
          onClick={() => handleSave(value)}
          disabled={saving}
          className="mt-2 text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3 transition-transform rtl:rotate-180" />}
          {saving ? t('common.loading') : t('address.saveThis')}
        </button>
      )}
    </div>
  );
}
