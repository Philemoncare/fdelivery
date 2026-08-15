import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { FoodCard } from '../common/FoodCard';
import { CardSkeleton } from '../ui/skeleton';
import { cn } from '@/src/lib/utils';
import {
  Search,
  SlidersHorizontal,
  Grid,
  List,
  Star,
  Store,
  ShoppingBag,
  Eye,
  Heart,
  X,
  Check
} from 'lucide-react';

export const ProductListingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    products,
    vendors,
    categories,
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    addToCart,
    formatPrice,
    setSelectedProduct,
    setQuickViewProduct,
    toggleWishlist,
    isInWishlist,
    isLoading,
    t
  } = useApp();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(300);
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('popular');

  // Filter products logic
  let filtered = products.filter((p) => {
    if (searchCategory !== 'All' && p.category !== searchCategory) return false;
    if (selectedVendorId !== 'all' && p.vendorId !== selectedVendorId) return false;
    if (p.price > maxPrice) return false;
    if (p.rating < minRating) return false;
    if (onlyInStock && p.stock <= 0) return false;
    if (
      searchQuery &&
      !p.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.category?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Sorting logic
  if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  if (sortBy === 'newest') filtered.sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">{t('msg.restaurant')} <span className="text-emerald-300">{t('menu.title')}</span></h1>
          <p className="text-sm text-emerald-50 mt-2 max-w-lg font-medium opacity-90">{t('vendorListing.subtitle')}</p>
        </div>
        <div className="relative z-10 flex items-center space-x-2 text-[10px] font-black bg-white/20 px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/20 uppercase tracking-widest">
          <span>{filtered.length} {t('common.mealsFound')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* FILTERS SIDEBAR */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 space-y-6 shadow-sm h-fit">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-500" /> {t('settings.preferences')}
            </h3>
            <button
              onClick={() => {
                setSearchCategory('All');
                setSelectedVendorId('all');
                setMaxPrice(300);
                setMinRating(0);
                setOnlyInStock(false);
                setSearchQuery('');
              }}
              className="text-[11px] text-rose-500 font-semibold hover:underline"
            >
              {t('common.clearFilters')}
            </button>
          </div>

          {/* Search filter input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('common.search')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('product.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('home.categories')}</label>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">{t('common.all')} {t('home.categories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('nav.restaurants')}</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">{t('common.all')} {t('nav.restaurants')}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Max Price Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
              <span>{t('common.maxPrice')}</span>
              <span className="text-emerald-600">{formatPrice(maxPrice)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Rating filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('rev.rating')}</label>
            <div className="flex items-center space-x-2">
              {[0, 4.0, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    minRating === r
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {r === 0 ? t('common.all') : (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-white" /> {r}+
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* In Stock Only Checkbox */}
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <input
              type="checkbox"
              id="stockCheck"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="stockCheck" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {t('common.showAvailable')}
            </label>
          </div>

        </div>

        {/* PRODUCTS LISTING AREA */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls Header: Sort & View Toggle */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{t('common.sortBy')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="popular">{t('common.mostPopular')}</option>
                <option value="price-low">{t('common.priceLowHigh')}</option>
                <option value="price-high">{t('common.priceHighLow')}</option>
                <option value="rating">{t('common.highestRated')}</option>
                <option value="newest">{t('common.newest')}</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'list'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Products Grid / List */}
          {isLoading ? (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}>
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border border-gray-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Search className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('common.noResults')}</h3>
                <p className="text-xs text-gray-500 mt-1">{t('vendorListing.noResultsText')}</p>
              </div>
            </div>
          ) : (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}>
              {filtered.map((product) => (
                <FoodCard key={product.id} product={product} variant={viewMode === 'grid' ? 'grid' : 'list'} />
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
