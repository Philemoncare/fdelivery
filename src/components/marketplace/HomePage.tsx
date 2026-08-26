import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '@/src/lib/utils';
import {
  Store,
  Bike,
  ShieldCheck,
  ArrowRight,
  Clock,
  Heart,
  Star,
  MapPin,
  Zap,
  ChefHat,
  UtensilsCrossed,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react';
import type { Product, Vendor } from '@/src/types';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function cuisineLabel(vendor: Vendor): string {
  return (vendor.category || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' • ');
}

/* ------------------------------------------------------------------ */
/* Restaurant card                                                     */
/* ------------------------------------------------------------------ */

const RestaurantCard: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
  const navigate = useNavigate();
  const { setSelectedVendor, formatPrice, toggleFavoriteVendor, isFavoriteVendor, t } = useApp();
  const fav = isFavoriteVendor(vendor.id);

  return (
    <div
      onClick={() => {
        setSelectedVendor(vendor);
        navigate(`/vendors/${vendor.id}`);
      }}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col"
    >
      <div className="relative h-40 shrink-0 overflow-hidden">
        {vendor.banner || vendor.logo ? (
          <img
            src={vendor.banner || vendor.logo}
            alt={vendor.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
            <Store className="w-8 h-8 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />

        <div className="absolute top-3 start-3 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-gray-100">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-[11px] font-black text-slate-900 dark:text-white">{(vendor.rating || 0).toFixed(1)}</span>
        </div>

        {vendor.isOpen !== false && (
          <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            {t('landing.availableNow')}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteVendor(vendor);
          }}
          className={cn(
            'absolute top-3 end-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-gray-100 shadow-sm transition-all active:scale-90',
            fav
              ? 'bg-rose-500 text-white'
              : 'bg-white/90 dark:bg-slate-900/80 text-gray-400 hover:text-rose-500'
          )}
        >
          <Heart className={cn('w-4 h-4', fav && 'fill-current')} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors leading-tight">
            {vendor.name}
          </h3>
          {vendor.logo && (
            <img src={vendor.logo} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0" />
          )}
        </div>

        <p className="text-[11px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1">
          <ChefHat className="w-3 h-3 shrink-0" />
          <span className="truncate">{cuisineLabel(vendor) || vendor.category}</span>
        </p>

        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 min-w-0">
          <MapPin className="w-3 h-3 shrink-0 text-emerald-500" />
          <span className="truncate">{vendor.address || 'Takoradi'}</span>
        </p>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
           <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
             <Clock className="w-3.5 h-3.5 text-emerald-500" />
             {vendor.deliveryTime || t('landing.fastDelivery')}
           </div>
           <div className="text-[11px] font-black text-slate-900 dark:text-white">
             {t('landing.deliveryFrom', { price: formatPrice(vendor.deliveryFee || 0) })}
           </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero section                                                        */
/* ------------------------------------------------------------------ */

function HeroSection() {
  const navigate = useNavigate();
  const { t } = useApp();

  return (
    <section className="relative overflow-hidden bg-white dark:bg-slate-950 pt-20 pb-12 sm:pt-24 lg:pt-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h1 className="font-heading font-black tracking-tight leading-[1.02] text-[clamp(44px,5vw,68px)]">
            <span className="text-slate-900 dark:text-white block">Your Favourite Food.</span>
            <span className="text-emerald-500 block">Delivered Fast.</span>
          </h1>

          <p className="text-[18px] md:text-[20px] leading-[1.5] text-slate-600 dark:text-slate-400 font-medium">
            Discover Takoradi's best local restaurants and get your favourite meals delivered straight to your door.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/food')}
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-base font-black shadow-xl shadow-emerald-500/25 transition-all active:scale-[0.98]"
            >
              Order Food →
            </button>
            <button
              onClick={() => navigate('/vendors')}
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 hover:border-emerald-500 text-slate-900 dark:text-white text-base font-black transition-all"
            >
              Explore Restaurants
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Popular meals card                                                  */
/* ------------------------------------------------------------------ */

const MealCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart, setSelectedProduct, formatPrice, t } = useApp();

  return (
    <div
      onClick={() => {
        setSelectedProduct(product);
        navigate(`/product/${product.id}`);
      }}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col"
    >
      <div className="relative h-44 shrink-0 overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors leading-tight line-clamp-1">
          {product.title}
        </h3>
        <p className="text-[11px] text-gray-500 font-semibold mt-1">
          {product.vendorName}
        </p>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-black text-emerald-600">
            {formatPrice(product.price)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const HomePage: React.FC = () => {
  const { vendors, products, categories, isLoading, t } = useApp();
  const featuredVendors = Array.isArray(vendors) ? vendors.slice(0, 6) : [];
  const popularMeals = Array.isArray(products) ? products.slice(0, 6) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <HeroSection />

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Top Categories</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
          {Array.isArray(categories) && categories.map(cat => (
            <div key={cat.id} className="shrink-0 w-24 text-center space-y-2">
              <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-slate-800 overflow-hidden">
                 {cat.image && <img src={cat.image} className="w-full h-full object-cover" />}
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{cat.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Featured Restaurants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredVendors.map(vendor => vendor && (
            <RestaurantCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </section>

      {/* Popular Meals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Popular Meals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularMeals.map(product => product && (
            <MealCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};
