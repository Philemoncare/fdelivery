import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Store, ShieldCheck, Clock, MapPin, Search, ChevronRight, Star } from 'lucide-react';
import { getVendorOperationalStatus } from '../../lib/vendor-utils';
import { Badge } from '../ui/badge';

export const VendorListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { vendors, setSelectedVendor, formatPrice, categories } = useApp();
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [vendorSearch, setVendorSearch] = useState<string>('');

  const filteredVendors = vendors.filter((v) => {
    if (selectedCat !== 'All' && v.category !== selectedCat) return false;
    if (vendorSearch && !v.name?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold">
            Restaurant Directory
          </h1>
          <p className="text-xs text-slate-300 mt-1">Browse verified restaurants and local kitchens with instant rider dispatch integration.</p>
        </div>

        <button
          onClick={() => navigate('/become-vendor')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow cursor-pointer self-start md:self-auto"
        >
          + Partner Your Restaurant
        </button>
      </div>

      {/* Search & Category filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search restaurants by name or cuisine..."
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCat('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCat === 'All'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Restaurants
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCat === c.name
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => {
              setSelectedVendor(vendor);
              navigate(`/vendors/${vendor.id}`);
            }}
            className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col h-full"
          >
            <div className="h-44 relative shrink-0">
              {vendor.banner || vendor.logo ? (
                <img
                  src={vendor.banner || vendor.logo}
                  alt={vendor.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

              <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" /> {(vendor.rating || 0).toFixed(1)}
                </span>
                {(() => {
                  const status = getVendorOperationalStatus(vendor);
                  return (
                    <Badge
                      variant={status === 'OPEN' ? 'success' : status === 'OPENING_SOON' ? 'warning' : 'danger'}
                      className="text-[7px] px-1.5 py-0.5 font-black uppercase tracking-tighter shadow-md"
                    >
                      {status.replace('_', ' ')}
                    </Badge>
                  );
                })()}
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                {vendor.logo && (
                  <img
                    src={vendor.logo}
                    alt={vendor.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-xl bg-white shrink-0"
                  />
                )}
                <div className="min-w-0 pb-0.5">
                  <h3 className="text-base font-bold text-white flex items-center gap-1 group-hover:text-emerald-400 transition truncate">
                    {vendor.name} <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium truncate uppercase tracking-wide">
                    {(vendor.category || '').split(',').slice(0, 3).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed">
                {vendor.description || `Experience authentic flavors and fresh ingredients from ${vendor.name}.`}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800/50">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" /> {vendor.deliveryTime || '30 min'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" /> {vendor.distanceKm || 0.8} km
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] uppercase font-black text-slate-400 tracking-widest mb-0.5">Min Order</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{formatPrice(vendor.minOrder || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
