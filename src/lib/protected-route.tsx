import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth/auth-store';
import { Role, resolvePostAuthenticationRoute } from './auth/types';
import { LoadingScreen } from '@/src/components/ui/loading-screen';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen label="Checking permissions..." />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const dashboard = resolvePostAuthenticationRoute(user);
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}
