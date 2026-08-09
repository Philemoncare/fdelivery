import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Scroll to top of window on route change
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
};
