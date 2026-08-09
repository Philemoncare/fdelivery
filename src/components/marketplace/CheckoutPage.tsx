import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { getVendorOperationalStatus } from '../../lib/vendor-utils';
import {
  ShieldCheck,
  Bike,
  CreditCard,
  Wallet,
  CheckCircle2,
  MapPin,
  Tag,
  ArrowRight,
  Clock,
  AlertCircle,
  Smartphone
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Checkout requires an authenticated customer account.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const {
    cart,
    cartTotal,
    formatPrice,
    riders,
    selectedRider,
    setSelectedRider,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    placeOrder,
    customerProfile,
    isLoading,
    setSelectedOrder,
    vendors,
    showToast
  } = useApp();

  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Wallet' | 'Apple Pay' | 'Cash on Delivery'>('Credit Card');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('Please call on arrival.');
  const [couponCode, setCouponCode] = useState<string>('');

  // Initial address selection once profile is loaded
  React.useEffect(() => {
    if (customerProfile?.addresses?.length && !selectedAddress) {
      setSelectedAddress(customerProfile.addresses[0]?.address || '');
    }
  }, [customerProfile, selectedAddress]);

  if (isLoading || !customerProfile) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  const discountAmount = appliedCoupon
    ? (appliedCoupon.type === 'percentage'
        ? Math.min((cartTotal * appliedCoupon.value) / 100, appliedCoupon.maxDiscount)
        : appliedCoupon.value)
    : 0;

  const estimatedTax = Number((cartTotal * 0.08).toFixed(2));
  const deliveryFee = deliveryMethod === 'delivery' ? (selectedRider ? selectedRider.deliveryFee : 3.50) : 0;
  const grandTotal = Math.max(0, cartTotal - discountAmount + estimatedTax + deliveryFee);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

    // Verify vendor is open
    const vendorId = cart[0].product.vendorId;
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      const status = getVendorOperationalStatus(vendor);
      if (status !== 'OPEN' && status !== 'BUSY') {
        showToast('warning', 'Restaurant Unavailable', `Sorry, ${vendor.name} is currently ${status.replace('_', ' ')}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const order = await placeOrder({
        deliveryMethod,
        paymentMethod,
        specialInstructions,
        riderId: selectedRider?.id,
        address: selectedAddress
      });
      setSelectedOrder(order);
      navigate('/track-order');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const vendor = vendors.find(v => v.id === cart[0]?.product.vendorId);
  const vendorStatus = vendor ? getVendorOperationalStatus(vendor) : 'OPEN';
  const isVendorOpen = vendorStatus === 'OPEN' || vendorStatus === 'BUSY';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 rounded-3xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-300" /> Secure Food Checkout
          </h1>
          <p className="text-xs text-emerald-100 mt-1">Review your meals, assign your dispatch rider, and confirm your food order.</p>
        </div>
        <span className="hidden md:inline-block bg-white/20 text-white font-mono text-xs px-3 py-1.5 rounded-full font-bold">
          256-Bit Encrypted
        </span>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your food cart is currently empty</h3>
          <button
            onClick={() => navigate('/products')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow"
          >
            Explore Restaurants
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Delivery & Payment Details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Step 1: Delivery Method & Address */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3 border-gray-100 dark:border-slate-800">
                <MapPin className="w-4 h-4 text-emerald-500" /> 1. Delivery Address & Restaurant Confirmation
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryMethod('delivery')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center space-x-2 ${
                    deliveryMethod === 'delivery'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Doorstep Delivery</span>
                </button>

                <button
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center space-x-2 ${
                    deliveryMethod === 'pickup'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Restaurant Pickup (Free)</span>
                </button>
              </div>

              {deliveryMethod === 'delivery' && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Saved Address:</label>
                  <div className="space-y-2">
                    {customerProfile.addresses.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAddress(a.address)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between ${
                          selectedAddress === a.address
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 font-bold text-gray-900 dark:text-white'
                            : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded font-bold mr-2">
                            {a.title}
                          </span>
                          <span>{a.address}</span>
                        </div>
                        {selectedAddress === a.address && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Delivery Instructions:
                    </label>
                    <input
                      type="text"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Call upon arrival or leave at front desk..."
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Preferred Rider Selection */}
            {deliveryMethod === 'delivery' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bike className="w-4 h-4 text-emerald-500" /> 2. Choose Dispatch Rider
                  </h3>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold px-2 py-0.5 rounded">
                    Live Nearby Fleet
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {riders.map((r) => {
                    const isSel = selectedRider?.id === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRider(r)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                          isSel
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                            : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <img src={r.avatar} alt={r.name} className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{r.name}</p>
                            <p className="text-[10px] text-gray-500">{r.vehicleType}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-between text-[11px]">
                          <span className="text-emerald-600 font-bold">ETA: {r.etaMinutes}m</span>
                          <span className="font-bold text-gray-900 dark:text-white">{formatPrice(r.deliveryFee)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Payment Method */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b pb-3 border-gray-100 dark:border-slate-800">
                <CreditCard className="w-4 h-4 text-emerald-500" /> 3. Payment Method
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'MTN MoMo', label: 'MTN MoMo', icon: <Smartphone className="w-4 h-4 text-amber-500" /> },
                  { id: 'Telecel Cash', label: 'Telecel Cash', icon: <Smartphone className="w-4 h-4 text-red-500" /> },
                  { id: 'AirtelTigo Money', label: 'AirtelTigo Money', icon: <Smartphone className="w-4 h-4 text-blue-500" /> },
                  { id: 'Visa', label: 'Visa Card', icon: <CreditCard className="w-4 h-4 text-blue-600" /> },
                  { id: 'Mastercard', label: 'Mastercard', icon: <CreditCard className="w-4 h-4 text-orange-500" /> },
                  { id: 'OmniWallet', label: `OmniWallet (${formatPrice(customerProfile.walletBalance)})`, icon: <Wallet className="w-4 h-4 text-emerald-500" /> },
                  { id: 'Cash on Delivery', label: 'Cash on Delivery', icon: <CheckCircle2 className="w-4 h-4 text-amber-600" /> }
                ].map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`p-3.5 rounded-2xl border text-[10px] font-bold transition flex flex-col items-center justify-center space-y-2 text-center ${
                      paymentMethod === pm.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {pm.icon}
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6 sticky top-[168px]">
              
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white border-b pb-3 border-gray-100 dark:border-slate-800">
                Order Summary ({cart.length} Meals)
              </h3>

              {/* Items overview */}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-bold text-emerald-600">{item.quantity}x</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{item.product.title}</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 text-xs pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Estimated Tax</span>
                  <span>{formatPrice(estimatedTax)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Delivery Fee</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-slate-700">
                  <span>Grand Total</span>
                  <span className="text-emerald-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || !isVendorOpen}
                className={`w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-4 rounded-2xl transition shadow-xl shadow-emerald-500/30 flex items-center justify-center space-x-2 cursor-pointer ${isSubmitting || !isVendorOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>{isSubmitting ? 'Processing Order...' : !isVendorOpen ? `Restaurant ${vendorStatus.replace('_', ' ')}` : 'Place Food Order'}</span>
                {!isSubmitting && isVendorOpen && <ArrowRight className="w-4 h-4" />}
              </button>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
