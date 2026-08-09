import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, TrendingUp, Star, Package, Users,
  BarChart3, Wallet, Bell, MessageSquare, Truck, Plus, Edit3, Trash2,
  Search, Filter, MoreHorizontal, Clock, CheckCircle, XCircle,
  Zap, AlertTriangle, ChefHat, Activity, ArrowRight, Printer,
  Pause, Play
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';
import { getVendorOperationalStatus } from '@/src/lib/vendor-utils';

export function VendorDashboardPage() {
  const navigate = useNavigate();
  const { user, vendorId } = useAuth();
  const {
    orders,
    products,
    formatPrice,
    vendors,
    toggleKitchenStatus,
    vendorDashboard,
    showToast,
    isLoading
  } = useApp();

  // Strict vendor isolation: only show data for the authenticated vendor
  const currentVendor = useMemo(() => {
    return vendors.find(v => v.id === vendorId);
  }, [vendors, vendorId]);

  const vendorOrders = useMemo(() => orders.filter(o => o.vendorId === vendorId), [orders, vendorId]);
  const vendorProducts = useMemo(() => products.filter(p => p.vendorId === vendorId), [products, vendorId]);

  const todayCompleted = useMemo(() =>
    vendorOrders.filter(o =>
      new Date(o.createdAt).toDateString() === new Date().toDateString() &&
      ['delivered', 'completed'].includes(o.status)
    ).length, [vendorOrders]);

  const productStats = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>();
    vendorOrders.forEach(o => {
      (o.items || []).forEach((i: any) => {
        const cur = map.get(i.productId) || { orders: 0, revenue: 0 };
        cur.orders += Number(i.quantity) || 0;
        cur.revenue += (Number(i.price) || 0) * (Number(i.quantity) || 0);
        map.set(i.productId, cur);
      });
    });
    return map;
  }, [vendorOrders]);

  const stats = useMemo(() => {
    if (!currentVendor) return [];

    // Use live data from vendorDashboard if available, fallback to basic logic
    const todaySales = vendorDashboard?.revenue?.today ?? vendorOrders.filter(o =>
      new Date(o.createdAt).toDateString() === new Date().toDateString() &&
      o.status !== 'Cancelled'
    ).reduce((sum, o) => sum + o.totalAmount, 0);

    const activeOrdersCount = vendorDashboard?.todayOrders?.active ?? vendorOrders.filter(o =>
      ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.status)
    ).length;

    const totalRevenue = vendorDashboard?.revenue?.total ?? currentVendor.totalSales ?? 0;
    const avgRating = vendorDashboard?.reviews?.rating ?? currentVendor.rating ?? 0;

    return [
      { label: "Today's Sales", value: formatPrice(todaySales), change: vendorDashboard?.revenue?.todayChange ?? `${todayCompleted} delivered today`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
      { label: 'Active Orders', value: activeOrdersCount.toString(), change: 'Live Tracking', icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
      { label: 'Total Revenue', value: formatPrice(totalRevenue), change: vendorDashboard?.revenue?.totalChange ?? `${totalRevenue > 0 ? 'Live' : 'No sales yet'}`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
      { label: 'Avg. Rating', value: avgRating.toString(), change: `${vendorDashboard?.reviews?.count ?? currentVendor.totalReviews ?? 0} reviews`, icon: Star, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    ];
  }, [vendorOrders, currentVendor, formatPrice, vendorDashboard, todayCompleted]);

  if (isLoading || !currentVendor) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>;
  }

  const liveOrders = vendorOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.status)).slice(0, 5);
  const bestSellers = [...vendorProducts].sort((a, b) => (productStats.get(b.id)?.revenue || 0) - (productStats.get(a.id)?.revenue || 0)).slice(0, 4);

  const handlePauseOrders = () => {
    toggleKitchenStatus(currentVendor.id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <section className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-violet-500 to-purple-500 p-8 text-white shadow-xl shadow-purple-500/20"
        >
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-heading font-black">Welcome back, {currentVendor.name}</h1>
                <p className="text-violet-100 font-medium">Your kitchen is currently <span className="font-black underline">{getVendorOperationalStatus(currentVendor)}</span> for orders.</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <ChefHat className="w-5 h-5 text-purple-200" />
                <div className="text-xs">
                  <p className="font-bold">Restaurant Online</p>
                  <p className="opacity-80">Ready for Orders</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 rounded-xl font-bold px-6" onClick={() => navigate('/restaurant/menu')}>
                <Plus className="w-4 h-4 mr-2" /> Add New Meal
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "rounded-xl border border-white/20 font-bold backdrop-blur-sm",
                  currentVendor.isKitchenOpen ? "bg-rose-500/20 hover:bg-rose-500/30 text-white" : "bg-emerald-500/20 hover:bg-emerald-500/30 text-white"
                )}
                onClick={handlePauseOrders}
              >
                {currentVendor.isKitchenOpen ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {currentVendor.isKitchenOpen ? 'Pause Kitchen' : 'Resume Kitchen'}
              </Button>
              <Button variant="ghost" className="rounded-xl border border-white/20 font-bold backdrop-blur-sm hover:bg-white/10" onClick={() => showToast('Printing...', 'Generating daily sales report.')}>
                <Printer className="w-4 h-4 mr-2" /> Daily Report
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Wallet Quick Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-xl flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Restaurant Wallet</span>
              <Wallet className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{formatPrice(currentVendor.totalSales * 0.9)}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter font-bold">Available for withdrawal (After Commission)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button variant="outline" className="rounded-xl text-[10px] font-black py-5 border-gray-200" onClick={() => navigate('/restaurant/wallet')}>
              HISTORY
            </Button>
            <Button className="rounded-xl text-[10px] font-black py-5 bg-purple-500 hover:bg-purple-600 shadow-md shadow-purple-500/20" onClick={() => navigate('/restaurant/withdrawals')}>
              WITHDRAW
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <Badge variant="ghost" className="text-[10px] text-emerald-500 font-bold">{s.change}</Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Live Orders Section */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-black text-gray-900 dark:text-white">Active Orders</h2>
              <p className="text-sm text-gray-500">Live feed of incoming and preparing meals</p>
            </div>
            <Button variant="ghost" className="text-purple-600 font-bold" onClick={() => navigate('/restaurant/orders')}>
              View Order Manager <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {liveOrders.length === 0 ? (
            <Card className="rounded-[2.5rem] border-dashed border-2 py-16 text-center bg-gray-50/50 dark:bg-slate-900/50">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white">No active orders right now</h3>
              <p className="text-xs text-gray-500 mt-1">Orders from customers will appear here in real-time.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {liveOrders.map(order => (
                <motion.div
                  key={order.id} layout
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center gap-5 group"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-colors",
                    order.status === 'Order Received' ? "bg-amber-50 text-amber-600" :
                    order.status === 'Preparing Food' ? "bg-blue-50 text-blue-600" :
                    "bg-emerald-50 text-emerald-600"
                  )}>
                    {(order.customerName || 'C').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">{order.customerName}</h4>
                      <Badge variant={order.status === 'Order Received' ? 'warning' : 'info'} className="text-[9px] px-1.5 py-0">
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-medium line-clamp-1">
                      {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-500" /> {order.id}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-2">
                    <p className="text-lg font-black text-gray-900 dark:text-white">{formatPrice(order.totalAmount)}</p>
                    <Button size="sm" className="rounded-xl h-9 px-4 bg-purple-500 hover:bg-purple-600 font-black text-[9px] uppercase tracking-widest" onClick={() => navigate(`/restaurant/orders`)}>
                      MANAGE
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Kitchen Controls */}
          <section className="space-y-4">
            <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white">Kitchen Status</h3>
            <Card className="rounded-[2rem] p-6 space-y-4 border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden relative">
              {(() => {
                const status = getVendorOperationalStatus(currentVendor);
                return (
                  <>
                    <div className={cn(
                      "absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-[9px] font-black uppercase tracking-widest",
                      status === 'OPEN' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {status.replace('_', ' ')}
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <div className={cn("p-4 rounded-[1.5rem] shadow-sm", status === 'OPEN' ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500")}>
                        <ChefHat className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Kitchen Mode</p>
                        <p className="text-xs text-gray-500">{status === 'OPEN' ? 'Customers can order now' : 'Ordering is limited'}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
              <Button
                className={cn(
                  "w-full rounded-2xl h-14 font-black text-xs shadow-lg transition-all",
                  currentVendor.isKitchenOpen ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                )}
                onClick={handlePauseOrders}
              >
                {currentVendor.isKitchenOpen ? 'PAUSE ALL ORDERS' : 'OPEN KITCHEN NOW'}
              </Button>
            </Card>
          </section>

          {/* Low Stock Alert */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white">Low Stock</h3>
              <Badge variant="danger">{vendorProducts.filter(p => p.stock < 10).length} ALERTS</Badge>
            </div>
            <div className="space-y-3">
              {vendorProducts.filter(p => p.stock < 10).map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-rose-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-rose-500 transition-colors">{p.title}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{p.stock} units left</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50" onClick={() => navigate('/restaurant/menu')}>
                    UPDATE
                  </Button>
                </div>
              ))}
              {vendorProducts.filter(p => p.stock < 10).length === 0 && (
                <p className="text-xs text-center py-6 text-gray-400 font-bold">Menu is fully stocked</p>
              )}
            </div>
          </section>

          {/* Today's Insights Widget */}
          <section className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10 space-y-6">
              <div className="space-y-2">
                <Badge className="bg-white/20 text-white border-white/20 uppercase tracking-[0.2em] text-[9px]">Growth Tip</Badge>
                <h3 className="text-2xl font-black leading-tight">Your restaurant is trending in {currentVendor.address.split(',').pop() || 'your area'}!</h3>
                <p className="text-xs text-purple-100 opacity-90 leading-relaxed">Consider running a Happy Hour promotion to increase afternoon sales by up to 25%.</p>
              </div>
              <Button size="lg" className="w-full bg-white text-purple-600 hover:bg-purple-50 font-black rounded-2xl shadow-xl shadow-black/20" onClick={() => navigate('/restaurant/promotions')}>
                Launch Promotion
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Popular Items Table */}
      <section className="space-y-6 pt-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-heading font-black text-gray-900 dark:text-white">Most Popular Meals</h2>
          <Button variant="ghost" className="text-gray-500 font-bold" onClick={() => navigate('/restaurant/analytics')}>
            Full Analytics <BarChart3 className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="px-8 py-5">Meal Name</th>
                  <th className="px-8 py-5">Orders</th>
                  <th className="px-8 py-5">Revenue</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {bestSellers.map(meal => (
                  <tr key={meal.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <img src={meal.images[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{meal.title}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{meal.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-gray-700 dark:text-gray-300">{productStats.get(meal.id)?.orders || 0}</td>
                    <td className="px-8 py-5 font-black text-emerald-600">{formatPrice(productStats.get(meal.id)?.revenue || 0)}</td>
                    <td className="px-8 py-5">
                      <Badge variant={meal.stock > 0 ? 'success' : 'danger'} className="text-[9px] font-black px-2 py-0.5 uppercase tracking-widest">
                        {meal.stock > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                      </Badge>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Button variant="ghost" size="sm" className="rounded-xl text-purple-600 font-bold hover:bg-purple-50" onClick={() => navigate('/restaurant/menu')}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

