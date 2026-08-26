import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { NewsletterService } from '@/src/services/api';
import { useApp } from '@/src/context/AppContext';
import omniLogo from '@/assets/omni-logo.png';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'submitting') return;
    setStatus('submitting');
    try {
      await NewsletterService.subscribe(email.trim());
      setEmail('');
      setStatus('done');
      setTimeout(() => setStatus('idle'), 4000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 mb-12 shadow-2xl flex flex-col lg:row items-center justify-between gap-6">
          <div className="space-y-1 text-center lg:text-start">
            <h3 className="text-xl font-heading font-bold text-white flex items-center gap-2 justify-center lg:justify-start">
              <span>{t('footer.subscribeTitle')}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {t('footer.subscribeDesc')}
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('settings.email')}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white ps-9 pe-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button type="submit" disabled={status === 'submitting'} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
              <span>{status === 'submitting' ? t('footer.joining') : t('footer.joinFree')}</span>
              {status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : status === 'error' ? <AlertCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* 5-Column Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 text-xs">
          
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')} className="flex items-center gap-2 group" aria-label="OmniMarket">
                <img
                  src={omniLogo}
                  alt="OmniMarket"
                  className="object-contain w-auto h-9 sm:h-10 transition-transform group-hover:scale-105"
                />
              </button>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              {t('footer.brandDesc')}
            </p>
            <div className="space-y-1.5 text-slate-400">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Market Circle, Takoradi, Western Region, Ghana
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> +233 24 000 0001
              </p>
            </div>
          </div>

          {/* Col 2: Customer Pages */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">{t('footer.colMarketplace')}</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => navigate('/')} className="hover:text-emerald-400">{t('nav.home')}</button></li>
              <li><button onClick={() => navigate('/products')} className="hover:text-emerald-400">{t('footer.allMeals')}</button></li>
              <li><button onClick={() => navigate('/vendors')} className="hover:text-emerald-400">{t('footer.featuredRestaurants')}</button></li>
              <li><button onClick={() => navigate('/deals')} className="hover:text-emerald-400">{t('footer.deals')}</button></li>
              <li><button onClick={() => navigate('/track-order')} className="hover:text-emerald-400">{t('footer.trackOrder')}</button></li>
            </ul>
          </div>

          {/* Col 3: Ecosystem Partners */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">{t('footer.colPartners')}</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => navigate('/become-vendor')} className="hover:text-emerald-400">{t('auth.register.vendor')}</button></li>
              <li><button onClick={() => navigate('/become-rider')} className="hover:text-emerald-400">{t('auth.register.rider')}</button></li>
              <li><button onClick={() => navigate('/how-delivery-works')} className="hover:text-emerald-400">{t('auth.register.customer')}</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-emerald-400">{t('nav.login')}</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-emerald-400">{t('auth.createAccount')}</button></li>
            </ul>
          </div>

          {/* Col 4: Support & Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">{t('footer.colCompany')}</h4>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => navigate('/about')} className="hover:text-emerald-400">{t('footer.about')}</button></li>
              <li><button onClick={() => navigate('/faq')} className="hover:text-emerald-400">{t('footer.helpFaq')}</button></li>
              <li><button onClick={() => navigate('/blog')} className="hover:text-emerald-400">{t('footer.blog')}</button></li>
              <li><button onClick={() => navigate('/careers')} className="hover:text-emerald-400">{t('footer.careers')}</button></li>
              <li><button onClick={() => navigate('/contact')} className="hover:text-emerald-400">{t('footer.contact')}</button></li>
              <li><button onClick={() => navigate('/terms')} className="hover:text-emerald-400">{t('footer.terms')}</button></li>
              <li><button onClick={() => navigate('/privacy')} className="hover:text-emerald-400">{t('footer.privacy')}</button></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Payment icons */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 {t('footer.copyright')}</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-medium">MTN MoMo / Telecel Cash</span>
            <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-medium">Visa / Mastercard</span>
            <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-medium">{t('common.paymentCash')}</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
