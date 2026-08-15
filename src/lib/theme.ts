// ============================================================
// OmniMarket Unified Theme Registry
// ------------------------------------------------------------
// ONE role-scoped theme system driving the entire portal visual
// layer. There is a single 6-state cycle (Light → Dark →
// OmniMarket → Ocean → Emerald → Amber) and ONE persisted key
// (`om_theme`). Each state is a complete theme with its own
// surfaces, text, borders and accent, defined via `data-theme`
// on <html> in src/index.css.
//
// Backward compatibility:
//   - `.dark` class is applied for the Dark theme so existing
//     `dark:` Tailwind utilities keep working.
//   - `data-accent` is kept in sync so legacy accent utilities
//     (`bg-primary`, `text-primary`, ...) resolve correctly.
//
// Business logic never reads theme values.
// ============================================================

import type { AccentKey, ThemeKey, ThemeMode, ThemeModePreference } from '@/src/types';

/** Single source of truth for the available themes (Light → Dark → System →
 *  OmniMarket → Ocean → Emerald → Amber). */
export const THEME_ORDER: ThemeKey[] = ['light', 'dark', 'system', 'ocean', 'emerald', 'amber'];

/**
 * The primary direct-cycling sequence used by the header theme control.
 * System is intentionally NOT part of the click-through cycle (it stays
 * reachable in the compact secondary picker only).
 * Click again after Amber → back to Light.
 */
export const THEME_CYCLE: ThemeKey[] = ['light', 'dark', 'ocean', 'emerald', 'amber'];

export interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  /** Whether this theme renders dark surfaces (toggles `.dark` on <html>). */
  dark: boolean;
  /** Accent used by this theme (drives `data-accent` + legacy tokens). */
  accent: AccentKey;
  tagline: string;
  /** Two swatches shown in the compact picker preview. */
  swatch: [string, string];
}

export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  light: {
    key: 'light',
    label: 'Light',
    dark: false,
    accent: 'omnimarket',
    tagline: 'Bright & airy',
    swatch: ['#f4f5f7', '#ffffff'],
  },
  dark: {
    key: 'dark',
    label: 'Dark',
    dark: true,
    accent: 'omnimarket',
    tagline: 'Easy on the eyes',
    swatch: ['#0e1013', '#171a1f'],
  },
  omnimarket: {
    key: 'omnimarket',
    label: 'OmniMarket',
    dark: false,
    accent: 'omnimarket',
    tagline: 'Pink / Magenta',
    swatch: ['#ec4899', '#c026d3'],
  },
  ocean: {
    key: 'ocean',
    label: 'Ocean',
    dark: false,
    accent: 'ocean',
    tagline: 'Electric Blue',
    swatch: ['#0ea5e9', '#2563eb'],
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald',
    dark: false,
    accent: 'emerald',
    tagline: 'Emerald Green',
    swatch: ['#10b981', '#059669'],
  },
  amber: {
    key: 'amber',
    label: 'Amber',
    dark: false,
    accent: 'amber',
    tagline: 'Amber / Gold',
    swatch: ['#f59e0b', '#f97316'],
  },
  system: {
    key: 'system',
    label: 'System',
    dark: false,
    accent: 'omnimarket',
    tagline: 'Follows device',
    swatch: ['#64748b', '#94a3b8'],
  },
};

export const THEME_DEFAULT: ThemeKey = 'system';

const THEME_KEY = 'om_theme';

/** Is `key` one of the known unified themes? */
export function isThemeKey(key: unknown): key is ThemeKey {
  return THEME_ORDER.includes(key as ThemeKey);
}

/**
 * Read the persisted unified theme. Falls back (migrates) from the legacy
 * `om_accent` preference so existing Ocean/Emerald/Amber users keep their
 * look, then follows the OS scheme (`system`) — matching the <html> bootstrap
 * in index.html so there is never a wrong-theme flash on first paint.
 */
export function readThemePreference(): ThemeKey {
  if (typeof window === 'undefined') return 'system';
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved && isThemeKey(saved)) return saved;
  // Legacy migration: a previously chosen accent now maps to a full theme.
  const legacyAccent = window.localStorage.getItem('om_accent');
  if (legacyAccent && (legacyAccent === 'omnimarket' || legacyAccent === 'ocean' || legacyAccent === 'emerald' || legacyAccent === 'amber')) {
    return legacyAccent as ThemeKey;
  }
  return 'system';
}

