import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, X, Plus, Minus, Trash2, Tag, ArrowRight, ShieldCheck, Bike } from 'lucide-react';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotal,
    cartCount,
    deliveryFee,
    estimatedTax,
    discountAmount,
    grandTotal,
    formatPrice,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    selectedRider,
    t
  } = useApp();

  const [couponInput, setCouponInput] = useState('');

  useEffect(() => {
    if (!isCartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      applyCoupon(couponInput.trim());
      setCouponInput('');
    }
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:end-0 md:start-auto md:bottom-auto md:max-w-full md:flex md:ps-10">
        <div className="w-full md:w-screen md:max-w-md max-h-[92dvh] md:max-h-none md:h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-t md:border-s border-gray-200 dark:border-slate-800 rounded-t-[2.5rem] md:rounded-none overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-gray-900 dark:text-white leading-tight">{t('cart.title')}</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{cartCount} {t('cartDrawer.itemsSelected')}</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2.5 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-20 space-y-6">
                <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center text-gray-300 mx-auto shadow-inner">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="font-black text-xl text-gray-900 dark:text-white">{t('cartDrawer.emptyTitle')}</h4>
                  <p className="text-xs text-gray-500 mt-2 max-w-[200px] mx-auto leading-relaxed">{t('cartDrawer.emptyDesc')}</p>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/products');
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-4 rounded-2xl transition shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
                >
                  {t('cartDrawer.startOrdering')}
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 p-4 rounded-[2rem] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 shadow-sm group hover:shadow-md transition-all"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <h5 className="text-sm font-black text-gray-900 dark:text-white truncate">
                          {item.product.title}
                        </h5>
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">
                          {item.product.vendorName}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-base font-black text-gray-900 dark:text-white">
                        {formatPrice(item.product.price)}
                      </span>

                      {/* Stepper */}
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl shadow-inner">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-black"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-gray-900 dark:text-white w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-black"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer calculation section */}
          {cart.length > 0 && (
            <div className="p-6 sm:p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md space-y-5 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
              
              {/* Promo code & Rider preview - Horizontal on mobile to save space */}
              <div className="grid grid-cols-1 gap-3">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-500 text-white p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                    <span className="flex items-center gap-2">
                      <Tag className="w-4 h-4" /> {t('cart.promo')} {appliedCoupon.code} {t('common.success')}
                    </span>
                    <button onClick={removeCoupon} className="hover:underline">{t('cart.remove')}</button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1 group">
                      <Tag className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <input
                        type="text"
                        placeholder={t('cart.voucher')}
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-transparent p-3 ps-10 rounded-2xl text-[10px] font-black tracking-widest text-gray-900 dark:text-white focus:border-emerald-500 shadow-sm outline-none transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-gray-900 dark:bg-slate-700 text-white text-[10px] font-black px-5 py-3 rounded-2xl hover:bg-black transition-all shadow-md uppercase tracking-widest"
                    >
                      {t('cart.apply')}
                    </button>
                  </form>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span className="uppercase tracking-widest">{t('cart.subtotal')}</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="uppercase tracking-widest">{t('cart.promo')}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <AnimatedTooltip
                    variant="sadoc"
                    content="Delivery estimate plus estimated tax. Final delivery fee is re-calculated at checkout using the platform pricing engine (includes fuel-price adjustments when fuel data is available)."
                    triggerClassName="px-1 py-0.5"
                  >
                    <span className="uppercase tracking-widest">{t('cartDrawer.taxAndFee')}</span>
                  </AnimatedTooltip>
                  <span className="text-gray-900 dark:text-white">{formatPrice(deliveryFee + estimatedTax)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-slate-800">
                  <span className="uppercase tracking-tighter">{t('cart.total')}</span>
                  <span className="text-emerald-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-5 rounded-[1.5rem] transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 cursor-pointer uppercase tracking-[0.2em] active:scale-[0.98]"
              >
                <span>{t('cartDrawer.checkoutNow')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
