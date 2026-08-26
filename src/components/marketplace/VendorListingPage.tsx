import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Store, ShieldCheck, Clock, MapPin, Search, ChevronRight, Star } from 'lucide-react';
import { getVendorOperationalStatus } from '../../lib/vendor-utils';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { AnimatedTooltip } from '../ui/animated-tooltip';

export const VendorListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { vendors, setSelectedVendor, formatPrice, categories, t } = useApp();
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [vendorSearch, setVendorSearch] = useState<string>('');

  const filteredVendors = vendors.filter((v) => {
    if (selectedCat !== 'All' && v.category !== selectedCat) return false;
    if (vendorSearch && !v.name?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">
            {t('vendorListing.titleFirst')} <span className="text-emerald-500">{t('vendorListing.titleSecond')}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-lg font-medium">{t('vendorListing.subtitle')}</p>
        </div>

        <button
          onClick={() => navigate('/become-vendor')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] px-8 py-4 rounded-2xl transition shadow-xl shadow-emerald-500/20 cursor-pointer self-start md:self-auto uppercase tracking-widest active:scale-95"
        >
          {t('vendorListing.partnerAction')}
        </button>
      </div>

      {/* Search & Category filter */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder={t('header.search')}
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-800 border-none text-xs font-bold text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none px-1">
          <button
            onClick={() => setSelectedCat('All')}
            className={cn("px-5 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest",
              selectedCat === 'All'
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                : "bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-700")}>
            {t('common.all')}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.name)}
              className={cn("px-5 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest",
                selectedCat === c.name
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-700")}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-gray-300">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('vendorListing.noResultsTitle')}</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{t('vendorListing.noResultsText')}</p>
          </div>
          <button
            onClick={() => { setSelectedCat('All'); setVendorSearch(''); }}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition"
          >
            {t('common.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => {
              setSelectedVendor(vendor);
              navigate(`/vendors/${vendor.id}`);
            }}
            className="group bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl transition-all cursor-pointer flex flex-col h-full"
          >
            <div className="h-44 relative shrink-0 overflow-hidden">
              {vendor.banner || vendor.logo ? (
                <img
                  src={vendor.banner || vendor.logo}
                  alt={vendor.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

              <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                <AnimatedTooltip
                  variant="cora"
                  placement="bottom"
                  content="Rating based on customer reviews and completed orders."
                  triggerClassName="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-lg border border-white/20 dark:border-white/5 flex items-center gap-1"
                >
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-[11px] font-black text-slate-900 dark:text-white">{(vendor.rating || 0).toFixed(1)}</span>
                </AnimatedTooltip>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                {vendor.logo && (
                  <img
                    src={vendor.logo}
                    alt={vendor.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-xl bg-white shrink-0"
                  />
                )}
                <div className="min-w-0 pb-0.5">
                  <h3 className="text-base font-black text-white flex items-center gap-1 group-hover:text-emerald-400 transition truncate tracking-tight">
                    {vendor.name}
                    <AnimatedTooltip
                      variant="dori"
                      placement="bottom"
                      content="This restaurant has completed the platform's vendor verification process."
                      triggerClassName="inline-flex px-0 py-0"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </AnimatedTooltip>
                  </h3>
                  <p className="text-[9px] text-slate-200 font-bold uppercase tracking-[0.15em] opacity-90">
                    {(vendor.category || '').split(',').slice(0, 2).join(' • ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed font-medium">
                {vendor.description || `Experience authentic flavors and fresh ingredients from ${vendor.name}.`}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-black text-gray-400 tracking-widest mb-0.5">{t('common.delivery')}</span>
                    <AnimatedTooltip
                      variant="dori"
                      placement="top"
                      content="Estimated delivery time based on restaurant preparation and rider availability."
                      triggerClassName="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1 px-0 py-0"
                    >
                      <Clock className="w-3 h-3 text-emerald-500" /> {vendor.deliveryTime || '30 min'}
                    </AnimatedTooltip>
                  </div>
                  <div className="flex flex-col border-l border-gray-100 dark:border-slate-800 pl-4">
                    <span className="text-[8px] uppercase font-black text-gray-400 tracking-widest mb-0.5">{t('common.distance')}</span>
                    <AnimatedTooltip
                      variant="cora"
                      placement="top"
                      content="Approximate distance between you and this restaurant."
                      triggerClassName="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1 px-0 py-0"
                    >
                      <MapPin className="w-3 h-3 text-emerald-500" /> {vendor.distanceKm || 0.8} km
                    </AnimatedTooltip>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] uppercase font-black text-gray-400 tracking-widest mb-0.5">{t('common.minOrder')}</span>
                  <AnimatedTooltip
                    variant="cora"
                    placement="top"
                    content="Minimum order value required before you can proceed with checkout."
                    triggerClassName="text-xs font-black text-emerald-600 px-0 py-0"
                  >
                    {formatPrice(vendor.minOrder || 0)}
                  </AnimatedTooltip>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

    </div>
  );
};
