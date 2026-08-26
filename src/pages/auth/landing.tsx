import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';
import {
  Globe,
  MapPin,
  Truck,
  CreditCard,
  Users,
  ShieldCheck,
  Camera,
  Pallet,
  Box,
  Folder,
  Menu,
  Layout,
  Heart,
  Signal,
  Zap,
  Eye,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currency, setCurrency, language, setLanguage, t, formatPrice } = useApp();

  // If already authenticated, redirect based on role
  useEffect(() => {
    if (user) {
      const role = user.role;
      if (role === 'customer') navigate('/customer');
      if (role === 'vendor') navigate('/restaurant');
      if (role === 'rider') navigate('/rider');
      if (role === 'admin') navigate('/admin');
      if (role === 'super-administrator') navigate('/super-admin');
    }
  }, [user, navigate]);

  const ctaText = t('landing.ctaGetStarted');
  const exploreText = t('landing.exploreOmniMarket');
  const becomeVendorText = t('landing.becomeVendor');
  const becomeRiderText = t('landing.becomeRider');
  const takoradiText = t('landing.takoradi');
  const howItWorksText = t('landing.howItWorks');
  const trustText = t('landing.trust');
  const securePayments = t('landing.securePayments');
  const verifiedPartners = t('landing.verifiedPartners');
  const orderTracking = t('landing.orderTracking');
  const foodText = t('landing.food');
  const goodsText = t('landing.goods');
  const deliveryText = t('landing.delivery');

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.02L12 2z" />
              </svg>
            </div>
            <span className="block font-black text-slate-900 dark:text-white text-xl tracking-tight">OmniMarket</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all" aria-label="Language">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest" id="lang-display">{t('nav.language')}</span>
              <ChevronDown className="w-2 h-2 transition-transform rotate-180" />
            </button>
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all" aria-label="Country">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 1H5a2 2 0 00-2 2v18a2 2 0 002 2h14a2 2 0 002-2V2a2 2 0 00-2-2zm-2 4c-.55 0-1 .45-1 1s.45 1 1 1h2.3l3.5 3.5c.39.39 1.02.39 1.41 0L17 5c.55-.55.59-1.46-.1-1.9l-2.3-2.3c-.66-.66-1.72-.66-2.38 0L7.3 11.7c-.66.66-.66 1.72 0 2.38l2.3 2.3c.39.39 1.02.39 1.41 0l6.37-6.37c.39-.39.39-1.02 0-1.41L11 3z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest" id="country-display">{t('landing.takoradi')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <section className="pt-20 pb-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-4">
              <span className="text-slate-900 dark:text-white block">{t('landing.heroTitle1')}</span>
              <span className="text-emerald-600 block">{t('landing.heroTitle2')}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              {t('landing.heroDesc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register/customer')}
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black shadow-lg shadow-emerald-600/25 transition-all"
              >
                {t('landing.ctaGetStarted')}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 hover:border-emerald-500 text-slate-900 dark:text-white text-base font-black transition-all"
              >
                {t('landing.exploreOmniMarket')}
              </button>
            </div>
          </div>
        </section>

        <section className="pb-12 border-y border-gray-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="font-black text-2xl tracking-tight mb-3">{foodText}</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.foodDesc')}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span>{t('landing.availableInTakoradi')}</span>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="font-black text-2xl tracking-tight mb-3">{goodsText}</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.goodsDesc')}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-3 h-3 text-emerald-500" />
                <span>{t('landing.deliveryAvailable')}</span>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="font-black text-2xl tracking-tight mb-3">{deliveryText}</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.deliveryDesc')}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Signal className="w-3 h-3 text-emerald-500" />
                <span>{t('landing.realTimeTracking')}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="font-black text-2xl tracking-tight mb-3">Business</h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t('landing.becomeVendorDesc')}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-3 h-3 text-emerald-500" />
              <span>{t('launchBecomeAVendor')}</span>
            </div>
          </div>
        </section>

        <section className="pb-12">
          <h2 className="font-black text-2xl tracking-tight mb-4">{howItWorksText}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg tracking-tight mb-2">{t('landing.step1Title')}</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.step1Desc')}
              </p>
            </div>
            <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg tracking-tight mb-2">{t('landing.step2Title')}</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.step2Desc')}
              </p>
            </div>
            <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg tracking-tight mb-2">{t('landing.step3Title')}</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.step3Desc')}
              </p>
            </div>
            <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg tracking-tight mb-2">{t('landing.step4Title')}</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.step4Desc')}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-12 border-y border-gray-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h2 className="font-black text-2xl tracking-tight mb-3">{t('landing.forBusiness')}</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.becomeVendorDesc')}
              </p>
              <button
                onClick={() => navigate('/register/vendor')}
                className="mt-4 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all"
              >
                {becomeVendorText} →
              </button>
            </div>
            <div>
              <h2 className="font-black text-2xl tracking-tight mb-3">For Riders</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.becomeRiderDesc')}
              </p>
              <button
                onClick={() => navigate('/register/rider')}
                className="mt-4 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all"
              >
                {becomeRiderText} →
              </button>
            </div>
            <div>
              <h2 className="font-black text-2xl tracking-tight mb-3">{takoradiText}</h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                {t('landing.localDelivery')}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-12 border-y border-gray-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-black text-lg tracking-tight mb-2">{securePayments}</h3>
              <p className="text-slate-600 dark:text-slate-400 small">
                {t('landing.securePaymentsDesc')}
              </p>
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight mb-2">{verifiedPartners}</h3>
              <p className="text-slate-600 dark:text-slate-400 small">
                {t('landing.verifiedPartnersDesc')}
              </p>
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight mb-2">{orderTracking}</h3>
              <p className="text-slate-600 dark:text-slate-400 small">
                {t('landing.orderTrackingDesc')}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-black text-lg tracking-tight mb-4">OmniMarket</h4>
              <p className="text-slate-600 dark:text-slate-400">
                {t('landing.everythingYouNeed')}
              </p>
              <div className="mt-4 text-sm">
                <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition-colors">{t('footer.terms')}</a>
                <span className="ml-2 text-slate-600 dark:text-slate-400">|</span>
                <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition-colors">{t('footer.privacy')}</a>
              </div>
            </div>
            <div>
              <h4 className="font-black text-lg tracking-tight mb-4">Quick Links</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
                <li><a href="#how-it-works" className="hover:text-emerald-500 transition-colors">{t('landing.howItWorks')}</a></li>
                <li><a href="#business" className="hover:text-emerald-500 transition-colors">{t('landing.forBusiness')}</a></li>
                <li><a href="#rider" className="hover:text-emerald-500 transition-colors">{t('landing.forRiders')}</a></li>
                <li><a href="/register/customer" className="hover:text-emerald-500 transition-colors">{t('landing.ctaGetStarted')}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between align-center text-slate-500 dark:text-slate-400 text-xs">
            <span>{t('common.allRightsReserved')}</span>
            <span>{t('footer.brandDesc')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}