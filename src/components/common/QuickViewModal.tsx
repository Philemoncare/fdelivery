import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { X, Star, Store, ShieldCheck, Truck, ShoppingCart, Heart, Check, Plus, Minus, Zap } from 'lucide-react';
import { getVendorOperationalStatus } from '../../lib/vendor-utils';
import { Badge } from '../ui/badge';

export const QuickViewModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    formatPrice,
    toggleWishlist,
    isInWishlist,
    setSelectedProduct,
    selectedRider,
    vendors,
    showToast
  } = useApp();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!quickViewProduct) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const handleSelectOption = (variantName: string, option: string) => {
    setSelectedVariants((prev) => ({ ...prev, [variantName]: option }));
  };

  const handleAddToCart = () => {
    const vendor = vendors.find(v => v.id === quickViewProduct.vendorId);
    if (vendor) {
      const status = getVendorOperationalStatus(vendor);
      if (status !== 'OPEN' && status !== 'BUSY') {
        showToast('Restaurant Unavailable', `Sorry, ${vendor.name} is currently ${status.replace('_', ' ')}.`, 'warning');
        return;
      }
    }
    addToCart(quickViewProduct, quantity, selectedVariants);
    setQuickViewProduct(null);
  };

  const handleBuyNow = () => {
    const vendor = vendors.find(v => v.id === quickViewProduct.vendorId);
    if (vendor) {
      const status = getVendorOperationalStatus(vendor);
      if (status !== 'OPEN' && status !== 'BUSY') {
        showToast('Restaurant Unavailable', `Sorry, ${vendor.name} is currently ${status.replace('_', ' ')}.`, 'warning');
        return;
      }
    }
    addToCart(quickViewProduct, quantity, selectedVariants);
    setQuickViewProduct(null);
    navigate('/checkout');
  };

  const isSaved = isInWishlist(quickViewProduct.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setQuickViewProduct(null)}
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity"
      />

      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden z-10 transition-all">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-500 dark:text-gray-300 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
              <img
                src={quickViewProduct.images?.[activeImageIndex] || quickViewProduct.images?.[0] || ''}
                alt={quickViewProduct.title}
                className="w-full h-full object-cover"
              />
              {quickViewProduct.discountPercent && (
                <span className="absolute top-3 left-3 bg-rose-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow">
                  -{quickViewProduct.discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {quickViewProduct.images && quickViewProduct.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-1">
                {quickViewProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition ${
                      activeImageIndex === idx ? 'border-emerald-500 scale-105' : 'border-gray-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col justify-between space-y-4">
            <div>
              {/* Vendor badge */}
              <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                <Store className="w-4 h-4" />
                <span>{quickViewProduct.vendorName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                {(() => {
                   const vendor = vendors.find(v => v.id === quickViewProduct.vendorId);
                   if (!vendor) return null;
                   const status = getVendorOperationalStatus(vendor);
                   return (
                     <Badge
                       variant={status === 'OPEN' ? 'success' : status === 'OPENING_SOON' ? 'warning' : 'danger'}
                       className="text-[7px] px-1 py-0 font-black uppercase"
                     >
                       {status.replace('_', ' ')}
                     </Badge>
                   );
                })()}
              </div>

              <h2 className="text-lg font-heading font-extrabold text-gray-900 dark:text-white leading-snug">
                {quickViewProduct.title}
              </h2>

              {/* Price & Rating */}
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(quickViewProduct.price)}
                </span>
                {quickViewProduct.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(quickViewProduct.originalPrice)}
                  </span>
                )}
                <div className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{quickViewProduct.rating}</span>
                  <span className="text-gray-400 font-normal">({quickViewProduct.reviewsCount})</span>
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 line-clamp-3">
                {quickViewProduct.description}
              </p>
            </div>

            {/* Variant options if available */}
            {quickViewProduct.variants && quickViewProduct.variants.length > 0 && (
              <div className="space-y-3">
                {quickViewProduct.variants.map((variant) => (
                  <div key={variant.name}>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      {variant.name}:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((opt) => {
                        const isSelected = selectedVariants[variant.name] === opt.label;
                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleSelectOption(variant.name, opt.label)}
                            className={`px-3 py-1 rounded-xl text-xs font-medium border transition ${
                              isSelected
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dispatch estimate callout */}
            <div className="flex items-center space-x-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-2xl text-xs">
              <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-900 dark:text-white">
                  Express Rider ETA: {selectedRider?.etaMinutes || 15} Mins
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Dispatched by {selectedRider?.name || 'Nearby Dispatcher'} ({selectedRider?.vehicleType || 'Motorcycle'})
                </p>
              </div>
            </div>

            {/* Quantity Stepper & Add Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3">
                <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-gray-50 dark:bg-slate-800">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-500 p-1">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold w-8 text-center text-gray-900 dark:text-white">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="text-gray-500 p-1">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3 rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={() => toggleWishlist(quickViewProduct)}
                  className={`p-3 rounded-xl border transition ${
                    isSaved
                      ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/40 dark:border-rose-800'
                      : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500' : ''}`} />
                </button>
              </div>

              <button
                onClick={handleBuyNow}
                className="w-full bg-gray-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Order Now with Express Rider</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
