import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
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
    isInWishlist
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
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-100/70 dark:bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-100/70 dark:bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: copy */}
          <div className="text-center lg:text-left space-y-5">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Flame className="w-3.5 h-3.5" />
              Takoradi Local Food Delivery
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight leading-tight text-gray-900 dark:text-white">
              Your favorite meals,{' '}
              <span className="text-emerald-600 dark:text-emerald-400">delivered fast</span>
              {' '}in Takoradi.
            </h1>

            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Fresh Jollof, Waakye, Fufu and more from trusted local kitchens — brought to your door by a vetted dispatch rider.
            </p>

            <div className="pt-1">
              <button
                onClick={() => navigate('/products')}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                Browse meals
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/vendors')}
                className="ml-3 inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-200 font-semibold text-sm px-1 py-3.5 transition cursor-pointer"
              >
                Explore restaurants
                <ChevronRight className="w-4 h-4" />
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

          {/* Right: real food collage with flying food */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              {products.slice(0, 4).map((p, i) => (
                <div
                  key={p.id}
                  className={`relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 aspect-square shadow-sm ${i % 2 === 1 ? 'translate-y-4' : ''} ${
                    i % 2 === 0 ? 'animate-flying' : 'animate-flying-slow'
                  }`}
                  style={{ animationDelay: `${i * 0.6}s` }}
                >
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-7 h-7 text-gray-300 dark:text-slate-600" />
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gray-800 dark:text-gray-100 shadow">
                    {formatPrice(p.price)}
                  </span>
                </div>
              ))}
            </div>

            {/* Floating ingredient bits that drift around the collage */}
            <div className="absolute -top-5 -right-4 w-16 h-16 rounded-full bg-amber-200/80 dark:bg-amber-500/30 blur-xl animate-flying" />
            <div className="absolute -bottom-4 -left-3 w-14 h-14 rounded-full bg-emerald-200/80 dark:bg-emerald-500/30 blur-xl animate-flying-slow" />
          </div>

        </div>
      </section>


      {/* FLYING FOOD RIBBON — a marquee of real dishes drifting across the page */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14">
        <div className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-lg">
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="animate-marquee flex w-max items-center gap-3 py-4">
            {[...products, ...products].map((p, i) => (
              <div
                key={`${p.id}-${i}`}
                onClick={() => {
                  setSelectedProduct(p);
                  navigate(`/product/${p.id}`);
                }}
                className="group flex items-center gap-3 pr-3 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pl-2 py-1.5 cursor-pointer hover:border-emerald-500/50 hover:shadow-xl transition-all shrink-0 animate-tilt-hover"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                  <img src={p.images?.[0] || undefined} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="pr-1">
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
              Explore Food Categories
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Browse dishes across top restaurants and cuisines.</p>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All ({categories.length})</span>
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
                    Flash Sales & Meal Deals
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Exclusive restaurant meal deals with instant express delivery.</p>
                </div>

              {/* Countdown timer blocks */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Ends in:</span>
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
                <div
                  key={product.id}
                  className="group bg-gray-50 dark:bg-slate-800/60 rounded-3xl p-4 border border-gray-200 dark:border-slate-700/80 hover:border-emerald-500 hover:shadow-xl transition-all flex flex-col justify-between animate-tilt-hover"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div>
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-white dark:bg-slate-900">
                      <img src={product.images?.[0] || ''} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                        -{product.discountPercent}% OFF
                      </span>
                      <button
                        onClick={() => toggleWishlist(product)}
                        className={`absolute top-2 right-2 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition ${
                          isInWishlist(product.id) ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                      <Store className="w-3.5 h-3.5" />
                      <span className="truncate">{product.vendorName}</span>
                    </div>

                    <h4
                      onClick={() => {
                        setSelectedProduct(product);
                        navigate(`/product/${product.id}`);
                      }}
                      className="text-xs font-bold text-gray-900 dark:text-white hover:text-emerald-500 transition line-clamp-2 cursor-pointer"
                    >
                      {product.title}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setQuickViewProduct(product)}
                        className="p-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 transition"
                        title="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition shadow"
                        title="Add to Basket"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
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
              Featured Restaurants
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Order directly from verified kitchens and restaurants.</p>
          </div>
          <button
            onClick={() => navigate('/vendors')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Explore All Restaurants ({vendors.length})</span>
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
      </section>


      {/* DISPATCH RIDERS SPOTLIGHT & SELECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-8 text-white border border-slate-800 shadow-2xl">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                <Bike className="w-4 h-4 text-blue-400" />
                <span>On-Demand Dispatch Network</span>
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-white">
                Our Verified Local Dispatch Riders
              </h2>
              <p className="text-xs text-slate-300">
                A fleet of professional riders ready to deliver your favorite meals across Takoradi.
              </p>
            </div>

            <button
              onClick={() => navigate('/become-rider')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow cursor-pointer self-start md:self-auto"
            >
              <Bike className="w-4 h-4" />
              <span>Join as a Rider</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {riders.map((rider) => {
              return (
                <div
                  key={rider.id}
                  className="p-5 rounded-3xl border border-slate-700 bg-slate-800/40 flex flex-col justify-between"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <img src={rider.avatar} alt={rider.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-600" />
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {rider.name} <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">{rider.vehicleType}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
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


      {/* BECOME A PARTNER SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/20 rounded-full -ml-32 -mb-32 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-heading font-black leading-tight">
                Grow Your Restaurant with OmniMarket
              </h2>
              <p className="text-emerald-50 text-sm md:text-base max-w-lg leading-relaxed">
                Join hundreds of local kitchens in Takoradi. Reach more customers, manage orders seamlessly, and grow your revenue with our express delivery platform.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/become-vendor')}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-8 py-4 rounded-2xl transition shadow-xl flex items-center gap-2"
                >
                  Partner Restaurant <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/how-delivery-works')}
                  className="bg-emerald-700/50 hover:bg-emerald-700 text-white border border-emerald-400/30 font-bold px-8 py-4 rounded-2xl transition"
                >
                  Learn More
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
          How Food Delivery Works
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10">
          Seamless ordering from your favorite restaurants, connected to your chosen local dispatch rider.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg">
              01
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Browse & Order Meals</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pick meals, add-ons, and drinks from your favorite local restaurants.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg">
              02
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Pick Dispatch Rider</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Choose your preferred local rider by rating, vehicle type, and estimated arrival time.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg">
              03
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Live GPS Delivery</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Watch your rider navigate live on the interactive map with doorstep arrival updates.</p>
          </div>
        </div>
      </section>

    </div>
  );
};
