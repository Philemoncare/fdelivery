import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Bike, Star, Clock, CreditCard,
  ChevronRight, Plus, X, CheckCircle2, Timer, Navigation, ShieldCheck,
  Send, RotateCcw, AlertCircle, Package, Wallet, Truck, Info, Loader2,
  ArrowLeft, ArrowRight, MapPinned, Phone
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { LocationSearch } from '@/src/components/common/LocationSearch';
import { OrderService, PaymentService } from '@/src/services/api';
import { cn } from '@/src/lib/utils';
import type { DispatchRider, Order, DeliveryLocation, PackageQuote, Address } from '@/src/types';
import { useNavigate } from 'react-router-dom';

const PACKAGE_SIZES = (t: any) => [
  { value: 'Small', label: t('common.small') || 'Small' },
  { value: 'Medium', label: t('common.medium') || 'Medium' },
  { value: 'Large', label: t('common.large') || 'Large' },
  { value: 'Extra Large', label: t('common.extraLarge') || 'Extra Large' },
] as const;

const PACKAGE_TYPES = (t: any) => [
  { value: 'Document', label: t('deliver.typeDocument') || 'Document' },
  { value: 'Clothes', label: t('deliver.typeClothes') || 'Clothes' },
  { value: 'Food', label: t('deliver.typeFood') || 'Food' },
  { value: 'Groceries', label: t('deliver.typeGroceries') || 'Groceries' },
  { value: 'Electronics', label: t('deliver.typeElectronics') || 'Electronics' },
  { value: 'Medication', label: t('deliver.typeMedication') || 'Medication' },
  { value: 'Other', label: t('common.other') || 'Other' },
] as const;

const SERVICES = (t: any) => [
  { value: 'Standard', label: t('deliver.speedStandard') || 'Standard' },
  { value: 'Express', label: t('deliver.speedExpress') || 'Express' },
] as const;
const STEPS = (t: any) => [
  { n: 1, title: t('deliver.route'), desc: t('deliver.pickupDestinationDesc') },
  { n: 2, title: t('deliver.recipient'), desc: t('deliver.recipient') },
  { n: 3, title: t('deliver.package'), desc: t('deliver.packageDetails') },
  { n: 4, title: t('deliver.options'), desc: t('deliver.options') },
  { n: 5, title: t('deliver.review'), desc: t('deliver.review') },
] as const;

