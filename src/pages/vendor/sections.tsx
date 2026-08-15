import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Boxes, Users, BarChart3, Megaphone, Wallet, Store,
  Package, CreditCard, TrendingUp, Truck, Star, RefreshCcw,
  Tags, TicketPercent, Download, LifeBuoy, Bell, MessageSquare,
  ChefHat, Timer, Flame, Bike, Heart, Clock, X, Search, Filter,
  CheckCircle2, AlertCircle, Phone, MapPin, Zap, ChevronRight,
  MoreHorizontal, Play, Pause, DollarSign, Printer, ArrowRight,
  Plus, Trash2, Edit3, Settings, ShieldCheck, Smartphone, Send, ChevronLeft,
  Crown, Gem, CalendarDays, BadgeCheck, Check, FolderTree, UtensilsCrossed
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
import { ImageCropModal } from '@/src/components/common/ImageCropModal';
import { ReceiptModal, ReceiptOrder } from '@/src/components/common/ReceiptModal';
import { OrderStatus } from '@/src/types';
import { LiveMap } from '@/src/components/common/LiveMap';
import { NotificationCenter } from '@/src/components/common/NotificationCenter';
import { AdminService, MessagingService, WalletService } from '@/src/services/api';
import { AuthApiService } from '@/src/services/auth-api';

