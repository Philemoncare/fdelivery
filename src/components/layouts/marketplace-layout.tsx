import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { ScrollToTop } from '@/src/components/common/ScrollToTop';
import { ContextualHeader } from '@/src/components/common/ContextualHeader';
import { ContextualFooter } from '@/src/components/common/ContextualFooter';
import { MegaMenu } from '@/src/components/common/MegaMenu';
import { CartDrawer } from '@/src/components/common/CartDrawer';
import { QuickViewModal } from '@/src/components/common/QuickViewModal';
import { ToastNotification } from '@/src/components/common/ToastNotification';
import { CookieConsent } from '@/src/components/common/CookieConsent';
import { MobileBottomNav } from '@/src/components/common/MobileBottomNav';
import { getFooterMode, getHeaderMode } from '@/src/lib/header-modes';
import { useApp } from '@/src/context/AppContext';
import { applyTheme } from '@/src/lib/theme';

export function MarketplaceShell() {
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const location = useLocation();
  const { themeKey } = useApp();
  const mode = getHeaderMode(location.pathname);
  const footerMode = getFooterMode(location.pathname, mode);

  const isMarketplaceMode = mode === 'marketplace';
  // Transaction-focused flows should not be interrupted by marketplace chrome.
  const showMobileNav = mode !== 'checkout' && mode !== 'payment';

  // The consumer marketplace is a white/green experience. Fix the accent to
  // the brand green while this shell is mounted, and restore the user's chosen
  // theme on leave so their preference is never lost.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = 'emerald';
    return () => {
      applyTheme(themeKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn(
      'min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 selection:bg-emerald-500 selection:text-white',
      showMobileNav ? 'pb-20 lg:pb-0' : 'pb-8'
    )}>
      <ScrollToTop />
      <div className="sticky top-0 z-40">
        <ContextualHeader
          mode={mode}
          onToggleMegaMenu={() => setMegaMenuOpen(!megaMenuOpen)}
          isMegaMenuOpen={megaMenuOpen}
        />
        {isMarketplaceMode && <MegaMenu isOpen={megaMenuOpen} onClose={() => setMegaMenuOpen(false)} />}
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
      <ContextualFooter mode={footerMode} />
      <CartDrawer />
      <QuickViewModal />
      <ToastNotification />
      <CookieConsent />
      {showMobileNav && <MobileBottomNav />}
    </div>
  );
}