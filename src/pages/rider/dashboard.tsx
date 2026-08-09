import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bike, DollarSign, Star, TrendingUp, Wallet,
  Navigation, Clock, CheckCircle, X, Phone, MessageSquare, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { getInitials } from '@/src/lib/utils';

import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { RiderStatus, RiderLocationUpdate, Order } from '@/src/types';

export function RiderDashboardPage() {
  const { user } = useAuth();
  const {
    riderStatus,
    updateRiderStatus,
    currentRiderLocation,
    orders,
    formatPrice,
    updateOrderStatus,
    assignRiderToOrder,
    vendors,
    riders,
    showToast
  } = useApp();
  const navigate = useNavigate();

  const online = riderStatus !== 'OFFLINE' && riderStatus !== 'LOCATION_PERMISSION_DENIED';

  const riderRecord = riders.find(r => r.userId === user?.id || r.id === user?.id);

  const riderOrders = orders.filter(o => o.riderId === user?.id);
  const completedOrders = riderOrders.filter(o => ['delivered', 'completed'].includes(o.status));
  const todayCompleted = completedOrders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const deliveredToday = todayCompleted.length;
  const earningsToday = todayCompleted.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

  const stats = [
    { label: "Today's Earnings", value: formatPrice(earningsToday), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Deliveries Today', value: deliveredToday.toString(), icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Completed Deliveries', value: completedOrders.length.toString(), icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Rating', value: riderRecord?.rating != null ? riderRecord.rating.toFixed(1) : '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ];

  const availableJobs = orders.filter(o => o.status === 'ready_for_pickup' && !o.riderId);

  const activeDelivery = orders.find(o => ['picked_up', 'in_transit', 'arriving'].includes(o.status) && o.riderId === user?.id);

  const handleAcceptJob = (orderId: string) => {
    if (!user) return;
    assignRiderToOrder(orderId, user.id);
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
      await updateOrderStatus(order.id, 'delivered');
      showToast('Delivery Completed', `Order #${order.orderNumber || order.id.slice(-6).toUpperCase()} marked as delivered. Earnings updated.`);
    } catch {
      showToast('Delivery Failed', 'Could not confirm the delivery. Check your connection.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 p-6 sm:p-8 text-white">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{user?.displayName || user?.firstName || 'Rider'}</h1>
            <p className="text-amber-100 mt-1">{riderRecord?.vehicleType || 'E-Bike'} Rider | {riderStatus.replace('_', ' ')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer backdrop-blur-sm text-sm font-medium transition-all ${
              online ? 'bg-emerald-500/40 text-white' : 'bg-white/10 text-amber-200'
            }`} onClick={handleToggleOnline}>
              <div className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
              {online ? 'Online' : 'Go Online'}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 text-sm font-bold">
              <Wallet className="w-4 h-4 inline mr-1" /> {formatPrice(user?.walletBalance || 0)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Location Status Alert */}
      {riderStatus === 'LOCATION_PERMISSION_DENIED' && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-700 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">GPS Permission Required</p>
            <p className="text-xs opacity-90">Location access is required for active deliveries. Please enable it in your browser settings.</p>
          </div>
          <Button size="sm" variant="danger" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {currentRiderLocation && (
        <Card className="border-emerald-500/20 bg-emerald-50/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Live GPS Active</p>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">
              {currentRiderLocation.latitude.toFixed(4)}, {currentRiderLocation.longitude.toFixed(4)}
              {currentRiderLocation.speed ? ` | ${Math.round(currentRiderLocation.speed * 3.6)} km/h` : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg}`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Delivery */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-emerald-500" /> Active Delivery
              </span>
            </CardTitle>
            {activeDelivery && <Badge variant="success" dot>In Progress</Badge>}
          </CardHeader>
          <CardContent>
            {activeDelivery ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                      {getInitials(activeDelivery.customerName || '') ? getInitials(activeDelivery.customerName || '') : <Bike className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activeDelivery.customerName}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{activeDelivery.items.length} meals</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatPrice(activeDelivery.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{activeDelivery.status.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-600 dark:text-gray-400">From:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{activeDelivery.vendorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-600 dark:text-gray-400">To:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{activeDelivery.customerAddress}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => window.open(`tel:${activeDelivery.customerPhone}`)}><Phone className="w-4 h-4" /> Call</Button>
                  <Button className="flex-1" variant="outline" size="sm" onClick={() => navigate('/rider/messages')}><MessageSquare className="w-4 h-4" /> Message</Button>
                  <Button className="flex-1" variant="primary" size="sm" onClick={() => setDeliverConfirm(activeDelivery)}>
                    <CheckCircle className="w-4 h-4" /> Delivered
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No active deliveries</p>
            )}
          </CardContent>
        </Card>

        {/* Available Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-amber-500" /> Available Jobs
              </span>
            </CardTitle>
            <Badge variant="warning">{availableJobs.length} nearby</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableJobs.map(job => (
                <motion.div key={job.id} whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{job.vendorName}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <p className="text-xs text-gray-500 dark:text-slate-400">{job.customerAddress}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{job.items.length} items</span>
                      <span>{job.estimatedDeliveryTime}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatPrice(job.deliveryFee)}</p>
                    <Button size="sm" className="mt-1" onClick={() => handleAcceptJob(job.id)}>Accept</Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Earnings */}
      <Card>
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