// ============================================================
// ORDERS MANAGER
// ============================================================
export function VendorOrdersPage() {
  const { vendorId } = useAuth();
  const { orders, formatPrice, updateOrderStatus, showToast, vendors } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'All'>('All');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null);

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

  const openReceipt = (order: any) => {
    setReceiptOrder({
      id: order.id,
      orderNumber: order.orderNumber || order.invoiceNumber || order.id,
      invoiceNumber: order.invoiceNumber || order.id,
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      customerPhone: order.customerPhone,
      vendorName: currentVendor?.name || order.vendorName,
      items: order.items,
      subtotal: order.subtotal || order.itemsTotal,
      deliveryFee: order.deliveryFee,
      tax: order.tax,
      discount: order.discount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
    });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <ShoppingBag className="w-3 h-3 text-amber-300" /> Order Manager
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Order Management</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Live order fulfillment and rider coordination</p>
            </div>
            <Button variant="ghost" className="rounded-2xl border border-white/20 font-black text-xs bg-white/10 hover:bg-white/20 backdrop-blur h-12 px-6" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print All Today
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur">
            {[
              { label: 'New Orders', value: orderStats.pending, icon: Bell, cls: 'text-amber-300' },
              { label: 'In Kitchen', value: orderStats.preparing, icon: ChefHat, cls: 'text-blue-300' },
              { label: 'Ready for Pickup', value: orderStats.ready, icon: Package, cls: 'text-emerald-300' },
              { label: 'Delivered Today', value: orderStats.delivered, icon: CheckCircle2, cls: 'text-violet-300' },
            ].map(s => (
              <div key={s.label} className="px-4 py-4 flex flex-col items-center gap-1.5">
                <s.icon className={`w-4 h-4 ${s.cls}`} />
                <p className="text-xl font-black leading-none">{s.value}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300/80 text-center">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ============ TABS ============ */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl overflow-x-auto scrollbar-none shadow-sm border border-gray-100 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={cn(
              "px-5 py-2.5 text-[10px] font-black rounded-xl transition-all whitespace-nowrap uppercase tracking-widest flex items-center gap-2",
              activeTab === tab.status
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/20"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {tab.label}
            {vendorOrders.filter(o => o.status === tab.status).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[8px]">{vendorOrders.filter(o => o.status === tab.status).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ============ ORDER CARDS ============ */}
      <div className="grid gap-3">
        {filteredOrders.length === 0 ? (
          <Card className="rounded-[2rem] border-dashed border-2 py-20 text-center bg-gray-50/30 dark:bg-slate-900/30">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">No orders in this category</h3>
            <p className="text-sm text-gray-500">Wait for incoming orders or try a different status filter.</p>
          </Card>
        ) : (
          filteredOrders.map(order => (
            <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-[2rem] overflow-hidden border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all group">
                <div className="p-6 space-y-5">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:scale-110 transition-transform",
                        order.status === 'pending' ? "bg-amber-50 text-amber-600" :
                        order.status === 'preparing' ? "bg-blue-50 text-blue-600" :
                        "bg-violet-50 text-violet-600"
                      )}>
                        {(order.customerName || 'C').charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">{order.customerName}</h3>
                          <Badge variant={order.status === 'cancelled' ? 'danger' : 'default'} className="text-[10px] font-black py-0.5 px-2.5 uppercase tracking-widest">{order.status.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-bold line-clamp-1">
                          {order.items.map(i => `${i.quantity}x ${i.productName || 'Meal'}`).join(', ')}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-400 pt-2 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-violet-500" /> {order.id.slice(-6).toUpperCase()}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleTimeString()}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {order.customerAddress}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Rider Map for Vendor */}
                    {order.riderId && ['rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(order.status) && (
                      <div className="hidden xl:block w-64 h-36 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-inner">
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
                      <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">{formatPrice(order.totalAmount)}</p>
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1 mt-1">
                        <CreditCard className="w-3.5 h-3.5" /> Paid via {order.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-xl h-11 px-5 font-bold text-xs border-gray-200 dark:border-slate-700" onClick={() => setSelectedOrderId(order.id)}>View Details</Button>
                      <Button className="rounded-xl h-11 px-4 font-black text-[10px] uppercase tracking-widest text-emerald-600 border border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => openReceipt(order)}><Printer className="w-4 h-4 mr-1.5" /> Receipt</Button>
                      <Button variant="ghost" className="rounded-xl h-11 px-3 text-gray-400 hover:text-violet-600" onClick={() => navigate('/restaurant/messages')}><MessageSquare className="w-5 h-5" /></Button>
                      <Button variant="ghost" className="rounded-xl h-11 px-3 text-gray-400 hover:text-emerald-600" onClick={() => window.open(`tel:${order.customerPhone}`)}><Phone className="w-5 h-5" /></Button>
                    </div>

                    <div className="flex gap-3">
                      {order.status === 'pending' && (
                        <>
                          <Button variant="outline" className="rounded-xl h-12 px-6 font-black text-xs text-rose-500 border-rose-100 dark:border-rose-900/40 hover:bg-rose-50" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>REJECT</Button>
                          <Button className="rounded-xl h-12 px-10 font-black text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-600/20" onClick={() => handleStatusUpdate(order.id, 'confirmed')}>ACCEPT ORDER</Button>
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
                 <Button className="flex-1 rounded-2xl h-12 bg-purple-600 font-black uppercase tracking-widest" onClick={() => openReceipt(orders.find(o => o.id === selectedOrderId))}><Printer className="w-4 h-4 mr-2" /> PRINT RECEIPT</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReceiptModal open={!!receiptOrder} order={receiptOrder} onClose={() => setReceiptOrder(null)} heading="Merchant Receipt" />
    </div>
  );
}

// ============================================================
// KITCHEN STATUS
// ============================================================
export function VendorKitchenStatusPage() {
  const { vendors, toggleKitchenStatus, orders, isLoading, showToast, updateOrderStatus } = useApp();
  const { vendorId } = useAuth();
  const currentVendor = vendors.find(v => v.id === vendorId);

  if (isLoading || !currentVendor) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>;
  }

  const inKitchen = orders.filter(o => ['confirmed', 'preparing'].includes(o.status) && o.vendorId === currentVendor.id);
  const queue = orders.filter(o => o.status === 'pending' && o.vendorId === currentVendor.id);

  const toggleKitchen = async () => {
    try {
      await toggleKitchenStatus(currentVendor.id);
      showToast('Kitchen Updated', currentVendor.isKitchenOpen ? 'Kitchen paused — customers will see your restaurant as closed.' : 'Kitchen is now open and accepting orders.');
    } catch (err) {
      showToast('Error', 'Could not update kitchen status. Please try again.', 'warning');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-amber-300" /> Kitchen Monitor
                </span>
                <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5", currentVendor.isKitchenOpen ? "bg-emerald-600/20 text-emerald-300" : "bg-rose-600/20 text-rose-300")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", currentVendor.isKitchenOpen ? "bg-emerald-400" : "bg-rose-400")} />
                  {currentVendor.isKitchenOpen ? 'Kitchen Online' : 'Kitchen Paused'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Kitchen Monitor</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Live view of kitchen load and preparation workflow</p>
            </div>
            <button
              onClick={toggleKitchen}
              className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95",
                currentVendor.isKitchenOpen
                  ? "bg-rose-500 text-white shadow-rose-500/25"
                  : "bg-emerald-500 text-white shadow-emerald-500/25"
              )}
            >
              <div className={cn("w-8 h-4 rounded-full relative p-0.5 transition-all", currentVendor.isKitchenOpen ? "bg-white/20" : "bg-white/20")}>
                <div className={cn("w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all", currentVendor.isKitchenOpen ? "ml-auto" : "ml-0")} />
              </div>
              {currentVendor.isKitchenOpen ? 'Pause Kitchen' : 'Open Kitchen'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur">
            {[
              { label: 'In Kitchen', value: inKitchen.length, icon: ChefHat, cls: 'text-blue-300' },
              { label: 'Incoming Queue', value: queue.length, icon: Clock, cls: 'text-amber-300' },
              { label: 'Avg Prep Time', value: '18', suffix: 'min', icon: Timer, cls: 'text-emerald-300' },
            ].map(s => (
              <div key={s.label} className="px-4 py-4 flex flex-col items-center gap-1.5">
                <s.icon className={`w-4 h-4 ${s.cls}`} />
                <p className="text-xl font-black leading-none">{s.value}<span className="text-xs text-slate-300/80 ml-0.5">{s.suffix || ''}</span></p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300/80 text-center">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Active Prep */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2"><ChefHat className="w-5 h-5 text-violet-600" /> Currently Preparing</h3>
            <Badge variant="info" className="px-3 rounded-full">{inKitchen.length} ACTIVE</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {inKitchen.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-gray-50/50 dark:bg-slate-900/30">
                <Flame className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">The stoves are quiet...</p>
              </div>
            ) : inKitchen.map(o => (
              <Card key={o.id} className="p-6 rounded-[2rem] border-violet-100 dark:border-violet-900/40 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">#{o.id.slice(-6).toUpperCase()}</p>
                    <h4 className="font-bold text-gray-900 dark:text-white mt-1">{o.customerName}</h4>
                  </div>
                  <Timer className="w-5 h-5 text-violet-400 animate-pulse" />
                </div>
                <div className="space-y-2">
                  {o.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs font-medium">
                      <span className="text-gray-600 dark:text-gray-400">{it.quantity}x {it.productName || 'Meal'}</span>
                      <span className="text-gray-400">{o.estimatedDeliveryTime || '25m'}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prep Load: High</p>
                  <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-[9px] uppercase h-9 px-4" onClick={() => updateOrderStatus(o.id, 'ready_for_pickup')}>MARK READY</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Incoming Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" /> Incoming Queue</h3>
            <Badge variant="warning" className="px-3 rounded-full">{queue.length} NEW</Badge>
          </div>

          <div className="space-y-2">
            {queue.map(o => (
              <div key={o.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center font-black text-amber-600">{(o.customerName || 'C').charAt(0)}</div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-1">{o.customerName}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{o.items.length} items</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 dark:bg-violet-900/20 group-hover:bg-violet-600 group-hover:text-white transition-all" onClick={() => updateOrderStatus(o.id, 'confirmed')}>ACCEPT</Button>
              </div>
            ))}
            {queue.length === 0 && <p className="text-xs text-center py-10 text-gray-400 font-bold">No orders in queue</p>}
          </div>

          <Card className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-indigo-700 p-7 text-white space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Average Prep Time Today</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">18</span>
                <span className="text-xl font-bold mb-1.5 opacity-80 uppercase">mins</span>
              </div>
              <div className="mt-5 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart3 className="w-3 h-3 text-amber-300" /> Analytics
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Business Analytics</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Track your sales performance and customer trends</p>
            </div>
            <div className="flex bg-white/10 backdrop-blur p-1 rounded-xl border border-white/10">
              {['Day', 'Week', 'Month', 'Year'].map(t => (
                <button key={t} className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", t === 'Week' ? "bg-white text-purple-600 shadow-sm" : "text-slate-300 hover:text-white")}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-[2rem] p-6 sm:p-8 space-y-6 border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-gray-900 dark:text-white uppercase tracking-widest">Revenue Trends (GH₵)</h3>
            <Button variant="outline" className="rounded-xl h-10 px-4 text-[10px] font-black border-gray-200 dark:border-slate-700"><Download className="w-4 h-4 mr-2" /> EXPORT PDF</Button>
          </div>
          <div className="h-[320px] w-full">
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

        <Card className="rounded-[2rem] p-6 sm:p-8 space-y-6 border-gray-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-black text-base text-gray-900 dark:text-white uppercase tracking-widest">Menu Performance</h3>
          <div className="h-[280px] flex items-center justify-center">
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
          <div className="space-y-3 pt-2">
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

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Avg Order Value', value: 'GHS 45.20', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Repeat Customer Rate', value: '38%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Cancellation Rate', value: '0.8%', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40' },
        ].map(kpi => (
          <Card key={kpi.label} className="rounded-[2rem] p-6 border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-5">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", kpi.bg, kpi.color)}><kpi.icon className="w-7 h-7" /></div>
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
  const { formatPrice, withdrawals, requestWithdrawal, transactions, customerProfile, vendors, showToast } = useApp();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MTN MoMo');
  const [balance, setBalance] = useState<number>(0);

  const currentVendor = vendors.find(v => v.id === user?.vendorId);

  // Real wallet balance from the server (credited on completed orders).
  useEffect(() => {
    if (!user) return;
    WalletService.getBalance(user.id).then(w => setBalance(Number(w.balance) || 0)).catch(() => setBalance(0));
  }, [user]);

  const handleRequestPayout = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showToast('Enter Amount', 'Please enter a valid amount to withdraw.', 'warning');
    if (amt > balance) return showToast('Insufficient Balance', 'Your wallet balance is too low for this withdrawal.', 'warning');
    requestWithdrawal({ amount: amt, method, accountInfo: 'Default' });
    setAmount('');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-purple-500/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-white/15 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/15 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Wallet className="w-3 h-3 text-amber-300" /> OmniPay
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" /> Secured
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Revenue Wallet</h1>
              <p className="text-sm text-purple-100/80 font-medium mt-1">Manage your earnings, payouts and platform commissions</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-100/80">Available Earnings</p>
              <p className="text-4xl sm:text-5xl font-black tracking-tight mt-1">{formatPrice(balance)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-purple-950 text-white rounded-[2rem] border-none shadow-2xl relative overflow-hidden p-6 sm:p-8 flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -mr-28 -mt-28 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
          <div className="space-y-2 relative z-10">
            <p className="text-purple-100 text-xs font-black uppercase tracking-[0.2em] opacity-80">Withdrawal Balance</p>
            <p className="text-5xl font-black tracking-tighter">{formatPrice(balance)}</p>
            <p className="text-[10px] text-purple-200/70 font-bold uppercase tracking-widest">After 10% platform commission</p>
          </div>

          <div className="space-y-5 relative z-10 mt-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-purple-200 uppercase tracking-widest">WITHDRAWAL AMOUNT (GH₵)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/10 border-2 border-white/20 p-4 rounded-2xl text-2xl font-black placeholder:text-white/40 focus:bg-white/20 outline-none transition-all"
              />
            </div>
            <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-2xl h-14 font-black text-sm shadow-xl shadow-black/20" onClick={handleRequestPayout}>
              REQUEST PAYOUT
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-[2rem] p-6 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-gray-900 dark:text-white uppercase tracking-widest">Payout Methods</h3>
              <Button variant="ghost" className="text-violet-600 font-black text-[10px] tracking-widest">+ ADD NEW</Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-5 rounded-[1.75rem] border-2 border-violet-500 bg-violet-50/10 dark:bg-violet-950/10 flex items-center justify-between group relative overflow-hidden">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-amber-400/20">MoMo</div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white text-sm">MTN Mobile Money</p>
                    <p className="text-[10px] font-mono text-gray-500 font-bold">024 **** 0001</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[9px] font-black uppercase absolute top-4 right-4">DEFAULT</Badge>
              </div>
              <div className="p-5 rounded-[1.75rem] border border-gray-100 dark:border-slate-800 flex items-center justify-between group hover:border-violet-500 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20"><Store className="w-6 h-6" /></div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white text-sm">GCB Bank</p>
                    <p className="text-[10px] font-mono text-gray-500 font-bold">**** **** 4492</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b bg-gray-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-base font-black uppercase tracking-widest">Recent Transactions</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {transactions.length === 0 ? (
                    <tr><td className="p-8 text-center text-gray-500 font-bold">No transactions found</td></tr>
                  ) : transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-black text-gray-900 dark:text-white leading-tight capitalize">{tx.category.replace('_', ' ')}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{tx.description} | {new Date(tx.date).toLocaleDateString()}</p>
                      </td>
                      <td className={cn("px-6 py-5 text-right font-black text-lg", tx.type === 'credit' ? "text-emerald-500" : "text-gray-900 dark:text-white")}>
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
  const { vendors, showToast, isLoading, updateVendorProfile, updateVendorHours, reviews, orders } = useApp();
  const { vendorId, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const currentVendor = vendors.find(v => v.id === vendorId);

  const [activeTab, setActiveTab] = useState('Profile');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'logo' | 'banner'>('logo');
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

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [hours, setHours] = useState<{ day: string; isOpen: boolean; open: string; close: string }[]>(
    DAYS.map(day => ({ day, isOpen: true, open: '08:00', close: '22:00' }))
  );
  const [emailStep, setEmailStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [emailCode, setEmailCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const emailVerified = !!(user?.isEmailVerified || user?.isVerified);

  useEffect(() => {
    if (!currentVendor) return;
    const raw = Array.isArray(currentVendor.businessHours) ? currentVendor.businessHours : [];
    setHours(DAYS.map(day => {
      const existing = raw.find((h: any) => h.day === day);
      return existing
        ? { day, isOpen: !!existing.isOpen, open: existing.open || '08:00', close: existing.close || '22:00' }
        : { day, isOpen: true, open: '08:00', close: '22:00' };
    }));
  }, [currentVendor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const src = event.target?.result as string;
        if (src) {
          setCropTarget(key);
          setCropSrc(src);
        }
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
      showToast('Error', 'Could not save your profile. Please try again.', 'warning');
    }
  };

  const formatHM = (v: string) => {
    if (!v) return '';
    const [h, m] = v.split(':').map(Number);
    const hr = h % 12 || 12;
    return `${hr}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const updateHours = (day: string, patch: Partial<{ open: string; close: string }>) =>
    setHours(prev => prev.map(h => h.day === day ? { ...h, ...patch } : h));

  const toggleDay = (day: string) =>
    setHours(prev => prev.map(h => h.day === day ? { ...h, isOpen: !h.isOpen } : h));

  const setAllDays = (isOpen: boolean) => setHours(prev => prev.map(h => ({ ...h, isOpen })));

  const saveHours = async () => {
    if (!vendorId) return;
    try {
      const openDays = hours.filter(h => h.isOpen);
      const display = openDays
        .map(h => `${h.day}: ${formatHM(h.open)} - ${formatHM(h.close)}`)
        .join(', ');
      await updateVendorHours(vendorId, {
        openHours: openDays.length ? display : 'Closed Today',
        businessHours: hours,
      });
    } catch (err) {
      console.error(err);
      showToast('Error', 'Could not save hours. Please try again.', 'warning');
    }
  };

  const handleContactSupport = async () => {
    try {
      showToast('Support', 'Opening your support thread with our team...');
      const conv = await MessagingService.supportConversation({
        subject: `Support Request - ${currentVendor?.name || 'Vendor'}`,
      });
      navigate(`/restaurant/messages?convId=${conv.id}`);
    } catch (err) {
      console.error(err);
      showToast('Error', 'Unable to reach support right now. Please try again.', 'warning');
    }
  };

  const requestEmailVerification = async () => {
    setEmailBusy(true);
    try {
      const res = await AuthApiService.sendVerification();
      if (res.emailVerified) {
        setEmailStep('verified');
        updateUser({ isEmailVerified: true, isVerified: true });
        showToast('Email Verified', 'Your business email is verified.');
      } else {
        setEmailStep('sent');
        showToast('Code Sent', 'Check your inbox for the verification code.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error', err?.message || 'Could not send the verification code.', 'warning');
    } finally {
      setEmailBusy(false);
    }
  };

  const submitEmailVerification = async () => {
    if (!emailCode.trim()) return;
    setEmailBusy(true);
    try {
      await AuthApiService.verifyEmail(emailCode.trim());
      setEmailStep('verified');
      updateUser({ isEmailVerified: true, isVerified: true });
      showToast('Email Verified', 'Your business email is now verified.');
    } catch (err: any) {
      console.error(err);
      showToast('Invalid Code', err?.message || 'The code could not be verified.', 'warning');
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Store className="w-3 h-3 text-amber-300" /> Storefront
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Restaurant Configuration</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Manage your digital storefront and operations in Takoradi</p>
            </div>
            <Button
              className="rounded-2xl h-12 px-8 font-black text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-xl shadow-violet-600/20 uppercase tracking-widest"
              onClick={activeTab === 'Operating Hours' ? saveHours : handleSaveProfile}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> SAVE CONFIGURATION
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto scrollbar-none gap-1">
         {['Profile', 'Operating Hours', 'Delivery Rules', 'Payment Settings', 'Staff', 'Security'].map(t => (
           <button
             key={t}
             onClick={() => {
               setActiveTab(t);
               window.scrollTo({ top: 0, behavior: 'smooth' });
             }}
             className={cn(
               "px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
               activeTab === t ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/20" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                     <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Kitchen Schedule</h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">Customers see when your restaurant opens and closes.</p>
                     </div>
                     <Badge variant="info" className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest">Shown to customers</Badge>
                  </div>
                  <div className="space-y-4">
                     {hours.map(h => (
                        <div key={h.day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 rounded-[1.5rem] bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                           <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{h.day}</span>
                           {h.isOpen ? (
                              <div className="flex items-center gap-3">
                                 <input type="time" value={h.open} onChange={e => updateHours(h.day, { open: e.target.value })} className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-slate-700" />
                                 <span className="text-gray-400 font-black text-xs">to</span>
                                 <input type="time" value={h.close} onChange={e => updateHours(h.day, { close: e.target.value })} className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold border border-gray-100 dark:border-slate-700" />
                              </div>
                           ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Closed</span>
                           )}
                           <button
                             onClick={() => toggleDay(h.day)}
                             className={cn("w-14 h-7 rounded-full relative p-1 transition-all shrink-0", h.isOpen ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700")}
                           >
                              <div className={cn("w-5 h-5 bg-white rounded-full shadow-md transition-all", h.isOpen ? "ml-auto" : "ml-0")} />
                           </button>
                        </div>
                     ))}
                  </div>
<div className="flex flex-wrap items-center gap-3 pt-2">
                     <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black" onClick={() => setAllDays(true)}>OPEN ALL DAYS</Button>
                     <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black text-rose-500" onClick={() => setAllDays(false)}>CLOSE ALL DAYS</Button>
                     <Button className="ml-auto rounded-2xl h-12 px-8 font-black text-xs bg-purple-600 hover:bg-purple-700 shadow-lg" onClick={saveHours}>SAVE HOURS</Button>
                  </div>
               </Card>
            )}

            {['Delivery Rules', 'Payment Settings', 'Staff', 'Security'].includes(activeTab) && (
               <Card className="rounded-[3rem] p-10 border-gray-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-start gap-6">
                     <div className={cn(
                       "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                       activeTab === 'Delivery Rules' ? "bg-blue-50 text-blue-600" : activeTab === 'Payment Settings' ? "bg-emerald-50 text-emerald-600" : activeTab === 'Staff' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                     )}>
                        {activeTab === 'Delivery Rules' ? <MapPin className="w-8 h-8" /> : activeTab === 'Payment Settings' ? <Wallet className="w-8 h-8" /> : activeTab === 'Staff' ? <Users className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">{activeTab}</h3>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                           {activeTab === 'Delivery Rules' && 'Configure delivery zones, fees and rider payout rules for orders from your kitchen.'}
                           {activeTab === 'Payment Settings' && 'Manage how you get paid — bank details, settlement schedule and payout thresholds.'}
                           {activeTab === 'Staff' && 'Add and manage your kitchen team members and their access to this portal.'}
                           {activeTab === 'Security' && 'Manage password, two-factor login and trusted devices for your restaurant account.'}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 pt-1">Coming soon — managed by our merchant success team</p>
                     </div>
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

            <Card className="rounded-[2.5rem] p-8 border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-4">Restaurant Rating</h3>
               <div className="flex items-center gap-5">
                  {(() => {
                     const myOrderIds = new Set(orders.filter(o => o.vendorId === vendorId).map(o => o.id));
                     const myReviews = reviews.filter(r => r.vendorId === vendorId || (r.orderId && myOrderIds.has(r.orderId)));
                     const avg = myReviews.length ? myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length : 0;
                     return (<>
                        <div className="text-5xl font-black text-amber-500">{avg ? avg.toFixed(1) : '—'}</div>
                        <div className="space-y-1.5">
                           <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                 <Star key={s} className={cn("w-4 h-4", s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-slate-600")} />
                              ))}
                           </div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{myReviews.length} verified reviews</p>
                        </div>
                     </>);
                  })()}
               </div>
               <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Ratings come from verified customer reviews left after delivery.</p>
            </Card>

            <Card className="rounded-[2.5rem] p-8 border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-4">Email Verification</h3>
               {emailVerified ? (
                  <div className="flex items-center gap-3">
                     <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                     <div className="min-w-0">
                        <p className="text-sm font-black text-emerald-600">Verified</p>
                        <p className="text-[10px] text-gray-400 font-bold truncate">{user?.email}</p>
                     </div>
                  </div>
               ) : emailStep === 'sent' ? (
                  <div className="space-y-3">
                     <p className="text-xs text-gray-500 font-medium">Enter the 6-digit code sent to <span className="font-black text-gray-700 dark:text-gray-200">{user?.email}</span>.</p>
                     <input
                       type="text"
                       inputMode="numeric"
                       maxLength={6}
                       value={emailCode}
                       onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))}
                       placeholder="••••••"
                       className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 p-4 rounded-xl text-sm font-black tracking-[0.4em] text-center focus:border-purple-500/50 outline-none transition-all"
                     />
                     <Button className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 font-black text-xs shadow-lg" onClick={submitEmailVerification} loading={emailBusy}>VERIFY EMAIL</Button>
                     <button onClick={requestEmailVerification} className="w-full text-center text-[10px] font-black text-purple-600 underline">Resend code</button>
                  </div>
               ) : (
                  <div className="space-y-3">
                     <p className="text-xs text-gray-500 font-medium">Verify your business email to unlock full account trust, order updates and support alerts.</p>
                     <Button className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 font-black text-xs shadow-lg" onClick={requestEmailVerification} loading={emailBusy}>SEND VERIFICATION CODE</Button>
                  </div>
               )}
            </Card>

            <section className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="relative z-10 space-y-4 text-center">
                  <ShieldCheck className="w-12 h-12 mx-auto text-purple-200" />
                  <h3 className="text-xl font-black leading-tight">Need technical help with your portal?</h3>
                  <p className="text-xs text-purple-100 opacity-90 leading-relaxed font-medium">Our merchant success team is available 24/7 in Takoradi to assist with orders and hardware.</p>
                  <Button onClick={handleContactSupport} className="w-full bg-white text-purple-600 hover:bg-purple-50 rounded-2xl h-14 font-black text-xs shadow-xl">Contact Support</Button>
               </div>
            </section>
         </div>
      </div>

      <ImageCropModal
        open={!!cropSrc}
        imageSrc={cropSrc || ''}
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => {
          setForm(f => ({ ...f, [cropTarget]: dataUrl }));
          showToast('Image Processed', 'Image ready. Click SAVE CONFIGURATION to apply.');
          setCropSrc(null);
        }}
        aspect={cropTarget === 'logo' ? 1 : 16 / 6}
        maxOutputSize={cropTarget === 'logo' ? 500 : 1400}
        title={cropTarget === 'logo' ? 'Crop Restaurant Logo' : 'Crop Cover Banner'}
      />
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <FolderTree className="w-3 h-3 text-amber-300" /> Categories
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Food Categories</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Organize your menu for easier customer browsing</p>
            </div>
            <Button className="rounded-2xl h-12 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-violet-600/20"><Plus className="w-4 h-4 mr-2" /> NEW CATEGORY</Button>
          </div>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
         {cats.map(c => (
           <Card key={c.id} className="p-6 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 flex items-center justify-center text-violet-600 dark:text-violet-300 font-bold shadow-inner">
                    <Tags className="w-6 h-6" />
                 </div>
                 <Badge variant={c.status === 'Active' ? 'success' : 'default'} className="text-[8px] font-black uppercase px-2">{c.status}</Badge>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">{c.name}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{c.items} menu items linked</p>
              <div className="mt-6 pt-6 border-t border-gray-50 dark:border-slate-800 flex gap-2">
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100 dark:border-slate-700 hover:bg-violet-50 hover:text-violet-600 transition-all">EDIT</Button>
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-all text-rose-400">HIDE</Button>
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
  const [searchParams] = useSearchParams();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const myConversations = (conversations || []).filter(c => c.type === 'customer_vendor' || c.type === 'vendor_support');
  const filtered = myConversations.filter(c => {
    if (!search.trim()) return true;
    const partner = ((c.participants || []).find(p => p.id !== user?.id) || c.participants?.[0])?.name || c.subject || '';
    return partner.toLowerCase().includes(search.toLowerCase());
  });
  const selectedConv = myConversations.find(c => c.id === selectedConvId)
    || (selectedConvId ? { id: selectedConvId, subject: 'OmniMarket Support', participants: [{ name: 'OmniMarket Support' }] } : null);
  const partnerInfo = (selectedConv?.participants || []).find(p => p.id !== user?.id) || selectedConv?.participants?.[0];

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

  useEffect(() => {
    const convId = searchParams.get('convId');
    if (convId && !selectedConvId) loadMessages(convId);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="flex flex-col gap-6 min-h-[calc(100vh-12rem)] pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-amber-300" /> Inbox
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Merchant Inbox</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Chat directly with your customers about their orders</p>
            </div>
            <Badge variant="brand" className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{filtered.length} CONVERSATIONS</Badge>
          </div>
        </div>
      </motion.div>

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
              const partner = (m.participants || []).find(p => p.id !== user?.id) || m.participants?.[0];
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
                      {partnerInfo?.avatar ? <img src={partnerInfo.avatar} className="w-full h-full object-cover" /> : (partnerInfo?.name || 'C').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white truncate">{partnerInfo?.name || selectedConv.subject}</p>
                      <p className="text-[10px] text-gray-500">{selectedConv.orderId ? 'Linked to an order' : selectedConv.type === 'vendor_support' ? 'OmniMarket Support' : 'Customer chat'}</p>
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
  return <NotificationCenter role="vendor" />;
}

export function VendorPromotionsPage() {
  const { coupons, addCategory, formatPrice, showToast } = useApp();
  const { vendorId } = useAuth();

  const vendorCoupons = coupons.filter(c => c.vendorId === vendorId);

  return (
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Megaphone className="w-3 h-3 text-amber-300" /> Marketing
                </span>
                <Badge variant="success" className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{vendorCoupons.filter(c => c.isActive).length} ACTIVE</Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Marketing & Promotions</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Boost your sales with restaurant-specific deals</p>
            </div>
            <Button className="rounded-2xl h-12 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-violet-600/20"><Plus className="w-4 h-4 mr-2" /> CREATE DEAL</Button>
          </div>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
         {vendorCoupons.length === 0 ? (
           <Card className="col-span-full py-20 text-center border-dashed border-2 bg-gray-50/50 dark:bg-slate-900/30">
              <Megaphone className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No active promotions</p>
              <Button variant="outline" className="mt-4 rounded-xl">Launch Your First Campaign</Button>
           </Card>
         ) : vendorCoupons.map(c => (
           <Card key={c.id} className="p-6 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden relative group">
              <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold shadow-inner">
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
                 <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${(c.totalUsed / (c.usageLimit || 100)) * 100}%` }} />
                 </div>
              </div>

              <div className="mt-6 pt-6 flex gap-2">
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100 dark:border-slate-700">EDIT</Button>
                 <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-gray-100 dark:border-slate-700 text-rose-400">STOP</Button>
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-amber-300" /> Team
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Restaurant Staff</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Manage access and roles for your team members</p>
            </div>
            <Button className="rounded-2xl h-12 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-violet-600/20"><Plus className="w-4 h-4 mr-2" /> INVITE STAFF</Button>
          </div>
        </div>
      </motion.div>

      <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
                       <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 flex items-center justify-center font-black text-violet-600 dark:text-violet-300">{(s.name).charAt(0)}</div>
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Boxes className="w-3 h-3 text-amber-300" /> Inventory
                </span>
                <Badge variant={lowStock.length > 0 ? 'warning' : 'success'} className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {lowStock.length > 0 ? `${lowStock.length} Low in Stock` : 'Stock Healthy'}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Inventory</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Live stock levels for every menu item</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur">
            {[
              { label: 'Menu Items', value: myProducts.length, icon: UtensilsCrossed, cls: 'text-violet-300' },
              { label: 'Total Units', value: totalUnits, icon: Boxes, cls: 'text-emerald-300' },
              { label: 'Out of Stock', value: myProducts.filter(p => p.stock <= 0).length, icon: X, cls: 'text-rose-300' },
            ].map(s => (
              <div key={s.label} className="px-4 py-4 flex flex-col items-center gap-1.5">
                <s.icon className={`w-4 h-4 ${s.cls}`} />
                <p className="text-xl font-black leading-none">{s.value}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-300/80 text-center">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {myProducts.length === 0 ? (
        <Card className="rounded-[2rem] p-12 text-center">
          <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No menu items yet</h3>
          <p className="text-sm text-gray-500 mt-1">Add dishes to the menu to see live stock here.</p>
        </Card>
      ) : (
        <Card className="rounded-[2rem] overflow-hidden">
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
                        <div className="w-20 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-amber-300" /> Customers
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Customers</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Everyone who has ordered from your restaurant</p>
            </div>
            <Badge className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/15">{customers.length} UNIQUE CUSTOMERS</Badge>
          </div>
        </div>
      </motion.div>

      {customers.length === 0 ? (
        <Card className="rounded-[2rem] p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No customers yet</h3>
          <p className="text-sm text-gray-500 mt-1">When customers place orders, their details will appear here.</p>
        </Card>
      ) : (
        <Card className="rounded-[2rem] overflow-hidden">
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 flex items-center justify-center font-black text-violet-600 dark:text-violet-300">{c.name.charAt(0)}</div>
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <LifeBuoy className="w-3 h-3 text-amber-300" /> Support
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Help & Support</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Your support tickets and replies</p>
            </div>
            <Badge variant="outline" className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{ticketState === 'ready' ? `${tickets.length} TICKETS` : '…'}</Badge>
          </div>
        </div>
      </motion.div>

      <Card className="rounded-[2rem] p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
        <CardTitle className="text-base flex items-center gap-2 mb-4"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 flex items-center justify-center text-violet-600 dark:text-violet-300"><LifeBuoy className="w-4 h-4" /></div> Open a New Ticket</CardTitle>
        <div className="space-y-3">
          <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500" />
          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={3} placeholder="Describe your issue…" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 resize-none" />
          <Button className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 px-6" onClick={create} disabled={sending}>{sending ? 'Sending…' : 'Submit Ticket'}</Button>
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
        <Card className="rounded-[2rem] p-12 text-center">
          <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No support tickets</h3>
          <p className="text-sm text-gray-500 mt-1">Create a ticket above and it will appear here.</p>
        </Card>
      )}
      {ticketState === 'ready' && tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map(t => (
            <Card key={t.id} className="rounded-[1.75rem] p-6 flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-gray-900 dark:text-white">{t.subject}</h4>
                  <Badge variant={t.status === 'open' ? 'warning' : t.status === 'resolved' ? 'success' : 'default'} className="text-[9px] font-black uppercase">{t.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">{t.message}</p>
                <p className="text-[11px] text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                {(t.replies?.length || 0) > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-gray-100 dark:border-slate-700 pl-3">
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
  const { orders, formatPrice, riders, showToast, updateOrderStatus, assignRiderToOrder } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);

  const deliveryOrders = orders.filter(o => o.vendorId === vendorId).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const handleDispatch = async (order: any, riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;
    try {
      // Real server-side assignment: marks rider_assigned, opens the
      // customer <-> rider thread and notifies customer/rider.
      await assignRiderToOrder(order.id, riderId);
      showToast('Rider Dispatched', `${rider.name} has been assigned to ${order.orderNumber || order.id}.`);
    } catch (err: any) {
      showToast('Dispatch Failed', err?.message || 'The rider could not be assigned.', 'warning');
    }
    setExpanded(null);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Truck className="w-3 h-3 text-amber-300" /> Dispatch
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Delivery Requests</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Orders awaiting dispatch and rider pairing</p>
            </div>
            <Badge className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/15">{deliveryOrders.length || 0} DELIVERIES</Badge>
          </div>
        </div>
      </motion.div>

      {deliveryOrders.length === 0 ? (
        <Card className="rounded-[2rem] p-12 text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No delivery requests</h3>
          <p className="text-sm text-gray-500 mt-1">Delivery orders placed by customers will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {deliveryOrders.map(o => (
            <Card key={o.id} className="rounded-[1.75rem] p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">{o.orderNumber || o.id}</h4>
                    <Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'} className="text-[9px] font-black uppercase">{o.status.replace('_', ' ')}</Badge>
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Bike className="w-3 h-3 text-amber-300" /> Dispatch Fleet
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Platform Riders</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Verified dispatch riders partnered with OmniMarket</p>
            </div>
            <Badge className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/15">{riders.length} RIDERS</Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {riders.length === 0 ? (
          <Card className="rounded-[2rem] p-12 text-center sm:col-span-2 lg:col-span-3">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No registered riders</h3>
            <p className="text-sm text-gray-500 mt-1">Riders join the platform after admin approval.</p>
          </Card>
        ) : riders.map(r => (
          <Card key={r.id} className="rounded-[2rem] p-6">
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
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-amber-300" /> Reviews
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Customer Reviews</h1>
              <p className="text-sm text-slate-300 font-medium mt-1">Ratings and feedback left for your restaurant</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-3xl font-black leading-none text-amber-300">{avgRating ? avgRating.toFixed(1) : '—'}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300/80 mt-1">{myReviews.length} REVIEWS</p>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn("w-4 h-4", s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-white/20")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {myReviews.length === 0 ? (
        <Card className="rounded-[2rem] p-12 text-center">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reviews yet</h3>
          <p className="text-sm text-gray-500 mt-1">Customer ratings will appear here after orders are completed.</p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="rounded-[2rem] p-8 text-center lg:col-span-1">
            <p className="text-6xl font-black text-amber-500">{avgRating.toFixed(1)}</p>
            <div className="flex justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn("w-5 h-5", s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-slate-700")} />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 font-bold">{myReviews.length} total reviews</p>
            <div className="mt-6 space-y-2 text-left">
              {distribution.map(d => (
                <div key={d.star} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-3">{d.star}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-6 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </Card>
          <div className="lg:col-span-2 space-y-3">
            {myReviews.map(r => (
              <Card key={r.id} className="rounded-[1.75rem] p-6">
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
                      <Star key={s} className={cn("w-4 h-4", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-slate-700")} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{r.comment}</p>
                {r.reply && (
                  <div className="mt-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-200">
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

// ============================================================
// SUBSCRIPTION
// ============================================================
const VENDOR_PLANS = [
  {
    id: 'Starter',
    price: 0,
    period: '/month',
    tagline: 'Free forever. Perfect for new restaurants finding their feet.',
    perks: ['Unlimited menu items', '2% per-order commission', 'Standard support', 'Basic analytics'],
    cta: 'Current Plan',
  },
  {
    id: 'Standard',
    price: 99,
    period: '/month',
    icon: Crown,
    popular: true,
    tagline: 'Best value for growing kitchens that deliver daily.',
    perks: ['0% commission on all orders', 'Priority rider dispatch', 'Designated account manager', 'Advanced analytics + reports', 'Promotion toolkit'],
    cta: 'Upgrade to Standard',
  },
  {
    id: 'Enterprise',
    price: 249,
    period: '/month',
    icon: Gem,
    tagline: 'For multi-brand kitchens and high-volume operations.',
    perks: ['0% commission on all orders', 'Multiple staff accounts', 'Custom branding & API access', '24/7 dedicated support', 'On-site hardware setup'],
    cta: 'Upgrade to Enterprise',
  },
];

export function VendorSubscriptionPage() {
  const { showToast } = useApp();
  const { vendorId } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(
    () => localStorage.getItem(`omnimarket_vendor_plan_${vendorId}`) || 'Starter'
  );
  const current = VENDOR_PLANS.find(p => p.id === currentPlan)!;
  const nextBilling = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  const handleSelect = (planId: string) => {
    localStorage.setItem(`omnimarket_vendor_plan_${vendorId}`, planId);
    setCurrentPlan(planId);
    const plan = VENDOR_PLANS.find(p => p.id === planId)!;
    showToast('Plan Updated', planId === 'Starter' ? 'You are now on the free Starter plan.' : `You are now on the ${planId} plan — billed ${plan.period === '/month' ? 'monthly' : 'yearly'}.`);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
              <Crown className="w-4 h-4 text-amber-300" /> Your Plan
            </div>
            <h1 className="text-3xl font-black">{current.id}</h1>
            <p className="text-sm text-slate-300 font-medium max-w-lg">{current.tagline}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center min-w-[190px] border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Next Billing</p>
            <p className="text-2xl font-black mt-1 flex items-center justify-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-300" /> {current.price === 0 ? 'Never' : nextBilling}
            </p>
            {current.price > 0 && (
              <p className="text-[10px] text-slate-300 mt-1">GHS {current.price}{current.period} · auto-renew</p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {VENDOR_PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={cn(
                'rounded-[2rem] p-8 flex flex-col relative border shadow-sm transition-all',
                plan.popular ? 'bg-white dark:bg-slate-900 border-violet-300 dark:border-violet-700 shadow-violet-500/20 ring-2 ring-violet-500/20' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800',
                !isCurrent && 'hover:shadow-xl'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                  Most Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" /> Current
                </span>
              )}

              {plan.icon && (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 flex items-center justify-center text-violet-600 dark:text-violet-300 mb-5">
                  <plan.icon className="w-7 h-7" />
                </div>
              )}

              <h3 className="text-lg font-black text-gray-900 dark:text-white">{plan.id}</h3>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-black text-gray-900 dark:text-white">GHS {plan.price}</span>
                <span className="text-xs font-bold text-gray-400 mb-1.5">{plan.period}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">{plan.tagline}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.perks.map(perk => (
                  <li key={perk} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                  'w-full h-12 rounded-2xl mt-8 font-black text-xs shadow-lg',
                  isCurrent
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-default'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-violet-500/20'
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
            <h3 className="text-base font-black text-gray-900 dark:text-white">Why upgrade?</h3>
            <p className="text-xs text-gray-500 font-medium">Subscription tiers remove per-order commission and unlock delivery tools.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: '0% Commission', desc: 'Keep 100% of every order once on a paid plan.', icon: DollarSign },
            { title: 'Priority Dispatch', desc: 'Paid plans get first claim on nearby riders during peak.', icon: Bike },
            { title: 'Marketing Boosts', desc: 'Promotions and featured slots rank higher in the app.', icon: Megaphone },
          ].map(f => (
            <div key={f.title} className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
              <f.icon className="w-5 h-5 text-violet-500 mb-3" />
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

