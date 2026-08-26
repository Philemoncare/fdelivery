import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, X, ChevronDown, Star, Clock, MapPin,
  UtensilsCrossed, ArrowRight, Store, ShieldCheck, Heart,
  RotateCcw, SlidersHorizontal, ShoppingBag
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';
import type { Vendor } from '@/src/types';

/* ------------------------------------------------------------------ */
/* Types & Constants                                                   */
/* ------------------------------------------------------------------ */

interface FilterState {
  category: string;
  priceRange: string[];
  rating: number | null;
  deliveryTime: number | null;
  availability: string[];
}

const PRICE_RANGES = [
  { label: 'Under GH₵50', value: '0-50' },
  { label: 'GH₵50–100', value: '50-100' },
  { label: 'GH₵100–200', value: '100-200' },
  { label: 'GH₵200+', value: '200+' },
];

const RATINGS = [4.0, 4.5, 4.8];
const DELIVERY_TIMES = [30, 45];

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{label}</span>
      <button type="button" onClick={onRemove} className="text-emerald-400 hover:text-emerald-600">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function FilterSelectChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
        selected
          ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-emerald-500/30"
      )}
    >
      {label}
    </button>
  );
}

function RestaurantMarketCard({ vendor, onClick, formatPrice }: { vendor: Vendor; onClick: () => void; formatPrice: (n: number) => string }) {
  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col h-full"
    >
      <div className="h-52 relative shrink-0 overflow-hidden">
        {vendor.banner || vendor.logo ? (
          <img src={vendor.banner || vendor.logo} alt={vendor.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
            <Store className="w-10 h-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />

        <button type="button" className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-lg">
          <Heart className="w-5 h-5" />
        </button>

        {vendor.isOpen === false && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-white/90 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 shadow-2xl">Closed</span>
          </div>
        )}

        <div className="absolute bottom-5 left-5 right-5 flex items-end gap-3">
          <div className="w-14 h-14 rounded-2xl border-2 border-white dark:border-slate-800 bg-white overflow-hidden shadow-2xl shrink-0">
            <img src={vendor.logo || ''} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 pb-1">
            <h3 className="text-xl font-black text-white leading-tight flex items-center gap-1.5 truncate">
              {vendor.name}
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            </h3>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate">
              {(vendor.category || '').split(',').slice(0, 2).join(' • ')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Rating</span>
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{vendor.rating || '4.0'}</span>
                <span className="text-[10px] text-slate-400 font-bold ml-0.5">({vendor.totalReviews || 0})</span>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery</span>
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>{vendor.deliveryTime || '25-35 min'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Fee</span>
            <span className="text-xs font-black text-emerald-600">{formatPrice(vendor.deliveryFee || 0)}</span>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[11px] font-bold text-slate-400 truncate max-w-[140px]">{vendor.address || 'Takoradi'}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 group-hover:text-emerald-500 transition-colors">
            View Menu
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page Component                                                 */
/* ------------------------------------------------------------------ */

export function FoodMarketplacePage() {
  const navigate = useNavigate();
  const { vendors, categories, currentAddressName, setSelectedVendor, formatPrice, t } = useApp();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('Recommended');

  const [filters, setFilters] = useState<FilterState>({
    category: 'All',
    priceRange: [],
    rating: null,
    deliveryTime: null,
    availability: [],
  });

  /* ---------- Logic ---------- */

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'All') count++;
    count += filters.priceRange.length;
    if (filters.rating) count++;
    if (filters.deliveryTime) count++;
    count += filters.availability.length;
    return count;
  }, [filters]);

  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    return vendors.filter(v => {
      if (v.role && v.role !== 'vendor') return false;
      if (search && !(v.name || '').toLowerCase().includes(search.toLowerCase()) && !(v.category || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.category !== 'All' && !v.category?.toLowerCase().includes(filters.category.toLowerCase())) return false;
      if (filters.rating && (v.rating || 0) < filters.rating) return false;
      if (filters.deliveryTime) {
        const mins = parseInt(v.deliveryTime || '60', 10);
        if (mins > filters.deliveryTime) return false;
      }
      if (filters.priceRange.length > 0) {
        const matches = filters.priceRange.some(range => {
          if (range === '0-50') return (v.minOrder || 0) <= 50;
          if (range === '50-100') return (v.minOrder || 0) > 50 && (v.minOrder || 0) <= 100;
          if (range === '100-200') return (v.minOrder || 0) > 100 && (v.minOrder || 0) <= 200;
          if (range === '200+') return (v.minOrder || 0) > 200;
          return false;
        });
        if (!matches) return false;
      }
      if (filters.availability.includes('Open now') && v.isOpen === false) return false;
      return true;
    }).sort((a, b) => {
      if (sort === 'Highest Rated') return (b.rating || 0) - (a.rating || 0);
      if (sort === 'Fastest Delivery') return parseInt(a.deliveryTime || '60', 10) - parseInt(b.deliveryTime || '60', 10);
      if (sort === 'Lowest Delivery Fee') return (a.deliveryFee || 0) - (b.deliveryFee || 0);
      return 0;
    });
  }, [vendors, search, filters, sort]);

  const togglePriceRange = (range: string) => {
    setFilters(prev => ({
      ...prev,
      priceRange: prev.priceRange.includes(range) ? prev.priceRange.filter(r => r !== range) : [...prev.priceRange, range]
    }));
  };

  const clearAllFilters = () => {
    setFilters({ category: 'All', priceRange: [], rating: null, deliveryTime: null, availability: [] });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">

      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-[72px] lg:top-[124px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Find great food near you</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">Discover the best restaurants delivering across Takoradi.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/customer/addresses')}
                className="hidden md:flex flex-col items-end gap-1 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-500 transition-colors">Deliver To</span>
                </div>
                <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-none">
                  {currentAddressName || 'Set delivery location'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search restaurants, meals, or cuisines..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-12 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl pl-11 pr-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  "flex items-center gap-2 h-12 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
                  activeFiltersCount > 0
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-500/50"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && <span className="bg-white text-emerald-600 w-5 h-5 rounded-full flex items-center justify-center ml-1">{activeFiltersCount}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">

        {/* Categories Carousel */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Popular Categories</h2>
          <div className="flex items-stretch gap-3 overflow-x-auto pb-4 scrollbar-none -mx-1 px-1">
            <button
              type="button"
              onClick={() => setFilters(p => ({ ...p, category: 'All' }))}
              className={cn(
                "shrink-0 px-6 py-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 min-w-[100px]",
                filters.category === 'All'
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-emerald-500/40"
              )}
            >
              <UtensilsCrossed className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">All</span>
            </button>
            {Array.isArray(categories) && categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilters(p => ({ ...p, category: c.name }))}
                className={cn(
                  "shrink-0 p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 min-w-[100px] overflow-hidden group",
                  filters.category === c.name
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-emerald-500/40"
                )}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800 shrink-0">
                  {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <ShoppingBag className="w-4 h-4 m-auto mt-3" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest truncate w-full text-center">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.category !== 'All' && (
              <FilterChip label={filters.category} onRemove={() => setFilters(p => ({ ...p, category: 'All' }))} />
            )}
            {filters.priceRange.map(r => (
              <FilterChip key={r} label={PRICE_RANGES.find(x => x.value === r)?.label || r} onRemove={() => togglePriceRange(r)} />
            ))}
            {filters.rating && (
              <FilterChip label={`${filters.rating}+ Stars`} onRemove={() => setFilters(p => ({ ...p, rating: null }))} />
            )}
            {filters.deliveryTime && (
              <FilterChip label={`Under ${filters.deliveryTime} min`} onRemove={() => setFilters(p => ({ ...p, deliveryTime: null }))} />
            )}
            {filters.availability.map(a => (
              <FilterChip key={a} label={a} onRemove={() => setFilters(p => ({ ...p, availability: p.availability.filter(x => x !== a) }))} />
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results Info */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Restaurants near you</h2>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{filteredVendors.length} restaurants available</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/10 cursor-pointer shadow-sm"
              >
                <option>Recommended</option>
                <option>Highest Rated</option>
                <option>Fastest Delivery</option>
                <option>Lowest Delivery Fee</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVendors.map((vendor, i) => vendor && (
              <div key={vendor.id}>
                <RestaurantMarketCard
                  vendor={vendor}
                  onClick={() => { setSelectedVendor(vendor); navigate(`/vendors/${vendor.id}`); }}
                  formatPrice={formatPrice}
                />
              </div>
            ))}
        </div>

        {/* Empty State */}
        {filteredVendors.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-6">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No restaurants found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm font-medium">Try adjusting your filters or search terms to find what you're looking for.</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset all filters
            </button>
          </div>
        )}
      </main>

      {/* Filter Side Drawer */}
      {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <div
              onClick={() => setIsFilterOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <div
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Filters</h3>
                </div>
                <button type="button" onClick={() => setIsFilterOpen(false)} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterSelectChip label="All" selected={filters.category === 'All'} onClick={() => setFilters(p => ({ ...p, category: 'All' }))} />
                    {Array.isArray(categories) && categories.map(c => (
                      <FilterSelectChip key={c.id} label={c.name} selected={filters.category === c.name} onClick={() => setFilters(p => ({ ...p, category: c.name }))} />
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price Range</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRICE_RANGES.map(r => (
                      <FilterSelectChip key={r.value} label={r.label} selected={filters.priceRange.includes(r.value)} onClick={() => togglePriceRange(r.value)} />
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</p>
                  <div className="flex flex-wrap gap-2">
                    {RATINGS.map(r => (
                      <FilterSelectChip key={r} label={`${r}+`} selected={filters.rating === r} onClick={() => setFilters(p => ({ ...p, rating: p.rating === r ? null : r }))} />
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery Time</p>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERY_TIMES.map(t_val => (
                      <FilterSelectChip key={t_val} label={`Under ${t_val} min`} selected={filters.deliveryTime === t_val} onClick={() => setFilters(p => ({ ...p, deliveryTime: p.deliveryTime === t_val ? null : t_val }))} />
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Availability</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterSelectChip label="Open now" selected={filters.availability.includes('Open now')} onClick={() => setFilters(p => ({ ...p, availability: p.availability.includes('Open now') ? [] : ['Open now'] }))} />
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex gap-3">
                <button type="button" onClick={clearAllFilters} className="flex-1 h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all">Reset</button>
                <button type="button" onClick={() => setIsFilterOpen(false)} className="flex-1 h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Show Results</button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
