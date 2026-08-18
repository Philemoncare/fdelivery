import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bike, Navigation, Wallet, UserRound, Settings, Star, MapPin,
  Truck, TrendingUp, Clock, Radio, MessageSquare, Bell, DollarSign,
  ChefHat, PackageCheck, Phone, CheckCircle, Navigation as NavigationIcon,
  RefreshCw, Search, Camera, MessageCircle, ChevronRight, Send,
  X, AlertCircle, CheckCircle2, Circle, ShieldCheck,
  Gift, Copy, Share2, QrCode, ArrowDownToLine, ArrowUpFromLine,
  Crown, CalendarDays, BadgeCheck, Check, Zap,
  ChevronDown, Download, LogOut, IdCard
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/src/components/ui/select';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn, getInitials, copyText, shareLink } from '@/src/lib/utils';
import { deliveryRef, deliveryKindLabel, deliveryKindBadge, deliveryKindTitle, deliveryKindOf, isPackageLike, pickupLabel, dropoffLabel, dropoffContact, senderLabel, type DeliveryKind } from '@/src/lib/rider-deliveries';
import { MessagingService, ReferralService, WalletService, type MyReferral } from '@/src/services/api';
import { AuthApiService } from '@/src/services/auth-api';
import { ImageCropModal } from '@/src/components/common/ImageCropModal';
import { GoogleDirectionsMap } from '@/src/components/rider/GoogleDirectionsMap';
import { DestinationSearch, SuggestedPlace } from '@/src/components/rider/DestinationSearch';
import { RiderSubscriptionStatus, RIDER_PLANS, getRiderPlan } from '@/src/components/rider/RiderSubscriptionStatus';
import { ReceiptModal, type ReceiptOrder } from '@/src/components/common/ReceiptModal';
import { NotificationCenter } from '@/src/components/common/NotificationCenter';
import { APP_VERSION_LABEL } from '@/src/lib/app-version';

