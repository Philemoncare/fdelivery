import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bike, Navigation, Wallet, UserRound, Settings, Star, MapPin,
  Truck, TrendingUp, Clock, Radio, MessageSquare, Bell, DollarSign,
  ChefHat, PackageCheck, Phone, CheckCircle, Navigation as NavigationIcon,
  RefreshCw, Search, Camera, Upload, MessageCircle, ChevronRight, Send,
  X, Image as ImageIcon, Moon, Sun
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';
import { MessagingService } from '@/src/services/api';

const ACCENT = 'from-amber-400 to-orange-600';

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
  const { orders, formatPrice, assignRiderToOrder, showToast } = useApp();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const availableJobs = orders.filter(o => o.status === 'ready_for_pickup' && !o.riderId).filter(j =>
    !search || j.vendorName.toLowerCase().includes(search.toLowerCase()) || j.customerAddress.toLowerCase().includes(search.toLowerCase())
  );

  const accept = (orderId: string) => {
    if (!user) return;
    assignRiderToOrder(orderId, user.id);
    showToast('Job Accepted!', 'The delivery has been assigned to you. Go to Active Deliveries to start.');
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={Bike} title="Available Deliveries" description="Food orders ready for pickup in Takoradi. Fast fingers win!" count={`${availableJobs.length} live`} />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search by restaurant or neighborhood..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-none text-sm font-bold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableJobs.length === 0 ? (
          <div className="md:col-span-2 py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
             <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Radio className="w-8 h-8 text-gray-300 animate-pulse" />
             </div>
             <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Scanning for nearby jobs...</p>
          </div>
        ) : (
          availableJobs.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/30 dark:shadow-none hover:border-amber-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shadow-inner">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white leading-none">{job.vendorName}</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.customerAddress.split(',')[0]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-600 leading-none">{formatPrice(job.deliveryFee)}</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Payout</p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-4 border-y border-gray-50 dark:border-slate-800 my-4">
                <div className="flex-1 space-y-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Items</p>
                   <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{job.items.length} dishes</p>
                </div>
                <div className="flex-1 space-y-1 text-center border-x border-gray-50 dark:border-slate-800">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Est. Time</p>
                   <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{job.estimatedDeliveryTime}</p>
                </div>
                <div className="flex-1 space-y-1 text-right">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Distance</p>
                   <p className="text-xs font-bold text-gray-700 dark:text-gray-300">~2.5 km</p>
                </div>
              </div>

              <Button className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 font-black uppercase tracking-widest" onClick={() => accept(job.id)}>
                Accept Delivery
              </Button>
            </motion.div>
          ))
        )}
      </div>
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

  const mine = useMemo(() => orders.filter(o => o.riderId === user?.id), [orders, user]);
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
                  {['ready_for_pickup', 'rider_assigned'].includes(o.status) && o.riderId === user?.id && (
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
  const { orders, formatPrice, updateOrderStatus, showToast } = useApp();
  const { user } = useAuth();

  const active = useMemo(() => orders.filter(o => o.riderId === user?.id && ['ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status)), [orders, user]);

  const progress = (status: string) => {
    const map: Record<string, number> = { rider_assigned: 20, ready_for_pickup: 35, picked_up: 50, in_transit: 75, arriving: 90 };
    return map[status] ?? 10;
  };

  const handleComplete = async (orderId: string, orderNumber: string) => {
    try {
      await updateOrderStatus(orderId, 'delivered');
      showToast('Delivery Completed!', `Order #${orderNumber} marked as delivered. Earnings updated.`);
    } catch (err) {
      showToast('Error', 'Failed to complete delivery. Check your connection.', 'warning');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={PackageCheck} title="Active Deliveries" description="Live tracking of your current assigned tasks." count={`${active.length} active`} />
      {active.length === 0 ? (
        <Card className="rounded-[2.5rem] border-dashed border-2 border-gray-100 dark:border-slate-800">
           <CardContent className="text-center py-20">
             <div className="w-20 h-20 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bike className="w-10 h-10 text-gray-300" />
             </div>
             <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">No Active Jobs</h3>
             <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">Go to Available Deliveries to find new jobs or wait for dispatch assignments.</p>
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
                  {['picked_up', 'in_transit', 'arriving'].includes(o.status) ? (
                    <Button className="rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 font-black uppercase tracking-widest gap-2"
                      onClick={() => handleComplete(o.id, o.orderNumber || o.id.slice(-6))}>
                      <CheckCircle className="w-5 h-5" /> Mark Delivered
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
  const { currentRiderLocation, riderStatus, orders, formatPrice } = useApp();
  const { user } = useAuth();

  const activeDelivery = orders.find(o => o.riderId === user?.id && ['picked_up', 'in_transit', 'arriving'].includes(o.status));
  const online = riderStatus !== 'OFFLINE' && riderStatus !== 'LOCATION_PERMISSION_DENIED' && riderStatus !== 'LOCATION_UNAVAILABLE';

  const statusCards = [
    { label: 'GPS Status', value: currentRiderLocation ? 'Live' : 'Waiting', note: currentRiderLocation ? `Lat ${currentRiderLocation.latitude.toFixed(4)} · Lng ${currentRiderLocation.longitude.toFixed(4)}` : 'Position acquired on demand', icon: Radio, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Rider Status', value: online ? 'Online' : riderStatus.replace('_', ' '), note: online ? 'Accepting jobs' : 'Click to go online from Settings', icon: Radio, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Speed', value: currentRiderLocation?.speed ? `${Math.round(currentRiderLocation.speed * 3.6)} km/h` : '0 km/h', note: 'From live GPS', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={NavigationIcon} title="Live Navigation" description="Your GPS position and current delivery route." />
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
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-500" /> Current Delivery Route</CardTitle></CardHeader>
        <CardContent>
          {activeDelivery ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-600 dark:text-gray-300">Pickup:</span>
                <span className="font-medium text-gray-900 dark:text-white">{activeDelivery.vendorName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-300">Drop-off:</span>
                <span className="font-medium text-gray-900 dark:text-white">{activeDelivery.customerAddress}</span>
              </div>
              <p className="text-xs text-gray-400">Estimated delivery: {activeDelivery.estimatedDeliveryTime} · {formatPrice(activeDelivery.totalAmount)}</p>
            </div>
          ) : (
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

  const completed = useMemo(() => orders.filter(o => o.riderId === user?.id && ['delivered', 'completed'].includes(o.status)), [orders, user]);
  const rating = riders.find(r => r.userId === user?.id)?.rating;

  const stats = [
    { label: 'Deliveries', value: completed.length.toString(), icon: Truck, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Total Earned', value: formatPrice(completed.reduce((a, o) => a + o.deliveryFee, 0)), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Avg Rating', value: rating !== undefined ? rating.toFixed(1) : '0.0', icon: Star, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
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
                  <span className="text-sm font-semibold text-emerald-600">+{formatPrice(o.deliveryFee)}</span>
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
 * WALLET & EARNINGS — real earned figures + wallet balance
 * ------------------------------------------------------------
 */
export function RiderWalletPage() {
  const { orders, formatPrice } = useApp();
  const { user } = useAuth();
  const today = new Date().toDateString();

  const myOrders = useMemo(() => orders.filter(o => o.riderId === user?.id && ['delivered', 'completed'].includes(o.status)), [orders, user]);
  const todayEarned = myOrders.filter(o => new Date(o.createdAt).toDateString() === today).reduce((a, o) => a + o.deliveryFee, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekEarned = myOrders.filter(o => new Date(o.createdAt) >= weekStart).reduce((a, o) => a + o.deliveryFee, 0);
  const allEarned = myOrders.reduce((a, o) => a + o.deliveryFee, 0);

  const cards = [
    { label: 'Wallet Balance', value: formatPrice(user?.walletBalance || 0), note: 'Available from wallet', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: "Today's Earnings", value: formatPrice(todayEarned), note: `${myOrders.filter(o => new Date(o.createdAt).toDateString() === today).length} trips`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'This Week', value: formatPrice(weekEarned), note: 'Last 7 days', icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'All-Time Earnings', value: formatPrice(allEarned), note: `${myOrders.length} deliveries`, icon: Wallet, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Wallet} title="Earnings & Wallet" description="Your payouts, trip earnings, and available balance." />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
  const { riders, updateProfile, showToast, orders, customerProfile, startConversation } = useApp();
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  const rider = riders.find(r => r.userId === user?.id || r.id === user?.id);
  const deliveredCount = orders.filter(o => o.riderId === user?.id && ['delivered', 'completed'].includes(o.status)).length;

  const [form, setForm] = useState({
    name: user?.displayName || '',
    phone: user?.phone || '',
    phoneSecondary: '',
    about: '',
    vehicleType: rider?.vehicleType || 'Motorcycle',
    vehicleNumber: rider?.vehicleNumber || '',
  });

  const bannerOptions = [
    { id: 'moto', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&q=80', label: 'Classic Motorbike' },
    { id: 'city', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80', label: 'City Streets' },
    { id: 'delivery', url: 'https://images.unsplash.com/photo-1526367790999-0150786486a9?w=1200&q=80', label: 'Logistics' },
    { id: 'abstract', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80', label: 'Abstract Orange' },
  ];

  const pickImage = (isBanner = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new (window as any).Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX = isBanner ? 1200 : 500;
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          if (isBanner) {
            updateProfile({ bannerUrl: base64 } as any);
            showToast('Banner Updated', 'Your cover photo has been changed.');
          } else {
            updateProfile({ avatar: base64 });
            showToast('Profile Updated', 'Your profile image has been changed.');
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
        about: form.about,
      } as any);
      setShowEditModal(false);
    } catch (err) {
      showToast('Error', 'Failed to update profile. Please try again.', 'warning');
    }
  };

  const fullName = user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName}` : 'Rider');
  const userInitials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'R';

  const fields = [
    { label: 'Display Name', value: fullName },
    { label: 'Registration Email', value: user?.email || '—' },
    { label: 'Primary Contact', value: user?.phone || '—' },
    { label: 'Alternative Contact', value: form.phoneSecondary || 'None' },
    { label: 'Vehicle Fleet', value: rider?.vehicleType || 'Motorcycle' },
    { label: 'Plate Number', value: rider?.vehicleNumber || '—' },
    { label: 'Account Status', value: rider?.verificationStatus || (user?.isVerified ? 'verified' : 'pending') },
    { label: 'Service Rating', value: rider?.rating !== undefined ? `${rider.rating.toFixed(1)}★` : '5.0★' },
  ];

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

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={UserRound} title="My Profile" description="Manage your rider identity and account details." />

      <div className="relative group overflow-hidden rounded-[2.5rem] shadow-2xl">
        {/* Modern Banner */}
        <div className="h-40 sm:h-56 bg-slate-900 relative group/banner">
          <img
            src={(user as any)?.bannerUrl || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&q=80'}
            className="w-full h-full object-cover opacity-60 transition-transform duration-500 group-hover/banner:scale-105"
            alt="Banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

          <div className="absolute top-6 right-6 flex gap-2">
             <Button size="sm" variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 rounded-xl" onClick={() => setShowBannerPicker(true)}>
               <ImageIcon className="w-4 h-4 mr-2" /> Change Banner
             </Button>
          </div>

          <div className="absolute bottom-6 right-8 text-white/10 font-black text-6xl sm:text-8xl uppercase tracking-tighter italic select-none pointer-events-none">
            RIDER
          </div>
        </div>

        {/* Profile Info Overlay */}
        <div className="px-8 pb-8 -mt-16 sm:-mt-20 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="relative group/avatar">
              <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-[2.5rem] bg-white dark:bg-slate-900 p-1.5 shadow-2xl overflow-hidden ring-8 ring-white dark:ring-slate-900 transition-all group-hover/avatar:scale-[1.02]">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-full h-full object-cover rounded-[2rem]" alt={fullName} />
                ) : (
                  <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-5xl font-black shadow-inner">
                    {userInitials}
                  </div>
                )}
              </div>
              <button
                onClick={() => pickImage(false)}
                className="absolute -bottom-2 -right-2 p-3.5 bg-amber-500 text-white rounded-2xl shadow-2xl hover:bg-amber-600 hover:scale-110 transition-all border-4 border-white dark:border-slate-900"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center sm:text-left flex-1 pb-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white sm:text-gray-900 sm:dark:text-white leading-tight drop-shadow-md sm:drop-shadow-none">
                {fullName}
              </h2>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-3">
                <Badge variant={rider?.isVerified || user?.isVerified ? 'success' : 'warning'} className="rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border-none shadow-lg">
                  {(rider?.verificationStatus || (user?.isVerified ? 'verified' : 'pending')).replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black text-gray-700 dark:text-gray-200">{rider?.rating?.toFixed(1) || '5.0'}</span>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
                  <Truck className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-black text-gray-700 dark:text-gray-200">{deliveredCount} Jobs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 px-8 py-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-6 p-8">
              {fields.map(f => (
                <div key={f.label} className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{f.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{f.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="h-16 rounded-2xl font-black uppercase tracking-widest border-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all gap-3"
            >
              <MessageSquare className="w-5 h-5 text-amber-500" /> Contact Support
            </Button>
            <Button
              onClick={() => setShowEditModal(true)}
              className="h-16 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02] transition-transform font-black uppercase tracking-widest shadow-xl shadow-gray-400/20"
            >
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-orange-600 text-white border-none shadow-xl p-8">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Rider Earnings</p>
                <h3 className="text-4xl font-black mt-2">GHS {(user?.walletBalance || 0).toFixed(2)}</h3>
              </div>
              <div className="space-y-4 pt-4 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-80">Platform Rating</span>
                  <span className="text-sm font-black">{rider?.rating?.toFixed(1) || '5.0'} ★</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-80">Total Trips</span>
                  <span className="text-sm font-black">{deliveredCount}</span>
                </div>
              </div>
              <Button className="w-full h-12 rounded-xl bg-white text-orange-600 font-black uppercase tracking-widest hover:bg-white/90">
                Withdraw
              </Button>
            </div>
          </Card>
        </div>
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

      {/* Banner Picker Modal */}
      <AnimatePresence>
        {showBannerPicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                   <div>
                     <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">Choose Banner</h3>
                     <p className="text-xs text-gray-500 font-bold mt-1">Select from our gallery or upload your own.</p>
                   </div>
                   <button onClick={() => setShowBannerPicker(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {bannerOptions.map(banner => (
                    <button key={banner.id} onClick={() => { updateProfile({ bannerUrl: banner.url } as any); setShowBannerPicker(false); }}
                      className="group relative h-24 rounded-2xl overflow-hidden border-2 border-transparent hover:border-amber-500 transition-all">
                      <img src={banner.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-black uppercase">{banner.label}</span>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => { setShowBannerPicker(false); pickImage(true); }}
                    className="h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Upload Custom</span>
                  </button>
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
 * SETTINGS — real availability toggle + status
 * ------------------------------------------------------------
 */
export function RiderSettingsPage() {
  const { riderStatus, updateRiderStatus, showToast, theme, toggleTheme } = useApp();
  const { user } = useAuth();
  const online = riderStatus !== 'OFFLINE' && riderStatus !== 'LOCATION_PERMISSION_DENIED' && riderStatus !== 'LOCATION_UNAVAILABLE';

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
          action: <Badge variant="success" className="rounded-lg">Enabled</Badge>
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Dark Mode',
          desc: 'Switch between light and dark visual themes.',
          icon: Moon,
          action: <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
        },
        {
          label: 'Push Notifications',
          desc: 'Receive alerts for new jobs and message updates.',
          icon: Bell,
          action: <Switch checked={true} />
        }
      ]
    },
    {
      title: 'Security',
      items: [
        {
          label: 'Email Verification',
          desc: user?.isVerified ? 'Your account is verified.' : 'Verify your email to ensure account security.',
          icon: CheckCircle,
          action: <Badge variant={user?.isVerified ? 'success' : 'warning'}>{user?.isVerified ? 'Verified' : 'Pending'}</Badge>
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader icon={Settings} title="Account Settings" description="Manage your availability, preferences, and security." />

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
          <Button variant="danger" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest shadow-xl shadow-rose-600/10" onClick={() => showToast('Account', 'Deletion requested. Contact admin.')}>
            Deactivate Account
          </Button>
        </div>
      </Card>
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
  const deliveredCount = orders.filter(o => o.riderId === user?.id && ['delivered', 'completed'].includes(o.status)).length;

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
    </div>
  );
}

/*
 * ------------------------------------------------------------
 * MESSAGES — real conversations
 * ------------------------------------------------------------
 */
export function RiderMessagesPage() {
  const { conversations, showToast, sendMessage } = useApp();
  const { user } = useAuth();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const filteredChats = conversations.filter(c => {
    if (!search.trim()) return true;
    const partner = (c.participants && c.participants[0]?.name) || c.subject || '';
    return partner.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId) || null;

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
              const partnerName = partner?.name || chat.subject || 'User';
              const partnerInitials = partnerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

              return (
                <div key={chat.id} onClick={() => loadMessages(chat.id)} className={cn("p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all mb-1 hover:bg-amber-50 dark:hover:bg-amber-950/20", selectedConvId === chat.id && "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500/20")}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-xs font-black shadow-md overflow-hidden">
                    {partner?.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : partnerInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{partnerName}</p>
                      <span className="text-[9px] text-gray-400">{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
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
                  {selectedConv.participants?.[0]?.avatar ? <img src={selectedConv.participants[0].avatar} className="w-full h-full object-cover" /> : (selectedConv.participants?.[0]?.name?.charAt(0) || 'U')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">{selectedConv.participants?.find((p: any) => p.id !== user?.id)?.name || selectedConv.subject}</p>
                  <p className="text-[10px] text-gray-500 truncate">{selectedConv.orderId ? `Order #${selectedConv.orderId.slice(-6).toUpperCase()}` : 'Support Thread'}</p>
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
  const { notifications, markNotificationRead, clearNotifications } = useApp();
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div className="space-y-6 pb-10">
      <PageHeader icon={Bell} title="Notifications" description="Job alerts, payout updates, and platform announcements." count={`${unread} unread`} />
      <Card className="rounded-2xl">
        <CardHeader className="border-b flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> Inbox</CardTitle>
          <Button variant="outline" size="sm" onClick={clearNotifications}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Clear All</Button>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-center text-gray-400 py-10 italic">No notifications.</p>
          ) : (
            <div className="space-y-1">
              {notifications.map(n => (
                <button key={n.id} onClick={() => markNotificationRead(n.id)} className={`w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 ${!n.read ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                  <div className="mt-0.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${n.read ? 'bg-gray-300 dark:bg-slate-600' : 'bg-amber-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <div className="mt-1 inline-flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{n.type}</Badge>
                      <span className="text-[10px] text-gray-400">{n.time}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}