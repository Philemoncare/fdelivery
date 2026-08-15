import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import {
  Bike,
  Store,
  MapPin,
  Star,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  ShieldCheck,
  AlertCircle,
  Search,
  Lock,
  ArrowRight,
  Package,
  PackageCheck,
  Send,
  Navigation,
  RefreshCw,
  UserCheck,
  X,
  Undo2
} from 'lucide-react';
import type { OrderStatus, Review, DispatchRider } from '../../types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LiveMap } from '../common/LiveMap';
import { OrderService, InteractionService } from '@/src/services/api';
import { cn } from '@/src/lib/utils';

type DeliveryKind = 'food' | 'package';

const deliveryKind = (o: any): DeliveryKind =>
  ['PACKAGE', 'PASS'].includes(String(o?.deliveryType || '').toUpperCase()) ? 'package' : 'food';

const isTerminal = (s?: string) => ['delivered', 'completed', 'cancelled', 'failed', 'refunded'].includes(s || '');
const isCancelledTerminal = (s?: string) => ['cancelled', 'refunded', 'failed'].includes(s || '');
const isCompletedTerminal = (s?: string) => ['delivered', 'completed'].includes(s || '');
const isOnRoad = (s?: string) => ['picked_up', 'in_transit', 'arriving', 'awaiting_confirmation'].includes(s || '');
const isConfirmed = (s?: string) => !['pending', 'cancelled', 'failed', 'refunded'].includes(s || '');
const ratingUnlocked = (s?: string) => ['delivered', 'completed'].includes(s || '');

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Order Confirmed',
  preparing: 'Preparing Your Order',
  ready_for_pickup: 'Ready for Pickup',
  rider_assigned: 'Rider Assigned',
  picked_up: 'Picked Up',
  in_transit: 'Out for Delivery',
  arriving: 'Arriving Soon',
  awaiting_confirmation: 'Recipient Confirmation Required',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  refunded: 'Refunded'
};

// Delivery pipeline labels (authoritative `deliveryStatus` from the backend).
const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PROCESSING: 'Processing',
  AWAITING_RIDER: 'Awaiting Rider',
  RIDER_ASSIGNED: 'Rider Assigned',
  IN_TRANSIT: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Delivery Ended',
  FAILED: 'Delivery Failed'
};

interface TimelineEvent { key: string; label: string; time: string; terminal?: boolean; }

interface TimelineStep { key: OrderStatus; label: string; }