const ACCENT = 'from-amber-400 to-orange-600';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number | null {
  if (![lat1, lng1, lat2, lng2].every(v => typeof v === 'number' && Number.isFinite(v))) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function PageHeader({ title, description, icon: Icon, count }: { title: string; description: string; icon: any; count?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between flex-wrap gap-4">
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br', ACCENT)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">{description}</p>
        </div>
      </div>
      {count && <Badge variant="default">{count}</Badge>}
    </motion.div>
  );
}

/*
 * ------------------------------------------------------------
 * JOBS — real ready-for-pickup orders awaiting a rider
 * ------------------------------------------------------------
 */
export function RiderJobsPage() {
  const { availableDeliveries, refreshAvailableDeliveries, assignRiderToOrder, showToast, updateRiderStatus, riderStatus, formatPrice } = useApp();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DeliveryKind>('all');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);

  // Pull the live pool into AppContext state the moment the page mounts (and
  // whenever the rider toggles online), so the list reflects the real backend.
  useEffect(() => {
    refreshAvailableDeliveries();
  }, [refreshAvailableDeliveries, riderStatus]);

  const online = riderStatus === 'ONLINE';

  const availableJobs = (availableDeliveries || []).filter(j =>
    (!search ||
    (j.vendorName || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.customerAddress || '').toLowerCase().includes(search.toLowerCase()) ||
    (deliveryRef(j) || '').toLowerCase().includes(search.toLowerCase())) &&
    (typeFilter === 'all' || deliveryKindOf(j) === typeFilter)
  );

  const accept = async (job: any) => {
    if (!user) return;
    setAcceptingId(job.id);
    try {
      await assignRiderToOrder(job.id, user.id);
      setViewing(null);
      showToast('Job Accepted!', `Delivery ${deliveryRef(job)} assigned to you. Go to Active Deliveries to start.`);
      refreshAvailableDeliveries();
    } catch (err: any) {
      const msg = err?.message || 'This delivery may have just been taken by another rider.';
      showToast('Not Available', msg, 'warning');
      refreshAvailableDeliveries();
    } finally {
      setAcceptingId(null);
    }
  };

  const pickup = (job: any) => pickupLabel(job);
  const dropoff = (job: any) => dropoffLabel(job);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={Bike} title="Available Deliveries" description="Jobs waiting for a rider. Review the details, then accept to start earning." count={online ? `${availableJobs.length} live` : 'Go online to see jobs'} />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search by delivery #, restaurant, pickup or destination..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-none text-sm font-bold"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all', label: 'All Types' },
          { key: 'FOOD_ORDER', label: 'FOOD' },
          { key: 'PASS', label: 'PASS' },
          { key: 'PACKAGE', label: 'PACKAGE' },
        ] as { key: 'all' | DeliveryKind; label: string }[]).map(f => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
              typeFilter === f.key
                ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                : "bg-white dark:bg-slate-900 text-gray-500 border-gray-100 dark:border-slate-800 hover:border-amber-500/40")}>
            {f.label}
          </button>
        ))}
      </div>

      {!online ? (
        <div className="md:col-span-2 py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Radio className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">You're offline</p>
          <p className="text-sm text-gray-500 mt-2">Go online to see available deliveries and accept jobs.</p>
          <Button
            className="mt-6 h-12 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 font-black uppercase tracking-widest"
            onClick={() => updateRiderStatus('ONLINE')}
          >
            Go Online
          </Button>
        </div>
      ) : availableJobs.length === 0 ? (
        <div className="md:col-span-2 py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 relative overflow-hidden">
           <div className="absolute inset-0 opacity-10 pointer-events-none">
              <img src="https://img.freepik.com/premium-photo/3d-delivery-man-scooter-yellow-background_115990-1282.jpg" alt="" className="w-full h-full object-cover" />
           </div>
           <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-inner">
              <Radio className="w-10 h-10 text-amber-500 animate-pulse" />
           </div>
           <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider relative z-10">Waiting for deliveries...</p>
           <p className="text-sm text-gray-500 mt-2 relative z-10">No jobs are ready right now. New deliveries will appear here the moment an order is ready for pickup.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableJobs.map((job, i) => {
            const p = pickup(job);
            const d = dropoff(job);
            const isPkg = deliveryKindLabel(job.deliveryType) !== 'Food Order';
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/30 dark:shadow-none hover:border-amber-500/50 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    deliveryKindOf(job) === 'PACKAGE' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                    deliveryKindOf(job) === 'PASS' ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" :
                    "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400")}>
                    {deliveryKindBadge(job.deliveryType)}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-gray-400">{deliveryRef(job)} · {job.orderNumber}</span>
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shadow-inner">
                      {isPkg ? <PackageCheck className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 dark:text-white leading-none">{deliveryKindTitle(job.deliveryType)}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Pickup: {p.address || p.name}
                      </p>
                      <p className="text-[10px] font-black text-gray-400 mt-1 flex items-center gap-1">
                        <ArrowDownToLine className="w-3 h-3" /> Drop-off: {d.address || d.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600 leading-none">{formatPrice(job.deliveryFee)}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{deliveryKindLabel(job.deliveryType)} · Payout</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-4 border-y border-gray-50 dark:border-slate-800 my-4">
                  <div className="flex-1 space-y-1">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{isPkg ? 'Deliver To' : 'Items'}</p>
                     <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                       {isPkg ? d.name || d.address : `${job.itemCount || (job.items || []).length} dish${job.itemCount === 1 ? '' : 'es'}`}
                     </p>
                  </div>
                  <div className="flex-1 space-y-1 text-center border-x border-gray-50 dark:border-slate-800">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Est. Time</p>
                     <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{job.estimatedDeliveryTime}</p>
                  </div>
                  <div className="flex-1 space-y-1 text-right">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Distance</p>
                     <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{(() => { const km = haversineKm(Number(job.vendorLat), Number(job.vendorLng), Number(job.customerLat), Number(job.customerLng)); return km != null ? `${km.toFixed(1)} km` : '—'; })()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest"
                    disabled={!!acceptingId}
                    onClick={() => setViewing(job)}
                  >
                    View Details
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 font-black uppercase tracking-widest"
                    disabled={!!acceptingId}
                    onClick={() => accept(job)}
                  >
                    {acceptingId === job.id ? 'Accepting...' : 'Accept Delivery'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Job Details Modal */}
      <AnimatePresence>
        {viewing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewing(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <div className="p-6 sm:p-7 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{deliveryRef(viewing)}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">related Order #{viewing.orderNumber}</p>
                  </div>
                  <button onClick={() => setViewing(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Type</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{deliveryKindTitle(viewing.deliveryType)}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Payout</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">{formatPrice(viewing.deliveryFee)}</p>
                  </div>
                </div>

                {isPackageLike(viewing.deliveryType) && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0"><UserRound className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sender</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{viewing.customerName || senderLabel(viewing).name}</p>
                      {senderLabel(viewing).address && <p className="text-xs text-gray-500 mt-0.5 break-words">{senderLabel(viewing).address}</p>}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0"><ArrowUpFromLine className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pickup</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{pickup(viewing).name}</p>
                      {pickup(viewing).address && <p className="text-xs text-gray-500 mt-0.5 break-words">{pickup(viewing).address}</p>}
                      {viewing.pickupInstructions && <p className="text-xs text-gray-500 mt-1 italic">“{viewing.pickupInstructions}”</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0"><ArrowDownToLine className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Drop-off</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{dropoff(viewing).name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 break-words">{dropoff(viewing).address}</p>
                      {viewing.specialInstructions && <p className="text-xs text-gray-500 mt-1 italic">“{viewing.specialInstructions}”</p>}
                    </div>
                  </div>
                  {viewing.package && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0"><PackageCheck className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Package</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {viewing.package.size} {viewing.package.type || 'Package'}{viewing.package.weightKg ? ` · ${viewing.package.weightKg} kg` : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Receiver: {viewing.package.receiverName}{viewing.package.receiverPhone ? ` · ${viewing.package.receiverPhone}` : ''}{viewing.package.service ? ` · ${viewing.package.service}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setViewing(null)}>BACK</Button>
                  <Button className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold" disabled={!!acceptingId} onClick={() => accept(viewing)}>
                    {acceptingId === viewing.id ? 'ACCEPTING...' : 'ACCEPT DELIVERY'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * PICKUP QUEUE — real orders assigned to this rider
 * ------------------------------------------------------------
 */
export function RiderPickupQueuePage() {
  const { orders, formatPrice, updateOrderStatus } = useApp();
  const { user } = useAuth();

  const mine = useMemo(() => orders.filter(o => o.riderId === user?.riderId), [orders, user]);
  const ready = mine.filter(o => o.status === 'ready_for_pickup' || o.status === 'rider_assigned');
  const preparing = mine.filter(o => o.status === 'picked_up' || o.status === 'in_transit' || o.status === 'arriving');

  const items: Array<{ label: string; value: number; icon: any; note: string }> = [
    { label: 'Ready for Pickup', value: ready.length, icon: PackageCheck, note: ready.length ? `${ready.length} order${ready.length > 1 ? 's' : ''} at restaurant` : 'Nothing ready yet' },
    { label: 'On Route', value: preparing.length, icon: Truck, note: preparing.length ? `${preparing.length} on the way to customer` : 'No active routes' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={ChefHat} title="Pickup Queue" description="Orders assigned to you, from restaurant pickup to doorstep." count={`${ready.length} to pick up`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(s => (
          <Card key={s.label} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.note}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500"><s.icon className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bike className="w-4 h-4 text-amber-500" /> Assigned Orders</CardTitle></CardHeader>
        <CardContent>
          {mine.length === 0 ? (
            <p className="text-center text-gray-400 py-10 italic">No orders assigned to you yet.</p>
          ) : (
            <div className="space-y-2">
              {mine.map(o => (
                <div key={o.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{o.vendorName} → {o.customerName}</p>
                    <p className="text-xs text-gray-500 mt-1">{o.status.replace('_', ' ')} · {formatPrice(o.deliveryFee)}</p>
                  </div>
                  {['ready_for_pickup', 'rider_assigned'].includes(o.status) && o.riderId === user?.riderId && (
                    <Button size="sm" variant="primary" className="rounded-lg" onClick={() => updateOrderStatus(o.id, 'picked_up')}>
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Picked Up
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * ORDER STATUS — live status of the rider's active orders
 * ------------------------------------------------------------
 */
export function RiderOrderStatusPage() {
  const navigate = useNavigate();
  const { orders, formatPrice, updateOrderStatus, completeDelivery, showToast } = useApp();
  const { user } = useAuth();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const active = useMemo(() => orders.filter(o => o.riderId === user?.riderId && ['ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status)), [orders, user]);

  const progress = (status: string) => {
    const map: Record<string, number> = { rider_assigned: 20, ready_for_pickup: 35, picked_up: 50, in_transit: 75, arriving: 90 };
    return map[status] ?? 10;
  };

  const handleComplete = async (orderId: string, orderNumber: string) => {
    if (completingId) return;
    setCompletingId(orderId);
    try {
      const { alreadyCompleted } = await completeDelivery(orderId);
      showToast('Delivery Completed!', `Order #${orderNumber} ${alreadyCompleted ? 'was already' : 'marked as'} delivered. Earnings updated.`);
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to complete delivery. Please try again.', 'warning');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={PackageCheck} title="Active Deliveries" description="Live tracking of your current assigned tasks." count={`${active.length} active`} />
      {active.length === 0 ? (
        <Card className="rounded-[2.5rem] border-dashed border-2 border-gray-100 dark:border-slate-800 relative overflow-hidden">
           <div className="absolute inset-0 opacity-5 pointer-events-none grayscale">
              <img src="https://img.freepik.com/premium-photo/3d-delivery-man-scooter-yellow-background_115990-1282.jpg" alt="" className="w-full h-full object-cover" />
           </div>
           <CardContent className="text-center py-24 relative z-10">
             <div className="w-24 h-24 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Bike className="w-12 h-12 text-gray-300" />
             </div>
             <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">No Active Deliveries</h3>
             <p className="text-sm text-gray-500 mt-3 max-w-xs mx-auto font-medium leading-relaxed">You don't have any jobs in progress. Head over to the Available Jobs tab to pick up new orders.</p>
             <Button
               onClick={() => navigate('/rider/jobs')}
               className="mt-8 rounded-2xl h-14 px-10 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
             >
               Find Jobs
             </Button>
           </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {active.map(o => (
            <Card key={o.id} className="rounded-[2.5rem] shadow-xl border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <Badge variant="brand" className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest">ORDER #{o.orderNumber || o.id.slice(-6).toUpperCase()}</Badge>
                       <Badge variant="success" className="rounded-lg px-2 text-[10px] font-black uppercase tracking-widest">{o.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">{o.vendorName}</p>
                    <p className="text-sm text-gray-500 font-bold mt-1 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-orange-500" /> {o.customerAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600 leading-none">{formatPrice(o.deliveryFee)}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Delivery Payout</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    <span>Pickup</span>
                    <span className="text-amber-500">En Route</span>
                    <span>Doorstep</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progress(o.status)}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" className="rounded-2xl h-14 font-black uppercase tracking-widest border-2 gap-2" onClick={() => window.open(`tel:${o.customerPhone}`)}>
                    <Phone className="w-5 h-5 text-emerald-500" /> Call Customer
                  </Button>
                  {['ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status) ? (
                    <Button className="rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 font-black uppercase tracking-widest gap-2 disabled:opacity-60"
                      disabled={completingId === o.id}
                      onClick={() => handleComplete(o.id, o.orderNumber || o.id.slice(-6))}>
                      <CheckCircle className="w-5 h-5" /> {completingId === o.id ? 'Marking…' : 'Mark Delivered'}
                    </Button>
                  ) : (
                    <Button className="rounded-2xl h-14 bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/20 font-black uppercase tracking-widest gap-2"
                      onClick={() => updateOrderStatus(o.id, 'picked_up')}>
                      <PackageCheck className="w-5 h-5" /> Confirm Pickup
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * NAVIGATION — real GPS position + active delivery route
 * ------------------------------------------------------------
 */
export function RiderNavigationPage() {
  const { currentRiderLocation, riderStatus, riderLocationError, geoActive, enableLiveGps, orders, formatPrice } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const activeDelivery = orders.find(o => o.riderId === user?.riderId && ['ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status));
  const online = riderStatus !== 'OFFLINE';

  const [destination, setDestination] = useState<SuggestedPlace | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ km: number; min: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const computeRoute = async (lat: number, lng: number) => {
    if (!currentRiderLocation) {
      setRouteInfo(null);
      return;
    }
    setRouteLoading(true);
    try {
      const origin = `${currentRiderLocation.longitude},${currentRiderLocation.latitude}`;
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin};${lng},${lat}?overview=false`
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        code: string;
        routes?: { distance: number; duration: number }[];
      };
      if (data.code === 'Ok' && data.routes?.length) {
        const r = data.routes[0];
        setRouteInfo({ km: r.distance / 1000, min: r.duration / 60 });
      } else {
        // Fallback: straight-line distance + 25 km/h motorbike estimate.
        const km = haversineKm(currentRiderLocation.latitude, currentRiderLocation.longitude, lat, lng);
        if (km != null) setRouteInfo({ km, min: (km / 25) * 60 });
        else setRouteInfo(null);
      }
    } catch {
      // Fallback: straight-line distance + 25 km/h motorbike estimate.
      const km = haversineKm(currentRiderLocation.latitude, currentRiderLocation.longitude, lat, lng);
      if (km != null) setRouteInfo({ km, min: (km / 25) * 60 });
      else setRouteInfo(null);
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (!destination) return;
    void computeRoute(destination.latitude, destination.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, currentRiderLocation]);

  const selectDestination = (p: SuggestedPlace) => {
    setDestination(p);
  };

  const clearDestination = () => {
    setDestination(null);
    setRouteInfo(null);
  };

  const openNavigation = () => {
    if (!destination) return;
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const statusCards = [
    {
      label: 'GPS Status',
      value: currentRiderLocation ? 'Live' : geoActive ? 'Waiting' : riderLocationError ? 'Off' : 'Not active',
      note: currentRiderLocation ? `Lat ${currentRiderLocation.latitude.toFixed(4)} · Lng ${currentRiderLocation.longitude.toFixed(4)}` : geoActive ? 'Waiting for a position fix' : riderLocationError ? 'Tap "Allow GPS" to retry' : 'Tap "Allow GPS" to enable',
      icon: Radio, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Rider Status', value: online ? 'Online' : riderStatus.replace('_', ' '), note: online ? 'Accepting jobs' : 'Click to go online from Settings', icon: Radio, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Speed', value: currentRiderLocation?.speed ? `${Math.round(currentRiderLocation.speed * 3.6)} km/h` : '—', note: currentRiderLocation?.speed ? 'From live GPS' : 'Not reported by device', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={NavigationIcon} title="Live Navigation" description="Your GPS position and current delivery route." />

      <DestinationSearch
        onSelect={selectDestination}
        origin={currentRiderLocation}
      />

      <div ref={mapRef}>
        <GoogleDirectionsMap
          origin={currentRiderLocation}
          destination={destination}
        />
      </div>

      {destination && (
        <Card className="rounded-2xl border-emerald-500/30 bg-emerald-50/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Destination</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{destination.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{destination.fullAddress}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="primary" className="rounded-xl" onClick={openNavigation}>
                  <Navigation className="w-3.5 h-3.5 mr-1" /> Show Route
                </Button>
                <Button size="sm" variant="ghost" onClick={clearDestination} className="text-rose-500">Clear</Button>
              </div>
            </div>
            {routeInfo ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/70 dark:bg-slate-800/50 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {routeInfo.km < 10 ? routeInfo.km.toFixed(1) : Math.round(routeInfo.km)} km
                  </p>
                  <p className="text-[10px] text-gray-500">Distance</p>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-slate-800/50 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.max(1, Math.round(routeInfo.min))} min</p>
                  <p className="text-[10px] text-gray-500">ETA</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                {routeLoading
                  ? 'Calculating distance…'
                  : currentRiderLocation
                    ? 'Could not calculate a route to this destination.'
                    : 'Enable GPS to show the distance and ETA from your position.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statusCards.map(s => (
          <Card key={s.label} className="rounded-2xl">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.note}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {online && !geoActive && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-50/10">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-amber-700 dark:text-amber-400">
              {riderLocationError || 'Allow GPS so customers can see your live position during deliveries.'}
            </div>
            <Button size="sm" variant="primary" onClick={enableLiveGps}>Allow GPS</Button>
          </CardContent>
        </Card>
      )}
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-500" /> Current Delivery Route</CardTitle></CardHeader>
        <CardContent>
          {activeDelivery ? (() => {
            const p = pickupLabel(activeDelivery);
            const d = dropoffLabel(activeDelivery);
            const heading = ['picked_up', 'in_transit', 'arriving'].includes(activeDelivery.status) ? d.name : p.name;
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-[10px]">{deliveryKindBadge(activeDelivery.deliveryType)} · {deliveryKindTitle(activeDelivery.deliveryType)}</Badge>
                  <Badge variant="info" className="text-[10px]">{activeDelivery.status.replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-gray-600 dark:text-gray-300">Pickup:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{p.name}{p.address ? ` · ${p.address}` : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-600 dark:text-gray-300">Drop-off:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{d.name}{d.address ? ` · ${d.address}` : ''}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Heading to <span className="font-bold text-gray-900 dark:text-white">{heading}</span> · Estimated delivery: {activeDelivery.estimatedDeliveryTime}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="rounded-xl" onClick={() => navigate('/rider/messages')}><MessageSquare className="w-3.5 h-3.5 mr-1" /> Message {heading.split(' ')[0]}</Button>
                  {dropoffContact(activeDelivery).phone && (
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => window.open(`tel:${dropoffContact(activeDelivery).phone}`)}><Phone className="w-3.5 h-3.5 mr-1" /> Call {d.name}</Button>
                  )}
                </div>
              </div>
            );
          })() : (
            <p className="text-center text-gray-400 py-10 italic">No active delivery route.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * HISTORY — real completed deliveries
 * ------------------------------------------------------------
 */
export function RiderHistoryPage() {
  const { orders, riders, formatPrice } = useApp();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<ReceiptOrder | null>(null);

  const completed = useMemo(() => orders.filter(o => o.riderId === user?.riderId && ['delivered', 'completed'].includes(o.status)), [orders, user]);
  const rating = riders.find(r => r.userId === user?.id)?.rating;

  const openTicket = (o: typeof completed[number]) => {
    setTicket({
      id: o.id,
      orderNumber: o.orderNumber,
      invoiceNumber: o.invoiceNumber,
      vendorName: o.vendorName,
      customerName: o.customerName,
      customerAddress: o.customerAddress,
      customerPhone: o.customerPhone,
      items: o.items,
      deliveryFee: o.deliveryFee,
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
    });
  };

  const stats = [
    { label: 'Deliveries', value: completed.length.toString(), icon: Truck, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Total Earned', value: formatPrice(completed.reduce((a, o) => a + o.deliveryFee, 0)), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Avg Rating', value: rating != null ? rating.toFixed(1) : '—', icon: Star, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Avg Payout', value: completed.length ? formatPrice(completed.reduce((a, o) => a + o.deliveryFee, 0) / completed.length) : formatPrice(0), icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Truck} title="Delivery History" description="Completed trips and earnings summaries." count={`${completed.length} completed`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="rounded-2xl">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Completed Trips</CardTitle></CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="text-center text-gray-400 py-10 italic">No completed deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {completed.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{o.vendorName} → {o.customerName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(o.createdAt).toLocaleDateString()} · {o.status.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-600">+{formatPrice(o.deliveryFee)}</span>
                    <button onClick={() => openTicket(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors" aria-label={`Download ticket for order ${o.orderNumber}`}>
                      <Download className="w-3.5 h-3.5" /> Ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReceiptModal open={!!ticket} order={ticket} onClose={() => setTicket(null)} heading="Delivery Ticket" />
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * WALLET & EARNINGS — real earned figures + wallet balance
 * ------------------------------------------------------------
 */
export function RiderWalletPage() {
  const { orders, formatPrice, requestWithdrawal, showToast } = useApp();
  const { user } = useAuth();
  const today = new Date().toDateString();

  const myOrders = useMemo(() => orders.filter(o => o.riderId === user?.riderId && ['delivered', 'completed'].includes(o.status)), [orders, user]);
  const todayEarned = myOrders.filter(o => new Date(o.createdAt).toDateString() === today).reduce((a, o) => a + o.deliveryFee, 0);
  const todayTrips = myOrders.filter(o => new Date(o.createdAt).toDateString() === today).length;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekEarned = myOrders.filter(o => new Date(o.createdAt) >= weekStart).reduce((a, o) => a + o.deliveryFee, 0);
  const weekTrips = myOrders.filter(o => new Date(o.createdAt) >= weekStart).length;
  const monthStart = new Date(); monthStart.setDate(1);
  const monthEarned = myOrders.filter(o => new Date(o.createdAt) >= monthStart).reduce((a, o) => a + o.deliveryFee, 0);
  const monthTrips = myOrders.filter(o => new Date(o.createdAt) >= monthStart).length;
  const allEarned = myOrders.reduce((a, o) => a + o.deliveryFee, 0);

  const [balance, setBalance] = useState<number>(0);
  const [txs, setTxs] = useState<any[]>([]);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('MTN Mobile Money');
  const [momoNumber, setMomoNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholder, setCardholder] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [depositAmt, setDepositAmt] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);

  useEffect(() => {
    if (!user) return;
    WalletService.getBalance(user.id).then(w => setBalance(Number(w.balance) || 0)).catch(() => setBalance(0));
    WalletService.getTransactions(user.id).then(t => setTxs(Array.isArray(t) ? t : [])).catch(() => setTxs([]));
  }, [user]);

  const methodKind = withdrawMethod.toLowerCase().includes('visa') || withdrawMethod.toLowerCase().includes('mastercard')
    ? 'card'
    : withdrawMethod.toLowerCase().includes('bank')
      ? 'bank'
      : 'momo';

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmt);
    if (!amt || amt <= 0) return showToast('Enter Amount', 'Please enter a valid amount to withdraw.', 'warning');
    if (amt > balance) return showToast('Insufficient Balance', 'Your wallet balance is too low for this withdrawal.', 'warning');

    if (methodKind === 'card') {
      if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length < 12) return showToast('Card Required', 'Enter a valid card number.', 'warning');
      if (!cardExpiry.trim() || !cardCvv.trim()) return showToast('Card Required', 'Enter the card expiry and CVV.', 'warning');
    } else if (methodKind === 'bank') {
      if (!bankName.trim() || !bankAccount.trim()) return showToast('Bank Required', 'Enter the bank name and account number.', 'warning');
    } else {
      if (!momoNumber.trim()) return showToast('Number Required', 'Enter the mobile money number to receive funds.', 'warning');
    }

    setWithdrawing(true);
    try {
      const account = methodKind === 'card'
        ? `${cardholder || 'Card'} •••• ${cardNumber.replace(/\s/g, '').slice(-4)}`
        : methodKind === 'bank'
          ? `${bankName} •••• ${bankAccount.slice(-4)}`
          : momoNumber.trim();
      await requestWithdrawal({ amount: amt, method: withdrawMethod, account });
      setBalance(b => b - amt);
      setWithdrawAmt('');
      setMomoNumber(''); setBankName(''); setBankAccount('');
      setCardNumber(''); setCardExpiry(''); setCardCvv(''); setCardholder('');
    } catch {
      // toast already shown by context
    } finally {
      setWithdrawing(false);
    }
  };

  const downloadCsv = () => {
    const header = 'ID,Type,Category,Amount,Status,Date,Description';
    const rows = txs.map(t => [
      t.id, t.type, t.category, Number(t.amount) || 0, t.status || 'pending',
      new Date(t.createdAt || t.date).toISOString(),
      (t.description || t.category || '').replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnimarket-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Statement Downloaded', 'Your transaction history has been saved as CSV.');
  };

  const shareStatement = async () => {
    const text = txs.slice(0, 20).map(t =>
      `${new Date(t.createdAt || t.date).toLocaleDateString()} ${t.type === 'credit' ? '+' : '−'}GHS ${Math.abs(Number(t.amount) || 0).toFixed(2)} — ${t.description || t.category}`
    ).join('\n');
    const res = await shareLink('OmniMarket Earnings Statement', text);
    if (res === 'copied') showToast('Statement Copied', 'Your statement was copied — paste it anywhere to share.');
  };

  const earningsRows = [
    { label: "Today's Earnings", value: formatPrice(todayEarned), note: `${todayTrips} trips` },
    { label: 'This Week', value: formatPrice(weekEarned), note: `${weekTrips} trips` },
    { label: 'This Month', value: formatPrice(monthEarned), note: `${monthTrips} trips` },
    { label: 'All-Time Earnings', value: formatPrice(allEarned), note: `${myOrders.length} deliveries` },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 p-6 sm:p-8 text-white shadow-2xl shadow-orange-500/30">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-black/10 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-100">Earnings &amp; Wallet</p>
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1">
              <Wallet className="w-3 h-3 text-amber-200" />
              <span className="text-[9px] font-black uppercase tracking-widest">OmniWallet</span>
            </div>
          </div>
          <p className="mt-6 text-[11px] font-bold text-orange-100 uppercase tracking-widest">Available Balance</p>
          <p className="text-4xl sm:text-5xl font-black tracking-tight mt-1">{formatPrice(balance)}</p>
          <p className="mt-2 text-[11px] text-orange-100/90 font-medium">Rider {user?.id?.slice(0, 8).toUpperCase() || '••••••••'}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button onClick={() => setShowTx(true)} className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 py-3 text-center hover:bg-white/25 transition">
              <ArrowUpFromLine className="w-5 h-5 mx-auto" />
              <span className="mt-1 block text-[10px] font-black uppercase tracking-widest">Withdraw</span>
            </button>
            <button onClick={() => setShowTx(true)} className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 py-3 text-center hover:bg-white/25 transition">
              <Clock className="w-5 h-5 mx-auto" />
              <span className="mt-1 block text-[10px] font-black uppercase tracking-widest">History</span>
            </button>
            <button onClick={() => setShowDeposit(v => !v)} className="rounded-2xl bg-white text-orange-600 py-3 text-center hover:bg-orange-50 transition shadow-lg">
              <ArrowDownToLine className="w-5 h-5 mx-auto" />
              <span className="mt-1 block text-[10px] font-black uppercase tracking-widest">Deposit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deposit panel */}
      {showDeposit && (
        <Card className="rounded-[1.75rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Deposit via Mobile Money</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input type="number" placeholder="Amount (GHS)" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} className="rounded-xl" />
              <Button
                onClick={() => {
                  const amt = Number(depositAmt);
                  if (!amt || amt <= 0) return showToast('Enter Amount', 'Please enter a valid deposit amount.', 'warning');
                  WalletService.topUp(user!.id, { amount: amt, method: 'Mobile Money' }).then(() => {
                    setBalance(b => b + amt);
                    setDepositAmt('');
                    setShowDeposit(false);
                    showToast('Deposit Successful', `GHS ${amt.toLocaleString()} added to your wallet.`);
                  }).catch(() => showToast('Error', 'Deposit failed. Please try again.', 'warning'));
                }}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest"
              >
                Confirm Deposit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings — single collapsed row */}
      <Card className="rounded-[1.75rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <button onClick={() => setShowEarnings(v => !v)} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">This Week</p>
              <p className="text-xs text-gray-400 font-medium">{weekTrips} trips · last 7 days</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xl font-black text-gray-900 dark:text-white">{formatPrice(weekEarned)}</p>
            <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', showEarnings && 'rotate-180')} />
          </div>
        </button>
        <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pb-5 overflow-hidden transition-all', !showEarnings && 'hidden')}>
          {earningsRows.map(r => (
            <div key={r.label} className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{r.label}</p>
              <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{r.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{r.note}</p>
            </div>
          ))}
        </div>
        <div className={cn('border-t border-gray-50 dark:border-slate-800 px-6 py-4 overflow-hidden transition-all', !showEarnings && 'hidden')}>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Recent Delivery Earnings</p>
          <div className="space-y-2">
            {myOrders.slice(0, 6).length === 0 && <p className="text-xs text-gray-400 italic">No completed deliveries yet.</p>}
            {myOrders.slice(0, 6).map(o => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    deliveryKindOf(o) === 'PACKAGE' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                    deliveryKindOf(o) === 'PASS' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
                    'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                  }`}>{deliveryKindBadge(o.deliveryType)}</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{dropoffLabel(o).name}</span>
                  <span className="text-[10px] text-gray-400 font-mono truncate hidden sm:inline">{deliveryRef(o)}</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 shrink-0">{formatPrice(o.deliveryFee)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Withdraw form */}
      <Card className="rounded-[1.75rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 px-6 sm:px-8 py-5">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
            <ArrowUpFromLine className="w-4 h-4 text-emerald-500" /> Withdraw Money
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Method</Label>
            <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
              <SelectTrigger className="w-full h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MTN Mobile Money">MTN Mobile Money</SelectItem>
                <SelectItem value="Telecel Cash">Telecel Cash</SelectItem>
                <SelectItem value="AirtelTigo Money">AirtelTigo Money</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Visa / Mastercard">Visa / Mastercard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic fields per method */}
          {methodKind === 'momo' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{withdrawMethod} Number</Label>
              <Input type="tel" placeholder="e.g. 0240000000" value={momoNumber} onChange={e => setMomoNumber(e.target.value)} className="rounded-xl h-12" />
            </div>
          )}

          {methodKind === 'bank' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bank Name</Label>
                <Input placeholder="e.g. GCB Bank" value={bankName} onChange={e => setBankName(e.target.value)} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Number</Label>
                <Input type="tel" placeholder="e.g. 0123456789012" value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="rounded-xl h-12" />
              </div>
            </div>
          )}

          {methodKind === 'card' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cardholder Name</Label>
                <Input placeholder="Name on card" value={cardholder} onChange={e => setCardholder(e.target.value)} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Card Number</Label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value.replace(/[^\d ]/g, '').slice(0, 19))}
                  className="rounded-xl h-12 font-mono tracking-widest"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expiry</Label>
                  <Input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value.slice(0, 5))} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">CVV</Label>
                  <Input type="password" placeholder="•••" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} className="rounded-xl h-12" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amount (GHS)</Label>
            <Input type="number" placeholder="0.00" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} className="rounded-xl h-12" />
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
          >
            {withdrawing ? 'Processing…' : `Withdraw ${withdrawAmt ? `GHS ${Number(withdrawAmt).toLocaleString()}` : ''}`}
          </Button>
          <p className="text-[10px] text-gray-400 font-medium text-center">Withdrawals are reviewed by the finance team and typically pay out within 24 hours.</p>
        </CardContent>
      </Card>

      {/* Transactions modal */}
      <AnimatePresence>
        {showTx && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Transactions</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{txs.length} records</p>
                </div>
                <button onClick={() => setShowTx(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="max-h-[46vh] overflow-y-auto">
                {txs.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 italic text-sm">No transactions yet. Your earnings will appear here.</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {txs.slice(0, 50).map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', t.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500')}>
                            {t.type === 'credit' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.description || t.category}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{new Date(t.createdAt || t.date).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn('text-sm font-black', t.type === 'credit' ? 'text-emerald-600' : 'text-gray-900 dark:text-white')}>
                            {t.type === 'credit' ? '+' : '−'}{formatPrice(Math.abs(Number(t.amount) || 0))}
                          </p>
                          <span className={cn('text-[9px] font-black uppercase tracking-widest', (t.status === 'completed' || t.status === 'Completed') ? 'text-emerald-500' : 'text-amber-500')}>
                            {t.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 p-6 border-t border-gray-50 dark:border-slate-800">
                <Button variant="outline" onClick={downloadCsv} disabled={txs.length === 0} className="h-12 rounded-xl font-black uppercase tracking-widest">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button onClick={shareStatement} disabled={txs.length === 0} className="h-12 rounded-xl bg-amber-500 hover:bg-amber-600 font-black uppercase tracking-widest text-white">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * PROFILE — real rider identity + fleet record
 * ------------------------------------------------------------
 */
export function RiderProfilePage() {
  const navigate = useNavigate();
  const { riders, updateProfile, updateRiderProfile, showToast, orders, customerProfile, startConversation, riderStatus, updateRiderStatus } = useApp();
  const { user, logout } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pushPref, setPushPref] = useState(() => localStorage.getItem('om_rider_push') !== 'off');

  const online = riderStatus !== 'OFFLINE';

  const [isCopied, setIsCopied] = useState(false);

  const onAvatarCropped = (dataUrl: string) => {
    updateProfile({ avatar: dataUrl });
    showToast('Profile Updated', 'Your profile image has been changed.');
    setCropSrc(null);
  };

  const rider = riders.find(r => r.userId === user?.id || r.id === user?.id);
  const deliveredCount = orders.filter(o => o.riderId === user?.riderId && ['delivered', 'completed'].includes(o.status)).length;

  const [form, setForm] = useState({
    name: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '',
    phone: user?.phone || rider?.phone || '',
    phoneSecondary: rider?.phoneSecondary || '',
    about: rider?.about || '',
    vehicleType: rider?.vehicleType || 'Motorcycle',
    vehicleNumber: rider?.vehicleNumber || '',
  });

const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (!src) return;
        setCropSrc(src);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name: form.name, phone: form.phone });
      if (rider) {
        await updateRiderProfile(rider.id, {
          phoneSecondary: form.phoneSecondary,
          about: form.about,
          vehicleType: form.vehicleType as any,
          vehicleNumber: form.vehicleNumber,
        });
      }
      setShowEditModal(false);
    } catch (err) {
      showToast('Error', 'Failed to update profile. Please try again.', 'warning');
    }
  };

  const fullName = user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName}` : 'Rider');
  const userInitials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  // Server-generated referral code + stats (from GET /api/referrals/me)
  const [referral, setReferral] = useState<MyReferral | null>(null);
  const [showReferralQr, setShowReferralQr] = useState(false);
  useEffect(() => {
    ReferralService.getMyReferral()
      .then(r => setReferral(r))
      .catch(() => setReferral(null));
  }, []);
  const riderReferralCode = referral?.code || user?.referralCode || `OM-${user?.id.slice(0, 4).toUpperCase() || ''}`;
  const referralLink = riderReferralCode ? `${window.location.origin}/register?ref=${riderReferralCode}` : '';
  const qrUrl = referralLink ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(referralLink)}` : '';

  const fields = [
    { label: 'Registration Email', value: user?.email || '—' },
    { label: 'Contact', value: user?.phone || '—' },
    { label: 'Alternative Contact', value: form.phoneSecondary || 'None' },
    { label: 'Vehicle Fleet', value: rider?.vehicleType || 'Motorcycle' },
    { label: 'Fleet Number', value: rider?.vehicleNumber || '—' },
  ];

  const riderIdField = {
    label: 'Rider ID',
    value: user?.riderId || rider?.id || '—',
  };

  const handleContactSupport = async () => {
    try {
      showToast('Support', 'Opening support chat...');
      const conv = await startConversation(['admin-support-id'], {
        type: 'rider_support',
        subject: `Support Request - ${fullName}`
      });
      navigate(`/rider/messages?convId=${conv.id}`);
    } catch (err) {
      showToast('Error', 'Unable to reach support right now.', 'warning');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4 pb-14">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 p-0.5 shadow-md overflow-hidden ring-1 ring-gray-100 dark:ring-slate-700">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} className="w-full h-full object-cover rounded-xl" alt={fullName} />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg font-black shadow-inner">
                  {userInitials}
                </div>
              )}
            </div>
            <button onClick={pickImage} className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 text-white rounded-lg shadow-md hover:bg-amber-600 transition-all border-2 border-white dark:border-slate-900">
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">{fullName}</h2>
              <RiderSubscriptionStatus size="sm" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
              {rider?.vehicleType || 'E-Bike'} Rider
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={rider?.isVerified || user?.isVerified ? 'success' : 'warning'} className="rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest border-none">
                {(rider?.verificationStatus || (user?.isVerified ? 'verified' : 'pending')).replace('_', ' ')}
              </Badge>
              <span className="flex items-center gap-1 text-[11px] font-black text-gray-600 dark:text-gray-300">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {rider?.rating != null ? rider.rating.toFixed(1) : '—'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-black text-gray-600 dark:text-gray-300">
                <Truck className="w-3 h-3 text-orange-500" /> {deliveredCount} jobs
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
          <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Rider ID hero strip */}
            <div className="flex items-center justify-between gap-4 px-8 py-5 bg-gradient-to-r from-amber-400/10 via-orange-400/5 to-transparent border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                  <IdCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rider ID</p>
                  <p className="text-sm font-black font-mono text-gray-900 dark:text-white tracking-wider">{riderIdField.value}</p>
                </div>
              </div>
              <Badge variant={rider?.isVerified || user?.isVerified ? 'success' : 'warning'} className="rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border-none">
                {(rider?.verificationStatus || (user?.isVerified ? 'verified' : 'pending')).replace('_', ' ')}
              </Badge>
            </div>

            <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 px-8 py-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-50 dark:divide-slate-800">
              {fields.map(f => (
                <div key={f.label} className="flex items-center justify-between gap-6 px-8 py-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">{f.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white text-right truncate">{f.value}</p>
                </div>
              ))}
              {(rider?.about || form.about) && (
                <div className="px-8 py-5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bio / About</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {rider?.about || form.about}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 px-8 py-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Go Online</p>
                    <p className="text-xs text-gray-400">Start receiving live order alerts</p>
                  </div>
                </div>
                <Switch
                  checked={online}
                  onCheckedChange={(v: boolean) => { updateRiderStatus(v ? 'ONLINE' : 'OFFLINE'); showToast(v ? 'Online' : 'Offline', v ? 'You are now available for deliveries.' : 'You are now offline.'); }}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Push Notifications</p>
                    <p className="text-xs text-gray-400">New order &amp; earnings alerts</p>
                  </div>
                </div>
                <Switch
                  checked={pushPref}
                  onCheckedChange={(v: boolean) => { setPushPref(v); localStorage.setItem('om_rider_push', v ? 'on' : 'off'); }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Refer & Earn */}
          <Card className="rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-600 text-white border-none shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider">Refer &amp; Earn</p>
                    <p className="text-xs text-white/80 font-bold">Friends who register earn you bonuses</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black leading-none">{referral?.totalReferred ?? 0}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/70">Referred</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-2xl border border-white/30 p-4 backdrop-blur-md shadow-inner relative">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Your Unique Code</p>
                  <p className="font-mono font-black text-2xl tracking-[0.2em] text-white truncate">{riderReferralCode}</p>
                </div>
                <div className="relative">
                  <AnimatePresence>
                    {isCopied && (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: -30, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none"
                      >
                        COPIED!
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={() => {
                      copyText(riderReferralCode).then(ok => {
                        if (ok) {
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }
                        showToast(ok ? 'Code Copied!' : 'Copy Failed', ok ? 'You can now paste and share your code.' : 'Please try again or copy manually.');
                      });
                    }}
                    className="px-6 py-3 rounded-xl bg-white text-orange-600 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" /> COPY
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    shareLink('Join me on OmniMarket — use my referral code to register!', referralLink).then(r => {
                      if (r === 'shared') showToast('Success', 'Opening share menu...');
                      else if (r === 'copied') showToast('Link Copied', 'Share it with your friends!');
                      else showToast('Share Unavailable', 'The share menu could not be opened. Link was copied instead.', 'warning');
                    }).catch(() => {
                      copyText(referralLink).then(() => showToast('Link Copied', 'Share it with your friends!'));
                    });
                  }}
                  className="py-3.5 rounded-2xl bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest hover:bg-black/30 transition-all text-white border border-white/10 flex items-center justify-center gap-2 group"
                >
                  <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> SHARE LINK
                </button>
                <button
                  onClick={() => setShowReferralQr(v => !v)}
                  className="py-3.5 rounded-2xl bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest hover:bg-black/30 transition-all text-white border border-white/10 flex items-center justify-center gap-2 group"
                >
                  <QrCode className="w-4 h-4 group-hover:scale-110 transition-transform" /> QR CODE
                </button>
              </div>
              {showReferralQr && qrUrl && (
                <div className="mt-3 flex items-center justify-center rounded-xl bg-white p-4">
                  <img src={qrUrl} alt="Referral QR code" className="w-36 h-36 rounded-lg" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Profile — distinct primary action */}
          <Button
            onClick={() => setShowEditModal(true)}
            className="w-full h-14 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] transition-transform font-black uppercase tracking-widest shadow-xl shadow-gray-400/20"
          >
            Edit Profile
          </Button>

          {/* About / Version — modern premium badge */}
          <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">OmniMarket Rider</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">App {APP_VERSION_LABEL}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Stable
              </span>
            </CardContent>
          </Card>

          {/* Contact Support — quiet, always last at the bottom */}
          <button
            onClick={handleContactSupport}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 hover:border-amber-400 hover:text-amber-500 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Contact Support
          </button>

          {/* Log Out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/40"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">Edit Profile</h3>
                  <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl h-12 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone Number</Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-12 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Secondary Contact</Label>
                    <Input value={form.phoneSecondary} onChange={e => setForm({ ...form, phoneSecondary: e.target.value })} className="rounded-xl h-12 font-bold" placeholder="+233..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Bio / About</Label>
                    <textarea value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} className="w-full rounded-xl p-3 h-24 font-medium text-sm bg-gray-50 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-amber-500" placeholder="Tell us about your service..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Vehicle Type</Label>
                      <Select value={form.vehicleType} onValueChange={(v) => setForm({ ...form, vehicleType: v })} className="w-full">
                        <SelectTrigger className="h-12 rounded-xl bg-gray-50 dark:bg-slate-800 border-none"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                        <SelectContent>
                          {(['Motorcycle', 'Scooter', 'Bicycle', 'Van', 'Car'] as string[]).map((v: string) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Plate Number</Label>
                      <Input value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="e.g. GT 1234-20" className="rounded-xl h-12 font-bold" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowEditModal(false)}>CANCEL</Button>
                  <Button className="flex-1 rounded-xl h-12 bg-amber-500 hover:bg-amber-600 font-bold" onClick={handleSaveProfile}>SAVE CHANGES</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImageCropModal
        open={!!cropSrc}
        imageSrc={cropSrc || ''}
        onCancel={() => setCropSrc(null)}
        onConfirm={onAvatarCropped}
        aspect={1}
        maxOutputSize={500}
        title="Crop Profile Photo"
      />
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * SETTINGS — real availability toggle + status
 * ------------------------------------------------------------
 */
export function RiderSettingsPage() {
  const navigate = useNavigate();
  const { riderStatus, riderLocationError, geoActive, updateRiderStatus, showToast, riders } = useApp();
  const { user, updateUser, logout } = useAuth();
  const online = riderStatus !== 'OFFLINE';
  const [pushPref, setPushPref] = useState(() => localStorage.getItem('om_rider_push') !== 'off');
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [emailStep, setEmailStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [emailCode, setEmailCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const rider = riders.find(r => r.userId === user?.id || r.id === user?.id);
  const emailVerified = !!(user?.isEmailVerified || user?.isVerified);

  const requestEmailVerification = async () => {
    setEmailBusy(true);
    try {
      const res = await AuthApiService.sendVerification();
      if (res.emailVerified) {
        setEmailStep('verified');
        updateUser({ isEmailVerified: true, isVerified: true });
      } else {
        setEmailStep('sent');
        showToast('Code Sent', 'Check your inbox for the verification code.');
      }
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not send the verification code.', 'warning');
    } finally {
      setEmailBusy(false);
    }
  };

  const submitEmailVerification = async () => {
    if (!emailCode.trim()) return;
    setEmailBusy(true);
    try {
      const res = await AuthApiService.verifyEmail(emailCode.trim());
      if (res?.user) updateUser({ isEmailVerified: true, isVerified: true });
      setEmailStep('verified');
      showToast('Email Verified', 'Your email is verified — full account trust unlocked.');
    } catch (err: any) {
      showToast('Invalid Code', err?.message || 'The code could not be verified.', 'warning');
    } finally {
      setEmailBusy(false);
    }
  };

  const handlePushToggle = (v: boolean) => {
    setPushPref(v);
    localStorage.setItem('om_rider_push', v ? 'on' : 'off');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Profile-setup / trust score (email verification is the biggest factor).
  const setupHasPhone = !!(user?.phone || '').trim();
  const setupHasVehicle = !!rider?.vehicleNumber;
  const setupHasPhoto = !!user?.avatarUrl && !user.avatarUrl.includes('dicebear');
  const setupHasBio = !!rider?.about?.trim();
  const setupPct = Math.min(
    100,
    (emailVerified ? 55 : 0) + (setupHasPhone ? 15 : 0) + (setupHasVehicle ? 15 : 0) + (setupHasPhoto ? 10 : 0) + (setupHasBio ? 5 : 0)
  );
  const setupLabel = emailVerified ? (setupPct >= 100 ? '100% Trust' : 'Email verified — finish your profile') : 'Verify your email to reach 100% trust';

  const setupSteps = [
    { label: 'Verify email', done: emailVerified, weight: 'Most important — unlocks 100% trust' },
    { label: 'Add phone number', done: setupHasPhone },
    { label: 'Add vehicle + plate', done: setupHasVehicle },
    { label: 'Add profile photo', done: setupHasPhoto },
    { label: 'Add a short bio', done: setupHasBio },
  ];

  const emailAction = emailVerified ? (
    <Badge variant="success" className="rounded-lg">Verified</Badge>
  ) : emailStep === 'sent' ? (
    <div className="flex items-center gap-2">
      <Input value={emailCode} onChange={e => setEmailCode(e.target.value)} placeholder="6-digit code" className="w-24 h-9 rounded-lg text-center font-bold" maxLength={6} />
      <Button size="sm" variant="primary" className="rounded-lg" onClick={submitEmailVerification} disabled={emailBusy}>Verify</Button>
    </div>
  ) : (
    <Button size="sm" variant="outline" className="rounded-lg" onClick={requestEmailVerification} disabled={emailBusy}>
      Verify Email
    </Button>
  );

  const settingsGroups = [
    {
      title: 'Availability & Service',
      items: [
        {
          label: 'Accepting Deliveries',
          desc: 'Toggle to go online and start receiving job requests.',
          icon: Radio,
          action: <Switch checked={online} onCheckedChange={(v) => updateRiderStatus(v ? 'ONLINE' : 'OFFLINE')} />
        },
        {
          label: 'Live Location Tracking',
          desc: 'Allow customers to see your real-time position during active deliveries.',
          icon: MapPin,
          action: geoActive
            ? <Badge variant="success" className="rounded-lg">Enabled</Badge>
            : <Badge variant="warning" className="rounded-lg">Off</Badge>
        }
      ]
    },
    {
      title: 'Profile & Delivery',
      items: [
        {
          label: 'Vehicle Type',
          desc: rider?.vehicleType || 'Not set — add it in Profile',
          icon: Bike,
          action: <Button size="sm" variant="outline" className="rounded-lg" onClick={() => navigate('/rider/profile')}>Edit</Button>
        },
        {
          label: 'Plate Number',
          desc: rider?.vehicleNumber || 'Not set — add it in Profile',
          icon: Truck,
          action: <Button size="sm" variant="outline" className="rounded-lg" onClick={() => navigate('/rider/profile')}>Edit</Button>
        },
        {
          label: 'Service Area',
          desc: rider?.serviceArea || 'Takoradi, Western Region',
          icon: MapPin,
          action: <Badge variant="default" className="rounded-lg">Active</Badge>
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Push Notifications',
          desc: 'Receive alerts for new jobs and message updates.',
          icon: Bell,
          action: <Switch checked={pushPref} onCheckedChange={handlePushToggle} />
        }
      ]
    },
    {
      title: 'Security',
      items: [
        {
          label: 'Email Verification',
          desc: emailVerified
            ? 'Your email is verified — 100% account trust.'
            : emailStep === 'sent'
              ? 'Enter the 6-digit code we emailed you.'
              : 'Verify your email to reach 100% account trust.',
          icon: CheckCircle,
          action: emailAction
        }
      ]
    },
    {
      title: 'Subscription',
      items: [
        {
          label: 'My Plan',
          desc: `You are on the ${getRiderPlan(user?.id)} plan — manage or upgrade anytime.`,
          icon: Crown,
          action: <Button size="sm" variant="outline" className="rounded-lg" onClick={() => navigate('/rider/subscription')}>Manage</Button>
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={Settings} title="Account Settings" description="Manage your availability, preferences, and security." />

      {/* Profile Setup & Trust Score */}
      <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Profile Setup &amp; Trust</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{setupPct}%</p>
              <p className="text-xs font-bold text-amber-600 mt-1">{setupLabel}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <div className="h-3 mt-5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${setupPct}%` }} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-5">
            {setupSteps.map(s => (
              <div key={s.label} title={s.done ? 'Complete' : s.weight || ''} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${s.done ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-500'}`}>
                {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                <span className="truncate">{s.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {settingsGroups.map(group => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-6">{group.title}</h3>
            <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
              <CardContent className="p-0 divide-y divide-gray-50 dark:divide-slate-800">
                {group.items.map(item => (
                  <div key={item.label} className="flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 text-amber-500 shadow-sm">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="max-w-[180px] sm:max-w-xs">
                        <p className="font-bold text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                    {item.action}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Card className="rounded-[2.5rem] bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Danger Zone</h3>
            <p className="text-xs text-rose-500/70 font-bold mt-1">Actions here are permanent and cannot be undone.</p>
          </div>
          <Button variant="danger" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest shadow-xl shadow-rose-600/10" onClick={() => setShowDeactivate(true)}>
            Deactivate Account
          </Button>
        </div>
      </Card>

      {/* Log Out */}
      <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2.5 py-5 text-red-500 dark:text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <LogOut className="w-4 h-4" /> Log Out of Rider Portal
        </button>
      </Card>

      {/* Deactivate Confirmation Modal */}
      <AnimatePresence>
        {showDeactivate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800">
              <div className="p-7 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <button onClick={() => setShowDeactivate(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Deactivate your rider account?</h3>
                  <p className="text-sm text-gray-500 mt-1.5">
                    This stops new job offers and hides your availability. Active deliveries must be finished first, and a support representative will confirm your request.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setShowDeactivate(false)}>CANCEL</Button>
                  <Button className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold" onClick={() => { setShowDeactivate(false); navigate('/rider/messages'); }}>CONTACT SUPPORT</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * RATINGS — real rider rating
 * ------------------------------------------------------------
 */
export function RiderRatingsPage() {
  const { riders, orders } = useApp();
  const { user } = useAuth();
  const rider = riders.find(r => r.userId === user?.id || r.id === user?.id);
  const deliveredCount = orders.filter(o => o.riderId === user?.riderId && ['delivered', 'completed'].includes(o.status)).length;

  const cards = [
    { label: 'Overall Rating', value: rider?.rating !== undefined ? `${rider.rating.toFixed(1)}★` : '—', note: `${deliveredCount} deliveries`, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Acceptance Rate', value: rider?.acceptanceRate !== undefined ? `${Math.round(rider.acceptanceRate)}%` : '—', note: 'From dispatch records', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Completion Rate', value: rider?.completionRate !== undefined ? `${Math.round(rider.completionRate)}%` : '—', note: 'Completed vs accepted', icon: PackageCheck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Star} title="Ratings" description="Customer feedback and your performance metrics." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(s => (
          <Card key={s.label} className="rounded-2xl">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.note}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rider?.rating == null && deliveredCount === 0 ? (
        <Card className="rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
          <CardContent className="text-center py-14">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Star className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">No ratings yet</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Your rating is calculated from customer feedback on completed deliveries. Go online to start earning your first reviews.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PackageCheck className="w-4 h-4 text-amber-500" /> Delivery Performance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              You have <span className="font-bold text-gray-900 dark:text-white">{deliveredCount}</span> completed delivery{deliveredCount === 1 ? '' : 'ies'}. Keep completing deliveries and keep ratings high to unlock priority dispatch.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * MESSAGES — real conversations
 * ------------------------------------------------------------
 */
export function RiderMessagesPage() {
  const { conversations, showToast, sendMessage, orders } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const convId = searchParams.get('convId');
    if (convId) {
      setSelectedConvId(convId);
      loadMessages(convId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const orderOfChat = (c: any) => {
    if (!c?.orderId) return null;
    return orders.find(o => o.id === c.orderId || o.orderNumber === c.orderId) || null;
  };

  const filteredChats = conversations.filter(c => {
    if (!search.trim()) return true;
    const partner = (c.participants && c.participants[0]?.name) || c.subject || '';
    return partner.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId) || null;
  const convPartner = selectedConv?.participants?.find((p: any) => p.id !== user?.id) || selectedConv?.participants?.[0] || null;
  const convPartnerInitials = getInitials(convPartner?.name || '');

  const loadMessages = async (convId: string) => {
    setSelectedConvId(convId);
    setLoading(true);
    try {
      const rows = await MessagingService.getMessages(convId);
      setMessages(Array.isArray(rows) ? rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)) : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const content = messageInput.trim();
    if (!content || !selectedConvId || !user) return;
    setSending(true);
    try {
      await sendMessage(selectedConvId, content);
      setMessageInput('');
      await loadMessages(selectedConvId);
    } catch {
      showToast('Send Failed', 'Could not send the message.', 'warning');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-12rem)] pb-10">
      <PageHeader icon={MessageSquare} title="Messages" description="Customer instructions and dispatch coordination." count={`${conversations.length} threads`} />

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Chat List */}
        <div className={cn("w-full md:w-80 border-r border-gray-50 dark:border-slate-800 flex flex-col", selectedConvId && "hidden md:flex")}>
          <div className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." className="w-full bg-gray-50 dark:bg-slate-800 border-none pl-10 py-3.5 rounded-2xl text-xs font-bold focus:ring-1 focus:ring-amber-500 outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {filteredChats.length === 0 ? (
               <div className="py-12 text-center">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No conversations</p>
               </div>
            ) : filteredChats.map(chat => {
              const partner = chat.participants && chat.participants.find((p: any) => p.id !== user?.id);
              const partnerName = partner?.name || chat.subject || 'Unknown participant';
              const partnerInitials = getInitials(partnerName);
              const order = orderOfChat(chat);

              return (
                <div key={chat.id} onClick={() => loadMessages(chat.id)} className={cn("p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all mb-1 hover:bg-amber-50 dark:hover:bg-amber-950/20", selectedConvId === chat.id && "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500/20")}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-xs font-black shadow-md overflow-hidden">
                    {partner?.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : (partnerInitials ? <span>{partnerInitials}</span> : <MessageCircle className="w-5 h-5" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{partnerName}</p>
                      <span className="text-[9px] text-gray-400">{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    {order && (
                      <p className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md mt-0.5 text-[9px] font-black uppercase tracking-wider ${
                        deliveryKindOf(order) === 'PACKAGE' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                        deliveryKindOf(order) === 'PASS' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
                        'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {deliveryKindBadge(order.deliveryType)} · {deliveryRef(order)} · Order #{order.orderNumber}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{chat.lastMessage || 'Open to view conversation'}</p>
                  </div>
                  {chat.unreadCount > 0 && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Window */}
        <div className={cn("flex-1 flex flex-col", !selectedConvId && "hidden md:flex")}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30 dark:bg-slate-950/30">
              <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-500 mb-6 shadow-inner">
                <MessageCircle className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Customer Chat</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-2">Select a conversation to communicate with your customers or support.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3 bg-gray-50/50 dark:bg-slate-950/30">
                <button onClick={() => setSelectedConvId(null)} className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {convPartner?.avatar ? <img src={convPartner.avatar} className="w-full h-full object-cover" /> : (convPartnerInitials ? <span>{convPartnerInitials}</span> : <MessageCircle className="w-5 h-5" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">{convPartner?.name || selectedConv.subject}</p>
                  {selectedConv.orderId ? (() => {
                    const ord = orderOfChat(selectedConv);
                    return ord ? (
                      <p className={cn("text-[10px] font-black uppercase tracking-wider mt-0.5",
                        deliveryKindOf(ord) === 'PACKAGE' ? 'text-blue-500 dark:text-blue-400' :
                        deliveryKindOf(ord) === 'PASS' ? 'text-violet-500 dark:text-violet-400' : 'text-amber-500 dark:text-amber-400')}>
                        {deliveryKindBadge(ord.deliveryType)} delivery · {deliveryRef(ord)} · Order #{ord.orderNumber}
                      </p>
                    ) : <p className="text-[10px] text-gray-500">Order #{selectedConv.orderId.slice(-8).toUpperCase()}</p>;
                  })() : <p className="text-[10px] text-gray-500">OmniMarket Support Thread</p>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20 dark:bg-slate-950/20">
                {loading ? (
                  <div className="flex justify-center py-10"><RefreshCw className="w-8 h-8 text-amber-500 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-12">No messages yet</p>
                ) : messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm font-bold shadow-sm", mine ? "bg-amber-500 text-white rounded-br-none" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-bl-none")}>
                        <p className="leading-relaxed">{m.content}</p>
                        <p className={cn("text-[9px] mt-1.5 opacity-60", mine ? "text-white" : "text-gray-500")}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3">
                <input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-100 dark:bg-slate-800 border-none px-5 py-3.5 rounded-2xl text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !messageInput.trim()}
                  className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 p-0 shadow-lg shadow-amber-500/20"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * NOTIFICATIONS — real notifications with read actions
 * ------------------------------------------------------------
 */
export function RiderNotificationsPage() {
  return <NotificationCenter role="rider" />;
}

/*
 * ------------------------------------------------------------
 * SUBSCRIPTION — rider plans (Free / Premium / Pro)
 * ------------------------------------------------------------
 */
export function RiderSubscriptionPage() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(
    () => localStorage.getItem(`omnimarket_rider_plan_${user?.id || 'guest'}`) || 'Free'
  );
  const current = RIDER_PLANS.find(p => p.id === currentPlan) || RIDER_PLANS[0];
  const nextBilling = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  const handleSelect = (planId: string) => {
    localStorage.setItem(`omnimarket_rider_plan_${user?.id || 'guest'}`, planId);
    setCurrentPlan(planId);
    const plan = RIDER_PLANS.find(p => p.id === planId)!;
    showToast('Plan Updated', planId === 'Free' ? 'You are now on the free plan.' : `You are now on the ${planId} plan — billed monthly.`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/20 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-300">
              <Crown className="w-4 h-4" /> Your Plan
            </div>
            <h1 className="text-3xl font-black">{current.id}</h1>
            <p className="text-sm text-slate-300 font-medium max-w-lg">{current.tagline}</p>
            <div className="flex items-center gap-2 text-[10px] font-black font-mono tracking-widest text-slate-400">
              <IdCard className="w-3.5 h-3.5 text-amber-400" /> RID-{(user?.riderId || '—').toUpperCase()}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 backdrop-blur rounded-2xl p-5 text-center min-w-[190px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Billing</p>
            <p className="text-2xl font-black mt-1 flex items-center justify-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-400" /> {current.price === 0 ? 'Never' : nextBilling}
            </p>
            {current.price > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">GHS {current.price}{current.period} · auto-renew</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {RIDER_PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan;
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={cn(
                'rounded-[2rem] p-8 flex flex-col relative border shadow-sm transition-all',
                plan.popular ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 shadow-amber-500/20 ring-2 ring-amber-500/20' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800',
                !isCurrent && 'hover:shadow-xl'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                  Most Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" /> Current
                </span>
              )}

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300 mb-5">
                <Icon className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-black text-gray-900 dark:text-white">{plan.id}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-black text-gray-900 dark:text-white">GHS {plan.price}</span>
                <span className="text-xs font-bold text-gray-400 mb-1.5">{plan.period}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">{plan.tagline}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.perks.map(perk => (
                  <li key={perk} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                    <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                  'w-full h-12 rounded-2xl mt-8 font-black text-xs shadow-lg',
                  isCurrent
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-default'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/20'
                )}
                disabled={isCurrent}
                onClick={() => handleSelect(plan.id)}
              >
                {isCurrent ? 'Current Plan' : plan.cta}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500"><Zap className="w-5 h-5" /></div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">Why subscribe?</h3>
            <p className="text-xs text-gray-500 font-medium">Paid plans remove per-delivery platform fees and unlock earning tools.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: '0% Platform Fees', desc: 'Keep 100% of every delivery once on a paid plan.', icon: DollarSign },
            { title: 'Priority Jobs', desc: 'Paid riders get first claim on nearby orders during peak.', icon: Bike },
            { title: 'Faster Payouts', desc: 'Withdraw earnings faster and reach out instantly.', icon: ArrowDownToLine },
          ].map(f => (
            <div key={f.title} className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
              <f.icon className="w-5 h-5 text-amber-500 mb-3" />
              <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{f.title}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 font-medium">Demo checkout: selecting a plan is instant on this demo build. Real billing would route through our Takoradi finance team.</p>
      </div>
    </div>
  );
}
