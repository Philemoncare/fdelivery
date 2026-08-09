import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Boxes, Users, BarChart3, Megaphone, Wallet, Store,
  Package, CreditCard, TrendingUp, Truck, Star, RefreshCcw,
  Tags, TicketPercent, Download, LifeBuoy, Bell, MessageSquare,
  ChefHat, Timer, Flame, Bike, Heart, Clock, X, Search, Filter,
  CheckCircle2, AlertCircle, Phone, MapPin, Zap, ChevronRight,
  MoreHorizontal, Play, Pause, DollarSign, Printer, ArrowRight,
  Plus, Trash2, Edit3, Settings, ShieldCheck, Smartphone, Send, ChevronLeft
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';
import { OrderStatus } from '@/src/types';
import { LiveMap } from '@/src/components/common/LiveMap';
import { AdminService, MessagingService } from '@/src/services/api';

// ============================================================
// ORDERS MANAGER
// ============================================================
export function VendorOrdersPage() {
  const { vendorId } = useAuth();
  const { orders, formatPrice, updateOrderStatus, showToast, vendors } = useApp();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'All'>('All');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const currentVendor = vendors.find(v => v.id === vendorId);
  const vendorOrders = orders.filter(o => o.vendorId === vendorId);

  const filteredOrders = vendorOrders.filter(o => activeTab === 'All' || o.status === activeTab);

  const tabs: { label: string, status: OrderStatus | 'All' }[] = [
    { label: 'All', status: 'All' },
    { label: 'New', status: 'pending' },
    { label: 'Accepted', status: 'confirmed' },
    { label: 'Preparing', status: 'preparing' },
    { label: 'Ready', status: 'ready_for_pickup' },
    { label: 'Assigned', status: 'rider_assigned' },
    { label: 'Picked Up', status: 'picked_up' },
    { label: 'Delivered', status: 'delivered' },
    { label: 'Cancelled', status: 'cancelled' }
  ];

  const orderStats = {
    pending: vendorOrders.filter(o => o.status === 'pending').length,
    preparing: vendorOrders.filter(o => o.status === 'preparing').length,
    ready: vendorOrders.filter(o => o.status === 'ready_for_pickup').length,
    delivered: vendorOrders.filter(o => o.status === 'delivered').length,
  };

  const handleStatusUpdate = (id: string, status: OrderStatus) => {
    updateOrderStatus(id, status);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Order Management</h1>
          <p className="text-sm text-gray-500">Live order fulfillment and rider coordination</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-xl font-bold h-11 border-gray-200" onClick={() => window.print()}>
             <Printer className="w-4 h-4 mr-2" /> Print All Today
           </Button>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'New Orders', value: orderStats.pending, color: 'text-amber-500', bg: 'bg-amber-50', icon: Bell },
          { label: 'In Kitchen', value: orderStats.preparing, color: 'text-blue-500', bg: 'bg-blue-50', icon: ChefHat },
          { label: 'Ready for Pickup', value: orderStats.ready, color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Package },
          { label: 'Total Today', value: orderStats.delivered, color: 'text-purple-500', bg: 'bg-purple-50', icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg, s.color)}><s.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-none shadow-inner border border-gray-200/50 dark:border-slate-700/50">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={cn(
              "px-5 py-2.5 text-[10px] font-black rounded-xl transition-all whitespace-nowrap uppercase tracking-widest flex items-center gap-2",
              activeTab === tab.status
                ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {tab.label}
            {vendorOrders.filter(o => o.status === tab.status).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[8px]">{vendorOrders.filter(o => o.status === tab.status).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Card className="rounded-[2.5rem] border-dashed border-2 py-20 text-center bg-gray-50/30 dark:bg-slate-900/30">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">No orders in this category</h3>
            <p className="text-sm text-gray-500">Wait for incoming orders or try a different status filter.</p>
          </Card>
        ) : (
          filteredOrders.map(order => (
            <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-[2.5rem] overflow-hidden border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all group">
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 transition-transform",
                        order.status === 'Order Received' ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                      )}>
                        {(order.customerName || 'C').charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-gray-900 dark:text-white">{order.customerName}</h3>
                          <Badge variant={order.status === 'Cancelled' ? 'danger' : 'default'} className="text-[10px] font-black py-0.5 px-2.5 uppercase tracking-widest">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">
                           {order.items.map(i => `${i.quantity}x ${i.productName || 'Meal'}`).join(', ')}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-400 pt-2 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-purple-500" /> {order.id}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleTimeString()}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {order.customerAddress}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Rider Map for Vendor */}
                    {order.riderId && ['Rider Assigned', 'Picked Up', 'On the Way', 'Ready for Pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(order.status) && (
                       <div className="hidden lg:block w-72 h-40 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-inner">
                          <LiveMap
                            riderLocation={order.currentRiderLocation}
                            restaurantLocation={currentVendor ? { lat: currentVendor.latitude, lng: currentVendor.longitude } : undefined}
                            customerLocation={order.customerLat && order.customerLng ? { lat: order.customerLat, lng: order.customerLng } : undefined}
                            zoom={13}
                          />
                       </div>
                    )}

                    <div className="flex flex-col md:items-end justify-center">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] mb-1">Order Value</p>
                      <p className="text-3xl font-black text-purple-600">{formatPrice(order.totalAmount)}</p>
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1 mt-1">
                        <CreditCard className="w-3.5 h-3.5" /> Paid via {order.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex gap-2">
                       <Button variant="outline" className="rounded-xl h-11 px-6 font-bold text-xs border-gray-100" onClick={() => setSelectedOrderId(order.id)}>View Details</Button>
                       <Button variant="ghost" className="rounded-xl h-11 px-4 text-gray-400 hover:text-purple-600"><MessageSquare className="w-5 h-5" /></Button>
                       <Button variant="ghost" className="rounded-xl h-11 px-4 text-gray-400 hover:text-emerald-600"><Phone className="w-5 h-5" /></Button>
                    </div>

                    <div className="flex gap-3">
                      {order.status === 'pending' && (
                        <>
                          <Button variant="outline" className="rounded-xl h-12 px-6 font-black text-xs text-rose-500 border-rose-100 hover:bg-rose-50" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>REJECT</Button>
                          <Button className="rounded-xl h-12 px-10 font-black text-xs bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20" onClick={() => handleStatusUpdate(order.id, 'confirmed')}>ACCEPT ORDER</Button>
                        </>
                      )}
                      {order.status === 'confirmed' && (
                        <Button className="rounded-xl h-12 px-10 font-black text-xs bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20" onClick={() => handleStatusUpdate(order.id, 'preparing')}>START PREPARING</Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button className="rounded-xl h-12 px-10 font-black text-xs bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" onClick={() => handleStatusUpdate(order.id, 'ready_for_pickup')}>READY FOR PICKUP</Button>
                      )}
                      {['ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                        <Badge variant="success" className="h-12 px-6 rounded-xl flex items-center font-black text-[10px] uppercase tracking-widest animate-pulse-subtle">
                          AWAITING RIDER COMPLETION
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-8 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Order Details</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">ID: #{selectedOrderId}</p>
                </div>
                <button onClick={() => setSelectedOrderId(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                 {/* Items List */}
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">ORDERED ITEMS</h4>
                    {orders.find(o => o.id === selectedOrderId)?.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center font-black text-purple-600">{it.quantity}x</div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{it.productName || 'Meal'}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{it.productCategory || 'Food'}</p>
                          </div>
                        </div>
                        <p className="font-black text-gray-900 dark:text-white">{formatPrice(it.price * it.quantity)}</p>
                      </div>
                    ))}
                 </div>

                 <div className="grid sm:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CUSTOMER</h4>
                       <p className="font-bold text-gray-900 dark:text-white">{orders.find(o => o.id === selectedOrderId)?.customerName}</p>
                       <p className="text-xs text-gray-500">{orders.find(o => o.id === selectedOrderId)?.customerPhone}</p>
                       <p className="text-xs text-gray-500">{orders.find(o => o.id === selectedOrderId)?.customerAddress}</p>
                    </div>
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ASSIGNED RIDER</h4>
                       {orders.find(o => o.id === selectedOrderId)?.riderId ? (
                         <div className="flex items-center gap-3">
                            <img src={orders.find(o => o.id === selectedOrderId)?.dispatchRider?.avatar || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100'} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                               <p className="text-xs font-bold">{orders.find(o => o.id === selectedOrderId)?.dispatchRider?.name || 'Assigned Rider'}</p>
                               <p className="text-[10px] text-gray-500">{orders.find(o => o.id === selectedOrderId)?.dispatchRider?.vehicleNumber || 'GHA-001'}</p>
                            </div>
                         </div>
                       ) : (
                         <p className="text-xs text-amber-600 font-bold flex items-center gap-2"><RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Matching nearby rider...</p>
                       )}
                    </div>
                 </div>

                 <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">SPECIAL INSTRUCTIONS</h4>
                    <p className="text-sm font-medium italic text-gray-600 dark:text-gray-400">"{orders.find(o => o.id === selectedOrderId)?.specialInstructions || 'No special notes.'}"</p>
                 </div>
              </div>
              <div className="p-8 border-t border-gray-50 dark:border-slate-800 flex gap-4">
                 <Button variant="outline" className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest" onClick={() => setSelectedOrderId(null)}>CLOSE</Button>
                 <Button className="flex-1 rounded-2xl h-12 bg-purple-600 font-black uppercase tracking-widest" onClick={() => showToast('Printing...', 'Generating customer receipt.')}><Printer className="w-4 h-4 mr-2" /> PRINT RECEIPT</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// KITCHEN STATUS
// ============================================================
export function VendorKitchenStatusPage() {
  const { vendors, toggleKitchenStatus, orders, isLoading } = useApp();
  const { vendorId } = useAuth();
  const currentVendor = vendors.find(v => v.id === vendorId);

  if (isLoading || !currentVendor) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>;
  }

  const inKitchen = orders.filter(o => o.status === 'Preparing Food' && o.vendorId === currentVendor.id);
  const queue = orders.filter(o => ['Order Received', 'Restaurant Accepted'].includes(o.status) && o.vendorId === currentVendor.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Kitchen Monitor</h1>
          <p className="text-sm text-gray-500">Live view of kitchen load and preparation workflow</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 pl-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
           <span className={cn("text-xs font-black uppercase tracking-widest", currentVendor.isKitchenOpen ? "text-emerald-500" : "text-rose-500")}>
             Kitchen: {currentVendor.isKitchenOpen ? 'ONLINE' : 'PAUSED'}
           </span>
           <button
             onClick={() => toggleKitchenStatus(currentVendor.id)}
             className={cn(
               "w-14 h-7 rounded-full relative p-1 transition-all",
               currentVendor.isKitchenOpen ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700"
             )}>
             <div className={cn("w-5 h-5 bg-white rounded-full shadow-md transition-all", currentVendor.isKitchenOpen ? "ml-auto" : "ml-0")} />
           </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Active Prep */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><ChefHat className="w-5 h-5 text-purple-600" /> Currently Preparing</h3>
              <Badge variant="info" className="px-3 rounded-full">{inKitchen.length} ACTIVE</Badge>
           </div>

           <div className="grid sm:grid-cols-2 gap-4">
              {inKitchen.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-gray-50/50">
                   <Flame className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                   <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">The stoves are quiet...</p>
                </div>
              ) : inKitchen.map(o => (
                <Card key={o.id} className="p-6 rounded-[2rem] border-purple-100 dark:border-purple-900 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">#{o.id}</p>
                       <h4 className="font-bold text-gray-900 dark:text-white">{o.customerName}</h4>
                     </div>
                     <Timer className="w-5 h-5 text-purple-400 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                     {o.items.map((it, i) => (
                       <div key={i} className="flex justify-between text-xs font-medium">
                          <span className="text-gray-600 dark:text-gray-400">{it.quantity}x {it.productName || 'Meal'}</span>
                          <span className="text-gray-400">25m</span>
                       </div>
                     ))}
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prep Load: High</p>
                     <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-[9px] uppercase h-9 px-4">MARK READY</Button>
                  </div>
                </Card>
              ))}
           </div>
        </div>

        {/* Incoming Queue */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" /> Incoming Queue</h3>
              <Badge variant="warning" className="px-3 rounded-full">{queue.length} NEW</Badge>
           </div>

           <div className="space-y-3">
              {queue.map(o => (
                <div key={o.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-amber-500/30 transition-all">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center font-black text-amber-600">{(o.customerName || 'C').charAt(0)}</div>
                     <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-1">{o.customerName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{o.items.length} items • 15:42</p>
                     </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white transition-all">ACCEPT</Button>
                </div>
              ))}
              {queue.length === 0 && <p className="text-xs text-center py-10 text-gray-400 font-bold">No orders in queue</p>}
           </div>

           <Card className="rounded-[2.5rem] bg-gradient-to-br from-purple-600 to-indigo-700 p-8 text-white space-y-6 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Average Prep Time Today</p>
                <div className="flex items-end gap-2">
                   <span className="text-5xl font-black">18</span>
                   <span className="text-xl font-bold mb-1.5 opacity-80 uppercase">mins</span>
                </div>
                <div className="mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                   <p className="text-[10px] font-medium leading-relaxed italic">"Performance is 12% faster than yesterday. Keep it up!"</p>
                </div>
             </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS & REVENUE
// ============================================================
export function VendorAnalyticsPage() {
  const { formatPrice } = useApp();

  const salesData = [
    { name: 'Mon', sales: 2400 },
    { name: 'Tue', sales: 1398 },
    { name: 'Wed', sales: 9800 },
    { name: 'Thu', sales: 3908 },
    { name: 'Fri', sales: 4800 },
    { name: 'Sat', sales: 3800 },
    { name: 'Sun', sales: 4300 },
  ];

  const popularMeals = [
    { name: 'Waakye Special', value: 45, color: '#8b5cf6' },
    { name: 'Ghana Jollof', value: 35, color: '#f59e0b' },
    { name: 'Fried Rice', value: 15, color: '#10b981' },
    { name: 'Banku & Fish', value: 5, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Business Analytics</h1>
          <p className="text-sm text-gray-500">Track your sales performance and customer trends</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
           {['Day', 'Week', 'Month', 'Year'].map(t => (
             <button key={t} className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", t === 'Week' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>{t}</button>
           ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[2.5rem] p-8 space-y-8 border-gray-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-widest">Revenue Trends (GH₵)</h3>
              <Button variant="outline" className="rounded-xl h-10 px-4 text-[10px] font-black border-gray-100"><Download className="w-4 h-4 mr-2" /> EXPORT PDF</Button>
           </div>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </Card>

        <Card className="rounded-[2.5rem] p-8 space-y-8 border-gray-100 dark:border-slate-800 shadow-sm">
           <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-widest">Menu Performance</h3>
           <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularMeals}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {popularMeals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="space-y-4 pt-4">
              {popularMeals.map(m => (
                <div key={m.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{m.name}</span>
                   </div>
                   <span className="text-xs font-black text-gray-900 dark:text-white">{m.value}%</span>
                </div>
              ))}
           </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {[
          { label: 'Avg Order Value', value: 'GHS 45.20', icon: CreditCard, color: 'text-emerald-500' },
          { label: 'Repeat Customer Rate', value: '38%', icon: Users, color: 'text-blue-500' },
          { label: 'Cancellation Rate', value: '0.8%', icon: AlertCircle, color: 'text-rose-500' },
        ].map(kpi => (
          <Card key={kpi.label} className="p-8 rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className={cn("w-16 h-16 rounded-[1.5rem] bg-gray-50 dark:bg-slate-800 flex items-center justify-center", kpi.color)}><kpi.icon className="w-8 h-8" /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{kpi.value}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// WALLET & WITHDRAWALS
// ============================================================
export function VendorWalletPage() {
  const { formatPrice, withdrawals, requestWithdrawal, transactions, customerProfile, vendors } = useApp();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MTN MoMo');

  const currentVendor = vendors.find(v => v.id === user?.vendorId);
  const balance = currentVendor?.totalRevenue || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Revenue Wallet</h1>
          <p className="text-sm text-gray-500">Manage your earnings, payouts and platform commissions</p>
        </div>
        <Badge variant="success" className="h-9 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">Secured by OmniPay</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-[3rem] border-none shadow-2xl relative overflow-hidden p-10 flex flex-col justify-between h-80 lg:h-[450px] group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
          <div className="space-y-2 relative z-10">
            <p className="text-purple-100 text-xs font-black uppercase tracking-[0.2em] opacity-80">Available Earnings</p>
            <p className="text-6xl font-black tracking-tighter">{formatPrice(balance)}</p>
          </div>

          <div className="space-y-8 relative z-10">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-purple-200 uppercase tracking-widest">WITHDRAWAL AMOUNT (GH₵)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/10 border-2 border-white/20 p-5 rounded-2xl text-2xl font-black placeholder:text-white/40 focus:bg-white/20 outline-none transition-all"
                />
             </div>
             <Button className="w-full bg-white text-purple-600 hover:bg-purple-50 rounded-2xl h-16 font-black text-sm shadow-xl shadow-black/20" onClick={() => requestWithdrawal({ amount: parseFloat(amount), method, accountInfo: 'Default' })}>
               REQUEST PAYOUT
             </Button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
           <Card className="rounded-[2.5rem] p-8 border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-widest">Payout Methods</h3>
                 <Button variant="ghost" className="text-purple-600 font-black text-[10px] tracking-widest">+ ADD NEW</Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                 <div className="p-6 rounded-[2rem] border-2 border-purple-500 bg-purple-50/10 dark:bg-purple-950/10 flex items-center justify-between group relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                       <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-amber-400/20">MoMo</div>
                       <div>
                          <p className="font-black text-gray-900 dark:text-white">MTN Mobile Money</p>
                          <p className="text-[10px] font-mono text-gray-500 font-bold">024 **** 0001</p>
                       </div>
                    </div>
                    <Badge variant="success" className="text-[9px] font-black uppercase absolute top-4 right-4">DEFAULT</Badge>
                 </div>
                 <div className="p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 flex items-center justify-between group hover:border-purple-500 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20"><Store className="w-7 h-7" /></div>
                       <div>
                          <p className="font-black text-gray-900 dark:text-white">GCB Bank</p>
                          <p className="text-[10px] font-mono text-gray-500 font-bold">**** **** 4492</p>
                       </div>
                    </div>
                 </div>
              </div>
           </Card>

           <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
              <CardHeader className="p-8 border-b bg-gray-50/50 dark:bg-slate-800/50">
                 <CardTitle className="text-lg font-black uppercase tracking-widest">Recent Transactions</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                      {transactions.length === 0 ? (
                        <tr><td className="p-8 text-center text-gray-500 font-bold">No transactions found</td></tr>
                      ) : transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                           <td className="px-8 py-5">
                              <p className="font-black text-gray-900 dark:text-white leading-tight capitalize">{tx.category.replace('_', ' ')}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{tx.description} | {new Date(tx.date).toLocaleDateString()}</p>
                           </td>
                           <td className={cn("px-8 py-5 text-right font-black text-lg", tx.type === 'credit' ? "text-emerald-500" : "text-gray-900 dark:text-white")}>
                              {tx.type === 'credit' ? '+' : ''}{formatPrice(tx.amount)}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RESTAURANT SETTINGS
// ============================================================
export function VendorStoreSettingsPage() {
  const { vendors, showToast, isLoading, updateVendorProfile } = useApp();
  const { vendorId } = useAuth();
  const currentVendor = vendors.find(v => v.id === vendorId);

  const [activeTab, setActiveTab] = useState('Profile');
  const [form, setForm] = useState({
    name: '',
    description: '',
    about: '',
    cuisine: 'Authentic Ghanaian',
    phone: '',
    email: '',
    address: '',
    minOrder: 0,
    prepTime: 20,
    deliveryFee: 0,
    logo: '',
    banner: '',
  });

  // The vendors list is loaded asynchronously (AppProvider). Seed the form
  // from the DB once the current vendor actually arrives, so the collected
  // restaurant details (name, phone, story, images...) always appear here.
  useEffect(() => {
    if (!currentVendor) return;
    setForm({
      name: currentVendor.name || '',
      description: currentVendor.description || '',
      about: currentVendor.about || '',
      cuisine: currentVendor.category || 'Authentic Ghanaian',
      phone: currentVendor.phone || '',
      email: currentVendor.email || '',
      address: currentVendor.address || '',
      minOrder: Number(currentVendor.minOrder) || 0,
      prepTime: Number(currentVendor.averageDeliveryMinutes) || 20,
      deliveryFee: Number(currentVendor.deliveryFee) || 0,
      logo: currentVendor.logo || '',
      banner: currentVendor.banner || '',
    });
  }, [currentVendor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadImage = (key: 'logo' | 'banner') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
          setForm(f => ({ ...f, [key]: compressedBase64 }));
          showToast('Image Processed', 'Image attached. Click SAVE CONFIGURATION to apply.');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  if (isLoading || !currentVendor) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>;
  }

  const handleSaveProfile = async () => {
    if (!vendorId) return;
    try {
      await updateVendorProfile(vendorId, {
        name: form.name,
        category: form.cuisine,
        description: form.description,
        about: form.about,
        phone: form.phone,
        email: form.email,
        address: form.address,
        minOrder: form.minOrder,
        averageDeliveryMinutes: form.prepTime,
        deliveryFee: form.deliveryFee,
        logo: form.logo,
        banner: form.banner,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Restaurant Configuration</h1>
          <p className="text-sm text-gray-500">Manage your digital storefront and operations in Takoradi</p>
        </div>
        <Button
          className="rounded-2xl h-14 px-10 font-black text-sm bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-600/20"
          onClick={handleSaveProfile}
        >
           SAVE CONFIGURATION
        </Button>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto scrollbar-none gap-2">
         {['Profile', 'Operating Hours', 'Delivery Rules', 'Payment Settings', 'Staff', 'Security'].map(t => (
           <button
             key={t}
             onClick={() => setActiveTab(t)}
             className={cn(
               "px-8 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap",
               activeTab === t ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
             )}>
             {t}
           </button>
         ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            {activeTab === 'Profile' && (
              <Card className="rounded-[3rem] p-10 space-y-10 border-gray-100 dark:border-slate-800 shadow-sm">
                 <div className="flex flex-col sm:flex-row gap-10 items-center">
                    <div className="relative group">
                       <img src={form.logo} className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-purple-50 dark:ring-purple-900/20 shadow-xl group-hover:scale-105 transition-transform duration-700" />
                       <button onClick={() => uploadImage('logo')} className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-xl text-purple-600 hover:text-purple-700 transition-all border border-gray-100 dark:border-slate-700"><Smartphone className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                       <h3 className="text-2xl font-black text-gray-900 dark:text-white">Branding & Identity</h3>
                       <p className="text-sm text-gray-500 font-medium">Update your logo, cover photo and restaurant description for the OmniMarket app.</p>
                       <div className="flex flex-wrap gap-3 pt-2">
                          <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black" onClick={() => uploadImage('logo')}>
                             CHANGE LOGO
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black" onClick={() => uploadImage('banner')}>
                             CHANGE COVER PHOTO
                          </Button>
                       </div>
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cover Banner</label>
                    <div className="relative mt-2">
                       <img src={form.banner} className="w-full h-40 object-cover rounded-2xl border border-gray-100 dark:border-slate-800" />
                       <button onClick={() => uploadImage('banner')} className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xl text-purple-600 hover:text-purple-700 transition-all border border-gray-100 dark:border-slate-700"><Smartphone className="w-5 h-5" /></button>
                    </div>
                 </div>

                 <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Restaurant Name</label>
                       <input
                         type="text"
                         value={form.name}
                         onChange={e => setForm({ ...form, name: e.target.value })}
                         className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold focus:border-purple-500/50 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cuisine Type</label>
                       <select
                         value={form.cuisine}
                         onChange={e => setForm({ ...form, cuisine: e.target.value })}
                         className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold focus:border-purple-500/50 outline-none transition-all"
                       >
                          <option>Authentic Ghanaian</option>
                          <option>Fast Food & Continental</option>
                          <option>Pastries & Desserts</option>
                       </select>
                    </div>
                    <div className="space-y-3 sm:col-span-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Description</label>
                       <textarea
                         rows={4}
                         value={form.description}
                         onChange={e => setForm({ ...form, description: e.target.value })}
                         className="w-full resize-y bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold focus:border-purple-500/50 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-3 sm:col-span-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">About Restaurant (Our Story, Specialties)</label>
                       <textarea
                         rows={6}
                         value={form.about}
                         onChange={e => setForm({ ...form, about: e.target.value })}
                         placeholder="Share your restaurant's story, specialties, and philosophy..."
                         className="w-full resize-y bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold focus:border-purple-500/50 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Minimum Order (GHS)</label>
                       <input
                         type="number"
                         value={form.minOrder}
                         onChange={e => setForm({ ...form, minOrder: parseFloat(e.target.value) })}
                         className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold focus:border-purple-500/50 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Avg. Prep Time (mins)</label>
                       <input
                         type="number"
                         value={form.prepTime}
                         onChange={e => setForm({ ...form, prepTime: parseInt(e.target.value) })}
                         className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold focus:border-purple-500/50 outline-none transition-all"
                       />
                    </div>
                 </div>
              </Card>
            )}

            {activeTab === 'Operating Hours' && (
               <Card className="rounded-[3rem] p-10 space-y-8 border-gray-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-black">Kitchen Schedule</h3>
                  <div className="space-y-4">
                     {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                       <div key={day} className="flex items-center justify-between p-6 rounded-[1.5rem] bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                          <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{day}</span>
                          <div className="flex items-center gap-4">
                             <input type="time" defaultValue="08:00" className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100" />
                             <span className="text-gray-400 font-black">to</span>
                             <input type="time" defaultValue="22:00" className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100" />
                             <div className="w-12 h-6 bg-emerald-500 rounded-full relative p-1 cursor-pointer"><div className="w-4 h-4 bg-white rounded-full ml-auto" /></div>
                          </div>
                       </div>
                     ))}
                  </div>
               </Card>
            )}
         </div>

         <div className="space-y-8">
            <Card className="rounded-[2.5rem] p-8 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-4">Verification & Legal</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold">
                     <span className="text-gray-500">Registration Status</span>
                     <Badge variant="success" className="text-[9px] font-black uppercase px-2">VERIFIED</Badge>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Business ID (TIN)</p>
                     <p className="text-sm font-black font-mono">GHA-88402910-X</p>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Phone (Customer Line)</p>
                     <input
                       type="text"
                       value={form.phone}
                       onChange={e => setForm({ ...form, phone: e.target.value })}
                       className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 p-3 rounded-xl text-sm font-bold"
                     />
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Email (Business)</p>
                     <input
                       type="email"
                       value={form.email}
                       onChange={e => setForm({ ...form, email: e.target.value })}
                       className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 p-3 rounded-xl text-sm font-bold"
                     />
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] text-gray-400 font-bold uppercase">Address</p>
                      <textarea
                        rows={2}
                        value={form.address}
                        onChange={e => setForm({ ...form, address: e.target.value })}
                        className="w-full resize-y bg-gray-50 dark:bg-slate-800 border border-gray-100 p-3 rounded-xl text-sm font-bold"
                      />
                  </div>
               </div>
            </Card>

            <section className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="relative z-10 space-y-4 text-center">
                  <ShieldCheck className="w-12 h-12 mx-auto text-purple-200" />
                  <h3 className="text-xl font-black leading-tight">Need technical help with your portal?</h3>
                  <p className="text-xs text-purple-100 opacity-90 leading-relaxed font-medium">Our merchant success team is available 24/7 in Takoradi to assist with orders and hardware.</p>
                  <Button className="w-full bg-white text-purple-600 hover:bg-purple-50 rounded-2xl h-14 font-black text-xs shadow-xl">Contact Support</Button>
               </div>
            </section>
         </div>
      </div>
    </div>
  );
}

// ============================================================
// FOOD CATEGORIES
// ============================================================
export function VendorCategoriesPage() {
  const [cats, setCats] = useState([
    { id: 1, name: 'Local Dishes', items: 12, status: 'Active' },
    { id: 2, name: 'Rice Meals', items: 8, status: 'Active' },
    { id: 3, name: 'Breakfast Specials', items: 5, status: 'Active' },
    { id: 4, name: 'Grilled Seafood', items: 4, status: 'Inactive' },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-black">Food Categories</h1>
            <p className="text-sm text-gray-500">Organize your menu for easier customer browsing</p>
         </div>
         <Button className="rounded-2xl h-12 px-8 bg-purple-600 font-bold"><Plus className="w-4 h-4 mr-2" /> NEW CATEGORY</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
         {cats.map(c => (
           <Card key={c.id} className="p-6 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold shadow-inner">
                    <Tags className="w-6 h-6" />
                 </div>
                 <Badge variant={c.status === 'Active' ? 'success' : 'default'} className="text-[8px] font-black uppercase px-2">{c.status}</Badge>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">{c.name}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{c.items} menu items linked</p>
              <div className="mt-6 pt-6 border-t border-gray-50 flex gap-2">
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100 hover:bg-purple-50 hover:text-purple-600 transition-all">EDIT</Button>
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100 hover:bg-rose-50 hover:text-rose-600 transition-all text-rose-400">HIDE</Button>
              </div>
           </Card>
         ))}
      </div>
    </div>
  );
}

// ============================================================
// MESSAGES & NOTIFICATIONS
// ============================================================
export function VendorMessagesPage() {
  const { conversations, showToast, sendMessage } = useApp();
  const { user } = useAuth();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const myConversations = (conversations || []).filter(c => c.type === 'customer_vendor');
  const filtered = myConversations.filter(c => {
    if (!search.trim()) return true;
    const partner = (c.participants && c.participants[0]?.name) || c.subject || '';
    return partner.toLowerCase().includes(search.toLowerCase());
  });
  const selectedConv = myConversations.find(c => c.id === selectedConvId) || null;

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
      showToast('Send Failed', 'Could not send the message. Please try again.', 'warning');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Merchant Inbox</h1>
          <p className="text-sm text-gray-500">Chat directly with your customers about their orders</p>
        </div>
        <Badge variant="brand" className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">{filtered.length} CONVERSATIONS</Badge>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 flex overflow-hidden">
        <div className={cn("w-full md:w-80 border-r border-gray-50 dark:border-slate-800 flex flex-col", selectedConvId && "hidden md:flex")}>
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." className="w-full bg-gray-50 dark:bg-slate-800 border-none pl-10 py-3 rounded-xl text-xs font-bold focus:ring-1 focus:ring-purple-500 outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-center py-10 text-gray-400 font-bold">No active conversations</p>
            ) : filtered.map(m => {
              const partner = m.participants && m.participants[0];
              return (
                <div key={m.id} onClick={() => loadMessages(m.id)} className={cn("p-4 rounded-2xl cursor-pointer transition-all flex gap-3 items-center", selectedConvId === m.id ? "bg-purple-50 dark:bg-purple-950/20 ring-1 ring-purple-500/20" : "hover:bg-gray-50 dark:hover:bg-slate-800/50")}>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center font-bold text-purple-600 overflow-hidden">
                    {partner?.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : (partner?.name || 'C').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{partner?.name || m.subject || 'Customer'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{m.lastMessage || 'No messages yet'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cn("flex-1 flex flex-col", !selectedConvId && "hidden md:flex")}>
          {!selectedConv ? (
            <div className="flex-1 items-center justify-center bg-gray-50/30 hidden md:flex">
              <div className="text-center space-y-4">
                <MessageSquare className="w-16 h-16 text-gray-200 mx-auto" />
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-50 dark:border-slate-800 flex items-center gap-3 bg-gray-50/50 dark:bg-slate-950/30">
                <button onClick={() => setSelectedConvId(null)} className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center font-bold text-purple-600 overflow-hidden">
                  {selectedConv.participants?.[0]?.avatar ? <img src={selectedConv.participants[0].avatar} className="w-full h-full object-cover" /> : (selectedConv.participants?.[0]?.name || 'C').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">{selectedConv.participants?.[0]?.name || selectedConv.subject}</p>
                  <p className="text-[10px] text-gray-500">{selectedConv.orderId ? 'Linked to an order' : 'Customer chat'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-slate-950/20">
                {loading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-12">No messages yet — greet your customer</p>
                ) : messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm", mine ? "bg-purple-600 text-white rounded-br-md" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-md")}>
                        <p className="leading-relaxed">{m.content}</p>
                        <p className={cn("text-[9px] mt-1", mine ? "text-purple-100" : "text-gray-400")}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-gray-50 dark:border-slate-800 flex items-center gap-3">
                <input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="Type a reply..."
                  className="flex-1 bg-gray-50 dark:bg-slate-800 border-2 border-transparent px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-purple-500 transition-all"
                />
                <button onClick={handleSend} disabled={sending || !messageInput.trim()} className="p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg disabled:opacity-40 transition-all">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function VendorNotificationsPage() {
  const { notifications } = useApp();

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-black">Activity Center</h1>
      <div className="space-y-4">
         {notifications.map(n => (
           <Card key={n.id} className="p-6 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm flex gap-5 items-start group hover:border-purple-500 transition-all">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform",
                n.type === 'order' ? "bg-amber-100 text-amber-600" :
                n.type === 'delivery' ? "bg-blue-100 text-blue-600" :
                "bg-emerald-100 text-emerald-600"
              )}>
                 {n.type === 'order' ? <ShoppingBag className="w-6 h-6" /> :
                  n.type === 'delivery' ? <Truck className="w-6 h-6" /> :
                  <Wallet className="w-6 h-6" />}
              </div>
              <div className="flex-1 space-y-1">
                 <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 dark:text-white">{n.title}</h4>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{n.time}</span>
                 </div>
                 <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{n.message}</p>
              </div>
           </Card>
         ))}
         {notifications.length === 0 && <p className="text-sm text-gray-500 text-center py-10">No notifications yet.</p>}
      </div>
    </div>
  );
}

export function VendorPromotionsPage() {
  const { coupons, addCategory, formatPrice, showToast } = useApp();
  const { vendorId } = useAuth();

  const vendorCoupons = coupons.filter(c => c.vendorId === vendorId);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-black">Marketing & Promotions</h1>
            <p className="text-sm text-gray-500">Boost your sales with restaurant-specific deals</p>
         </div>
         <Button className="rounded-2xl h-12 px-8 bg-purple-600 font-bold"><Plus className="w-4 h-4 mr-2" /> CREATE DEAL</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
         {vendorCoupons.length === 0 ? (
           <Card className="col-span-full py-20 text-center border-dashed border-2 bg-gray-50/50">
              <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No active promotions</p>
              <Button variant="outline" className="mt-4 rounded-xl">Launch Your First Campaign</Button>
           </Card>
         ) : vendorCoupons.map(c => (
           <Card key={c.id} className="p-6 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden relative group">
              <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold shadow-inner">
                    <TicketPercent className="w-6 h-6" />
                 </div>
                 <Badge variant={c.isActive ? 'success' : 'default'} className="text-[8px] font-black uppercase px-2">{c.isActive ? 'ACTIVE' : 'EXPIRED'}</Badge>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1 uppercase tracking-tighter">{c.code}</h3>
              <p className="text-xs text-gray-500 font-medium mb-4">{c.description}</p>

              <div className="space-y-2 border-t pt-4">
                 <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-400 uppercase">Usage</span>
                    <span className="text-gray-900 dark:text-white">{c.totalUsed} / {c.usageLimit || '∞'}</span>
                 </div>
                 <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${(c.totalUsed / (c.usageLimit || 100)) * 100}%` }} />
                 </div>
              </div>

              <div className="mt-6 pt-6 flex gap-2">
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100">EDIT</Button>
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100 text-rose-400">STOP</Button>
              </div>
           </Card>
         ))}
      </div>
    </div>
  );
}

export function VendorMarketingPage() { return <VendorPromotionsPage />; }
export function VendorCouponsPage() { return <VendorPromotionsPage />; }

export function VendorStaffPage() {
  const staff: any[] = []; // No staff API yet, starting with empty state as required

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-black">Restaurant Staff</h1>
            <p className="text-sm text-gray-500">Manage access and roles for your team members</p>
         </div>
         <Button className="rounded-2xl h-12 px-8 bg-purple-600 font-bold"><Plus className="w-4 h-4 mr-2" /> INVITE STAFF</Button>
      </div>

      <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                <th className="px-8 py-5">Staff Member</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Joined</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    No staff members registered yet
                  </td>
                </tr>
              ) : staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center font-black text-purple-600">{(s.name).charAt(0)}</div>
                       <p className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant="outline" className="text-[9px] font-black uppercase">{s.role}</Badge>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <div className={cn("w-2 h-2 rounded-full", s.status === 'Active' ? "bg-emerald-500" : "bg-amber-500")} />
                       <span className="text-xs font-bold">{s.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs text-gray-500 font-medium">{s.joined}</td>
                  <td className="px-8 py-5 text-right">
                    <Button variant="ghost" size="sm" className="rounded-xl text-gray-400 hover:text-purple-600"><Edit3 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// INVENTORY
// ============================================================
export function VendorInventoryPage() {
  const { vendorId } = useAuth();
  const { products, formatPrice, showToast } = useApp();
  const myProducts = products.filter(p => p.vendorId === vendorId);
  const lowStock = myProducts.filter(p => p.stock <= (p.lowStockThreshold ?? 5));
  const totalUnits = myProducts.reduce((s, p) => s + p.stock, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500">Live stock levels for every menu item</p>
        </div>
        <div className="flex gap-3">
          <Badge variant={lowStock.length > 0 ? 'warning' : 'success'} className="h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest">
            {lowStock.length > 0 ? `${lowStock.length} Low in Stock` : 'Stock Healthy'}
          </Badge>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Menu Items</p>
            <p className="text-3xl font-black mt-1">{myProducts.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Units</p>
            <p className="text-3xl font-black mt-1">{totalUnits}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Out of Stock</p>
            <p className="text-3xl font-black mt-1 text-rose-500">{myProducts.filter(p => p.stock <= 0).length}</p>
          </CardContent>
        </Card>
      </div>

      {myProducts.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center">
          <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No menu items yet</h3>
          <p className="text-sm text-gray-500 mt-1">Add dishes to the menu to see live stock here.</p>
        </Card>
      ) : (
        <Card className="rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="px-6 py-4">Dish</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {myProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={p.images?.[0]} alt={p.title} className="w-10 h-10 rounded-xl object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{p.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{p.category}</td>
                    <td className="px-6 py-4 text-sm font-bold">{formatPrice(p.price)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn("h-full", p.stock <= (p.lowStockThreshold ?? 5) ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, (p.stock / 50) * 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold">{p.stock}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={p.stock <= 0 ? 'danger' : p.stock <= (p.lowStockThreshold ?? 5) ? 'warning' : 'success'} className="text-[9px] font-black uppercase px-2.5">
                        {p.stock <= 0 ? 'Out of Stock' : p.stock <= (p.lowStockThreshold ?? 5) ? 'Low' : 'In Stock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// CUSTOMERS
// ============================================================
export function VendorCustomersPage() {
  const { vendorId } = useAuth();
  const { orders, formatPrice } = useApp();

  const map = new Map<string, any>();
  orders.filter(o => o.vendorId === vendorId).forEach(o => {
    const key = o.customerId || o.customerEmail || o.customerName;
    if (!key) return;
    const existing = map.get(key);
    if (existing) {
      existing.totalOrders += 1;
      existing.totalSpent += o.totalAmount;
      existing.lastOrderDate = o.createdAt || existing.lastOrderDate;
      return;
    }
    map.set(key, {
      id: o.customerId || `cust-${key}`,
      name: o.customerName || o.customerEmail,
      email: o.customerEmail || '',
      phone: o.customerPhone || '',
      totalOrders: 1,
      totalSpent: o.totalAmount,
      lastOrderDate: o.createdAt || '',
    });
  });
  const customers = Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500">Everyone who has ordered from your restaurant</p>
        </div>
        <Badge className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{customers.length} UNIQUE CUSTOMERS</Badge>
      </div>

      {customers.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No customers yet</h3>
          <p className="text-sm text-gray-500 mt-1">When customers place orders, their details will appear here.</p>
        </Card>
      ) : (
        <Card className="rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Orders</th>
                  <th className="px-6 py-4">Total Spent</th>
                  <th className="px-6 py-4">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center font-black text-purple-600">{c.name.charAt(0)}</div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {c.email}
                      {c.phone && <p className="text-xs">{c.phone}</p>}
                    </td>
                    <td className="px-6 py-4"><Badge variant="outline" className="text-[9px] font-black">{c.totalOrders}</Badge></td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatPrice(c.totalSpent)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// SUPPORT TICKETS
// ============================================================
export function VendorSupportPage() {
  const { user } = useAuth();
  const { showToast } = useApp();
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketState, setTicketState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    setTicketState('loading');
    AdminService.getTickets(user?.id)
      .then((rows: any) => { setTickets(Array.isArray(rows) ? rows : []); setTicketState('ready'); })
      .catch(() => setTicketState('error'));
  };
  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSending(true);
    try {
      await AdminService.createTicket({ subject: newSubject.trim(), message: newMessage.trim(), priority: 'medium', userId: user?.id });
      setNewSubject(''); setNewMessage('');
      showToast('Ticket Created', 'Our support team will respond shortly.');
      load();
    } catch {
      showToast('Error', 'Unable to create ticket. Please try again.', 'warning');
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Help & Support</h1>
          <p className="text-sm text-gray-500">Your support tickets and replies</p>
        </div>
        <Badge variant="outline" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{ticketState === 'ready' ? `${tickets.length} TICKETS` : '…'}</Badge>
      </div>

      <Card className="rounded-2xl p-6">
        <CardTitle className="text-base flex items-center gap-2 mb-4"><LifeBuoy className="w-5 h-5 text-purple-500" /> Open a New Ticket</CardTitle>
        <div className="space-y-3">
          <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500" />
          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={3} placeholder="Describe your issue…" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 resize-none" />
          <Button className="rounded-xl bg-purple-600 hover:bg-purple-700 px-6" onClick={create} disabled={sending}>{sending ? 'Sending…' : 'Submit Ticket'}</Button>
        </div>
      </Card>

      {ticketState === 'loading' && <p className="text-center text-gray-400 py-10">Loading tickets…</p>}
      {ticketState === 'error' && (
        <div className="text-center py-10">
          <p className="text-gray-500">Unable to load tickets.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={load}>Retry</Button>
        </div>
      )}
      {ticketState === 'ready' && tickets.length === 0 && (
        <Card className="rounded-2xl p-12 text-center">
          <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No support tickets</h3>
          <p className="text-sm text-gray-500 mt-1">Create a ticket above and it will appear here.</p>
        </Card>
      )}
      {ticketState === 'ready' && tickets.length > 0 && (
        <div className="space-y-4">
          {tickets.map(t => (
            <Card key={t.id} className="rounded-2xl p-6 flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-gray-900 dark:text-white">{t.subject}</h4>
                  <Badge variant={t.status === 'open' ? 'warning' : t.status === 'resolved' ? 'success' : 'default'} className="text-[9px] font-black uppercase">{t.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">{t.message}</p>
                <p className="text-[11px] text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                {(t.replies?.length || 0) > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-gray-100 pl-3">
                    {t.replies.map((r: any, i: number) => (
                      <p key={i} className="text-xs text-gray-600 dark:text-gray-300"><span className="font-bold">{r.senderName}:</span> {r.message}</p>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DELIVERY REQUESTS
// ============================================================
export function VendorDeliveryRequestsPage() {
  const { vendorId } = useAuth();
  const { orders, formatPrice, riders, showToast, updateOrderStatus } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);

  const deliveryOrders = orders.filter(o => o.vendorId === vendorId).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const handleDispatch = async (order: any, riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;
    await updateOrderStatus(order.id, 'rider_assigned');
    showToast('Rider Dispatched', `${rider.name} has been assigned to ${order.orderNumber}.`);
    setExpanded(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Delivery Requests</h1>
          <p className="text-sm text-gray-500">Orders awaiting dispatch and rider pairing</p>
        </div>
        <Badge className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{deliveryOrders.length || 0} DELIVERIES</Badge>
      </div>

      {deliveryOrders.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No delivery requests</h3>
          <p className="text-sm text-gray-500 mt-1">Delivery orders placed by customers will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {deliveryOrders.map(o => (
            <Card key={o.id} className="rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">{o.orderNumber || o.id}</h4>
                    <Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'} className="text-[9px] font-black uppercase">{o.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{o.customerName} · {new Date(o.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-bold text-emerald-600 mt-1">{formatPrice(o.totalAmount)} · {o.paymentMethod}</p>
                </div>
                <div className="flex items-center gap-2">
                  {o.dispatchRider && (
                    <Badge variant="outline" className="text-[9px] font-black gap-1"><Bike className="w-3 h-3" /> {o.dispatchRider.name}</Badge>
                  )}
                  <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black uppercase" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                    {expanded === o.id ? 'Hide' : o.dispatchRider ? 'View' : 'Dispatch'}
                  </Button>
                </div>
              </div>

              {expanded === o.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Select available rider</p>
                  <div className="space-y-2">
                    {riders.filter(r => r.isOnline && r.isAvailable).length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No riders currently online to dispatch.</p>
                    ) : riders.filter(r => r.isOnline && r.isAvailable).map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={r.avatar} alt={r.name} className="w-9 h-9 rounded-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{r.name}</p>
                            <p className="text-[11px] text-gray-500">{r.vehicleType} · {r.totalDeliveries} deliveries · GHS {r.deliveryFee} fee</p>
                          </div>
                        </div>
                        <Button size="sm" className="rounded-xl bg-emerald-600 text-[10px] font-black uppercase" onClick={() => handleDispatch(o.id, r.id)}>Dispatch</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// RIDERS
// ============================================================
export function VendorRidersPage() {
  const { riders, formatPrice } = useApp();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Platform Riders</h1>
          <p className="text-sm text-gray-500">Verified dispatch riders partnered with OmniMarket</p>
        </div>
        <Badge className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{riders.length} RIDERS</Badge>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {riders.length === 0 ? (
          <Card className="rounded-2xl p-12 text-center sm:col-span-2 lg:col-span-3">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No registered riders</h3>
            <p className="text-sm text-gray-500 mt-1">Riders join the platform after admin approval.</p>
          </Card>
        ) : riders.map(r => (
          <Card key={r.id} className="rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <img src={r.avatar} alt={r.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500" onError={e => (e.currentTarget.style.display = 'none')} />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white">{r.name}</h4>
                <p className="text-xs text-gray-500">{r.vehicleType} · {r.vehicleNumber}</p>
              </div>
              <Badge variant={r.isOnline && r.isAvailable ? 'success' : 'default'} className="text-[9px] font-black uppercase">{r.isOnline ? (r.isAvailable ? 'Available' : 'Busy') : 'Offline'}</Badge>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-black text-gray-900 dark:text-white">{r.totalDeliveries}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase">Deliveries</p>
              </div>
              <div>
                <p className="text-lg font-black text-amber-500">{(r.rating || 0).toFixed(1)}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase">Rating</p>
              </div>
              <div>
                <p className="text-lg font-black text-emerald-600">{formatPrice(r.totalEarnings)}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase">Earnings</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// REVIEWS
// ============================================================
export function VendorReviewsPage() {
  const { vendorId } = useAuth();
  const { reviews, orders } = useApp();

  const myOrderIds = new Set(orders.filter(o => o.vendorId === vendorId).map(o => o.id));
  const myReviews = reviews.filter(r => r.vendorId === vendorId || (r.orderId && myOrderIds.has(r.orderId)));
  const avgRating = myReviews.length ? myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length : 0;
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: myReviews.filter(r => r.rating === star).length,
    pct: myReviews.length ? (myReviews.filter(r => r.rating === star).length / myReviews.length) * 100 : 0,
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Customer Reviews</h1>
          <p className="text-sm text-gray-500">Ratings and feedback left for your restaurant</p>
        </div>
        <Badge className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{myReviews.length} REVIEWS</Badge>
      </div>

      {myReviews.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reviews yet</h3>
          <p className="text-sm text-gray-500 mt-1">Customer ratings will appear here after orders are completed.</p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="rounded-2xl p-8 text-center lg:col-span-1">
            <p className="text-6xl font-black text-amber-500">{avgRating.toFixed(1)}</p>
            <div className="flex justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn("w-5 h-5", s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 font-bold">{myReviews.length} total reviews</p>
            <div className="mt-6 space-y-2 text-left">
              {distribution.map(d => (
                <div key={d.star} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-3">{d.star}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-6 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </Card>
          <div className="lg:col-span-2 space-y-4">
            {myReviews.map(r => (
              <Card key={r.id} className="rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={r.userAvatar} alt={r.userName} className="w-10 h-10 rounded-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{r.userName}</p>
                      <p className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn("w-4 h-4", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{r.comment}</p>
                {r.reply && (
                  <div className="mt-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-xs text-purple-700 dark:text-purple-200">
                    <p className="font-black mb-1 underline">Your Reply</p>{r.reply}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Redirects/aliases kept to satisfy existing router imports
export function VendorWithdrawalsPage() { return <VendorWalletPage />; }
export function VendorOrderQueuePage() { return <VendorKitchenStatusPage />; }
export function VendorOpeningHoursPage() { return <VendorStoreSettingsPage />; }
export function VendorSubscriptionPage() { return <VendorAnalyticsPage />; }

