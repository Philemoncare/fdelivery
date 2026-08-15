import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Store, ShieldCheck, UtensilsCrossed, CheckCircle2, ArrowRight, ChefHat, Bike } from 'lucide-react';

export const BecomeVendorPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, t } = useApp();
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('Local Dishes');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast('Restaurant Application Submitted!', 'Our onboarding team will review your food license within 24 hours.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
          <ChefHat className="w-4 h-4" />
          <span>Restaurant Partner Program</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white">
          {t('partner.vendor.title')}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
          {t('partner.vendor.subtitle')}
        </p>
      </div>

      {submitted ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-emerald-500/30 text-center space-y-4 shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('partner.vendor.successTitle')}</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {t('partner.vendor.successDesc')}
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow hover:bg-emerald-600 transition"
          >
            {t('auth.createAccount')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-3 border-gray-100 dark:border-slate-800">
            {t('partner.vendor.formTitle')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">{t('partner.vendor.restaurantName')}</label>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. Takoradi Central Kitchen"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">{t('partner.vendor.cuisineType')}</label>
                <select
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                >
                  <option value="Local Dishes">{t('auth.register.customer')}</option>
                  <option value="Continental">Continental</option>
                  <option value="Fast Food">Fast Food</option>
                  <option value="Pastries & Bakery">Bakery & Pastries</option>
                  <option value="Drinks & Smoothies">Drinks & Smoothies</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">{t('partner.vendor.location')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Market Circle, Fijai, Anaji..."
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold block mb-1 text-gray-700 dark:text-gray-300">{t('partner.vendor.contact')}</label>
              <input
                type="tel"
                required
                placeholder="e.g. +233 24 XXX XXXX"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-4 rounded-xl transition shadow-xl shadow-emerald-500/20"
            >
              {t('partner.vendor.submit')}
            </button>
          </form>
        </div>
      )}

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {[
          { title: 'More Customers', desc: 'Reach thousands of hungry customers in Takoradi daily.', icon: UtensilsCrossed },
          { title: 'Reliable Riders', desc: 'Our dispatch network handles all your deliveries.', icon: Bike },
          { title: 'Weekly Payouts', desc: 'Get your earnings sent directly to your MoMo or Bank.', icon: ShieldCheck },
        ].map((benefit, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-2 text-center">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <benefit.icon className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{benefit.title}</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{benefit.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
};