/**
 * Apply a unified theme to <html>: sets `data-theme`, keeps `data-accent`
 * in sync, toggles `.dark` for the dark theme, and persists under the single
 * `om_theme` key. Also mirrors legacy keys (`om_theme` mode + `om_accent`)
 * so any legacy code path stays consistent. Returns the applied theme.
 */
export function applyTheme(theme: ThemeKey): ThemeKey {
  // `system` resolves to the OS scheme for the DOM layer, while the raw
  // preference is what gets persisted under `om_theme`.
  const resolved = theme === 'system'
    ? (systemTheme() === 'dark' ? THEMES.dark : THEMES.light)
    : (THEMES[theme] || THEMES[THEME_DEFAULT]);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    // Enable the cross-fade transition for the swap, then release it so it
    // never interferes with component-level hover/transform animations.
    root.classList.add('theme-anim');
    root.dataset.theme = resolved.key;
    root.dataset.accent = resolved.accent;
    root.dataset.themeMode = theme;
    root.classList.toggle('dark', resolved.dark);
    window.setTimeout(() => root.classList.remove('theme-anim'), 420);
  }
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable — ignore
  }
  return theme;
}

/** Advance to the next theme in the primary cycle (wrapping, never lands on
 *  `system` — that is only reachable through the compact picker). A theme that
 *  is not part of the cycle (e.g. `system`) starts the sequence at Light. */
export function cycleTheme(current: ThemeKey): ThemeKey {
  const idx = THEME_CYCLE.indexOf(current);
  if (idx === -1) return THEME_CYCLE[0];
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

/**
 * Resolve a unified theme to the effective light/dark mode used by legacy
 * `theme === 'dark'` checks (brand themes are light-rendering).
 */
export function themeToMode(theme: ThemeKey): ThemeMode {
  if (theme === 'system') return systemTheme();
  return (THEMES[theme] || THEMES[THEME_DEFAULT]).dark ? 'dark' : 'light';
}

// -------------------------------------------------------------------
// Legacy helpers retained for backward compatibility. New code should
// use the unified registry above (readThemePreference / applyTheme /
// cycleTheme). These delegate to the unified system.
// -------------------------------------------------------------------

/** @deprecated Use readThemePreference(). Resolve OS colour scheme. */
export function systemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** @deprecated Effective mode for a legacy preference. */
export function effectiveTheme(pref: ThemeModePreference): 'light' | 'dark' {
  if (pref === 'system') return systemTheme();
  return pref;
}

/** @deprecated Read legacy mode preference (light/dark/system). */
export function readThemeModePreference(): ThemeModePreference {
  if (typeof window === 'undefined') return 'system';
  const saved = window.localStorage.getItem('om_theme_mode');
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return 'system';
}

/** @deprecated Use applyTheme(). Apply a legacy mode preference. */
export function applyThemeMode(pref: ThemeModePreference): 'light' | 'dark' {
  const effective = effectiveTheme(pref);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', effective === 'dark');
    document.documentElement.dataset.themeMode = pref;
  }
  try {
    window.localStorage.setItem('om_theme_mode', pref);
  } catch {
    // ignore
  }
  return effective;
}

export interface AccentTheme {
  id: AccentKey;
  label: string;
  swatch: [string, string];
  tagline: string;
}

export const ACCENTS: AccentTheme[] = [
  { id: 'omnimarket', label: 'OmniMarket', tagline: 'Pink / Magenta', swatch: ['#ec4899', '#c026d3'] },
  { id: 'ocean', label: 'Ocean', tagline: 'Electric Blue', swatch: ['#0ea5e9', '#2563eb'] },
  { id: 'emerald', label: 'Emerald', tagline: 'Emerald Green', swatch: ['#10b981', '#059669'] },
  { id: 'amber', label: 'Amber', tagline: 'Amber / Gold', swatch: ['#f59e0b', '#f97316'] },
];

export const ACCENT_DEFAULT: AccentKey = 'omnimarket';

const ACCENT_KEY = 'om_accent';

/** @deprecated Use readThemePreference(). */
export function readAccentPreference(): AccentKey {
  const theme = readThemePreference();
  return THEMES[theme].accent;
}

/** @deprecated Accent is derived from the active theme; this just syncs DOM. */
export function applyAccentTheme(accent: AccentKey) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.accent = accent;
  try {
    window.localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    // storage unavailable — ignore
  }
}
