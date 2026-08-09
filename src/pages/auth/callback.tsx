import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth/auth-store';
import { LoadingScreen } from '@/src/components/ui/loading-screen';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSessions } = useAuth();

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

        // Store tokens temporarily so the next API call (me) can use them
        localStorage.setItem('om_auth_tokens', JSON.stringify(tokens));

        try {
          // Trigger a session refresh in the store
          // In a real implementation, the store would watch localStorage or we would call a 'completeSocialLogin' method
          window.location.href = '/'; // Simple way to force app re-init and session validation
        } catch (err) {
          navigate('/login?error=Authentication failed', { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [location, navigate, refreshSessions]);

  return <LoadingScreen label="Completing authentication..." />;
}
