import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { getVendorOperationalStatus } from '../../lib/vendor-utils';
import { cn } from '@/src/lib/utils';
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
  Smartphone,
  Package,
  Star
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
    showToast,
    deliveryFee,
    estimatedTax,
    discountAmount,
    grandTotal
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Address & Rider, 2: Payment, 3: Success
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<string>('MTN MoMo');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Initial address selection
  React.useEffect(() => {
    if (customerProfile?.addresses?.length && !selectedAddress) {
      const def = customerProfile.addresses.find(a => a.isDefault) || customerProfile.addresses[0];
      setSelectedAddress(def?.address || '');
    }
  }, [customerProfile, selectedAddress]);

  // Default rider
  React.useEffect(() => {
    if (deliveryMethod === 'delivery' && riders.length && !selectedRider) {
      const available = riders.filter(r => r.isOnline && r.isAvailable);
      if (available.length) setSelectedRider(available[0]);
      else setSelectedRider(riders[0]);
    }
  }, [deliveryMethod, riders, selectedRider, setSelectedRider]);

  if (isLoading || !customerProfile) {
    return <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;

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
        specialInstructions: specialInstructions || 'No instructions',
        riderId: selectedRider?.id,
        address: selectedAddress
      });
      setPlacedOrder(order);
      setSelectedOrder(order);
      setStep(3); // Move to Success Step
      window.scrollTo(0, 0);
    } catch (err: any) {
      showToast('error', 'Order Failed', err.message || 'Could not process your order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (step === 3 && placedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Order Placed Successfully!</h1>
          <p className="text-gray-500 mt-2">Thank you, {customerProfile.name.split(' ')[0]}. Your delicious meal is on the way.</p>
        </div>

        <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">{placedOrder.orderNumber}</p>
              </div>
              <Badge variant="success" className="rounded-xl px-4 py-1 font-black uppercase text-[10px] tracking-widest">Confirmed</Badge>
            </div>

            <div className="grid grid-cols-2 gap-6 text-left">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Restaurant</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{placedOrder.vendorName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-sm font-black text-emerald-600">{formatPrice(placedOrder.totalAmount)}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Status</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {placedOrder.riderId ? `Assigned to ${selectedRider?.name || 'Rider'}` : 'Awaiting Assignment'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="brand" className="rounded-2xl py-6 font-black uppercase text-xs tracking-widest shadow-lg" onClick={() => navigate(`/customer/orders/${placedOrder.id}`)}>
            <Package className="w-4 h-4 mr-2" /> View Order Details
          </Button>
          <Button variant="outline" className="rounded-2xl py-6 font-black uppercase text-xs tracking-widest border-gray-200" onClick={() => navigate('/track-order')}>
            <MapPin className="w-4 h-4 mr-2" /> Track Delivery
          </Button>
        </div>

        <button onClick={() => navigate('/')} className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] hover:underline">
          Back to Marketplace
        </button>
      </div>
    );
  }

  const activeRiders = riders.filter(r => r.isOnline && r.isAvailable);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-32">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            Checkout
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-1">Complete your food order from {cart[0]?.product.vendorName || 'Takoradi'}</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all",
                step === s ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-gray-400"
              )}
            >
              Step {s}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">

        <div className="space-y-6">
          {step === 1 ? (
            <>
              {/* Delivery Choice */}
              <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Delivery Details
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDeliveryMethod('delivery')}
                    className={cn("p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                      deliveryMethod === 'delivery' ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-gray-50 bg-gray-50 text-gray-400")}>
                    <Bike className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Doorstep</span>
                  </button>
                  <button onClick={() => setDeliveryMethod('pickup')}
                    className={cn("p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                      deliveryMethod === 'pickup' ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-gray-50 bg-gray-50 text-gray-400")}>
                    <Clock className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pickup</span>
                  </button>
                </div>

                {deliveryMethod === 'delivery' && (
                  <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Saved Address</label>
                      <div className="space-y-2">
                        {customerProfile.addresses.map((a) => (
                          <button key={a.id} onClick={() => setSelectedAddress(a.address)}
                            className={cn("w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between group transition-all",
                              selectedAddress === a.address ? "border-emerald-500 bg-white dark:bg-slate-800" : "border-gray-100 bg-gray-50/50 hover:border-emerald-300")}>
                            <div>
                               <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">{a.title}</p>
                               <p className="text-xs font-bold text-gray-900 dark:text-white">{a.address}</p>
                            </div>
                            {selectedAddress === a.address && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Special Note for Rider</label>
                      <input type="text" value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="e.g. Ring doorbell or leave at gate" className="w-full bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-bold border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all" />
                    </div>
                  </div>
                )}
              </Card>

              {/* Rider Selection */}
              {deliveryMethod === 'delivery' && (
                <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Bike className="w-4 h-4" /> Dispatch Rider
                    </h3>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-gray-200">Nearby Fleet Only</Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {(activeRiders.length ? activeRiders : riders.slice(0, 4)).map((r) => (
                      <button key={r.id} onClick={() => setSelectedRider(r)}
                        className={cn("p-4 rounded-3xl border-2 flex items-center gap-4 text-left transition-all",
                          selectedRider?.id === r.id ? "border-emerald-500 bg-white dark:bg-slate-800 shadow-md ring-4 ring-emerald-500/5" : "border-gray-50 bg-gray-50/50 hover:border-emerald-200")}>
                        <img src={r.avatar} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900 dark:text-white truncate">{r.name}</p>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                            <span className="flex items-center gap-0.5 text-amber-500"><Star className="w-2.5 h-2.5 fill-current" /> {r.rating}</span>
                            <span>{r.vehicleType}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-600">{formatPrice(r.deliveryFee)}</p>
                          <p className="text-[8px] text-gray-400 uppercase">{r.etaMinutes}m ETA</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              <Button className="w-full rounded-[1.75rem] py-8 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.98] transition-all" onClick={() => setStep(2)}>
                Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              {/* Payment Selection */}
              <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Payment Selection
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'MTN MoMo', label: 'MTN Mobile Money', icon: 'MoMo', color: 'bg-amber-400' },
                    { id: 'Telecel Cash', label: 'Telecel Cash', icon: 'Cash', color: 'bg-red-600' },
                    { id: 'AirtelTigo Money', label: 'AirtelTigo Money', icon: 'M', color: 'bg-blue-600' },
                    { id: 'Visa', label: 'Bank Card / Visa', icon: <CreditCard className="w-5 h-5" />, color: 'bg-blue-800' },
                    { id: 'OmniWallet', label: `OmniWallet (${formatPrice(customerProfile.walletBalance)})`, icon: <Wallet className="w-5 h-5" />, color: 'bg-emerald-600' },
                    { id: 'Cash on Delivery', label: 'Cash on Delivery', icon: <Smartphone className="w-5 h-5" />, color: 'bg-gray-700' },
                  ].map((pm) => (
                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                      className={cn("p-5 rounded-[2rem] border-2 flex items-center gap-4 text-left transition-all relative overflow-hidden group",
                        paymentMethod === pm.id ? "border-emerald-500 bg-white dark:bg-slate-800 shadow-md" : "border-gray-50 bg-gray-50/50 hover:border-emerald-200")}>
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black text-white shadow-lg", pm.color)}>
                        {pm.icon}
                      </div>
                      <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{pm.label}</span>
                      {paymentMethod === pm.id && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
                    </button>
                  ))}
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-blue-500 flex-shrink-0" />
                  <p className="text-[11px] text-blue-600 dark:text-blue-300 font-medium leading-relaxed uppercase tracking-widest">Transactions are processed securely in Ghana Cedis (GH₵). Your payment data is never stored on our servers.</p>
                </div>
              </Card>

              <div className="flex gap-3">
                 <Button variant="outline" className="rounded-2xl py-8 px-8 font-black uppercase text-xs tracking-widest border-gray-200" onClick={() => setStep(1)}>Back</Button>
                 <Button className="flex-1 rounded-2xl py-8 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/20" onClick={handlePlaceOrder} disabled={isSubmitting}>
                   {isSubmitting ? 'Processing Order...' : 'Confirm & Place Order'}
                 </Button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Summary */}
        <aside className="space-y-6">
          <Card className="rounded-[2.5rem] border-none bg-white dark:bg-slate-900 shadow-2xl p-8 space-y-6 border border-gray-100 dark:border-slate-800 lg:sticky lg:top-24">
            <h3 className="font-black text-xl uppercase tracking-widest border-b pb-4">My Order</h3>

            <div className="space-y-4 max-h-64 overflow-y-auto pr-2 scrollbar-none">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                     <img src={item.product.images[0]} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-black text-gray-900 dark:text-white truncate">{item.product.title}</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.quantity}x @ {formatPrice(item.product.price)}</p>
                   </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-dashed">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>Tax & Service</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(estimatedTax)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>Delivery Fee</span>
                <span className="text-emerald-600">{formatPrice(deliveryFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  <span>Promo Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-[0.2em]">Total</span>
                <span className="text-2xl font-black text-emerald-600">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
               Takoradi Marketplace Delivery
            </div>
          </Card>

          <div className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-slate-800/30 rounded-[2rem] border border-gray-100 dark:border-slate-800">
             <AlertCircle className="w-6 h-6 text-gray-400 flex-shrink-0" />
             <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Estimated delivery time is 35-45 minutes. Our dispatch riders prioritize safety first.</p>
          </div>
        </aside>

      </div>
    </div>
  );
};
