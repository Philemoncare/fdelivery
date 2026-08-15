import { useEffect, useRef, useState } from 'react';
import {
  Sun, Moon, Monitor, Waves, Leaf, Flame, Palette, Check, ChevronsUpDown
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { useApp } from '@/src/context/AppContext';
import { THEMES, THEME_ORDER, THEME_CYCLE, type ThemeDefinition } from '@/src/lib/theme';
import type { ThemeKey } from '@/src/types';

const THEME_ICONS: Record<ThemeKey, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
  omnimarket: Palette,
  ocean: Waves,
  emerald: Leaf,
  amber: Flame,
};

const THEME_COLORS: Record<ThemeKey, string> = {
  light: 'text-amber-500',
  dark: 'text-indigo-300',
  system: 'text-slate-400',
  omnimarket: 'text-pink-500',
  ocean: 'text-sky-500',
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
};

/**
 * Unified, role-scoped theme control.
 *
 * Primary interaction: a single click advances the theme directly through the
 * cycle (Light → Dark → Ocean → Emerald → Amber). The icon
 * dynamically represents the active theme. A small caret opens a compact
 * secondary picker for jumping straight to any theme — never required for the
 * normal interaction.
 */
export function ThemeControl() {
  const { themeKey, cycleNextTheme, setThemeKey } = useApp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const def: ThemeDefinition = THEMES[themeKey] || THEMES.light;
  // Primary cycle preview uses the 5-state sequence (System never appears in
  // the click-through title; it is only selectable in the compact picker).
  const currentIdx = THEME_CYCLE.indexOf(def.key);
  const next = THEMES[THEME_CYCLE[(currentIdx + 1) % THEME_CYCLE.length]];
  const ActiveIcon = THEME_ICONS[def.key];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-0.5">
      {/* Primary: direct theme cycling */}
      <button
        onClick={() => cycleNextTheme()}
        aria-label={`Theme: ${def.label}. Activate to switch to ${next.label}`}
        title={`${def.label} — click to switch to ${next.label}`}
        className="btn-ghost p-2 relative rounded-xl focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition group"
      >
        <ActiveIcon className={cn('w-5 h-5 transition-all duration-300 group-hover:scale-110', THEME_COLORS[def.key])} />
      </button>

      {/* Secondary: compact picker (optional, never required) */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Choose a theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Choose a theme"
        className="hidden sm:inline-flex p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <ChevronsUpDown className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true"
            />
            <motion.div
              role="menu"
              aria-label="Themes"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] z-50 rounded-2xl bg-surface dark:bg-slate-900 shadow-2xl border border-line overflow-hidden origin-top-right"
            >
              <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
                <span className="text-xs font-black text-ink dark:text-white">Theme</span>
                <span className="ml-auto text-[10px] text-ink-3 truncate">{def.label} · {def.tagline}</span>
              </div>
              <div className="p-1.5 space-y-0.5">
                {THEME_ORDER.map(key => {
                  const t = THEMES[key];
                  const Icon = THEME_ICONS[key];
                  const active = key === def.key;
                  return (
                    <button
                      key={key}
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => { setThemeKey(key); setOpen(false); }}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                        active ? 'bg-primary-soft text-primary' : 'text-ink-2 dark:text-gray-300 hover:bg-surface-2 dark:hover:bg-slate-800'
                      )}
                    >
                      <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', THEME_COLORS[key])}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-xs font-bold truncate', active ? 'text-primary' : 'text-ink dark:text-white')}>{t.label}</span>
                        <span className="block text-[10px] text-ink-3 truncate">{t.tagline}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
