import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { getVendorOperationalStatus } from '../../lib/vendor-utils';
import { cn } from '@/src/lib/utils';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';
import {
  ShieldCheck,
  Bike,
  CreditCard,
  Wallet,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Clock,
  AlertCircle,
  Smartphone,
  Package,
  Star,
  RefreshCw,
  Store,
  Loader2
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { VendorService, PaymentService, RiderService } from '@/src/services/api';
import { LocationSearch } from '../common/LocationSearch';
import type { DeliveryLocation, DispatchRider } from '@/src/types';

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
    addAddress,
    isLoading,
    setSelectedOrder,
    showToast,
    deliveryFee,
    estimatedTax,
    discountAmount,
    grandTotal,
    t
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Address & Rider, 2: Payment, 3: Success
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false);
  const [eligibleRiders, setEligibleRiders] = useState<DispatchRider[]>([]);
  const submitLockRef = useRef(false);

  // Vendor availability state: 'checking' | 'available' | 'unavailable' | 'unknown'
  const [availability, setAvailability] = useState<'checking' | 'available' | 'unavailable' | 'unknown'>('checking');

  const cartVendorId = cart.length > 0 ? cart[0].product.vendorId : null;

  const checkVendorAvailability = useCallback(async () => {
    if (!cartVendorId) {
      setAvailability('unknown');
      return;
    }
    setAvailability('checking');
    try {
      const vendor = await VendorService.getById(cartVendorId);
      const status = getVendorOperationalStatus(vendor);
      setAvailability(status === 'OPEN' || status === 'BUSY' ? 'available' : 'unavailable');
    } catch (err: any) {
      setAvailability('unknown');
    }
  }, [cartVendorId]);

  // Payment options come from the server's gateway configuration — the single
  // source of truth. Only configured + enabled methods are shown as usable.
  const availablePayments = useMemo(() => {
    return (Array.isArray(gateways) ? gateways : [])
      .filter((g: any) => g.configured && g.enabled)
      .map((g: any) => {
        const key = String((g.id || '') + ' ' + (g.name || '')).toLowerCase();
        if (/wallet|omni/.test(key)) return { value: 'OmniWallet', gatewayId: g.id, label: `${t('nav.wallet')} (${formatPrice(customerProfile?.walletBalance ?? 0)})`, icon: <Wallet className="w-5 h-5" />, color: 'bg-emerald-600' };
        if (/cod|cash on delivery/.test(key)) return { value: 'Cash on Delivery', gatewayId: g.id, label: t('common.paymentCash'), icon: <Smartphone className="w-5 h-5" />, color: 'bg-gray-700' };
        if (/mtn/.test(key)) return { value: 'MTN MoMo', gatewayId: g.id, label: 'MTN Mobile Money', icon: 'MoMo', color: 'bg-amber-400' };
        if (/telecel|vodafone/.test(key)) return { value: 'Telecel Cash', gatewayId: g.id, label: 'Telecel Cash', icon: 'Cash', color: 'bg-red-600' };
        if (/airteltigo/.test(key)) return { value: 'AirtelTigo Money', gatewayId: g.id, label: 'AirtelTigo Money', icon: 'M', color: 'bg-blue-600' };
        if (/card|visa|mastercard/.test(key)) return { value: g.id, gatewayId: g.id, label: `Bank Card (${g.name})`, icon: <CreditCard className="w-5 h-5" />, color: 'bg-blue-800' };
        return { value: g.id, gatewayId: g.id, label: g.name, icon: <CreditCard className="w-5 h-5" />, color: 'bg-blue-800' };
      });
  }, [gateways, t, formatPrice, customerProfile?.walletBalance ?? 0]);

  // Gateways the server knows about but that are NOT ready (disabled and/or
  // unconfigured). These stay visible but clearly unselectable so no client
  // silently pretends they work — the backend also rejects them at checkout.
  const unavailablePayments = useMemo(() => {
    return (Array.isArray(gateways) ? gateways : [])
      .filter((g: any) => !(g.configured && g.enabled))
      .map((g: any) => ({
        label: g.name || g.id,
        reason: !g.configured ? 'Not configured' : 'Currently unavailable',
        id: g.id,
      }));
  }, [gateways]);

  // Load the authoritative gateway list from the backend.
  useEffect(() => {
    PaymentService.getGateways()
      .then(g => setGateways(Array.isArray(g) ? g : []))
      .catch(() => setGateways([]))
      .finally(() => setGatewaysLoaded(true));
  }, []);

  // Server-computed eligible riders (verified/approved/non-suspended, online,
  // available, under the active cap, and within radius when coords exist).
  useEffect(() => {
    if (deliveryMethod !== 'delivery') return;
    let cancelled = false;
    let lat: number | undefined;
    let lng: number | undefined;
    if (typeof deliveryLocation?.latitude === 'number' && typeof deliveryLocation?.longitude === 'number') {
      lat = deliveryLocation.latitude;
      lng = deliveryLocation.longitude;
    }
    RiderService.getEligible(lat, lng)
      .then(list => { if (!cancelled) setEligibleRiders(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setEligibleRiders([]); });
    return () => { cancelled = true; };
  }, [deliveryMethod, deliveryLocation?.latitude, deliveryLocation?.longitude]);

  // Eligible list is authoritative; fall back to a client-side filter only if
  // the endpoint is unreachable so the checkout still renders.
  const activeRiders = useMemo(() => {
    if (eligibleRiders.length) return eligibleRiders;
    return riders.filter(r => r.isOnline && r.isAvailable);
  }, [eligibleRiders, riders]);

  // Default the payment method to the first server-available option.
  useEffect(() => {
    if (!gatewaysLoaded) return;
    if (availablePayments.length && !availablePayments.some(p => p.value === paymentMethod)) {
      setPaymentMethod(availablePayments[0].value);
    }
  }, [gatewaysLoaded, availablePayments, paymentMethod]);

  useEffect(() => {
    if (step === 1) {
      checkVendorAvailability();
    }
  }, [step, checkVendorAvailability]);

  // Initial address selection
  React.useEffect(() => {
    if (!deliveryLocation && customerProfile?.addresses?.length) {
      const def = customerProfile.addresses.find(a => a.isDefault) || customerProfile.addresses[0];
      setDeliveryLocation({ address: def.address, area: def.address, city: def.city, latitude: def.latitude, longitude: def.longitude, source: 'saved', deliveryAddressId: def.id });
    }
  }, [customerProfile, deliveryLocation]);

  // Default rider — the backend-eligible pool decides who can actually take it.
  React.useEffect(() => {
    if (deliveryMethod === 'delivery' && activeRiders.length && !selectedRider) {
      setSelectedRider(activeRiders[0]);
    }
  }, [deliveryMethod, activeRiders, selectedRider, setSelectedRider]);

  if (isLoading || !customerProfile) {
    return <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-gray-400">
          <Package className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('cart.empty')}</h1>
        <p className="text-sm text-gray-500">{t('checkout.details')}</p>
        <Button variant="brand" className="rounded-2xl py-6 font-black uppercase text-xs tracking-widest" onClick={() => navigate('/vendors')}>
          {t('nav.restaurants')}
        </Button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting || submitLockRef.current) return;
    if (deliveryMethod === 'delivery' && !deliveryLocation?.address?.trim()) {
      showToast('Delivery address required', t('checkout.addressRequired'), 'warning');
      return;
    }

    const vendorId = cart[0].product.vendorId;
    if (availability === 'unavailable') {
      showToast(t('checkout.unavailableTitle'), t('checkout.unavailableMessage'), 'error');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      // Fresh availability re-check immediately before placing the order.
      const vendor = await VendorService.getById(vendorId);
      const status = getVendorOperationalStatus(vendor);
      if (status !== 'OPEN' && status !== 'BUSY') {
        setAvailability('unavailable');
        showToast(t('checkout.unavailableTitle'), `Sorry, ${vendor.name} is currently ${status.replace('_', ' ')}.`, 'error');
        return;
      }
      setAvailability('available');

      const order = await placeOrder({
        deliveryMethod,
        paymentMethod,
        specialInstructions: specialInstructions || 'No instructions',
        riderId: selectedRider?.id,
        address: deliveryLocation?.address || '',
        customerLat: deliveryLocation?.latitude,
        customerLng: deliveryLocation?.longitude,
        city: deliveryLocation?.city,
        country: deliveryLocation?.region,
        deliveryAddressId: deliveryLocation?.deliveryAddressId || null,
        paymentMethodId: availablePayments.find(p => p.value === paymentMethod)?.gatewayId || null,
        location: deliveryLocation,
      });
      setPlacedOrder(order);
      setSelectedOrder(order);
      setStep(3); // Move to Success Step
      window.scrollTo(0, 0);
    } catch (err: any) {
      // Developers get the full diagnostic in the console; customers get a safe,
      // category-specific message. Server 4xx messages are already customer-safe
      // and specific (e.g. "Insufficient wallet balance") and are shown as-is.
      console.error('[Checkout] Order creation failed', {
        status: err?.status ?? null,
        message: err?.message ?? 'Unknown error',
        endpoint: '/api/orders',
        paymentMethod,
        deliveryMethod,
        vendorId,
        items: cart.map(i => ({ productId: i.product.id, qty: i.quantity })),
      });
      const status = err?.status ?? 0;
      const isTimeout = err?.name === 'AbortError' || !!err?.isTimeout;
      let message: string;
      if (isTimeout || status === 0) {
        message = t('checkout.networkError');
      } else if (status >= 500) {
        message = t('checkout.serverError');
      } else if (status === 401 || status === 403) {
        message = t('checkout.authError');
      } else if (status === 402 || (err?.message ?? '').toLowerCase().includes('insufficient')) {
        message = err?.message || t('checkout.serverError');
      } else if (status === 400 && /payment method|not configured|currently disabled/i.test(err?.message ?? '')) {
        message = t('checkout.paymentUnavailable');
      } else if (status === 422 && /address/i.test(err?.message ?? '')) {
        message = t('checkout.invalidAddress');
      } else {
        // Remaining 4xx validation failures carry safe, specific server messages.
        message = err?.message || t('checkout.serverError');
      }
      showToast('error', t('checkout.orderFailed'), message);
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
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
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('checkout.success')}</h1>
          <p className="text-gray-500 mt-2">{t('checkout.successDesc')}</p>
        </div>

        <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="text-start">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('checkout.orderId')}</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">{placedOrder.orderNumber}</p>
              </div>
              <Badge variant="success" className="rounded-xl px-4 py-1 font-black uppercase text-[10px] tracking-widest">{t('status.confirmed')}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-6 text-start">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('msg.restaurant')}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{placedOrder.vendorName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('orders.total')}</p>
                <p className="text-sm font-black text-emerald-600">{formatPrice(placedOrder.totalAmount)}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center gap-4 text-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('orders.status')}</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {placedOrder.riderId ? t('orders.assigningRider') : t('orders.findingRider')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="brand" className="rounded-2xl py-6 font-black uppercase text-xs tracking-widest shadow-lg" onClick={() => navigate(`/customer/orders/${placedOrder.id}`)}>
            <Package className="w-4 h-4 mr-2" /> {t('orders.details')}
          </Button>
          <Button variant="outline" className="rounded-2xl py-6 font-black uppercase text-xs tracking-widest border-gray-200" onClick={() => navigate('/track-order')}>
            <MapPin className="w-4 h-4 mr-2" /> {t('checkout.track')}
          </Button>
        </div>

        <button onClick={() => navigate('/')} className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] hover:underline">
          {t('auth.forgot.backToLogin')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-32">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            {t('checkout.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1 ms-1">Complete your food order from {cart[0]?.product.vendorName || 'Takoradi'}</p>
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
              {t('checkout.step')} {s}
            </div>
          ))}
        </div>
      </div>

      {/* Vendor availability banner */}
      {cart.length > 0 && availability === 'checking' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <p className="text-[11px] font-bold uppercase tracking-widest">{t('checkout.checkingAvailability')}</p>
        </div>
      )}
      {cart.length > 0 && availability === 'unavailable' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[11px] font-black uppercase tracking-widest">{t('checkout.unavailableTitle')}</p>
            <p className="text-[10px] font-medium text-red-500 mt-0.5">{t('checkout.unavailableMessage')}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl text-[9px] font-black uppercase tracking-widest border-red-200 text-red-600" onClick={checkVendorAvailability}>
            <RefreshCw className="w-3 h-3 me-1.5" /> {t('checkout.recheck')}
          </Button>
        </div>
      )}
      {cart.length > 0 && availability === 'unknown' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1 text-[11px] font-bold uppercase tracking-widest">{t('checkout.availabilityUnknown')}</p>
          <Button variant="outline" size="sm" className="rounded-xl text-[9px] font-black uppercase tracking-widest border-amber-200 text-amber-600" onClick={checkVendorAvailability}>
            <RefreshCw className="w-3 h-3 me-1.5" /> {t('checkout.retry')}
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">

        <div className="space-y-6">
          {step === 1 ? (
            <>
              {/* Delivery Choice */}
              <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {t('checkout.details')}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDeliveryMethod('delivery')}
                    className={cn("p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                      deliveryMethod === 'delivery' ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-gray-50 bg-gray-50 text-gray-400")}>
                    <Bike className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('checkout.delivery')}</span>
                  </button>
                  <button onClick={() => setDeliveryMethod('pickup')}
                    className={cn("p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                      deliveryMethod === 'pickup' ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-gray-50 bg-gray-50 text-gray-400")}>
                    <Clock className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('checkout.pickup')}</span>
                  </button>
                </div>

                {deliveryMethod === 'delivery' && (
                  <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <LocationSearch
                        id="checkout-delivery-location"
                        label={t('checkout.savedAddress')}
                        placeholder="Search or enter your delivery location…"
                        hint="Search, use your current location, or enter an address manually."
                        value={deliveryLocation}
                        onChange={(loc) => setDeliveryLocation(loc)}
                        allowCurrentLocation
                        savedOptions={(customerProfile.addresses || []).map((a) => ({
                          address: a.address,
                          area: a.address,
                          city: a.city,
                          latitude: a.latitude,
                          longitude: a.longitude,
                          source: 'saved' as const,
                          deliveryAddressId: a.id,
                        }))}
                        allowSave
                        onSave={async (loc) => {
                          await addAddress({
                            title: loc.area || 'Saved location',
                            address: loc.address,
                            latitude: loc.latitude ?? undefined,
                            longitude: loc.longitude ?? undefined,
                            city: loc.city,
                            isDefault: false,
                          });
                          return true;
                        }}
                      />
                      {deliveryLocation?.address && (
                        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40">
                          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Delivering to</p>
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 truncate">{deliveryLocation.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ms-1">{t('deliver.instructions')}</label>
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
                      <Bike className="w-4 h-4" /> {t('common.rider')}
                    </h3>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-gray-200">{t('checkout.nearbyFleet')}</Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {(activeRiders.length ? activeRiders : riders.slice(0, 4)).map((r) => (
                      <button key={r.id} onClick={() => setSelectedRider(r)}
                        className={cn("p-4 rounded-3xl border-2 flex items-center gap-4 text-start transition-all",
                          selectedRider?.id === r.id ? "border-emerald-500 bg-white dark:bg-slate-800 shadow-md ring-4 ring-emerald-500/5" : "border-gray-50 bg-gray-50/50 hover:border-emerald-200")}>
                        <img src={r.avatar} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900 dark:text-white truncate">{r.name}</p>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                            <span className="flex items-center gap-0.5 text-amber-500"><Star className="w-2.5 h-2.5 fill-current" /> {r.rating}</span>
                            <span>{r.vehicleType}</span>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="text-[10px] font-black text-emerald-600">{formatPrice(r.deliveryFee)}</p>
                          <p className="text-[8px] text-gray-400 uppercase">{r.etaMinutes}m ETA</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              <Button className="w-full rounded-[1.75rem] py-8 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.98] transition-all" onClick={() => setStep(2)} disabled={availability === 'checking' || availability === 'unavailable'}>
                {availability === 'checking' ? t('checkout.checkingAvailability') : t('common.continue')} <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Button>
            </>
          ) : (
            <>
              {/* Payment Selection */}
              <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> {t('checkout.payment')}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!gatewaysLoaded ? (
                    <div className="col-span-full p-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Loading payment options…</p>
                    </div>
                  ) : availablePayments.length === 0 ? (
                    <div className="col-span-full p-8 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No payment methods are currently available</p>
                      <p className="text-[11px] text-gray-400 mt-1">Please try again later or contact support.</p>
                    </div>
                  ) : (
                    availablePayments.map((pm) => (
                      <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                        className={cn("p-5 rounded-[2rem] border-2 flex items-center gap-4 text-start transition-all relative overflow-hidden group",
                          paymentMethod === pm.value ? "border-emerald-500 bg-white dark:bg-slate-800 shadow-md" : "border-gray-50 bg-gray-50/50 hover:border-emerald-200")}>
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black text-white shadow-lg", pm.color)}>
                          {pm.icon}
                        </div>
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{pm.label}</span>
                        {paymentMethod === pm.value && <CheckCircle2 className="w-5 h-5 text-emerald-500 ms-auto" />}
                      </button>
                    ))
                  )}
                </div>

                {unavailablePayments.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Not currently available</p>
                    {unavailablePayments.map((u) => (
                      <div key={u.id} aria-disabled="true"
                        className="p-4 rounded-[1.5rem] border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center gap-4 opacity-60 select-none">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-gray-500 uppercase tracking-tight">{u.label}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{u.reason}</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-gray-200 text-gray-400">Unavailable</Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-blue-500 flex-shrink-0" />
                  <p className="text-[11px] text-blue-600 dark:text-blue-300 font-medium leading-relaxed uppercase tracking-widest">{t('checkout.secureNotice')}</p>
                </div>
              </Card>

              <div className="flex gap-3">
                 <Button variant="outline" className="rounded-2xl py-8 px-8 font-black uppercase text-xs tracking-widest border-gray-200" onClick={() => setStep(1)}>{t('common.back')}</Button>
                 <Button className="flex-1 rounded-2xl py-8 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/20" onClick={handlePlaceOrder} disabled={isSubmitting || availability === 'checking' || availability === 'unavailable' || !paymentMethod}>
                   {isSubmitting ? t('checkout.placingOrder') : availability === 'checking' ? t('checkout.checkingAvailability') : t('checkout.placeOrder')}
                 </Button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Summary */}
        <aside className="space-y-6">
          <Card className="rounded-[2.5rem] border-none bg-white dark:bg-slate-900 shadow-2xl p-8 space-y-6 border border-gray-100 dark:border-slate-800 lg:sticky lg:top-24">
            <h3 className="font-black text-xl uppercase tracking-widest border-b pb-4">{t('cart.summary')}</h3>

            <div className="space-y-4 max-h-64 overflow-y-auto pe-2 scrollbar-none">
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
                <span>{t('cart.subtotal')}</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>{t('cart.tax')}</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(estimatedTax)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <AnimatedTooltip
                  variant="sadoc"
                  content="Estimated delivery fee for this route. The final fee is recalculated at order confirmation using the platform pricing engine, which adjusts for current fuel prices when fuel data is available."
                  triggerClassName="px-1 py-0.5"
                >
                  <span>{t('cart.deliveryFee')}</span>
                </AnimatedTooltip>
                <span className="text-emerald-600">{formatPrice(deliveryFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  <span>{t('cart.promo')}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-[0.2em]">{t('cart.total')}</span>
                <span className="text-2xl font-black text-emerald-600">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
               Takoradi Marketplace Delivery
            </div>
          </Card>

          <div className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-slate-800/30 rounded-[2rem] border border-gray-100 dark:border-slate-800">
             <AlertCircle className="w-6 h-6 text-gray-400 flex-shrink-0" />
             <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{t('checkout.etaNotice')}</p>
          </div>
        </aside>

      </div>
    </div>
  );
};
