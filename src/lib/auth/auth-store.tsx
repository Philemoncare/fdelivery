// ============================================================
// OmniMarket Auth — Auth Store (Context Provider)
// Multi-session: one isolated session per role (customer, vendor,
// rider, administrator, super-administrator). Logging into one
// portal never affects another.
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { AuthTokens, Portal, Role, SessionInfo, UserProfile, Permission, DecodedToken } from './types';
import { ROLE_PERMISSIONS, ROLE_PORTALS } from './types';
import { AuthApiService } from '@/src/services/auth-api';
import { logAudit, getDeviceInfo, getClientIp, generateCsrfToken } from './security';
import { saveTabTokens, saveActiveRole, roleFromPath, readActiveRole } from './token-scope';

// JWT helper for local state
function decodeToken(token: string): DecodedToken | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const body = parts[1];
    const json = decodeURIComponent(escape(atob(body.replace(/-/g, '+').replace(/_/g, '/'))));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp * 1000 < Date.now();
}

interface RoleSession {
  tokens: AuthTokens;
  user: UserProfile;
  /** False when the user did NOT tick "Remember me" — session stays per-tab and is not restored after a browser restart. */
  persist?: boolean;
}

// Resolve the intended role from the current URL so a page refresh right away
// loads the right session without depending on prior navigation.
// NOTE: uses the shared complete roleFromPath from token-scope (handles all
// portals incl. /customer, /restaurant) so a hard refresh never loses the session.

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  portal: Portal | null;
  sessionExpired: boolean;
  csrfToken: string;
}

interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string, portal: Portal, remember?: boolean) => Promise<{ success: boolean; error?: string; requires2FA?: boolean; requiresOtp?: boolean; user?: UserProfile }>;
  loginWithGoogle: (intent?: string) => void;
  loginWithApple: (intent?: string) => void;
  completeSocialLogin: (tokens: AuthTokens, persist?: boolean) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  loginWithOtp: (identifier: string, code: string, portal: Portal) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  sendLoginOtp: (identifier: string, channel: 'email' | 'phone') => Promise<{ success: boolean; error?: string }>;
  logout: (sessionExpired?: boolean) => void;
  register: (payload: Record<string, unknown>, role: Role) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  completePasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  clearSessionExpired: () => void;
  sessions: SessionInfo[];
  refreshSessions: () => void;
  revokeSessionById: (sessionId: string) => void;
  hasRole: (roles: Role[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  vendorId: string | null;
  restaurantId: string | null;
  riderId: string | null;
  isVendor: boolean;
  isRider: boolean;
  isCustomer: boolean;
  isAdmin: boolean;
  // Multi-session helpers
  activateRole: (role: Role) => void;
  getSession: (role: Role) => RoleSession | undefined;
  hasSession: (role: Role) => boolean;
  updateUser: (patch: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Session persistence per role so different portals never overwrite each other.
const SESSION_PREFIX = 'om_session_';
const sessionKey = (role: Role) => `${SESSION_PREFIX}${role}`;

function loadAllSessions(): Partial<Record<Role, RoleSession>> {
  const map: Partial<Record<Role, RoleSession>> = {};
  (Object.keys(localStorage)).forEach(key => {
    if (!key.startsWith(SESSION_PREFIX)) return;
    const role = key.slice(SESSION_PREFIX.length) as Role;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tokens && parsed.user) map[role] = parsed;
    } catch { /* ignore malformed */ }
  });
  return map;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionMap, setSessionMap] = useState<Partial<Record<Role, RoleSession>>>(() => loadAllSessions());
  // Resolve the intended role from the URL first; on the public marketplace
  // landing path (/) fall back to the role that is actively signed in so a
  // customer who lands on the home hero still sees their authenticated shell.
  const [activeRole, setActiveRole] = useState<Role | null>(() => roleFromPath(window.location.pathname) ?? readActiveRole());
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [csrfToken] = useState(() => generateCsrfToken());
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  const active = activeRole ? sessionMap[activeRole] : null;
  const tokens = active?.tokens ?? null;
  const user = active?.user ?? null;

  const portalOf = useCallback((role: Role): Portal => {
    return ROLE_PORTALS[role];
  }, []);

  const persistSession = useCallback((role: Role, s: RoleSession) => {
    // persist defaults to true (remembered session). Non-remembered sessions
    // only live in this tab (memory + sessionStorage tab token) — never written
    // to localStorage, so a browser restart signs the user out.
    if (s.persist !== false) {
      localStorage.setItem(sessionKey(role), JSON.stringify(s));
    } else {
      try { localStorage.removeItem(sessionKey(role)); } catch { /* ignore */ }
    }
    saveTabTokens(role, s.tokens);
    saveActiveRole(role, s.persist !== false);
    setSessionMap(prev => ({ ...prev, [role]: s }));
  }, []);

  const removeSession = useCallback((role: Role) => {
    localStorage.removeItem(sessionKey(role));
    saveTabTokens(role, null);
    setSessionMap(prev => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  }, []);

  const activateRole = useCallback((role: Role) => {
    setActiveRole(prev => (prev === role ? prev : role));
  }, []);

  // Merge profile edits into the active session's user so the header/nav reflect
  // name and avatar changes immediately (persisted for the active role tab).
  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    if (!activeRole || !active?.user) return;
    const next = { ...active.user, ...patch };
    persistSession(activeRole, { tokens: active.tokens, user: next, persist: active.persist !== false });
  }, [activeRole, active, persistSession]);

  const refreshSessions = useCallback(async () => {
    if (active?.user) {
      try {
        const s = await AuthApiService.getSessions(active.user.id);
        setSessions(s);
      } catch {
        setSessions([]);
      }
    } else {
      setSessions([]);
    }
  }, [active]);

  // Log out only the ACTIVE role's session so other roles stay signed in.
  const logout = useCallback((expired = false) => {
    if (activeRole && user) {
      logAudit({ actorId: user.id, action: expired ? 'session_expired' : 'logout', resourceType: 'auth' });
      // Terminate the real server session + audit (fire-and-forget; idempotent).
      try { AuthApiService.logout(); } catch { /* offline logout still works */ }
      removeSession(activeRole);
    }
    setActiveRole(null);
    if (expired) setSessionExpired(true);
  }, [activeRole, user, removeSession]);

  // On mount, validate the session for the active role ONCE.
  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      const initialRole = roleFromPath(window.location.pathname) ?? readActiveRole();
      const session = initialRole ? sessionMap[initialRole] : null;
      if (!session) {
        if (mounted) {
          setActiveRole(initialRole);
          setIsLoading(false);
        }
        return;
      }

      try {
        let currentTokens = session.tokens;
        if (isTokenExpired(session.tokens.accessToken)) {
          currentTokens = await AuthApiService.refreshToken(session.tokens.refreshToken);
        }

        const freshUser = await AuthApiService.me();
        if (mounted) {
          persistSession(initialRole!, { tokens: currentTokens, user: freshUser, persist: session.persist !== false });
          setActiveRole(initialRole);
        }
      } catch {
        if (mounted) {
          removeSession(initialRole!);
          setActiveRole(null);
          setSessionExpired(true);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    validate();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh the ACTIVE session's token when nearing expiry.
  useEffect(() => {
    if (!tokens || !user || !activeRole) return;

    const interval = setInterval(async () => {
      if (isTokenExpired(tokens.accessToken)) {
        try {
          const newTokens = await AuthApiService.refreshToken(tokens.refreshToken);
          persistSession(activeRole, { tokens: newTokens, user, persist: active.persist !== false });
        } catch {
          logout(true);
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tokens, user, activeRole, persistSession, logout, active]);

  // Mirror the ACTIVE role's token to the request key the API layer reads.
  // We ONLY ever write it here; we deliberately DO NOT remove it on logout,
  // because many tabs share this key and deleting it would nuke the session
  // another tab just established (the cross-tab "bounce back to login" bug).
  // Per-tab correctness is handled by saveTabTokens() in token-scope.ts.
  useEffect(() => {
    if (tokens && activeRole) {
      try {
        localStorage.setItem('om_auth_tokens', JSON.stringify(tokens));
        sessionStorage.setItem(`om_tab_active_${activeRole}`, '1');
      } catch { /* ignore */ }
    }
  }, [tokens, activeRole]);

  const login = useCallback(async (identifier: string, password: string, p: Portal, remember?: boolean) => {
    try {
      const result = await AuthApiService.login({ identifier, password, portal: p, remember });
      // Server-gated OTP step: credentials are valid, a code was emailed, and we
      // must surface the second factor to the UI before any tokens are issued.
      if (result.requiresOtp) {
        return { success: true, requires2FA: true, requiresOtp: true };
      }
      if (!result.success || !result.user || !result.tokens) {
        logAudit({ actorId: 'anonymous', action: 'login_failed', resourceType: 'auth', details: { identifier, portal: p } });
        return { success: false, error: result.error || 'Login failed.' };
      }

      const role = result.user.role as Role;
      persistSession(role, { tokens: result.tokens, user: result.user, persist: remember !== false });
      setActiveRole(role);
      setSessionExpired(false);
      refreshSessions();
      logAudit({ actorId: result.user.id, action: 'login_success', resourceType: 'auth', details: { portal: p, role, remember: !!remember } });
      return { success: true, requires2FA: !!result.requires2FA, user: result.user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [persistSession, refreshSessions]);

  const loginWithGoogle = useCallback((intent?: string) => {
    AuthApiService.loginWithGoogle(intent);
  }, []);

  const loginWithApple = useCallback((intent?: string) => {
    AuthApiService.loginWithApple(intent);
  }, []);

  const completeSocialLogin = useCallback(async (tokens: AuthTokens, persist = true) => {
    try {
      const freshUser = await AuthApiService.me(tokens);
      const role = freshUser.role as Role;
      persistSession(role, { tokens, user: freshUser, persist });
      setActiveRole(role);
      setSessionExpired(false);
      refreshSessions();
      return { success: true, user: freshUser };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not complete sign-in.' };
    }
  }, [persistSession, refreshSessions]);

  const sendLoginOtp = useCallback(async (identifier: string, channel: 'email' | 'phone') => {
    try {
      const result = await AuthApiService.sendOtp(identifier, channel);
      return { success: result.success };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const loginWithOtp = useCallback(async (identifier: string, code: string, p: Portal) => {
    try {
      const result = await AuthApiService.verifyOtp(identifier, code, p);
      if (!result.success || !result.user || !result.tokens) {
        return { success: false, error: result.error || 'Login failed.' };
      }
      const role = result.user.role as Role;
      persistSession(role, { tokens: result.tokens, user: result.user, persist: true });
      setActiveRole(role);
      setSessionExpired(false);
      refreshSessions();
      return { success: true, user: result.user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [persistSession, refreshSessions]);

  const refresh = useCallback(async () => {
    if (!activeRole || !active) return false;
    if (!isTokenExpired(active.tokens.accessToken)) return true;
    try {
      const newTokens = await AuthApiService.refreshToken(active.tokens.refreshToken);
      persistSession(activeRole, { tokens: newTokens, user: active.user, persist: active.persist !== false });
      return true;
    } catch {
      removeSession(activeRole);
      setActiveRole(null);
      setSessionExpired(true);
      return false;
    }
  }, [activeRole, active, persistSession, removeSession]);

  const register = useCallback(async (payload: Record<string, unknown>, role: Role) => {
    try {
      const result = await AuthApiService.register({ ...payload, role });
      if (result.success && result.user && result.tokens) {
        const r = result.user.role as Role;
        persistSession(r, { tokens: result.tokens, user: result.user });
        setActiveRole(r);
        return { success: true, user: result.user };
      }
      return { success: result.success, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [persistSession]);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const result = await AuthApiService.requestPasswordReset(email);
      return { success: result.success, error: result.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const completePasswordReset = useCallback(async (email: string, code: string, newPassword: string) => {
    try {
      const result = await AuthApiService.completePasswordReset({ email, code, newPassword });
      return { success: result.success, error: result.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const result = await AuthApiService.changePassword({ currentPassword, newPassword });
      if (result.success) {
        // After changing password, update the user locally to clear mustChangePassword
        updateUser({ mustChangePassword: false });
      }
      return { success: result.success, error: result.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [updateUser]);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const revokeSessionById = useCallback(async (sessionId: string) => {
    if (!user) return;
    try {
      await AuthApiService.revokeSession(user.id, sessionId);
      refreshSessions();
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  }, [user, refreshSessions]);

  const hasRole = useCallback((roles: Role[]) => {
    return !!user && roles.includes(user.role);
  }, [user]);

  const hasPermission = useCallback((permission: Permission) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
  }, [user]);

  const vendorId = useMemo(() => user?.vendorId || null, [user]);
  const restaurantId = useMemo(() => user?.restaurantId || user?.vendorId || null, [user]);
  const riderId = useMemo(() => user?.riderId || null, [user]);

  const isVendor = useMemo(() => user?.role === 'vendor' || user?.role === 'store-manager' || user?.role === 'vendor-staff', [user]);
  const isRider = useMemo(() => user?.role === 'rider', [user]);
  const isCustomer = useMemo(() => user?.role === 'customer', [user]);
  const isAdmin = useMemo(() => user?.role === 'administrator' || user?.role === 'super-administrator', [user]);

  const getSession = useCallback((role: Role) => sessionMap[role], [sessionMap]);
  const hasSession = useCallback((role: Role) => !!sessionMap[role], [sessionMap]);

  const portal = useMemo(() => (user ? portalOf(user.role) : null), [user, portalOf]);

  const value: AuthContextValue = useMemo(() => ({
    user, tokens, isAuthenticated: !!user && !!tokens, isLoading, portal, sessionExpired, csrfToken,
    login, loginWithGoogle, loginWithApple, completeSocialLogin, loginWithOtp, sendLoginOtp, logout, register,
    requestPasswordReset, completePasswordReset, changePassword, refresh, clearSessionExpired,
    sessions, refreshSessions, revokeSessionById, hasRole, hasPermission,
    vendorId, restaurantId, riderId,
    isVendor, isRider, isCustomer, isAdmin,
    activateRole, getSession, hasSession, updateUser,
  }), [
    user, tokens, isLoading, portal, sessionExpired, csrfToken,
    login, loginWithGoogle, loginWithApple, completeSocialLogin, loginWithOtp, sendLoginOtp, logout, register,
    requestPasswordReset, completePasswordReset, changePassword, refresh, clearSessionExpired,
    sessions, refreshSessions, revokeSessionById, hasRole, hasPermission,
    vendorId, restaurantId, riderId,
    isVendor, isRider, isCustomer, isAdmin,
    activateRole, getSession, hasSession, updateUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useDeviceId(): string {
  return getDeviceInfo().deviceId;
}

export function useClientIp(): string {
  return getClientIp();
}
