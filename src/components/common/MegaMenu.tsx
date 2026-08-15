import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ChevronRight, ArrowRight, Star } from 'lucide-react';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { setSearchCategory, vendors, categories, t } = useApp();

  if (!isOpen) return null;

  const handleCategoryClick = (catName: string) => {
    setSearchCategory(catName);
    navigate('/products');
    onClose();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-2xl relative z-30 transition-all animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1 & 2: Main Categories */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('mega.foodCategories')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="flex items-center space-x-3 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition cursor-pointer group"
                >
                  <img src={cat.image} alt={cat.name} className="w-12 h-12 object-cover rounded-xl shadow-sm" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 transition">
                      {cat.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{cat.count} {t('mega.mealsAvailable')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Featured Vendors */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('mega.topRestaurants')}
            </h3>
            <div className="space-y-2">
              {vendors.slice(0, 4).map((vendor) => (
                <div
                  key={vendor.id}
                  onClick={() => {
                    navigate(`/vendors/${vendor.id}`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition"
                >
                  <div className="flex items-center space-x-3">
                    <img src={vendor.logo} alt={vendor.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">
                        {vendor.name}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-emerald-600" /> {vendor.rating} ({vendor.totalReviews})
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: Deal Callout Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wide inline-block mb-3">
                {t('mega.exclusiveOffer')}
              </span>
              <h4 className="font-heading font-bold text-lg leading-tight mb-2">
                {t('mega.offerTitle')}
              </h4>
              <p className="text-xs text-emerald-100 opacity-90 mb-4">
                {t('mega.offerDesc')}
              </p>
            </div>

            <button
              onClick={() => {
                navigate('/deals');
                onClose();
              }}
              className="relative z-10 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow"
            >
              <span>{t('mega.exploreDeals')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
