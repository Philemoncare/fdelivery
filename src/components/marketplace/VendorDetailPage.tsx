import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Store, ShieldCheck, MapPin, Phone, Mail, Clock, Star, ShoppingBag, Eye, Heart, ArrowLeft, Search, Plus } from 'lucide-react';
import { getVendorOperationalStatus } from '../../lib/vendor-utils';
import { cn } from '../../lib/utils';

export const VendorDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    selectedVendor,
    vendors,
    products,
    addToCart,
    formatPrice,
    setQuickViewProduct,
    setSelectedProduct,
    toggleWishlist,
    isInWishlist,
    isLoading,
    t
  } = useApp();

  const vendor = vendors.find((v) => v.id === id) || selectedVendor;

  const [searchKey, setSearchKey] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('common.noResults')}</h3>
        <p className="text-gray-500 mt-2">{t('vendorListing.noResultsText')}</p>
        <button onClick={() => navigate('/vendors')} className="mt-6 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg">
          {t('common.back')}
        </button>
      </div>
    );
  }

  const vendorProducts = products.filter((p) => p.vendorId === vendor.id);

  const productCategories = useMemo(() => {
    const cats = ['Popular', ...new Set(vendorProducts.map(p => p.category).filter(Boolean))];
    return cats.map(c => ({
      name: c,
      products: c === 'Popular'
        ? vendorProducts.filter(p => p.isPopular).slice(0, 4)
        : vendorProducts.filter(p => p.category === c)
    })).filter(c => c.products.length > 0);
  }, [vendorProducts]);

  const [activeCategory, setActiveCategory] = useState(productCategories[0]?.name || '');

  const status = getVendorOperationalStatus(vendor);
  const statusLabel = status === 'OPEN' ? t('common.open') : status === 'BUSY' ? t('common.busy') : status === 'TEMPORARILY_PAUSED' ? t('common.paused') : status.replace('_', ' ');

  const scrollToCategory = (name: string) => {
    setActiveCategory(name);
    const el = document.getElementById(`category-${name}`);
    if (el) {
      const offset = 220; // sticky header height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        <button
          onClick={() => navigate('/food')}
          className="group flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t('common.back')}</span>
        </button>

        {/* Restaurant Hero Section */}
        <div className="relative rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xl">
           <div className="h-48 sm:h-80 relative group">
              <img src={vendor.banner || vendor.logo || ''} alt={vendor.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />

              <button
                onClick={() => toggleWishlist({ id: vendor.id, title: vendor.name } as any)}
                className={cn(
                  "absolute top-6 right-6 w-12 h-12 rounded-2xl backdrop-blur-md flex items-center justify-center transition-colors shadow-2xl z-10",
                  isInWishlist(vendor.id) ? "bg-rose-500 text-white" : "bg-white/90 dark:bg-slate-900/90 text-slate-400 hover:text-rose-500"
                )}
              >
                 <Heart className={cn("w-5 h-5", isInWishlist(vendor.id) && "fill-current")} />
              </button>
           </div>

           <div className="px-6 sm:px-10 pb-10 relative">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                 <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 flex-1 min-w-0">
                    <div className="relative -mt-20 sm:-mt-24 shrink-0">
                       <img src={vendor.logo || ''} alt={vendor.name} className="w-32 h-32 sm:w-44 sm:h-44 rounded-[2.5rem] object-cover border-[6px] border-white dark:border-slate-900 shadow-2xl bg-white" />
                    </div>

                    <div className="space-y-4 pb-2 flex-1 min-w-0">
                       <div className="flex flex-wrap gap-2">
                          {(vendor.category || '').split(',').map((cat: string) => (
                             <span key={cat} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/10">
                                {cat.trim()}
                             </span>
                          ))}
                       </div>

                       <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight truncate">{vendor.name}</h1>
                          <div className="flex items-center gap-2">
                             <div className="p-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500">
                                <ShieldCheck className="w-5 h-5" />
                             </div>
                             <span className={cn(
                                "text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border",
                                status === 'OPEN' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                             )}>
                                {statusLabel}
                             </span>
                          </div>
                       </div>

                       <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                             <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                             <span className="text-slate-900 dark:text-white font-black">{vendor.rating || '4.0'}</span>
                             <span className="opacity-60">({vendor.totalReviews || 0} reviews)</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <Clock className="w-4 h-4 text-emerald-500" />
                             <span>{vendor.deliveryTime || '25-35 min'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <ShoppingBag className="w-4 h-4 text-violet-500" />
                             <span>{formatPrice(vendor.deliveryFee || 0)} delivery</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Menu Navigation & Search */}
        <div className="sticky top-[72px] lg:top-[124px] z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none snap-x">
                 {productCategories.map(cat => (
                   <button
                     key={cat.name}
                     onClick={() => scrollToCategory(cat.name)}
                     className={cn(
                       "shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all snap-start",
                       activeCategory === cat.name
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl"
                        : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                     )}
                   >
                      {cat.name}
                   </button>
                 ))}
              </div>

              <div className="relative w-full md:w-72">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input
                   type="text"
                   placeholder="Search in menu..."
                   value={searchKey}
                   onChange={(e) => setSearchKey(e.target.value)}
                   className="w-full h-11 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl pl-11 pr-4 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                 />
              </div>
           </div>
        </div>

        {/* Menu Content */}
        <div className="space-y-16 py-8">
           {productCategories.map(cat => (
             <section key={cat.name} id={`category-${cat.name}`} className="space-y-8">
                <div className="flex items-center gap-4">
                   <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{cat.name}</h2>
                   <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {cat.products.filter(p => p && p.title.toLowerCase().includes(searchKey.toLowerCase())).map(product => product && (
                     <div
                       key={product.id}
                       onClick={() => { setSelectedProduct(product); navigate(`/product/${product.id}`); }}
                       className="group flex gap-4 p-4 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-2xl hover:border-emerald-500/20 transition-all duration-500 cursor-pointer"
                     >
                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 shadow-inner">
                           <img src={product.images?.[0] || ''} alt={product.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                           <div className="space-y-1">
                              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight truncate group-hover:text-emerald-500 transition-colors">{product.title}</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                                 {product.description || 'Authentic flavors prepared with fresh local ingredients.'}
                              </p>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(product.price)}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                              >
                                 <Plus className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </section>
           ))}
        </div>

        {/* Out of results */}
        {searchKey && productCategories.every(cat => cat.products.filter(p => p.title.toLowerCase().includes(searchKey.toLowerCase())).length === 0) && (
           <div className="py-20 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-6">
                 <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">No items found</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2">We couldn't find "{searchKey}" in the menu.</p>
           </div>
        )}

      </div>
    </div>
  );
};
