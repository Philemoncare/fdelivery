// ============================================================
// OmniMarket Auth — Middleware
// Enterprise-grade route protection:
//  - JWT verification (with auto-refresh)
//  - Session validation
//  - User status checks (active, approved, verified)
//  - Role / permission authorization
//  - Portal isolation
// ============================================================

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-store';
import type { AppModule, Portal, Role } from './types';
import { MODULE_LOGIN, ROLE_DASHBOARDS, ROLE_MODULES, isAdminRole, resolvePostLoginRoute } from './types';
import { ForbiddenPage } from '@/src/pages/errors/ForbiddenPage';
import { LoadingScreen } from '@/src/components/ui/loading-screen';

interface AuthGuardProps {
  children: ReactNode;
  portal?: Portal;
  module?: AppModule;
  roles?: Role[];
}

/**
 * Primary middleware: verifies the session for the role this route guards,
 * activates that role's isolated session for the subtree, auto-refreshes
 * expired tokens, and redirects on failure.
 *
 * Portal isolation rules:
 *  - Public apps (customer/vendor/rider) cross-access : redirect to the
 *    user's own dashboard.
 *  - Admin apps (admin/super-admin) are strictly guarded : 403 Forbidden
 *    for any unauthorized role.
 */
export function AuthGuard({ children, portal, module, roles }: AuthGuardProps) {
  const { isLoading, activateRole, getSession, sessionExpired } = useAuth();
  const location = useLocation();

  // Pick the session for this guarded route among the allowed roles so
  // isolated per-role sessions are honored (e.g. a store-manager or
  // super-admin keep their own separate session).
  const roleList = roles && roles.length > 0 ? roles : [];
  const session = roleList.length ? roleList.map(r => getSession(r)).find(s => !!s) : undefined;
  const user = session?.user;
  const targetRole: Role | undefined = user?.role as Role | undefined;

  // Activate this role's isolated session so the whole subtree uses it.
  useEffect(() => {
    if (targetRole) activateRole(targetRole);
  }, [targetRole, activateRole]);

  if (isLoading && !session) {
    return <LoadingScreen label="Verifying session..." />;
  }

  // Session expired or not authenticated for THIS role : redirect to module login.
  // (Logging into another role does not block or break this one.)
  if (!session || !user) {
    const redirectPortal = module ? MODULE_LOGIN[module] : portal === 'admin' ? '/admin/login' : '/login';
    const expired = sessionExpired ? '?expired=1' : '';
    return <Navigate to={`${redirectPortal}${expired}`} replace state={{ from: location.pathname }} />;
  }

  // Portal isolation: admin roles must not use public portal and vice versa.
  // Any unauthorized role is denied with 403 Forbidden.
  const isAdminUser = isAdminRole(user.role);
  if (portal) {
    if (portal === 'admin' && !isAdminUser) {
      return <ForbiddenPage />;
    }
    if (portal === 'public' && isAdminUser) {
      return <ForbiddenPage />;
    }
  }

  // Role authorization: users without the required role receive 403 Forbidden.
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  // FORCE PASSWORD CHANGE logic
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    console.log('[AuthGuard] User must change password, redirecting…');
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}

/**
 * Module guard: blocks access to a module the authenticated user does not
 * belong to, returning 403 Forbidden.
 */
export function ModuleGuard({ children, module }: { children: ReactNode; module: AppModule }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={MODULE_LOGIN[module]} replace />;
  if (ROLE_MODULES[user.role] !== module) {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
}

/**
 * Role middleware: narrows access to specific roles.
 */
export function RoleGuard({ children, roles }: { children: ReactNode; roles: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
}

/**
 * Redirects authenticated users away from auth pages (login/register).
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen label="Loading..." />;

  if (isAuthenticated && user) {
    const destination = resolvePostLoginRoute(user);
    console.log(`[PublicOnlyRoute] Authenticated as ${user.role}, redirecting to ${destination}`);
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}

/**
 * Ensures a route is only reachable through the admin portal.
 */
export function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/admin/login" replace />;
  if (!isAdminRole(user.role)) return <ForbiddenPage />;
  return <>{children}</>;
}

/**
 * Session expiry notification handler — renders a banner if session expired.
 */
export function SessionExpiredNotice() {
  const { sessionExpired, clearSessionExpired } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionExpired) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        clearSessionExpired();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sessionExpired, clearSessionExpired]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] animate-slide-up">
      <div className="bg-amber-50 dark:bg-amber-900/80 border border-amber-200 dark:border-amber-700 rounded-xl shadow-lg px-5 py-3 text-sm flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">Session expired</p>
          <p className="text-xs text-amber-700 dark:text-amber-300">Please sign in again to continue.</p>
        </div>
      </div>
    </div>
  );
}