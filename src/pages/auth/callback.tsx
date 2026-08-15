import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth/auth-store';
import { resolvePostLoginRoute } from '@/src/lib/auth/types';
import { LoadingScreen } from '@/src/components/ui/loading-screen';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeSocialLogin } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');
      const error = params.get('error');

      if (error) {
        navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
        return;
      }

      if (accessToken && refreshToken) {
        const tokens = {
          accessToken,
          refreshToken,
          expiresIn: 3600,
          tokenType: 'Bearer' as const
        };

        const result = await completeSocialLogin(tokens);
        if (result.success && result.user) {
          navigate(resolvePostLoginRoute(result.user), { replace: true });
        } else {
          navigate(`/login?error=${encodeURIComponent(result.error || 'Authentication failed')}`, { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [location, navigate, completeSocialLogin]);

  return <LoadingScreen label="Completing authentication..." />;
}
