import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '@/src/components/common/ScrollToTop';
import { PortalAccessBar } from '@/src/components/common/PortalAccessBar';
import { HeaderNavbar } from '@/src/components/common/HeaderNavbar';
import { MegaMenu } from '@/src/components/common/MegaMenu';
import { Footer } from '@/src/components/common/Footer';
import { CartDrawer } from '@/src/components/common/CartDrawer';
import { QuickViewModal } from '@/src/components/common/QuickViewModal';
import { ToastNotification } from '@/src/components/common/ToastNotification';
import { CookieConsent } from '@/src/components/common/CookieConsent';
import { MobileBottomNav } from '@/src/components/common/MobileBottomNav';

export function MarketplaceShell() {
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);

  return (
<div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 selection:bg-emerald-500 selection:text-white pb-20 lg:pb-0">
      <ScrollToTop />
      <div className="sticky top-0 z-40">
        <PortalAccessBar />
        <HeaderNavbar
          onToggleMegaMenu={() => setMegaMenuOpen(!megaMenuOpen)}
          isMegaMenuOpen={megaMenuOpen}
        />
        <MegaMenu isOpen={megaMenuOpen} onClose={() => setMegaMenuOpen(false)} />
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <CartDrawer />
      <QuickViewModal />
      <ToastNotification />
      <CookieConsent />
      <MobileBottomNav />
    </div>
  );
}
