import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, X, Plus, Minus, Trash2, Tag, ArrowRight, ShieldCheck, Bike } from 'lucide-react';

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
    formatPrice,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    selectedRider,
    riders
  } = useApp();

  const [couponInput, setCouponInput] = useState('');

  useEffect(() => {
    if (!isCartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const discountAmount = appliedCoupon
    ? (appliedCoupon.type === 'percentage'
        ? Math.min((cartTotal * appliedCoupon.value) / 100, appliedCoupon.maxDiscount)
        : appliedCoupon.value)
    : 0;

  const estimatedTax = Number((cartTotal * 0.08).toFixed(2));
  const deliveryFee = cart.length > 0 ? (selectedRider ? selectedRider.deliveryFee : 3.50) : 0;
  const grandTotal = Math.max(0, cartTotal - discountAmount + estimatedTax + deliveryFee);

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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-emerald-500" />
              <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                Your Food Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h3>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500 mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Your food cart is empty</h4>
                  <p className="text-xs text-gray-500 mt-1">Explore our restaurants and add your favorite meals.</p>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/products');
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow"
                >
                  Start Ordering
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex space-x-3 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title}
                    className="w-16 h-16 object-cover rounded-xl border border-gray-200 dark:border-slate-700"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {item.product.title}
                      </h5>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Restaurant: <span className="text-emerald-600 font-medium">{item.product.vendorName}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(item.product.price)}
                      </span>

                      {/* Stepper */}
                      <div className="flex items-center space-x-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 px-2 py-0.5">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-gray-900 dark:text-white w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-gray-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer calculation section */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-850 space-y-3">
              
              {/* Coupon Form */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-2.5 rounded-xl text-xs">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Tag className="w-4 h-4" /> Code {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)
                  </span>
                  <button onClick={removeCoupon} className="text-rose-500 font-bold hover:underline">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Promo code (e.g. FREEDEL)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="bg-gray-900 dark:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-black transition"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Rider assigned preview */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl text-xs border border-gray-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <Bike className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Assigned Rider: {selectedRider?.name}</p>
                    <p className="text-[10px] text-gray-500">{selectedRider?.vehicleType} | ETA {selectedRider?.etaMinutes}m</p>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold">{formatPrice(deliveryFee)}</span>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Promo Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Estimated Tax (8%)</span>
                  <span>{formatPrice(estimatedTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dispatch Delivery Fee</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-slate-700">
                  <span>Grand Total</span>
                  <span className="text-emerald-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/30 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
