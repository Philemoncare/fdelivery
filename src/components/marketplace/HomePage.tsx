import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { FoodCard } from '../common/FoodCard';
import { cn } from '@/src/lib/utils';
import {
  Store,
  Bike,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
  Clock,
  Heart,
  Eye,
  Star,
  MapPin,
  ChevronRight,
  Flame
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    products,
    vendors,
    riders,
    categories,
    setSelectedProduct,
    setSelectedVendor,
    addToCart,
    formatPrice,
    setQuickViewProduct,
    toggleWishlist,
    isInWishlist,
    t
  } = useApp();

  // Flash Sale Countdown Timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const flashSaleProducts = products.filter((p) => p.isFlashSale && p.status === 'active');

  return (
    <div className="space-y-16 pb-16">

      {/* HERO — bright, lightweight (no dark panel, no stats, no floating cards) */}
      <section className="relative overflow-hidden rounded-3xl mx-4 sm:mx-6 lg:mx-8 mt-4 border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Soft ambient wash */}
        <div className="absolute -top-24 -start-24 w-72 h-72 rounded-full bg-emerald-100/70 dark:bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -end-24 w-72 h-72 rounded-full bg-amber-100/70 dark:bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: copy */}
          <div className="text-center lg:text-start space-y-5">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Flame className="w-3.5 h-3.5" />
              {t('home.heroTitle')}
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight leading-tight text-gray-900 dark:text-white">
              {t('home.heroTitle')}, {' '}
              <span className="text-emerald-600 dark:text-emerald-400">{t('home.heroSubtitle')}</span>
              {' '} {t('header.takoradiExpress')}
            </h1>

            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t('home.heroDesc')}
            </p>

            <div className="pt-1">
              <button
                onClick={() => navigate('/products')}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                {t('home.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/vendors')}
                className="ms-3 inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-200 font-semibold text-sm px-1 py-3.5 transition cursor-pointer"
              >
                {t('nav.restaurants')}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center lg:justify-start gap-5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.8 rated kitchens
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-500" /> ~12 min avg delivery
              </span>
            </div>
          </div>

          {/* Right: Premium Food Display */}
          <div className="relative h-[400px] sm:h-[500px] w-full hidden sm:block">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative h-full w-full">
              {products.slice(0, 3).map((p, i) => {
                const positions = [
                  "top-0 left-10 z-20 scale-100",
                  "bottom-10 right-0 z-30 scale-110",
                  "top-20 right-10 z-10 scale-90 opacity-60 rotate-6"
                ];

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 40, rotate: i === 2 ? 6 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                    whileHover={{ y: -10, scale: i === 1 ? 1.12 : 1.02, transition: { duration: 0.2 } }}
                    onClick={() => {
                      setSelectedProduct(p);
                      navigate(`/product/${p.id}`);
                    }}
                    className={cn(
                      "absolute w-64 rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden cursor-pointer",
                      positions[i]
                    )}
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          {p.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
                          <Star className="w-3 h-3 fill-current" /> {p.rating || '4.5'}
                        </div>
                      </div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">{p.title}</h3>
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-base font-black text-emerald-600">{formatPrice(p.price)}</p>
                        <div className="w-8 h-8 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Mobile fallback collage (grid) */}
              <div className="sm:hidden grid grid-cols-2 gap-4 mt-8">
                 {products.slice(0, 4).map(p => (
                   <div key={p.id} className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl">
                      <img src={p.images[0]} className="w-full aspect-square object-cover" alt="" />
                      <div className="p-3">
                         <p className="text-[10px] font-black text-gray-900 dark:text-white truncate">{p.title}</p>
                         <p className="text-xs font-black text-emerald-600">{formatPrice(p.price)}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* FLYING FOOD RIBBON — a marquee of real dishes drifting across the page */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14">
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-lg">
          <div className="absolute inset-y-0 start-0 w-16 bg-gradient-to-r from-gray-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 end-0 w-16 bg-gradient-to-l from-gray-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="animate-marquee flex w-max items-center gap-3 py-4">
            {[...products, ...products].map((p, i) => (
              <div
                key={`${p.id}-${i}`}
                onClick={() => {
                  setSelectedProduct(p);
                  navigate(`/product/${p.id}`);
                }}
                className="group flex items-center gap-3 pe-3 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 ps-2 py-1.5 cursor-pointer hover:border-emerald-500/50 hover:shadow-xl transition-all shrink-0 animate-tilt-hover"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                  <img src={p.images?.[0] || undefined} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="pe-1">
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white whitespace-nowrap">{p.title}</p>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CATEGORIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-gray-900 dark:text-white">
              {t('home.categories')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('home.viewAll')}</p>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>{t('home.viewAll')} ({categories.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                navigate('/products');
              }}
              className="group bg-white dark:bg-slate-900 rounded-3xl p-4 border border-gray-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-xl transition-all text-center cursor-pointer flex flex-col items-center justify-between"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                <img src={cat.image || undefined} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition line-clamp-1">
                {cat.name}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1">{cat.count}+ Dishes</p>
            </div>
          ))}
        </div>
      </section>


      {/* FLASH SALES SECTION WITH COUNTDOWN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 p-0.5 rounded-3xl shadow-xl">
          <div className="bg-white dark:bg-slate-900 rounded-[23px] p-6 sm:p-8">
            
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-heading font-black text-gray-900 dark:text-white">
                    {t('home.deals')}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('deliver.speedExpress')}</p>
                </div>

              {/* Countdown timer blocks */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">{t('common.eta')}</span>
                <div className="bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl border border-slate-700">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </div>
                <span className="text-slate-400 font-bold">:</span>
                <div className="bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl border border-slate-700">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </div>
                <span className="text-slate-400 font-bold">:</span>
                <div className="bg-rose-600 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl shadow">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </div>
              </div>
            </div>

            {/* Flash sale products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {flashSaleProducts.map((product, idx) => (
                <FoodCard key={product.id} product={product} />
              ))}
            </div>

          </div>
        </div>
      </section>


      {/* CERTIFIED VENDORS SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-gray-900 dark:text-white">
              {t('home.featuredRestaurants')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('vendorListing.subtitle')}</p>
          </div>
          <button
            onClick={() => navigate('/vendors')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>{t('home.viewAll')} ({vendors.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vendors.slice(0, 3).map((vendor) => (
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

                <div className="absolute top-3 right-3">
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-lg border border-white/20 dark:border-white/5 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-[11px] font-black text-slate-900 dark:text-white">{(vendor.rating || 0).toFixed(1)}</span>
                  </div>
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
                      {vendor.name} <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
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
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" /> {vendor.deliveryTime || '30 min'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase font-black text-slate-400 tracking-widest mb-0.5">{t('common.minOrder')}</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">{formatPrice(vendor.minOrder || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* DISPATCH RIDERS SPOTLIGHT & SELECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-8 text-white border border-slate-800 shadow-2xl">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                <Bike className="w-4 h-4 text-blue-400" />
                <span>{t('header.takoradiExpress')}</span>
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-white">
                {t('deliver.letDispatchMatch')}
              </h2>
              <p className="text-xs text-slate-300">
                {t('deliver.fastestRider')}
              </p>
            </div>

            <button
              onClick={() => navigate('/become-rider')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow cursor-pointer self-start md:self-auto"
            >
              <Bike className="w-4 h-4 rtl:-scale-x-100" />
              <span>{t('deliver.book')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {riders.map((rider) => {
              return (
                <div
                  key={rider.id}
                  className="p-5 rounded-3xl border border-slate-700 bg-slate-800/40 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <img src={rider.avatar} alt={rider.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-600" />
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {rider.name} <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">{rider.vehicleType}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="text-amber-400 font-bold"><Star className="w-3 h-3 fill-amber-400 inline" /> {rider.rating}</span>
                        <span>| {rider.totalDeliveries} Deliveries</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/60">
                    <div className="flex justify-between">
                      <span>Proximity:</span>
                      <span className="font-bold text-white">Active in Takoradi</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg. Delivery:</span>
                      <span className="font-bold text-emerald-400">12-25 Mins</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>


      {/* SEND SOMETHING — PARCEL & RIDER BOOKING */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 end-0 w-64 h-64 bg-white/10 rounded-full -me-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 start-0 w-64 h-64 bg-rose-400/20 rounded-full -ms-32 -mb-32 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-1.5 bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Bike className="w-3.5 h-3.5" /> {t('deliver.title')}
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-black leading-tight">
                {t('deliver.subtitle')}
              </h2>
              <p className="text-orange-50 text-sm md:text-base max-w-lg leading-relaxed">
                {t('deliver.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/customer/deliver')}
                  className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-8 py-4 rounded-2xl transition shadow-xl flex items-center gap-2"
                >
                  <Bike className="w-5 h-5" /> {t('deliver.book')}
                </button>
                <span className="inline-flex items-center gap-2 text-orange-100 text-sm font-bold">
                  <b className="bg-white/20 px-3 py-1.5 rounded-xl">{t('common.from')} {''}</b>
                  <span>GHS 13</span>
                </span>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-3 gap-4">
              {[
                { icon: Bike, label: 'Ride-Hailing Riders', desc: 'Same-day couriers across Takoradi' },
                { icon: Clock, label: '45-Min Average', desc: 'Fast doorstep-to-doorstep delivery' },
                { icon: Star, label: 'Top-Rated Fleet', desc: 'Verified, tracked, and insured riders' },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center">
                  <item.icon className="w-6 h-6 mx-auto mb-2 text-white" />
                  <h4 className="font-bold text-sm mb-1">{item.label}</h4>
                  <p className="text-[11px] text-orange-100">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* BECOME A PARTNER SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 end-0 w-64 h-64 bg-white/10 rounded-full -me-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 start-0 w-64 h-64 bg-emerald-400/20 rounded-full -ms-32 -mb-32 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-heading font-black leading-tight">
                {t('vendorListing.partnerAction')}
              </h2>
              <p className="text-emerald-50 text-sm md:text-base max-w-lg leading-relaxed">
                {t('vendorListing.subtitle')}
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/become-vendor')}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-8 py-4 rounded-2xl transition shadow-xl flex items-center gap-2"
                >
                  {t('vendorListing.partnerAction')} <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/how-delivery-works')}
                  className="bg-emerald-700/50 hover:bg-emerald-700 text-white border border-emerald-400/30 font-bold px-8 py-4 rounded-2xl transition"
                >
                  {t('home.viewAll')}
                </button>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { title: 'No Setup Fee', desc: 'Register your kitchen for free and start selling.' },
                { title: 'Wide Reach', desc: 'Get seen by thousands of hungry foodies daily.' },
                { title: 'Express Riders', desc: 'We provide the fastest riders in Takoradi.' },
                { title: 'Analytics', desc: 'Track your sales and customer growth live.' },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl">
                  <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                  <p className="text-[11px] text-emerald-100">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-8">
        <h2 className="text-2xl font-heading font-extrabold text-gray-900 dark:text-white mb-2">
          {t('support.faq')}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10">
          {t('support.subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 text-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg">
              01
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('header.browse')} & {t('auth.register.customer')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('deliver.pickupDestinationDesc')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 text-start">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg">
              02
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('deliver.chooseRider')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('deliver.fastestRider')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 text-start">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg">
              03
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('common.track')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('deliver.noActiveDesc')}</p>
          </div>
        </div>
      </section>

    </div>
  );
};
