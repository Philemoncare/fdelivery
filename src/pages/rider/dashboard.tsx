import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bike, Wallet, Navigation, CheckCircle, X, Phone, MessageSquare,
  Crown, Star, Coins, TrendingUp, PackageCheck, Fingerprint, Zap, Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { cn, getInitials } from '@/src/lib/utils';
import { deliveryRef, deliveryKindBadge, deliveryKindTitle, deliveryKindOf, pickupLabel, dropoffLabel, ACTIVE_DELIVERY_STATUSES } from '@/src/lib/rider-deliveries';

import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { geolocationEnvironment } from '@/src/lib/location/geolocation';
import { Order } from '@/src/types';
import { RiderSubscriptionStatus } from '@/src/components/rider/RiderSubscriptionStatus';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';

export function RiderDashboardPage() {
  const { user } = useAuth();
  const geoEnv = geolocationEnvironment();

  const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const localUrl = isLocalHost ? window.location.href : 'http://localhost:3000';

  const {
    riderStatus,
    updateRiderStatus,
    currentRiderLocation,
    riderLocationError,
    geoActive,
    enableLiveGps,
    orders,
    availableDeliveries,
    refreshAvailableDeliveries,
    formatPrice,
    completeDelivery,
    assignRiderToOrder,
    riders,
    showToast
  } = useApp();
  const navigate = useNavigate();

  const online = riderStatus !== 'OFFLINE';

  const riderRecord = riders.find(r => r.userId === user?.id || r.id === user?.id);
  const riderIdDisplay = (user?.riderId || riderRecord?.id || '').toUpperCase();

  // My Deliveries = deliveries assigned to this rider (authoritative source).
  const riderOrders = orders.filter(o => o.riderId === user?.riderId);
  const ACTIVE_STATUSES = ACTIVE_DELIVERY_STATUSES;
  const activeDeliveries = riderOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = riderOrders.filter(o => ['delivered', 'completed'].includes(o.status));
  const todayCompleted = completedOrders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const deliveredToday = todayCompleted.length;
  const earningsToday = todayCompleted.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
  const avgFee = deliveredToday > 0 ? Math.round((earningsToday / deliveredToday) * 100) / 100 : 0;

  // Available deliveries come from the backend pool endpoint (`/api/orders/available`),
  // NOT the rider's own order list — a rider-scoped list never contains unassigned jobs.
  const availableJobs = Array.isArray(availableDeliveries) ? availableDeliveries : [];
  const activeDelivery = activeDeliveries[0] || null;

  const handleAcceptJob = async (orderId: string) => {
    if (!user) return;
    try {
      await assignRiderToOrder(orderId, user.id);
      await refreshAvailableDeliveries();
      showToast('Job Accepted', 'Delivery assigned. Open Active Delivery to start.');
    } catch (err: any) {
      showToast('Not Available', err?.message || 'This delivery was just taken by another rider.', 'warning');
      refreshAvailableDeliveries();
    }
  };

  const earnings = riderOrders
    .filter(o => o.status === 'delivered')
    .slice(0, 5)
    .map(o => ({
      time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      job: `${o.vendorName} → ${o.customerAddress.split(',')[0]}`,
      amount: `+${formatPrice(o.deliveryFee)}`
    }));

  const handleToggleOnline = () => {
    updateRiderStatus(online ? 'OFFLINE' : 'ONLINE');
  };

  const [deliverConfirm, setDeliverConfirm] = useState<Order | null>(null);

  const handleConfirmDelivered = async () => {
    const order = deliverConfirm;
    setDeliverConfirm(null);
    if (!order) return;
    try {
      await completeDelivery(order.id);
      showToast('Delivery Completed', `Order #${order.orderNumber || order.id.slice(-6).toUpperCase()} marked as delivered. Earnings updated.`);
    } catch {
      showToast('Delivery Failed', 'Could not confirm the delivery. Check your connection.', 'warning');
    }
  };

  const quickActions = [
    { label: 'Wallet', icon: Coins, path: '/rider/wallet', cls: 'from-amber-400 to-orange-600' },
    { label: 'Subscription', icon: Crown, path: '/rider/subscription', cls: 'from-violet-500 to-purple-700' },
    { label: 'Ratings', icon: Star, path: '/rider/ratings', cls: 'from-rose-400 to-pink-600' },
    { label: 'Messages', icon: MessageSquare, path: '/rider/messages', cls: 'from-sky-400 to-blue-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-[#facc15] p-6 sm:p-8 text-slate-900 shadow-lg shadow-yellow-500/20">

        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 w-64 h-64 rounded-full bg-black/5 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-slate-900/10 text-[9px] font-black uppercase tracking-widest">
                {riderRecord?.vehicleType || 'E-Bike'} Rider
              </span>
              <span className={cn('px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5', online ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white')}>
                <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', online ? 'bg-white' : 'bg-emerald-400')} />
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mt-3">
              {user?.firstName || 'Rider'}<span className="text-white">.</span>
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-700/80">
                <Wallet className="w-4 h-4" /> <span className="text-lg font-black text-slate-900">{formatPrice(user?.walletBalance || 0)}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-60">wallet</span>
              </span>
              {riderIdDisplay && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/10 text-[9px] font-black tracking-widest font-mono text-slate-800">
                  <Fingerprint className="w-3 h-3" /> RID-{riderIdDisplay}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <RiderSubscriptionStatus size="md" />
            <button
              onClick={handleToggleOnline}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95",
                online
                  ? "bg-emerald-500 text-white shadow-emerald-500/25"
                  : "bg-slate-900 text-white shadow-slate-900/20"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full animate-pulse", online ? "bg-white" : "bg-emerald-400")} />
              {online ? 'Online' : 'Go Online'}
            </button>
            <AnimatedTooltip
              variant="smaug"
              placement="bottom"
              accentColor="#10b981"
              content="When you're online, you may receive eligible delivery requests."
              triggerClassName="px-0 py-0"
            >
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Info className="w-3.5 h-3.5" />
              </span>
            </AnimatedTooltip>
          </div>
        </div>
      </motion.div>

      {/* GPS Status — one modern banner */}
      {online && !geoActive && !currentRiderLocation && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">
                  {riderLocationError ? 'GPS Disconnected' : 'Enable GPS'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {riderLocationError
                    ? 'Location was blocked. Tap Allow to try again.'
                    : 'Tap Allow to begin live location sharing.'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="rounded-xl px-5 h-10 shrink-0"
              onClick={geoEnv.inIframe || !geoEnv.secureContext ? () => window.open(localUrl, '_blank') : enableLiveGps}
            >
              {geoEnv.inIframe || !geoEnv.secureContext ? 'Open GPS page' : 'Allow GPS'}
            </Button>
          </div>
        </div>
      )}

      {currentRiderLocation && (
        <Card className="border-emerald-500/20 bg-emerald-50/10">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <AnimatedTooltip
                variant="gram"
                placement="right"
                accentColor="#059669"
                content="The application is currently receiving your location for delivery tracking."
                triggerClassName="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-0 py-0"
              >
                Live GPS Active
              </AnimatedTooltip>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">
              {currentRiderLocation.latitude.toFixed(4)}, {currentRiderLocation.longitude.toFixed(4)}
              {currentRiderLocation.speed ? ` | ${Math.round(currentRiderLocation.speed * 3.6)} km/h` : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Earnings spotlight — premium hero metric */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-800 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-orange-500/20 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <AnimatedTooltip
              variant="gram"
              placement="right"
              accentColor="#fbbf24"
              triggerColor="#fcd34d"
              content="Total rider earnings recorded today before any applicable adjustments."
              triggerClassName="text-[10px] font-black uppercase tracking-[0.3em] px-0 py-0"
            >
              Today's Earnings
            </AnimatedTooltip>
            <p className="text-4xl sm:text-5xl font-black tracking-tight mt-1">{formatPrice(earningsToday)}</p>
            <p className="text-xs text-slate-300 mt-1.5 font-medium">{deliveredToday} delivery{deliveredToday === 1 ? '' : 's'} completed today</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-300 backdrop-blur">
            <TrendingUp className="w-4 h-4" /> GHS {avgFee.toFixed(2)} avg
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur">
          {[
            { label: 'Delivered Today', value: deliveredToday.toString(), icon: PackageCheck },
            { label: 'Total Delivered', value: completedOrders.length.toString(), icon: CheckCircle },
            { label: 'Rating', value: riderRecord?.rating != null ? riderRecord.rating.toFixed(1) : '—', icon: Star },
          ].map(s => (
            <div key={s.label} className="px-4 py-4 flex flex-col items-center gap-1.5">
              <s.icon className="w-4 h-4 text-amber-300" />
              <p className="text-xl font-black leading-none">{s.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300/80 text-center">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick actions — only the ones NOT in the bottom nav */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
        {quickActions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => navigate(a.path)}
            className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex-shrink-0"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.cls} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <a.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">{a.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Active Delivery */}
      <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle>
            <AnimatedTooltip
              variant="indis"
              placement="right"
              content="The order currently assigned to you and requiring delivery action."
              triggerClassName="flex items-center gap-2 px-0 py-0"
            >
              <Navigation className="w-5 h-5 text-emerald-500" /> Active Delivery
            </AnimatedTooltip>
          </CardTitle>
          {activeDelivery && <Badge variant="success" dot>In Progress</Badge>}
        </CardHeader>
        <CardContent>
          {activeDelivery ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    {getInitials(dropoffLabel(activeDelivery).name) ? getInitials(dropoffLabel(activeDelivery).name) : <Bike className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{dropoffLabel(activeDelivery).name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="font-mono">{deliveryRef(activeDelivery)}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        deliveryKindOf(activeDelivery.deliveryType) === 'PACKAGE' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                        deliveryKindOf(activeDelivery.deliveryType) === 'PASS' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
                        'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {deliveryKindBadge(activeDelivery.deliveryType)} · {deliveryKindTitle(activeDelivery.deliveryType)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{formatPrice(activeDelivery.deliveryFee || activeDelivery.totalAmount)}</p>
                  <p className="text-xs text-gray-400">{activeDelivery.status.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-400">From:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{pickupLabel(activeDelivery).name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-600 dark:text-gray-400">To:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{dropoffLabel(activeDelivery).address || dropoffLabel(activeDelivery).name}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" size="sm" onClick={() => navigate('/rider/navigation')}><Navigation className="w-4 h-4" /> Navigate</Button>
                <Button className="flex-1" variant="outline" size="sm" onClick={() => navigate('/rider/messages')}><MessageSquare className="w-4 h-4" /> Message</Button>
                <Button className="flex-1" variant="primary" size="sm" onClick={() => setDeliverConfirm(activeDelivery)}>
                  <CheckCircle className="w-4 h-4" /> Delivered
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto text-amber-500">
                <Zap className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-4">No active delivery</p>
              <p className="text-xs text-gray-400 mt-1">Accept a job to start earning.</p>
              <Button size="sm" className="mt-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold" onClick={() => navigate('/rider/jobs')}>
                <Bike className="w-4 h-4 mr-1.5" /> View Available Deliveries
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Jobs */}
      <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-amber-500" /> Available Jobs
            </span>
          </CardTitle>
          <Badge variant="warning">{availableJobs.length} nearby</Badge>
        </CardHeader>
        <CardContent>
          {availableJobs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No new jobs right now — check back soon.</p>
          ) : (
            <div className="space-y-2">
              {availableJobs.map(job => (
                <motion.div key={job.id} whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{pickupLabel(job).name}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        deliveryKindOf(job.deliveryType) === 'PACKAGE' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                        deliveryKindOf(job.deliveryType) === 'PASS' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
                        'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {deliveryKindBadge(job.deliveryType)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{dropoffLabel(job).address || dropoffLabel(job).name}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="font-mono">{deliveryRef(job)}</span>
                      <span>{job.itemCount || (job.items || []).length} item{(job.itemCount || (job.items || []).length) === 1 ? '' : 's'}</span>
                      <span>{job.estimatedDeliveryTime}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-emerald-600">{formatPrice(job.deliveryFee)}</p>
                    <Button size="sm" className="mt-1" onClick={() => navigate('/rider/jobs')}>View</Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <Badge variant="brand">Today</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {earnings.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-xs text-gray-500">
                    {e.time}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{e.job}</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600">{e.amount}</span>
              </div>
            ))}
            {earnings.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Earnings from completed deliveries will appear here.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm Delivery Modal */}
      <AnimatePresence>
        {deliverConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800">
              <div className="p-7 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <button onClick={() => setDeliverConfirm(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Confirm Delivery?</h3>
                  <p className="text-sm text-gray-500 mt-1.5">
                    Mark order <span className="font-bold text-gray-900 dark:text-white">#{deliverConfirm.orderNumber || deliverConfirm.id.slice(-6).toUpperCase()}</span> as delivered to
                    <span className="font-bold text-gray-900 dark:text-white"> {deliverConfirm.customerName}</span>?
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setDeliverConfirm(null)}>CANCEL</Button>
                  <Button className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={handleConfirmDelivered}>CONFIRM</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
