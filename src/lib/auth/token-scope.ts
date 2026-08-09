// ============================================================
// OmniMarket Auth — Token Scoping
// Solves cross-tab token clobbering: every tab keeps its OWN
// usable token (per role, in sessionStorage). The legacy single
// `om_auth_tokens` localStorage key is never deleted anymore, so
// one tab's logout/login cannot wipe another tab's session.
// ============================================================

import type { AuthTokens, Role } from './types';

export const ACTIVE_ROLE_LOCALSTORAGE_KEY = 'om_last_active_role';
const TAB_TOKEN_PREFIX = 'omtab_token_';
const ACTIVE_ROLE_KEY = 'omtab_active_role';

const ALL_ROLES: Role[] = [
  'customer', 'vendor', 'vendor-staff', 'store-manager',
  'rider', 'administrator', 'super-administrator',
];

function isValidRole(r: string | null): r is Role {
  return !!r && ALL_ROLES.includes(r as Role);
}

/** Map a URL path to the role session it belongs to. */
export function roleFromPath(pathname: string): Role | null {
  if (pathname.startsWith('/super-admin')) return 'super-administrator';
  if (pathname.startsWith('/admin')) return 'administrator';
  if (pathname.startsWith('/rider')) return 'rider';
  if (pathname.startsWith('/restaurant') || pathname.startsWith('/vendor')) return 'vendor';
  if (pathname.startsWith('/customer')) return 'customer';
  return null;
}

/**
 * Write the token THIS tab should use for a given role into
 * sessionStorage (per-tab). Passing null removes this tab's copy.
 */
export function saveTabTokens(role: Role | null, tokens: AuthTokens | null): void {
  try {
    if (!role) return;
    const key = TAB_TOKEN_PREFIX + role;
    if (tokens && tokens.accessToken) {
      sessionStorage.setItem(key, JSON.stringify(tokens));
    } else {
      sessionStorage.removeItem(key);
    }
  } catch { /* private mode / quota: ignore */ }
}

/** The token THIS tab has for a role — scoped and isolated per tab. */
export function readTabTokens(role: Role | null): AuthTokens | null {
  if (!role) return null;
  try {
    const raw = sessionStorage.getItem(TAB_TOKEN_PREFIX + role);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.accessToken) return parsed;
    }
  } catch { /* ignore malformed */ }
  return null;
}

/** Remember which role is currently active in this tab. */
export function saveActiveRole(role: Role | null, persistent = true): void {
  try {
    if (role) {
      sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
      if (persistent) {
        try { localStorage.setItem(ACTIVE_ROLE_LOCALSTORAGE_KEY, role); } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem(ACTIVE_ROLE_LOCALSTORAGE_KEY); } catch { /* ignore */ }
      }
    } else {
      sessionStorage.removeItem(ACTIVE_ROLE_KEY);
    }
  } catch { /* ignore */ }
}

export function readActiveRole(): Role | null {
  try {
    const s = sessionStorage.getItem(ACTIVE_ROLE_KEY);
    if (isValidRole(s)) return s;
    const l = localStorage.getItem(ACTIVE_ROLE_LOCALSTORAGE_KEY);
    if (isValidRole(l)) return l;
  } catch { /* ignore */ }
  return null;
}

/**
 * Read tokens for a page strictly from the per-tab + per-role store,
 * WITHOUT touching the old shared key — the source of cross-tab bugs.
 */
export function readTokensForRequest(role: Role | null): AuthTokens | null {
  if (!role) return null;
  const tab = readTabTokens(role);
  if (tab) return tab;
  // Fallback: the persisted per-role session (created by login "remember me").
  try {
    const raw = localStorage.getItem(`om_session_${role}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tokens && parsed.tokens.accessToken) return parsed.tokens;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Grab whatever token this tab should present to the API for the
 * current URL. Layered: path role -> tab scope -> persisted session.
 */
export function readRequestTokens(): AuthTokens | null {
  const byPath = roleFromPath(window.location.pathname);
  if (byPath) {
    const t = readTokensForRequest(byPath);
    if (t) return t;
  }
  const active = readActiveRole();
  if (active) {
    const t = readTokensForRequest(active);
    if (t) return t;
  }
  return null;
}