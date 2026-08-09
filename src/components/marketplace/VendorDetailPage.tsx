import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Store, ShieldCheck, MapPin, Phone, Mail, Clock, Star, ShoppingBag, Eye, Heart, ArrowLeft, Search } from 'lucide-react';
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
    isLoading
  } = useApp();

  const vendor = vendors.find((v) => v.id === id) || selectedVendor;

  const [searchKey, setSearchKey] = useState('');

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  if (!vendor) {
    return <div className="max-w-7xl mx-auto py-16 px-4 text-center">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Restaurant not found</h3>
      <p className="text-gray-500 mt-2">The kitchen you are looking for may have moved or changed names.</p>
      <button onClick={() => navigate('/vendors')} className="mt-6 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg">Back to Directory</button>
    </div>;
  }

  const vendorProducts = products.filter((p) => p.vendorId === vendor.id);

  const displayProds = vendorProducts.filter((p) =>
    p.title?.toLowerCase().includes(searchKey.toLowerCase())
  );

  const status = getVendorOperationalStatus(vendor);
  const statusLabel = status === 'OPEN' ? 'Open Now' : status === 'BUSY' ? 'Busy' : status === 'TEMPORARILY_PAUSED' ? 'Temporarily Paused' : status.replace('_', ' ');

  const todayHours = (() => {
    if (!Array.isArray(vendor.businessHours) || vendor.businessHours.length === 0) return null;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const h = vendor.businessHours.find((x: any) => x.day === dayNames[new Date().getDay()]);
    if (!h) return null;
    if (!h.isOpen) return 'Closed today';
    const fmt = (v: string) => {
      if (!v) return '';
      const [hr, min] = v.split(':').map(Number);
      return `${hr % 12 || 12}:${String(min ?? 0).padStart(2, '0')} ${hr >= 12 ? 'PM' : 'AM'}`;
    };
    return `${fmt(h.open)} - ${fmt(h.close)}`;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <button
        onClick={() => navigate('/vendors')}
        className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-emerald-600 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Restaurants</span>
      </button>

      {/* Restaurant Header Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-xl relative">
        {/* Banner */}
        <div className="h-48 sm:h-72 relative group">
          <img
            src={vendor.banner || vendor.logo || ''}
            alt={vendor.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Info Area */}
        <div className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 flex-1 min-w-0">
              {/* Logo/Profile Image */}
              <div className="relative -mt-16 sm:-mt-24 shrink-0">
                <img
                  src={vendor.logo || ''}
                  alt={vendor.name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-2xl bg-white"
                />
              </div>

              {/* Identity & Basic Info */}
              <div className="space-y-3 pb-1 flex-1 min-w-0 w-full">
                <div className="flex flex-wrap gap-1.5">
                  {(vendor.category || '').split(',').slice(0, 5).map((cat: string) => (
                    <span key={cat} className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border border-emerald-500/10">
                      {cat.trim()}
                    </span>
                  ))}
                  {(vendor.category || '').split(',').length > 5 && (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                      +{(vendor.category || '').split(',').length - 5} More
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-heading font-black text-slate-900 dark:text-white truncate">
                    {vendor.name}
                  </h1>
                  <span className={cn(
                    "shrink-0 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border",
                    status === 'OPEN' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  )}>
                    <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", status === 'OPEN' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                    {statusLabel}
                  </span>
                  <div className="p-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-slate-900 dark:text-white">{vendor.rating || 0}</span>
                    <span className="text-gray-400 font-medium">({vendor.totalReviews || 0} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1.5 group cursor-pointer">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="hover:text-emerald-500 transition-colors truncate">{vendor.address}</span>
                  </div>
                  {todayHours && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-violet-500" />
                      <span className="text-slate-900 dark:text-white">{todayHours}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {vendor.phone && (
                    <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 transition-all border border-slate-100 dark:border-slate-800">
                      <Phone className="w-3 h-3" />
                      {vendor.phone}
                    </a>
                  )}
                  {vendor.email && (
                    <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 transition-all border border-slate-100 dark:border-slate-800">
                      <Mail className="w-3 h-3" />
                      {vendor.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Action Cards */}
            <div className="flex items-center gap-3 lg:mb-1">
              <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800 shadow-xl text-center min-w-[120px]">
                <span className="text-slate-500 block text-[8px] uppercase font-black tracking-[0.2em] mb-1.5">ETA Delivery</span>
                <span className="text-xl font-black text-emerald-400 leading-none">{vendor.deliveryTime || '25-35 min'}</span>
              </div>
              <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800 shadow-xl text-center min-w-[120px]">
                <span className="text-slate-500 block text-[8px] uppercase font-black tracking-[0.2em] mb-1.5">Min Order</span>
                <span className="text-xl font-black text-white leading-none">{formatPrice(vendor.minOrder || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About / Our Story */}
      {(vendor.about || vendor.description) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-lg font-heading font-bold text-gray-900 dark:text-white mb-3">Our Story</h3>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line">
            {vendor.about || vendor.description}
          </p>
        </div>
      )}

      {/* Menu Search & Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white">
            Available Menu <span className="text-emerald-500 font-bold ml-1">({displayProds.length})</span>
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search items in this menu..."
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-9 py-2.5 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayProds.map((product, idx) => (
            <div
              key={product.id}
              className="group bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 border border-gray-100 dark:border-slate-800 hover:border-emerald-500/30 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-500 flex flex-col justify-between relative overflow-hidden animate-slide-up"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div>
                <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-5 bg-slate-50 dark:bg-slate-800 shadow-inner">
                  <img
                    src={product.images?.[0] || ''}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-xl shadow-lg border border-emerald-500/10">
                      {product.category}
                    </span>
                  </div>

                  {/* Quick View Button (Center Overlay) */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setQuickViewProduct(product)}
                      className="p-3 bg-white dark:bg-slate-900 text-emerald-500 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleWishlist(product)}
                      className={`p-3 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 ${
                        isInWishlist(product.id) ? 'bg-rose-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="px-1">
                  <h3
                    onClick={() => {
                      setSelectedProduct(product);
                      navigate(`/product/${product.id}`);
                    }}
                    className="text-sm sm:text-base font-black text-slate-900 dark:text-white hover:text-emerald-500 transition-colors cursor-pointer line-clamp-1 mb-1"
                  >
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-emerald-500/50" />
                    <span>Prep: {product.prepTime || '15'} mins</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between px-1">
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 leading-none mb-1">Price</span>
                   <span className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">
                    {formatPrice(product.price)}
                  </span>
                </div>

                <button
                  onClick={() => addToCart(product)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-5 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] transition-all hover:translate-y-[-2px] active:translate-y-0 active:shadow-none flex items-center gap-2 font-bold text-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Order</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {displayProds.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-slate-800 space-y-3">
            <ShoppingBag className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No meals found</h3>
            <p className="text-xs text-gray-500">This kitchen hasn&apos;t uploaded any meals matching your search yet.</p>
          </div>
        )}
      </div>

    </div>
  );
};