// Takoradi/Sekondi service corridor reference for the honest "we don't deliver
// here" state — never silently pretends a route is supported.
const TAKORADI_REF = { lat: 4.9031, lng: -1.7753 };
const SERVICE_RADIUS_KM = 45;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidGhanaPhone(input: string): boolean {
  const cleaned = String(input || '').replace(/[^\d+]/g, '');
  let d = cleaned.replace(/^\+/, '');
  if (d.startsWith('233')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^[2-5]\d{8}$/.test(d);
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Request Created',
  confirmed: 'Accepted',
  rider_assigned: 'Rider Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  arriving: 'Arrived',
  awaiting_confirmation: 'Recipient Confirmation',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  refunded: 'Refunded'
};

const isTerminal = (s?: string) => ['delivered', 'completed', 'cancelled', 'failed', 'refunded'].includes(s || '');

const inputClass = "w-full bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/60 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all";
const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ms-1";

export function DeliverSomethingPage() {
  const { riders, formatPrice, customerProfile, showToast, createPackageDelivery, orders, setSelectedOrder, updateOrderStatus, addAddress, t } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<'book' | 'track'>('book');
  const [step, setStep] = useState(1);
  const [deliveryType, setDeliveryType] = useState<'PACKAGE' | 'PASS'>('PACKAGE');
  const [bookingState, setBookingState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [created, setCreated] = useState<Order | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const [pickup, setPickup] = useState<DeliveryLocation | null>(null);
  const [dropoff, setDropoff] = useState<DeliveryLocation | null>(null);
  const [recipient, setRecipient] = useState({ name: '', phone: '', note: '' });
  const [pkg, setPkg] = useState({
    size: 'Medium' as string,
    type: 'Document' as string,
    weightKg: 1,
    description: '',
    instructions: '',
  });
  const [options, setOptions] = useState({
    service: 'Standard' as string,
    paymentMethod: 'MTN MoMo' as string,
    coupon: '',
  });

  const defaultAddress = customerProfile?.addresses?.find(a => a.isDefault)?.address
    || customerProfile?.location?.address
    || customerProfile?.address
    || '';

  useEffect(() => {
    if (!pickup && defaultAddress) {
      setPickup({ address: defaultAddress, area: defaultAddress.split(',')[0], city: 'Takoradi', region: 'Western Region', source: 'seed' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProfile?.id]);

  // Real package/pass bookings from the backend — the SAME orders pipeline as
  // food. Never invented locally.
  const deliveries = useMemo(() =>
    (orders || []).filter(o =>
      o.customerId === user?.id &&
      ['PACKAGE', 'PASS'].includes(String(o.deliveryType || '').toUpperCase())
    ),
    [orders, user?.id]
  );
  const activeDelivery = deliveries.find(d => !isTerminal(d.status)) || null;
  const history = deliveries.filter(d => isTerminal(d.status));

  const savedOptions = useMemo<DeliveryLocation[]>(() =>
    (customerProfile?.addresses || []).map(a => ({
      address: a.addressLine1 || a.address || a.title || '',
      area: a.addressLine1 || undefined,
      city: a.city || undefined,
      region: a.state || undefined,
      landmark: a.addressLine2 || undefined,
      instructions: a.deliveryInstructions || undefined,
      latitude: a.latitude,
      longitude: a.longitude,
      source: 'saved' as const,
    })).filter(l => l.address),
    [customerProfile?.addresses]
  );

  const selectedRider = riders.find(r => r.id === selectedRiderId) || null;

  // ---- Quote (server-authoritative, debounced) ----
  const [quote, setQuote] = useState<PackageQuote | null>(null);
  const [quoteState, setQuoteState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteReady, setQuoteReady] = useState(false);
  // Payment availability comes from the server gateway config (single source of truth).
  const [gateways, setGateways] = useState<any[]>([]);
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false);

  useEffect(() => {
    PaymentService.getGateways()
      .then(g => setGateways(Array.isArray(g) ? g : []))
      .catch(() => setGateways([]))
      .finally(() => setGatewaysLoaded(true));
  }, []);

  const availableGatewayMethods = useMemo(() => {
    const list = (Array.isArray(gateways) ? gateways : [])
      .filter((g: any) => g.configured && g.enabled)
      .map((g: any) => {
        const key = String((g.id || '') + ' ' + (g.name || '')).toLowerCase();
        if (/wallet|omni/.test(key)) return { value: 'OmniWallet', label: t('nav.wallet') || 'OmniWallet' };
        if (/cod|cash on delivery/.test(key)) return { value: 'Cash on Delivery', label: t('common.paymentCash') || 'Cash on Delivery' };
        if (/mtn/.test(key)) return { value: 'MTN MoMo', label: 'MTN MoMo' };
        if (/telecel|vodafone/.test(key)) return { value: 'Telecel Cash', label: 'Telecel Cash' };
        if (/airteltigo/.test(key)) return { value: 'AirtelTigo Money', label: 'AirtelTigo Money' };
        return { value: g.id, label: g.name || g.id };
      });
    return list;
  }, [gateways, t]);

  useEffect(() => {
    if (gatewaysLoaded && availableGatewayMethods.length && !availableGatewayMethods.some(m => m.value === options.paymentMethod)) {
      setOptions(prev => ({ ...prev, paymentMethod: availableGatewayMethods[0].value }));
    }
  }, [gatewaysLoaded, availableGatewayMethods, options.paymentMethod]);

  const outOfArea = useCallback((loc: DeliveryLocation | null): boolean => {
    if (!loc?.latitude || !loc?.longitude) return false;
    return haversineKm(loc.latitude, loc.longitude, TAKORADI_REF.lat, TAKORADI_REF.lng) > SERVICE_RADIUS_KM;
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!pickup?.address || !dropoff?.address) {
      setQuoteState('idle');
      return;
    }
    if (outOfArea(pickup) || outOfArea(dropoff)) {
      setQuoteState('error');
      setQuoteError('We currently don\'t deliver to this area.');
      return;
    }
    setQuoteState('loading');
    setQuoteError(null);
    try {
      const q = await OrderService.quotePackage({
        deliveryType,
        pickupLat: pickup.latitude ?? null,
        pickupLng: pickup.longitude ?? null,
        dropoffLat: dropoff.latitude ?? null,
        dropoffLng: dropoff.longitude ?? null,
        packageSize: pkg.size,
        weightKg: pkg.weightKg,
        service: options.service,
        riderId: selectedRiderId ?? undefined,
        couponCode: options.coupon.trim() || undefined,
      });
      setQuote(q);
      setQuoteState('ok');
      setQuoteReady(true);
    } catch (e: any) {
      setQuoteState('error');
      setQuoteReady(false);
      setQuoteError(e?.message || 'Unable to calculate delivery fee.');
    }
  }, [pickup, dropoff, deliveryType, pkg.size, pkg.weightKg, options.service, options.coupon, selectedRiderId, outOfArea]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchQuote();
    }, 450);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // ---- Validation per step ----
  const sameLocation = useMemo(() => {
    if (!pickup?.address || !dropoff?.address) return false;
    if (pickup.address.trim().toLowerCase() === dropoff.address.trim().toLowerCase()) return true;
    if (pickup.latitude && pickup.longitude && dropoff.latitude && dropoff.longitude) {
      return haversineKm(pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude) < 0.05;
    }
    return false;
  }, [pickup, dropoff]);

  const stepValid = useCallback((n: number): string | null => {
    if (n === 1) {
      if (!pickup?.address?.trim()) return 'Choose where we should pick up the package.';
      if (!dropoff?.address?.trim()) return 'Choose the delivery destination.';
      if (sameLocation) return 'Pickup and destination cannot be the same location.';
      return null;
    }
    if (n === 2) {
      if (!recipient.name.trim() || recipient.name.trim().length < 2) return 'Enter the recipient name.';
      if (!isValidGhanaPhone(recipient.phone)) return 'Enter a valid Ghana phone number, e.g. +233 24 000 0000.';
      return null;
    }
    if (n === 3) {
      const w = Number(pkg.weightKg);
      if (!Number.isFinite(w) || w <= 0 || w > 200) return 'Weight must be between 0 and 200kg.';
      if (!pkg.type.trim()) return 'Choose a package type.';
      return null;
    }
    return null;
  }, [pickup, dropoff, sameLocation, recipient, pkg]);

  const goNext = () => {
    const err = stepValid(step);
    if (err) {
      showToast('Check the form', err, 'warning');
      return;
    }
    setStep(s => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAddress = async (loc: DeliveryLocation): Promise<boolean> => {
    if (!user) return false;
    const payload: Partial<Address> = {
      label: 'other',
      recipientName: recipient.name || user.name || '',
      recipientPhone: recipient.phone || user.phone || '',
      addressLine1: loc.address,
      city: loc.city || 'Takoradi',
      state: loc.region || 'Western Region',
      country: 'Ghana',
      latitude: loc.latitude ?? 0,
      longitude: loc.longitude ?? 0,
      deliveryInstructions: loc.instructions,
    };
    try {
      await addAddress(payload);
      showToast('Address Saved', 'Added to your saved addresses.');
      return true;
    } catch (e: any) {
      showToast('Could not save', e?.message || 'Saving failed.', 'warning');
      return false;
    }
  };

  const bookDelivery = async () => {
    for (let i = 1; i <= 5; i++) {
      const err = stepValid(i);
      if (err) {
        setStep(i);
        showToast('Check the form', err, 'warning');
        return;
      }
    }
    if (quoteState !== 'ok' || !quote) {
      setQuoteError(quoteError || 'Unable to calculate delivery fee.');
      setQuoteState('error');
      showToast('No price yet', 'Fetch the delivery fee before booking. Tap "Try again" in the summary.', 'warning');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBookingState('submitting');
    setBookingError(null);
    try {
      const createdOrder = await createPackageDelivery({
        deliveryType,
        riderId: selectedRider?.id,
        pickupAddress: pickup!.address,
        pickupLat: pickup!.latitude ?? null,
        pickupLng: pickup!.longitude ?? null,
        pickupArea: pickup!.area || null,
        pickupCity: pickup!.city || null,
        pickupRegion: pickup!.region || null,
        pickupLandmark: pickup!.landmark || null,
        pickupInstructions: pickup!.instructions || null,
        dropoffAddress: dropoff!.address,
        dropoffLat: dropoff!.latitude ?? null,
        dropoffLng: dropoff!.longitude ?? null,
        dropoffArea: dropoff!.area || null,
        dropoffCity: dropoff!.city || null,
        dropoffRegion: dropoff!.region || null,
        dropoffLandmark: dropoff!.landmark || null,
        dropoffInstructions: dropoff!.instructions || null,
        receiverName: recipient.name.trim(),
        receiverPhone: recipient.phone.trim(),
        receiverNote: recipient.note.trim(),
        packageSize: pkg.size,
        packageType: pkg.type,
        weightKg: Number(pkg.weightKg),
        service: options.service,
        note: pkg.description.trim(),
        specialInstructions: pkg.instructions.trim() || pkg.description.trim(),
        paymentMethod: options.paymentMethod,
        couponCode: options.coupon.trim() || undefined,
      });
      setCreated(createdOrder);
      setBookingState('success');
      if (createdOrder?.id) setSelectedOrder(createdOrder);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setBookingState('error');
      setBookingError(e?.message || 'Could not book this delivery. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      submittingRef.current = false;
    }
  };

  const cancelDelivery = async (id: string) => {
    const job = deliveries.find(j => j.id === id);
    if (!job) return;
    if (!['pending', 'confirmed', 'rider_assigned'].includes(job.status)) {
      showToast('Cannot Cancel', 'Your parcel is already in motion.', 'warning');
      return;
    }
    if (!window.confirm('Cancel this delivery request? This cannot be undone.')) return;
    try {
      await updateOrderStatus(id, 'cancelled');
      showToast('Booking Cancelled', 'Your delivery request has been cancelled.');
    } catch (e: any) {
      showToast('Could not cancel', e?.message || 'Cancellation failed.', 'warning');
    }
  };

  const openTracking = (o: Order) => {
    setSelectedOrder(o);
    navigate('/track-order');
  };

  const bookAgain = (job: Order) => {
    setPickup({ address: job.dropoffAddress || '', area: job.dropoffArea || undefined, city: job.dropoffCity || undefined, region: job.dropoffRegion || undefined, latitude: job.dropoffLat, longitude: job.dropoffLng, source: 'manual' });
    setDropoff(null);
    setView('book');
    setStep(1);
    setBookingState('idle');
    setCreated(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetBooking = () => {
    setStep(1);
    setBookingState('idle');
    setCreated(null);
    setBookingError(null);
    setQuote(null);
    setQuoteState('idle');
  };

  const breakdown = quote?.breakdown;

  const quoteRows = useMemo(() => {
    if (!quote || !breakdown) return [];
    const rows: Array<{ label: string; value: number | null }> = [];
    rows.push({ label: 'Base delivery fee', value: breakdown.baseFee });
    if (breakdown.sizeFee > 0) rows.push({ label: `Size (${quote.packageSize})`, value: breakdown.sizeFee });
    if (breakdown.riderFee > 0) rows.push({ label: 'Rider distance fee', value: breakdown.riderFee });
    if (breakdown.distanceFee > 0) rows.push({ label: `Distance (${breakdown.distanceKm ?? '?'} km)`, value: breakdown.distanceFee });
    if (breakdown.weightFee > 0) rows.push({ label: 'Heavy parcel (over 5kg)', value: breakdown.weightFee });
    if (breakdown.serviceFee > 0) rows.push({ label: `Service (${quote.service} x${breakdown.serviceMultiplier})`, value: breakdown.serviceFee });
    if (breakdown.platformFee > 0) rows.push({ label: 'Platform fee', value: breakdown.platformFee });
    if (quote.discount > 0) rows.push({ label: 'Coupon discount', value: -quote.discount });
    return rows;
  }, [quote, breakdown]);

  const progress = (step / 5) * 100;
  const steps = STEPS(t);
  const packageSizes = PACKAGE_SIZES(t);
  const packageTypes = PACKAGE_TYPES(t);
  const services = SERVICES(t);
  const paymentMethods = availableGatewayMethods;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-16">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white p-8 sm:p-10 shadow-xl shadow-emerald-500/20">
        <div className="absolute -top-20 -end-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white border border-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Bike className="w-3.5 h-3.5" /> {t('header.takoradiExpress')}
            </span>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight">{t('deliver.title')}</h1>
            <p className="text-sm text-emerald-50 opacity-90 max-w-md">
              {t('deliver.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setView('book'); resetBooking(); }}
              className={cn(
                "rounded-2xl px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-all",
                view === 'book' ? "bg-white text-emerald-600 shadow-xl" : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
              )}
            >
              {t('deliver.book')}
            </button>
            <button
              onClick={() => setView('track')}
              className={cn(
                "rounded-2xl px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-all",
                view === 'track' ? "bg-white text-emerald-600 shadow-xl" : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
              )}
            >
              {t('deliver.trackHistory')}
            </button>
          </div>
        </div>
      </div>

      {view === 'book' ? (
        bookingState === 'success' && created ? (
          /* ---- Confirmation ---- */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl p-8 sm:p-10 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">{t('deliver.booked')}</h2>
                <p className="text-sm text-gray-500">
                  {created.deliveryType === 'PASS' ? 'Pass' : 'Package'} {created.orderNumber} {t('deliver.bookedDesc')}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 p-5 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>{t('common.from')}</span><span className="font-bold text-gray-900 dark:text-white text-end">{created.pickupAddress}</span></div>
                <div className="flex justify-between text-gray-500"><span>{t('common.to')}</span><span className="font-bold text-gray-900 dark:text-white text-end">{created.dropoffAddress}</span></div>
                <div className="flex justify-between text-gray-500"><span>{t('common.recipient')}</span><span className="font-bold text-gray-900 dark:text-white">{created.receiverName} · {created.receiverPhone}</span></div>
                <div className="flex justify-between text-gray-500"><span>{t('common.payment')}</span><span className="font-bold text-gray-900 dark:text-white">{created.paymentMethod} · {formatPrice(created.totalAmount)}</span></div>
                {created.dispatchRider && (
                  <div className="flex justify-between text-gray-500"><span>{t('common.rider')}</span><span className="font-bold text-gray-900 dark:text-white">{created.dispatchRider.name}</span></div>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Final fee is confirmed by the backend. When a rider accepts, you will be notified and can track it live.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => openTracking(created)} className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-4 uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4 rtl:-scale-x-100" /> {t('common.track')}
                </button>
                <button onClick={resetBooking} className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-black text-xs px-6 py-4 uppercase tracking-widest transition hover:border-emerald-400">
                  {t('deliver.book')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : bookingState === 'error' ? (
          /* ---- Booking failure: keep the data, show the real reason ---- */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-xl p-8 sm:p-10 text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">{t('checkout.orderFailed')}</h2>
                <p className="text-sm font-bold text-rose-500">{bookingError}</p>
                <p className="text-xs text-gray-400">{t('checkout.unavailableMessage')}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => setBookingState('idle')} className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-4 uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
                </button>
                <button onClick={resetBooking} className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-black text-xs px-8 py-4 uppercase tracking-widest">{t('common.retry')}</button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
            {/* ---- Booking form ---- */}
            <div className="space-y-6">
              {/* Stepper */}
              <div className="rounded-[1.75rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  {steps.map(s => (
                    <button
                      key={s.n}
                      onClick={() => { if (s.n < step || stepValid(step) === null) setStep(s.n); }}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 text-center py-1 rounded-xl transition-colors",
                        step === s.n ? "text-emerald-600" : s.n < step ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"
                      )}
                    >
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all",
                        step === s.n ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" :
                          s.n < step ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                      )}>
                        {s.n < step ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{s.title}</span>
                    </button>
                  ))}
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* STEP 1 — Route */}
              {step === 1 && (
                <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                        <MapPinned className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-black text-gray-900 dark:text-white">{t('deliver.pickupDestination')}</h2>
                        <p className="text-xs text-gray-500">{t('deliver.pickupDestinationDesc')}</p>
                      </div>
                    </div>
                    {/* Delivery type */}
                    <div className="flex rounded-xl border-2 border-gray-100 dark:border-slate-800 p-1">
                      {(['PACKAGE', 'PASS'] as const).map(t_type => (
                        <button
                          key={t_type}
                          onClick={() => setDeliveryType(t_type)}
                          className={cn(
                            "px-3 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            deliveryType === t_type ? "bg-emerald-500 text-white shadow" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                          )}
                        >
                          {t_type === 'PACKAGE' ? t('deliver.package') : t('deliver.type')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <LocationSearch
                      id="pickup-search"
                      label={t('deliver.pickupLocation')}
                      placeholder={t('address.placeholder')}
                      hint={t('location.manual')}
                      accent="emerald"
                      allowCurrentLocation
                      value={pickup}
                      onChange={setPickup}
                      savedOptions={savedOptions}
                    />
                    <LocationSearch
                      id="dropoff-search"
                      label={t('deliver.dropoffLocation')}
                      placeholder={t('address.placeholder')}
                      hint={t('location.manual')}
                      accent="rose"
                      value={dropoff}
                      onChange={setDropoff}
                      savedOptions={savedOptions}
                      allowSave
                      onSave={handleSaveAddress}
                    />
                  </div>

                  {sameLocation && (
                    <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {t('checkout.addressRequired')}
                    </p>
                  )}
                  {outOfArea(pickup) || outOfArea(dropoff) ? (
                    <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {t('checkout.unavailableMessage')}
                    </p>
                  ) : null}

                  <div className="flex justify-end">
                    <button onClick={goNext} className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-4 uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                      {t('common.continue')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </motion.section>
              )}

              {/* STEP 2 — Recipient */}
              {step === 2 && (
                <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-900 dark:text-white">{t('deliver.recipient')}</h2>
                      <p className="text-xs text-gray-500">{t('deliver.recipient')}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={labelClass}>{t('common.recipient')} Name *</label>
                      <input type="text" value={recipient.name} onChange={e => setRecipient({ ...recipient, name: e.target.value })} placeholder="e.g. Ama Mensah" className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>{t('common.recipient')} Phone *</label>
                      <input type="tel" inputMode="tel" value={recipient.phone} onChange={e => setRecipient({ ...recipient, phone: e.target.value })} placeholder="+233 24 000 0000" className={inputClass} />
                      <p className="text-[10px] text-gray-400 font-medium ms-1">Ghana number, e.g. 024 000 0000 or +233 24 000 0000</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>{t('deliver.description')} ({t('common.optional')})</label>
                    <textarea value={recipient.note} onChange={e => setRecipient({ ...recipient, note: e.target.value })} rows={2} placeholder="e.g. Call when you arrive; leave at security desk" className={cn(inputClass, "resize-none")} />
                  </div>
                  <div className="flex justify-between">
                    <button onClick={goBack} className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-black text-xs px-6 py-4 uppercase tracking-widest flex items-center gap-2 hover:border-emerald-400 transition">
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
                    </button>
                    <button onClick={goNext} className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-4 uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                      {t('common.continue')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </motion.section>
              )}

              {/* STEP 3 — Package / Pass */}
              {step === 3 && (
                <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-900 dark:text-white">{deliveryType === 'PASS' ? t('deliver.passDetails') : t('deliver.packageDetails')}</h2>
                      <p className="text-xs text-gray-500">{deliveryType === 'PASS' ? t('deliver.passDetails') : t('deliver.packageDetails')}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={labelClass}>{deliveryType === 'PASS' ? t('deliver.type') : t('deliver.packageType')} *</label>
                      <select value={pkg.type} onChange={e => setPkg({ ...pkg, type: e.target.value })} className={inputClass}>
                        {packageTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    {deliveryType === 'PACKAGE' && (
                      <div className="space-y-2">
                        <label className={labelClass}>{t('deliver.packageSize')}</label>
                        <select value={pkg.size} onChange={e => setPkg({ ...pkg, size: e.target.value })} className={inputClass}>
                          {packageSizes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className={labelClass}>{t('deliver.weight')} *</label>
                      <input type="number" inputMode="decimal" min={0.5} max={200} step={0.5} value={pkg.weightKg} onChange={e => setPkg({ ...pkg, weightKg: Number(e.target.value) })} className={inputClass} />
                      <p className="text-[10px] text-gray-400 font-medium ms-1">{t('deliver.weightMax')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>{t('deliver.description')} ({t('common.optional')})</label>
                    <input type="text" value={pkg.description} onChange={e => setPkg({ ...pkg, description: e.target.value })} placeholder="e.g. Official documents, fragile electronics" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>{t('deliver.instructions')} ({t('common.optional')})</label>
                    <textarea value={pkg.instructions} onChange={e => setPkg({ ...pkg, instructions: e.target.value })} rows={2} placeholder="e.g. Handle with care, do not bend, keep upright" className={cn(inputClass, "resize-none")} />
                  </div>

                  <div className="flex justify-between">
                    <button onClick={goBack} className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-black text-xs px-6 py-4 uppercase tracking-widest flex items-center gap-2 hover:border-emerald-400 transition">
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
                    </button>
                    <button onClick={goNext} className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-4 uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                      {t('common.continue')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </motion.section>
              )}

              {/* STEP 4 — Options */}
              {step === 4 && (
                <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                      <Timer className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-900 dark:text-white">{t('deliver.options')}</h2>
                      <p className="text-xs text-gray-500">{t('deliver.options')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>{t('deliver.speed')}</label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {services.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setOptions({ ...options, service: s.value })}
                          className={cn(
                            "p-5 rounded-2xl border-2 text-left transition-all",
                            options.service === s.value
                              ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/10"
                              : "border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/40"
                          )}
                        >
                          <p className="font-black text-sm uppercase tracking-widest">{s.label}</p>
                          <p className="text-[11px] text-gray-500 mt-1 font-medium">
                            {s.value === 'Express' ? t('deliver.speedExpress') : t('deliver.speedStandard')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>{t('deliver.payWith')}</label>
                    <select value={options.paymentMethod} onChange={e => setOptions({ ...options, paymentMethod: e.target.value })} className={inputClass}>
                      {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={goBack} className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-black text-xs px-6 py-4 uppercase tracking-widest flex items-center gap-2 hover:border-emerald-400 transition">
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
                    </button>
                    <button onClick={goNext} className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-4 uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                      {t('deliver.review')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </motion.section>
              )}

              {/* STEP 5 — Review */}
              {step === 5 && (
                <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-500">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-900 dark:text-white">{t('deliver.review')}</h2>
                      <p className="text-xs text-gray-500">{t('deliver.review')}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
                    <ReviewRow icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />} label={t('common.from')} value={pickup?.address || '—'} />
                    <ReviewRow icon={<MapPin className="w-3.5 h-3.5 text-rose-500" />} label={t('common.to')} value={dropoff?.address || '—'} />
                    <ReviewRow icon={<Phone className="w-3.5 h-3.5 text-blue-500" />} label={t('common.recipient')} value={`${recipient.name || '—'} · ${recipient.phone || ''}`} />
                    <ReviewRow icon={<Package className="w-3.5 h-3.5 text-amber-500" />} label={t('deliver.package')} value={`${pkg.type}${deliveryType === 'PACKAGE' ? ` · ${pkg.size}` : ''} · ${pkg.weightKg}kg`} />
                    <ReviewRow icon={<Timer className="w-3.5 h-3.5 text-blue-500" />} label={t('deliver.speed')} value={options.service} />
                    <ReviewRow icon={<Wallet className="w-3.5 h-3.5 text-emerald-500" />} label={t('common.payment')} value={options.paymentMethod} />
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>{t('cart.voucher')} ({t('common.optional')})</label>
                    <input type="text" value={options.coupon} onChange={e => setOptions({ ...options, coupon: e.target.value })} placeholder="e.g. FREE20" className={inputClass} />
                  </div>

                  <div className="flex justify-between pt-1">
                    <button onClick={goBack} className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-black text-xs px-6 py-4 uppercase tracking-widest flex items-center gap-2 hover:border-emerald-400 transition">
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
                    </button>
                    <button
                      onClick={bookDelivery}
                      disabled={bookingState === 'submitting' || quoteState !== 'ok'}
                      className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm px-8 py-4 uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {bookingState === 'submitting' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> {t('deliver.booking')}</>
                      ) : (
                        <><Send className="w-4 h-4" /> {t('deliver.confirmBook')}</>
                      )}
                    </button>
                  </div>
                  {quoteState !== 'ok' && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {t('deliver.verifiedOnly')}
                    </p>
                  )}
                </motion.section>
              )}
            </div>

            {/* ---- Quote / summary (right on desktop, below on mobile) ---- */}
            <aside className="space-y-6 lg:sticky lg:top-28">
              <section className="p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-5">
                <h3 className="font-black uppercase tracking-widest text-xs text-emerald-400 flex items-center gap-2"><Wallet className="w-4 h-4" /> {t('deliver.quote')}</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">{t('common.from')}</span>
                    <span className="font-bold text-white text-end">{pickup?.address || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">{t('common.to')}</span>
                    <span className="font-bold text-white text-end">{dropoff?.address || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">{t('deliver.type')}</span>
                    <span className="font-bold text-white">{deliveryType === 'PASS' ? 'Pass' : 'Package'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">{t('deliver.package')}</span>
                    <span className="font-bold text-white">{pkg.type}{deliveryType === 'PACKAGE' ? ` · ${pkg.size}` : ''} · {pkg.weightKg}kg</span>
                  </div>
                  {quote?.distanceKm != null && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">{t('common.distance')}</span>
                      <span className="font-bold text-white">{quote.distanceKm} km</span>
                    </div>
                  )}
                  {quote && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">{t('common.eta')}</span>
                      <span className="font-bold text-white">{quote.estimatedDeliveryTime}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10">
                  {quoteState === 'loading' && (
                    <div className="py-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('deliver.calculating')}
                    </div>
                  )}
                  {quoteState === 'idle' && (
                    <p className="py-4 text-xs text-slate-400 text-center">
                      {t('deliver.pickupDestinationDesc')}
                    </p>
                  )}
                  {quoteState === 'error' && (
                    <div className="py-2 text-center space-y-2">
                      <p className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {quoteError}</p>
                      <button onClick={() => void fetchQuote()} className="rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition">
                        {t('common.retry')}
                      </button>
                    </div>
                  )}
                  {quoteState === 'ok' && breakdown && (
                    <div className="space-y-2 text-xs text-slate-300">
                      {quoteRows.map(r => (
                        <div key={r.label} className="flex justify-between">
                          <span>{r.label}</span>
                          <span className={cn("font-bold", (r.value ?? 0) < 0 ? "text-emerald-400" : "text-white")}>
                            {r.value === 0 ? '—' : (r.value ?? 0) < 0 ? `-${formatPrice(-(r.value ?? 0))}` : formatPrice(r.value ?? 0)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-3 mt-3 border-t border-white/10 flex items-end justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('common.total')}</span>
                        <span className="text-3xl font-black text-emerald-400">{formatPrice(quote.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="p-5 rounded-[1.75rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">{t('deliver.chooseRider')}</h3>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{t('deliver.autoAssign')}</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <button
                    onClick={() => setSelectedRiderId(null)}
                    className={cn(
                      "w-full p-3 rounded-xl border-2 text-left transition-all text-xs",
                      !selectedRiderId ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-gray-100 dark:border-slate-800 hover:border-emerald-500/30"
                    )}
                  >
                    <span className="font-black text-gray-900 dark:text-white">{t('deliver.letDispatchMatch')}</span>
                    <span className="block text-[10px] text-gray-400 font-medium mt-0.5">{t('deliver.fastestRider')}</span>
                  </button>
                  {riders.filter(r => r.isAvailable !== false && r.status !== 'OFFLINE').slice(0, 5).map(rider => (
                    <button
                      key={rider.id}
                      onClick={() => setSelectedRiderId(rider.id)}
                      className={cn(
                        "w-full p-3 rounded-xl border-2 text-left transition-all",
                        selectedRiderId === rider.id ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-gray-100 dark:border-slate-800 hover:border-emerald-500/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={rider.avatar} alt={rider.name} className="w-9 h-9 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{rider.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{rider.vehicleType} · {rider.vehicleNumber}</p>
                        </div>
                        <span className="text-[11px] text-amber-500 font-black flex items-center gap-1 shrink-0"><Star className="w-3 h-3 fill-current" /> {rider.rating || '4.8'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <p className="text-[10px] text-gray-400 leading-relaxed flex items-start gap-1.5 px-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {t('deliver.verifiedOnly')}
              </p>
            </aside>
          </div>
        )
      ) : (
        /* ---- Tracking & History (real backend orders) ---- */
        <div className="space-y-8">
          {activeDelivery ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{t('deliver.trackHistory')}</span>
                  </div>
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    {activeDelivery.orderNumber} <span className="text-sm font-bold text-slate-400">· {activeDelivery.service || 'Standard'}</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    {activeDelivery.packageSize} {activeDelivery.packageType?.toLowerCase()} · {activeDelivery.weightKg}kg · to {activeDelivery.receiverName}
                  </p>
                </div>
                <span className={cn(
                  "rounded-2xl px-5 py-3 font-black text-xs uppercase tracking-widest shadow-lg",
                  ['delivered', 'completed'].includes(activeDelivery.status)
                    ? "bg-emerald-500 text-white"
                    : "bg-white/10 text-emerald-300 border border-emerald-400/30"
                )}>
                  {t(`status.${activeDelivery.status}`) || activeDelivery.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid sm:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.from')}</p>
                    <p className="font-bold flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {activeDelivery.pickupAddress}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.to')}</p>
                    <p className="font-bold flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {activeDelivery.dropoffAddress}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.recipient')}</p>
                    <p className="font-bold">{activeDelivery.receiverName} · {activeDelivery.receiverPhone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.payment')}</p>
                    <p className="font-bold flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {activeDelivery.paymentMethod} · {formatPrice(activeDelivery.totalAmount)}</p>
                  </div>
                </div>
                {activeDelivery.riderId && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                    <Bike className="w-4 h-4 flex-shrink-0" />
                    {t('orders.findingRider')}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button onClick={() => openTracking(activeDelivery)} className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-4 uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                    <Navigation className="w-4 h-4" /> {t('common.track')}
                  </button>
                  {['pending', 'confirmed', 'rider_assigned'].includes(activeDelivery.status) && (
                    <button onClick={() => cancelDelivery(activeDelivery.id)} className="rounded-2xl border-2 border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-xs px-6 py-4 uppercase tracking-widest transition">
                      {t('common.cancel')}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> {t('deliver.verifiedOnly')}</p>
              </div>
            </motion.div>
          ) : (
            <div className="p-16 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <Truck className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('deliver.noActive')}</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">{t('deliver.noActiveDesc')}</p>
              <button onClick={() => { setView('book'); resetBooking(); }} className="mt-2 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 uppercase tracking-widest">
                <Plus className="w-4 h-4" /> {t('deliver.book')}
              </button>
            </div>
          )}

          {/* History */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-gray-900 dark:text-white">{t('deliver.history')}</h2>
                <p className="text-xs text-gray-500">{t('deliver.historyDesc')}</p>
              </div>
            </div>
            {history.length === 0 ? (
              <div className="p-10 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-slate-800 text-center">
                <p className="text-sm font-bold text-gray-400">{t('deliver.noHistory')}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {history.map(job => (
                  <div key={job.id} className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 group hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-black text-emerald-600">{job.orderNumber}</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            ['delivered', 'completed'].includes(job.status) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950/40"
                          )}>
                            {t(`status.${job.status}`) || job.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">{new Date(job.updatedAt || job.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-lg font-black text-gray-900 dark:text-white">{formatPrice(job.totalAmount)}</p>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <p className="flex items-center gap-2 font-medium"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {job.pickupAddress}</p>
                      <p className="flex items-center gap-2 font-medium ps-3 border-s-2 border-dashed border-gray-200 dark:border-slate-700"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {job.dropoffAddress}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('common.to')}: {job.receiverName}</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openTracking(job)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" /> {t('common.track')}
                        </button>
                        <button onClick={() => bookAgain(job)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">{t('orders.reorder')}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 px-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">{label}</span>
      </div>
      <span className="text-xs font-bold text-gray-900 dark:text-white text-end min-w-0 truncate">{value}</span>
    </div>
  );
}