export const OrderTrackingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlOrderId = searchParams.get('order');
  const {
    orders,
    selectedOrder,
    formatPrice,
    riders,
    isLoading,
    showToast,
    receiverConfirmDelivery,
    openOrderConversation,
    updateOrderStatus,
    t
  } = useApp();

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [existingReviews, setExistingReviews] = useState<Review[]>([]);
  const [ratingTarget, setRatingTarget] = useState<'rider' | 'vendor' | 'experience'>('rider');
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInvoiceOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isInvoiceOpen]);

  // The live order is derived from the `orders` collection keyed by the selected
  // id, so the page always reflects authoritative backend + realtime updates.
  useEffect(() => {
    if (selectedOrder?.id) setActiveId(selectedOrder.id);
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (urlOrderId && orders.some(o => o.id === urlOrderId)) setActiveId(urlOrderId);
  }, [urlOrderId, orders]);

  const myOrders = (orders || []).filter(o => o.customerId === user?.id);

  const activeOrder = useMemo(() => {
    if (!myOrders.length || !activeId) return myOrders[0] || null;
    return myOrders.find(o => o.id === activeId) || myOrders[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, activeId, user?.id]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    setVerifying(true);
    setFoundOrder(null);
    try {
      const order = await OrderService.trackingLookup(trackingNumber.trim());
      setFoundOrder(order || 'not_found');
    } catch {
      setFoundOrder('not_found');
    } finally {
      setVerifying(false);
    }
  };

  const rider: DispatchRider | null = useMemo(() => {
    if (!activeOrder) return null;
    if (activeOrder.dispatchRider) return activeOrder.dispatchRider;
    if (!activeOrder.riderId) return null;
    return riders?.find(r => r.id === activeOrder.riderId || r.userId === activeOrder.riderId) || null;
  }, [activeOrder, riders]);

  // Load real review rows for this delivery (authoritative: shows locked state
  // when a review already exists and the current flow status).
  useEffect(() => {
    if (!activeOrder || !ratingUnlocked(activeOrder.status)) {
      setExistingReviews([]);
      return;
    }
    InteractionService.getReviews({ deliveryId: activeOrder.id })
      .then(rows => setExistingReviews(Array.isArray(rows) ? rows : []))
      .catch(() => setExistingReviews([]));
  }, [activeOrder?.id, activeOrder?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeOrder = (id: string) => {
    if ((orders || []).some(o => o.id === id)) setActiveId(id);
  };

  const refreshOrder = async () => {
    if (!activeOrder) return;
    try {
      const fresh = await OrderService.getById(activeOrder.id);
      setActiveId(activeOrder.id);
    } catch {
      showToast('Refresh failed', 'Could not refresh the order status right now.', 'warning');
    }
  };

  const openChat = async (party: 'rider' | 'vendor') => {
    if (!activeOrder) return;
    try {
      const conv = await openOrderConversation(activeOrder.id, party);
      if (conv?.id) {
        navigate('/customer/messages', { state: { conversationId: conv.id, tab: party === 'rider' ? 'Rider' : 'Vendor' } });
      } else {
        showToast('Chat unavailable', 'Could not open this conversation right now.', 'warning');
      }
    } catch (e: any) {
      showToast('Chat unavailable', e?.message || 'Could not open this conversation right now.', 'warning');
    }
  };

  const callRider = () => {
    const phone = rider?.phone;
    if (!phone) {
      showToast('No phone number', 'This rider has no phone number on file.', 'warning');
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  // Cancellation is only offered for the states the backend may legally cancel
  // from (ORDER_STATUS_FLOW: pending/confirmed/preparing/ready_for_pickup).
  const canCancel = !!activeOrder && !isTerminal(activeOrder.status) &&
    ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(activeOrder.status);

  const cancelOrder = async () => {
    if (!activeOrder || !canCancel) return;
    setConfirmingCancel(true);
    try {
      await updateOrderStatus(activeOrder.id, 'cancelled', cancelReason.trim());
      setCancelReason('');
      showToast('Delivery Cancelled', 'Your delivery was cancelled and a refund was processed where applicable.', 'info');
    } catch (e: any) {
      showToast('Could not cancel', e?.message || 'Cancellation failed.', 'warning');
    } finally {
      setConfirmingCancel(false);
    }
  };

  const confirmReceipt = async (useCode?: boolean) => {
    if (!activeOrder) return;
    setConfirmingReceipt(true);
    try {
      await receiverConfirmDelivery(activeOrder.id, useCode ? confirmCode.trim() : undefined);
      setConfirmCode('');
    } catch (e: any) {
      showToast('Confirmation failed', e?.message || 'Could not confirm this delivery.', 'warning');
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const submitReview = async () => {
    if (!activeOrder) return;
    if (!user) return;
    setSubmittingReview(true);
    try {
      await InteractionService.postReview({
        deliveryId: activeOrder.id,
        riderId: rider?.id || activeOrder.riderId || null,
        vendorId: activeOrder.vendorId || null,
        target: ratingTarget,
        rating: ratingStars,
        comment: ratingComment.trim(),
        userName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      });
      showToast('Thank you!', 'Your rating has been recorded and will influence this rider and the platform.');
      setRatingComment('');
      const rows = await InteractionService.getReviews({ deliveryId: activeOrder.id });
      setExistingReviews(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      showToast('Rating failed', e?.message || 'Your rating could not be saved.', 'warning');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ------------------------------------------------------------
  // Guest flow — public tracking by OM-/INV- reference (sanitized data)
  // ------------------------------------------------------------
  if (!user) {
    const fk = foundOrder ? deliveryKind(foundOrder) : 'food';
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('orders.trackMap')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('deliver.trackHistory')}</p>
        </div>

        <form onSubmit={handleTrack} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t('nav.orders')} / {t('common.track')} Number</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. OM-482013 or DLV-990041"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl focus:border-emerald-500 outline-none font-mono text-lg transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
          >
            {verifying ? t('common.loading') : <>{t('orders.trackMap')} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {foundOrder === 'not_found' && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center gap-3 text-sm font-medium animate-shake">
            <AlertCircle className="w-5 h-5" /> {t('common.noResults')}
          </div>
        )}

        {foundOrder && foundOrder !== 'not_found' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-lg space-y-6">
            <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-2">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{t('orders.status')}</p>
                <h3 className={cn('text-xl font-black uppercase', isCancelledTerminal(foundOrder.status) ? 'text-rose-500' : 'text-emerald-600')}>
                  {t(`status.${foundOrder.status}`) || foundOrder.status.replace(/_/g, ' ')}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  {t('deliver.speed')}: <span className="font-bold text-gray-700 dark:text-gray-300">{t(`status.${foundOrder.deliveryStatus}`) || foundOrder.deliveryStatus || t('common.loading')}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">{fk === 'package' ? t('common.rider') : t('msg.restaurant')}</p>
                <p className="font-bold text-gray-900 dark:text-white">{foundOrder.vendorName}</p>
              </div>
            </div>

            <p className="text-xs font-mono font-bold text-emerald-600">Ref: #{foundOrder.orderNumber}</p>

            {fk === 'package' && (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pickup</p>
                  <p className="font-bold text-gray-900 dark:text-white">{foundOrder.pickupAddress}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Drop-off</p>
                  <p className="font-bold text-gray-900 dark:text-white">{foundOrder.dropoffAddress}</p>
                </div>
              </div>
            )}

            {isCancelledTerminal(foundOrder.status) && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3">
                <X className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-rose-700 dark:text-rose-300">This delivery was {foundOrder.status === 'refunded' ? 'refunded' : 'cancelled'}.</p>
                  {foundOrder.cancellationReason && <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">Reason: {foundOrder.cancellationReason}</p>}
                  {foundOrder.refundStatus === 'refunded' && (
                    <p className="text-xs text-emerald-600 font-bold mt-1">Refund processed · {formatPrice(foundOrder.refundAmount ?? foundOrder.totalAmount)}</p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-start gap-4">
              <Lock className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Live GPS Tracking Locked</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  For security, live rider locations, messaging and receipts are only available to logged-in customers.
                </p>
                <Link to="/login" className="inline-block text-xs font-black text-emerald-600 mt-2 hover:underline flex items-center gap-1">
                  <span>Login to view live map</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  const order = activeOrder;

  // Body is built from the authoritative order state; terminal states never show
  // live/active controls.
  const state =
    order && isCancelledTerminal(order.status) ? 'cancelled'
    : order && isCompletedTerminal(order.status) ? 'completed'
    : 'active';

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold">{t('common.noResults')}</h3>
        <p className="text-sm text-gray-500">{t('deliver.noActiveDesc')}</p>
        <button onClick={() => navigate('/customer/orders')} className="inline-flex items-center gap-2 mt-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-6 h-12 transition">
          <ArrowRight className="w-4 h-4" /> {t('header.myOrders')}
        </button>
      </div>
    );
  }

  const kind = deliveryKind(order);
  const statusLabel = t(`status.${order.status}`) || order.status.replace(/_/g, ' ');
  const deliveryStatusLabel = t(`status.${order.deliveryStatus}`) || order.deliveryStatus || t('common.loading');

  const schema: TimelineStep[] = kind === 'package'
    ? [
        { key: 'pending', label: t('status.pending') },
        { key: 'confirmed', label: t('status.confirmed') },
        { key: 'rider_assigned', label: t('status.rider_assigned') },
        { key: 'picked_up', label: t('status.picked_up') },
        { key: 'in_transit', label: t('status.in_transit') },
        { key: 'arriving', label: t('status.arriving') },
        { key: 'awaiting_confirmation', label: t('status.awaiting_confirmation') },
        { key: 'delivered', label: t('status.delivered') },
        { key: 'completed', label: t('status.completed') }
      ]
    : [
        { key: 'pending', label: t('status.pending') },
        { key: 'confirmed', label: t('status.confirmed') },
        { key: 'preparing', label: t('status.preparing') },
        { key: 'ready_for_pickup', label: t('status.ready_for_pickup') },
        { key: 'rider_assigned', label: t('status.rider_assigned') },
        { key: 'picked_up', label: t('status.picked_up') },
        { key: 'in_transit', label: t('status.in_transit') },
        { key: 'arriving', label: t('status.arriving') },
        { key: 'delivered', label: t('status.delivered') },
        { key: 'completed', label: t('status.completed') }
      ];

  // Event-based timeline: only milestones that genuinely occurred (recorded in
  // the backend statusTimestamps) are rendered — never future states. A terminal
  // event (cancelled/failed) is appended from the real terminal timestamp.
  const events: TimelineEvent[] = useMemo(() => {
    if (!order) return [];
    const list: TimelineEvent[] = schema
      .filter(s => order.statusTimestamps?.[s.key])
      .map(s => ({ key: s.key, label: s.label, time: order.statusTimestamps[s.key] }));

    if (order.status === 'cancelled' || order.status === 'refunded') {
      list.push({
        key: 'cancelled',
        label: order.status === 'refunded' ? 'Cancelled & Refunded' : 'Cancelled',
        time: order.statusTimestamps?.cancelled || order.cancelledAt || order.updatedAt || order?.createdAt,
        terminal: true
      });
    } else if (order.status === 'failed') {
      list.push({ key: 'failed', label: statusLabel, time: order.statusTimestamps?.failed || order.updatedAt || order.createdAt, terminal: true });
    } else if (!list.some(e => e.key === order.status)) {
      // Backfill safety: the current status always appears even for legacy rows.
      list.push({ key: order.status, label: statusLabel, time: order.statusTimestamps?.[order.status] || order.updatedAt || order.createdAt });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status, order?.statusTimestamps, order?.cancelledAt, order?.updatedAt, order?.createdAt]);

  const live = state === 'active';

  if (live && !rider && isConfirmed(order.status) && !isOnRoad(order.status)) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-amber-800 dark:text-amber-200">{t('orders.assigningRider')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {t('orders.findingRider')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white border-b pb-3">
            {t('orders.details')} — #{order.orderNumber}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('orders.status')}</p>
              <p className="font-bold text-gray-900 dark:text-white">{statusLabel}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('common.payment')}</p>
              <p className="font-bold text-gray-900 dark:text-white">{order.paymentMethod}</p>
            </div>
            {kind === 'package' && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">{t('common.recipient')}</p>
                <p className="font-bold text-gray-900 dark:text-white">{order.receiverName} · {order.receiverPhone}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Reference</p>
              <p className="font-mono font-bold text-emerald-600">#{order.orderNumber}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={refreshOrder} className="flex-1 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> {t('common.retry')}
          </button>
          <button onClick={() => navigate('/customer/orders')} className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" /> {t('header.myOrders')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Top Bar */}
      <div className={cn(
        'rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4',
        state === 'cancelled' ? 'bg-gradient-to-r from-rose-900 to-slate-800'
        : state === 'completed' ? 'bg-gradient-to-r from-emerald-800 to-slate-800'
        : 'bg-gradient-to-r from-slate-900 to-slate-800'
      )}>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className={cn('w-2.5 h-2.5 rounded-full', state === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-slate-400')} />
            <span className={cn('text-xs font-bold uppercase tracking-wider', state === 'active' ? 'text-emerald-400' : state === 'completed' ? 'text-emerald-300' : 'text-rose-300')}>
              {state === 'cancelled' ? t('status.cancelled')
                : state === 'completed' ? t('status.completed')
                : (kind === 'package' ? t('deliver.trackHistory') : t('deliver.trackHistory'))}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold flex items-center gap-2 flex-wrap">
            {kind === 'package'
              ? `${order.deliveryType === 'PASS' ? 'Pass' : t('deliver.package')} #${order.orderNumber} (${order.packageSize || ''} ${order.packageType || ''})`
              : `${t('nav.orders')} #${order.orderNumber} (${order.vendorName})`}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="bg-white/10 rounded-full px-2.5 py-0.5">{t('orders.status')}: <span className="font-bold text-white">{statusLabel}</span></span>
            <span className="bg-white/10 rounded-full px-2.5 py-0.5">{t('deliver.type')}: <span className="font-bold text-white">{deliveryStatusLabel}</span></span>
            {order.deliveryRef && <span className="bg-white/10 rounded-full px-2.5 py-0.5 font-mono text-emerald-300">Delivery #{order.deliveryRef.replace(/^DLV-/, '')}</span>}
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap justify-center">
          {myOrders.length > 1 && (
            <div className="flex items-center space-x-2 bg-slate-700 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <select
                value={activeOrder?.id}
                onChange={(e) => changeOrder(e.target.value)}
                aria-label="Switch order"
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer max-w-[340px] [&>option]:text-gray-900"
              >
                {[...myOrders]
                  .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
                  .map(o => (
                    <option key={o.id} value={o.id}>
                      #{o.orderNumber} · {o.vendorName || (deliveryKind(o) === 'package' ? 'Parcel' : 'Order')} · {STATUS_LABELS[o.status] || o.status.replace(/_/g, ' ')}
                    </option>
                  ))}
              </select>
            </div>
          )}
          {canCancel && !confirmingCancel && (
            <button
              onClick={() => setConfirmingCancel(true)}
              disabled={confirmingCancel}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              <span>{t('common.cancel')}</span>
            </button>
          )}
          <button onClick={() => setIsInvoiceOpen(true)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2">
            <Printer className="w-4 h-4" />
            <span>{t('orders.viewReceipt')}</span>
          </button>
        </div>
      </div>

      {/* In-place cancellation confirmation (bound to backend business rules) */}
      {canCancel && confirmingCancel && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-rose-700 dark:text-rose-300">{t('common.cancel')}?</h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 leading-relaxed">
                {t('cart.terms')}
              </p>
            </div>
          </div>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder={t('deliver.description')}
            className="w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-2xl p-3 text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-rose-400 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setConfirmingCancel(false); setCancelReason(''); }}
              className="flex-1 h-11 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-bold text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            >
              {t('common.close')}
            </button>
            <button
              onClick={cancelOrder}
              disabled={confirmingCancel}
              className="flex-1 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {confirmingCancel ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><X className="w-4 h-4" /> {t('common.confirm')}</>}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">

          {state === 'active' && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-0 relative overflow-hidden shadow-2xl h-80 sm:h-[450px] flex flex-col">
              <LiveMap
                riderLocation={order.currentRiderLocation}
                restaurantLocation={
                  kind === 'package'
                    ? (order.pickupLat != null && order.pickupLng != null ? { lat: order.pickupLat, lng: order.pickupLng } : undefined)
                    : (order.vendorLat && order.vendorLng ? { lat: order.vendorLat, lng: order.vendorLng } : undefined)
                }
                customerLocation={
                  kind === 'package'
                    ? (order.dropoffLat != null && order.dropoffLng != null ? { lat: order.dropoffLat, lng: order.dropoffLng } : undefined)
                    : (order.customerLat && order.customerLng ? { lat: order.customerLat, lng: order.customerLng } : undefined)
                }
              />
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-xs text-white gap-3">
                <div className="flex items-center space-x-2 min-w-0">
                  {kind === 'package' ? <Package className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Store className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  <span className="font-bold truncate">{kind === 'package' ? order.pickupAddress : order.vendorName}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-slate-400">{t('orders.status')}:</span>
                  <span className="text-emerald-400 font-bold uppercase">{statusLabel}</span>
                </div>
              </div>
              {order.currentRiderLocation && (
                <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-[10px] z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t('deliver.trackHistory')}</span>
                  </div>
                  <p className="text-gray-500">{t('deliver.fastestRider')}</p>
                </div>
              )}
              {kind === 'package' && !isTerminal(order.status) && (
                <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <PackageCheck className="w-3.5 h-3.5" />
                  {order.receiverConfirmed ? t('status.delivered') : `${order.packageSize} ${order.packageType || t('deliver.package')} · ${order.weightKg}kg`}
                </div>
              )}
            </div>
          )}

          {(state === 'cancelled' || state === 'completed') && (
            <div className={cn('rounded-3xl p-8 border-2 shadow-xl flex items-start gap-5',
              state === 'cancelled' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800')}>
              {state === 'cancelled' ? (
                <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0"><X className="w-7 h-7" /></div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0"><PackageCheck className="w-7 h-7" /></div>
              )}
              <div className="space-y-2">
                <h3 className={cn('text-lg font-black', state === 'cancelled' ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300')}>
                  {state === 'cancelled' ? (order.refundStatus === 'refunded' ? t('status.refunded') : t('status.cancelled')) : t('status.completed')}
                </h3>
                {state === 'cancelled' ? (
                  <>
                    <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                      {order.cancellationReason || t('status.cancelled')}
                    </p>
                    {order.refundStatus === 'refunded' ? (
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                        <Undo2 className="w-3.5 h-3.5" />
                        {t('status.refunded')} {formatPrice(order.refundAmount ?? order.totalAmount)}
                      </p>
                    ) : (
                      <p className="text-xs text-rose-500">
                        {t('common.error')}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                      {statusLabel}{order.deliveredAt ? ` at ${new Date(order.deliveredAt).toLocaleString()}` : ''}.
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">
                      {t('rev.impact')}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Timeline — built from real event history only */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">{t('deliver.trackHistory')}</h3>
              {order.deliveredAt && (
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  {t('status.completed')} {new Date(order.deliveredAt).toLocaleString()}
                </span>
              )}
            </div>

            {events.length === 0 ? (
              <p className="text-xs text-gray-400">{t('common.noResults')}</p>
            ) : (
              <div className="space-y-0">
                {events.map((ev, i) => {
                  const isLast = i === events.length - 1;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-white',
                          ev.terminal ? 'bg-rose-500' : 'bg-emerald-500',
                          order.status === ev.key && !ev.terminal && 'ring-4 ring-emerald-500/20'
                        )}>
                          {ev.terminal ? <X className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-emerald-200 dark:bg-slate-700 my-1" />}
                      </div>
                      <div className={cn('pb-5', !isLast && 'pt-0.5')}>
                        <p className={cn('text-xs font-black', ev.terminal ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white')}>
                          {ev.label}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(ev.time).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {live && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                {t('deliver.verifiedOnly')}
              </p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">

          {/* Rider card — only when the backend confirms a (historical or active) assignment */}
          {rider && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
                <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Bike className={cn('w-4 h-4', state === 'cancelled' ? 'text-slate-400' : 'text-emerald-500')} />
                  {state === 'cancelled' ? t('common.rider') : t('common.rider')}
                </h3>
                {Number(rider.rating) > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {Number(rider.rating).toFixed(1)}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <img src={rider.avatar} alt={rider.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500" />
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                    {rider.name} <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{rider.vehicleType} | {rider.vehicleNumber}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{rider.totalDeliveries ?? 0} {t('status.completed')}</p>
                </div>
              </div>

              {/* Communication is only offered on live deliveries — business rule. */}
              {state === 'active' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={callRider} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>{t('support.emergency')}</span>
                  </button>
                  <button onClick={() => openChat('rider')} className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>{t('msg.title')}</span>
                  </button>
                </div>
              )}
              {state === 'cancelled' && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('common.error')}
                </p>
              )}
              {state === 'completed' && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {t('status.completed')}
                </p>
              )}
            </div>
          )}

          {!rider && live && isConfirmed(order.status) && !isOnRoad(order.status) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm text-center py-10 space-y-2">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <Navigation className="w-6 h-6" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                {t('orders.findingRider')}
              </p>
              <p className="text-[11px] text-gray-500">{t('orders.findingRider')}</p>
            </div>
          )}

          {/* Order / parcel summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white border-b pb-3 border-gray-100 dark:border-slate-800">
              {kind === 'package' ? t('deliver.pickupDestination') : t('orders.itemsOrdered')}
            </h3>

            {kind === 'package' ? (
              <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between gap-2"><span className="text-gray-400 font-bold uppercase tracking-widest">{t('common.from')}</span><span className="font-bold text-right">{order.pickupAddress}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-400 font-bold uppercase tracking-widest">{t('common.to')}</span><span className="font-bold text-right">{order.dropoffAddress}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-400 font-bold uppercase tracking-widest">{t('common.recipient')}</span><span className="font-bold text-right">{order.receiverName} · {order.receiverPhone}</span></div>
                {order.receiverNote && <div className="flex justify-between gap-2"><span className="text-gray-400 font-bold uppercase tracking-widest">{t('deliver.instructions')}</span><span className="font-bold text-right">{order.receiverNote}</span></div>}
                <div className="flex justify-between"><span className="text-gray-400 font-bold uppercase tracking-widest">{t('deliver.package')}</span><span className="font-bold">{order.packageSize} {order.packageType} · {order.weightKg}kg</span></div>
                <div className="flex justify-between"><span className="text-gray-400 font-bold uppercase tracking-widest">{t('deliver.speed')}</span><span className="font-bold">{order.service || 'Standard'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400 font-bold uppercase tracking-widest">{t('common.payment')}</span><span className="font-bold">{order.paymentMethod}</span></div>
              </div>
            ) : (
              <div className="space-y-3">
                {(order.items || []).map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-emerald-600">{it.quantity}x</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{it.productName || it.title || t('nav.products')}</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{formatPrice((it.unitPrice || it.price || 0) * it.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              {kind === 'food' && (
                <div className="flex justify-between">
                  <span>{t('common.payment')}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{order.paymentMethod}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-2 border-t">
                <span>{t('orders.total')} {state === 'cancelled' && order.refundStatus === 'refunded' ? t('status.refunded') : t('status.confirmed')}</span>
                <span className={state === 'cancelled' ? 'text-rose-500' : 'text-emerald-600'}>
                  {state === 'cancelled' && order.refundStatus === 'refunded' ? formatPrice(order.refundAmount ?? order.totalAmount) : formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Message Restaurant — food orders only, live deliveries only */}
          {kind === 'food' && live && (
            <button
              onClick={() => openChat('vendor')}
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
            >
              <Store className="w-4 h-4 text-amber-400" />
              <span>{t('msg.restaurant')}</span>
            </button>
          )}

          {/* Receiver confirmation — packages once the parcel is on the road */}
          {kind === 'package' && live && isOnRoad(order.status) && !order.receiverConfirmed && (
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> {t('checkout.details')}
              </h3>
              <p className="text-xs text-emerald-50 leading-relaxed">
                {order.status === 'awaiting_confirmation'
                  ? t('status.awaiting_confirmation')
                  : t('checkout.details')}
              </p>
              <div className="rounded-2xl bg-white/10 border border-white/20 p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{t('checkout.success')}</p>
                <p className="font-mono text-2xl font-black tracking-[0.3em]">{order.confirmationCode}</p>
                <p className="text-[10px] opacity-80 mt-1">{t('checkout.successDesc')}</p>
              </div>
              <button
                onClick={() => confirmReceipt(false)}
                disabled={confirmingReceipt}
                className="w-full rounded-2xl bg-white text-emerald-700 font-black text-xs py-3.5 uppercase tracking-widest hover:bg-emerald-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {confirmingReceipt ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-700" /> : <><CheckCircle2 className="w-4 h-4" /> {t('status.confirmed')}</>}
              </button>
              <div className="flex gap-2">
                <input
                  value={confirmCode}
                  onChange={e => setConfirmCode(e.target.value.toUpperCase())}
                  placeholder={t('auth.2fa.verify')}
                  className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white placeholder:text-emerald-200/70 outline-none focus:border-white"
                />
                <button
                  onClick={() => confirmReceipt(true)}
                  disabled={confirmingReceipt || confirmCode.trim().length < 4}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 transition disabled:opacity-40"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          )}

          {kind === 'package' && order.receiverConfirmed && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-3xl p-5 flex items-start gap-3 text-xs font-bold">
              <PackageCheck className="w-5 h-5 flex-shrink-0" />
              <div>
                <p>{t('status.delivered')} {order.receiverConfirmedAt ? `at ${new Date(order.receiverConfirmedAt).toLocaleString()}` : ''}.</p>
                <p className="text-[10px] font-medium mt-1">{t('status.delivered')}</p>
              </div>
            </div>
          )}

          {/* Ratings — unlock only after delivered/completed, backend-enforced */}
          {ratingUnlocked(order.status) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> {t('rev.rateOrder')}
              </h3>

              {existingReviews.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {t('status.confirmed')} ({existingReviews.length} {t('product.reviews')}).
                  </p>
                  {existingReviews.map(r => (
                    <div key={r.id} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-xs space-y-1">
                      <p className="font-black text-amber-500">{'★'.repeat(Math.max(1, Math.min(5, Math.round(r.rating))))}<span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - Math.round(r.rating)))}</span></p>
                      {r.comment && <p className="font-medium text-gray-700 dark:text-gray-300">"{r.comment}"</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {(kind === 'food' ? (['rider', 'vendor'] as const) : (['rider', 'experience'] as const)).map(t_target => (
                      <button
                        key={t_target}
                        onClick={() => setRatingTarget(t_target)}
                        className={cn(
                          "flex-1 rounded-xl border-2 py-2.5 text-[10px] font-black uppercase tracking-widest transition",
                          ratingTarget === t_target
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                            : "border-gray-200 dark:border-slate-700 text-gray-400 hover:border-emerald-500/40"
                        )}
                      >
                        {t_target === 'rider' ? t('common.rider') : t_target === 'vendor' ? t('msg.restaurant') : t('fav.recent')}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setRatingStars(n)} className="p-1">
                        <Star className={cn("w-7 h-7 transition", n <= ratingStars ? "text-amber-400 fill-current" : "text-gray-200 dark:text-slate-700")} />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-black text-gray-500">{ratingStars}/5</span>
                  </div>
                  <textarea
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    rows={2}
                    placeholder={t('rev.commentPlaceholder')}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl p-3 text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition resize-none"
                  />
                  <button
                    onClick={submitReview}
                    disabled={submittingReview}
                    className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3.5 uppercase tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingReview ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Send className="w-4 h-4" /> {t('rev.submit')}</>}
                  </button>
                  <p className="text-[9px] text-gray-400">{t('rev.impact')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Digital Invoice Modal */}
      {isInvoiceOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsInvoiceOpen(false)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />

          <div className="relative bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{t('orders.viewReceipt').toUpperCase()}</h2>
                <p className="text-xs text-gray-500">{kind === 'package' ? t('deliver.title') : t('nav.restaurants')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold text-emerald-600">{order.invoiceNumber}</p>
                <p className="text-[10px] text-gray-400">{String(order.createdAt || '').split('T')[0]}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-gray-400 uppercase text-[10px]">{t('common.recipient')}:</p>
                <p className="font-bold text-gray-900 dark:text-white">{order.customerName}</p>
                <p className="text-gray-500">{order.customerAddress}</p>
              </div>
              <div>
                <p className="font-bold text-gray-400 uppercase text-[10px]">{kind === 'package' ? t('common.rider') + ':' : t('msg.restaurant') + ':'}</p>
                <p className="font-bold text-gray-900 dark:text-white">{order.vendorName}</p>
                <p className="text-gray-500">{kind === 'package' ? `Ref ${order.orderNumber}` : `Tax ID: TX-88402910`}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b text-gray-400">
                    <th className="py-2">{kind === 'package' ? t('deliver.package') : t('nav.products')}</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {kind === 'package' ? (
                    <tr>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">{order.packageSize} {order.packageType || t('deliver.package')} · {order.weightKg}kg · {order.service || 'Standard'}</td>
                      <td className="py-2">1</td>
                      <td className="py-2 text-right font-bold">{formatPrice(order.deliveryFee || order.totalAmount)}</td>
                    </tr>
                  ) : (
                    (order.items || []).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 font-medium text-gray-900 dark:text-white">{item.productName || item.title || t('nav.products')}</td>
                        <td className="py-2">{item.quantity}</td>
                        <td className="py-2 text-right font-bold">{formatPrice((item.unitPrice || item.price || 0) * item.quantity)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 flex justify-between items-center text-sm font-bold">
              <span>{t('cart.total')}</span>
              <span className={state === 'cancelled' && order.refundStatus === 'refunded' ? 'text-rose-500' : 'text-emerald-600'}>{formatPrice(order.totalAmount)}</span>
            </div>

            {state === 'cancelled' && (
              <div className={cn('rounded-2xl p-4 text-xs font-bold flex items-start gap-2',
                order.refundStatus === 'refunded' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800')}>
                {order.refundStatus === 'refunded' ? <Undo2 className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
                <span>
                  {order.refundStatus === 'refunded'
                    ? `This order was cancelled and refunded. ${formatPrice(order.refundAmount ?? order.totalAmount)} was returned to your balance.${order.refundedAt ? ` Refund processed ${new Date(order.refundedAt).toLocaleString()}.` : ''}`
                    : `This order was cancelled${order.cancellationReason ? ` (${order.cancellationReason})` : ''}. No amount was refunded because no payment was captured.`}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => window.print()} className="bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl">
                {t('common.save')}
              </button>
              <button onClick={() => setIsInvoiceOpen(false)} className="bg-gray-200 text-gray-800 font-bold text-xs px-4 py-2 rounded-xl">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};