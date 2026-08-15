import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, TrendingUp, Star, Package, Users,
  BarChart3, Wallet, Bell, Truck, Plus, Printer,
  Zap, AlertTriangle, ChefHat, Activity, ArrowRight,
  Pause, Play, Crown, Clock, CheckCircle, MessageSquare, Phone,
  Fingerprint, LayoutGrid, Megaphone, Boxes, LifeBuoy
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn, getInitials } from '@/src/lib/utils';
import { getVendorOperationalStatus } from '@/src/lib/vendor-utils';
import { VendorSubscriptionStatus } from '@/src/components/vendor/VendorSubscriptionStatus';
import { APP_VERSION_LABEL } from '@/src/lib/app-version';

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

  const [showReport, setShowReport] = useState(false);

  if (isLoading || !currentVendor) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>;
  }

  const liveOrders = vendorOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.status)).slice(0, 5);
  const bestSellers = [...vendorProducts].sort((a, b) => (productStats.get(b.id)?.revenue || 0) - (productStats.get(a.id)?.revenue || 0)).slice(0, 4);
  const lowStockItems = vendorProducts.filter(p => p.stock < 10);

  const handlePauseOrders = async () => {
    try {
      await toggleKitchenStatus(currentVendor.id);
      showToast('Kitchen Updated', currentVendor.isKitchenOpen
        ? 'Kitchen paused — customers will see your restaurant as closed.'
        : 'Kitchen is now open and accepting orders.');
    } catch (err) {
      showToast('Error', 'Could not update kitchen status. Please try again.', 'warning');
    }
  };

  const kitchenStatus = getVendorOperationalStatus(currentVendor);
  const walletAvailable = (currentVendor.totalSales || 0) * 0.9;
  const vendorIdChip = (vendorId || '').replace(/-/g, '').toUpperCase();

  const quickActions = [
    { label: 'Add Meal', icon: Plus, path: '/restaurant/menu', cls: 'from-violet-500 to-purple-600' },
    { label: 'Promotions', icon: Megaphone, path: '/restaurant/promotions', cls: 'from-amber-400 to-orange-600' },
    { label: 'Inventory', icon: Boxes, path: '/restaurant/inventory', cls: 'from-emerald-400 to-teal-600' },
    { label: 'Support', icon: LifeBuoy, path: '/restaurant/support', cls: 'from-rose-400 to-pink-600' },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* ============ HERO HEADER ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/20">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl" />

        {currentVendor.banner && (
          <img src={currentVendor.banner} className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-luminosity" />
        )}

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest">
                {currentVendor.category || 'Restaurant'} Vendor
              </span>
              <span className={cn('px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5', currentVendor.isKitchenOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')}>
                <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', currentVendor.isKitchenOpen ? 'bg-white' : 'bg-white/50')} />
                {currentVendor.isKitchenOpen ? 'Kitchen Open' : 'Kitchen Paused'}
              </span>
              {vendorIdChip && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-[9px] font-black tracking-widest font-mono">
                  <Fingerprint className="w-3 h-3 text-violet-300" /> VEN-{vendorIdChip.slice(0, 8)}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mt-3">
              {user?.firstName || 'Welcome'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300">·</span>
            </h1>
            <p className="text-sm text-slate-300 font-medium mt-1">
              Your kitchen is <span className="font-black text-white">{kitchenStatus}</span> for orders in Takoradi.
            </p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-200/90">
                <ChefHat className="w-4 h-4 text-violet-300" /> {currentVendor.name}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-[9px] font-black tracking-widest text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {APP_VERSION_LABEL}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <VendorSubscriptionStatus size="md" />
            <button
              onClick={handlePauseOrders}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95",
                currentVendor.isKitchenOpen
                  ? "bg-rose-500 text-white shadow-rose-500/25"
                  : "bg-emerald-500 text-white shadow-emerald-500/25"
              )}
            >
              {currentVendor.isKitchenOpen ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {currentVendor.isKitchenOpen ? 'Pause Kitchen' : 'Resume Kitchen'}
            </button>
          </div>
        </div>

        {/* Hero quick actions */}
        <div className="relative z-10 flex gap-2.5 flex-wrap mt-5">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              onClick={() => navigate(a.path)}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur hover:bg-white/20 transition-all flex-shrink-0"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.cls} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <a.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">{a.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ============ WALLET SPOTLIGHT ============ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-purple-500/20">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-100/80">Restaurant Wallet</p>
            <p className="text-4xl sm:text-5xl font-black tracking-tight mt-1">{formatPrice(walletAvailable)}</p>
            <p className="text-xs text-purple-100/80 mt-1.5 font-medium">Available for withdrawal after 10% platform commission</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest backdrop-blur">
            <Zap className="w-4 h-4 text-amber-300" /> OmniPay Secured
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur">
          {stats.map(s => (
            <div key={s.label} className="px-4 py-4 flex flex-col items-center gap-1.5">
              <s.icon className="w-4 h-4 text-amber-300" />
              <p className="text-lg sm:text-xl font-black leading-none">{s.value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-purple-100/80 text-center">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-6 flex gap-3">
          <button onClick={() => navigate('/restaurant/wallet')}
            className="flex-1 h-12 rounded-2xl bg-white/10 border border-white/15 backdrop-blur text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">
            History
          </button>
          <button onClick={() => navigate('/restaurant/withdrawals')}
            className="flex-1 h-12 rounded-2xl bg-white text-purple-700 hover:bg-purple-50 text-xs font-black uppercase tracking-widest shadow-lg shadow-black/10 transition-all">
            Withdraw
          </button>
        </div>
      </motion.div>

      {/* ============ LIVE ORDERS + RIGHT RAIL ============ */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Live Orders */}
        <Card className="lg:col-span-2 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" /> Active Orders
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="warning">{liveOrders.length} live</Badge>
              <Button variant="ghost" size="sm" className="text-violet-600 font-black text-[10px] uppercase tracking-widest" onClick={() => navigate('/restaurant/orders')}>
                Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {liveOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-gray-300">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-4">No active orders right now</p>
                <p className="text-xs text-gray-400 mt-1">Orders from customers will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {liveOrders.map(order => (
                  <motion.div key={order.id} whileHover={{ x: 4 }}
                    className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-inner flex-shrink-0",
                        order.status === 'pending' ? "bg-amber-100 text-amber-600" :
                        order.status === 'preparing' ? "bg-blue-100 text-blue-600" :
                        order.status === 'ready_for_pickup' ? "bg-emerald-100 text-emerald-600" :
                        "bg-violet-100 text-violet-600"
                      )}>
                        {getInitials(order.customerName || 'C')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{order.customerName}</p>
                          <Badge variant={order.status === 'pending' ? 'warning' : 'info'} className="text-[8px] px-1.5 py-0 uppercase">
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 font-medium line-clamp-1">{order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {order.deliveryMethod}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                      <p className="text-base font-black text-gray-900 dark:text-white">{formatPrice(order.totalAmount)}</p>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="p-2 h-8 w-8" onClick={() => window.open(`tel:${order.customerPhone}`)}><Phone className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="p-2 h-8 w-8" onClick={() => navigate('/restaurant/messages')}><MessageSquare className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Kitchen Controls */}
          <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", currentVendor.isKitchenOpen ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">Kitchen Status</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{kitchenStatus}</p>
                  </div>
                </div>
                <span className={cn("px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest", currentVendor.isKitchenOpen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                  {currentVendor.isKitchenOpen ? 'OPEN' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-3">{currentVendor.isKitchenOpen ? 'Customers can order now.' : 'Ordering is paused.'}</p>
              <button onClick={handlePauseOrders}
                className={cn("w-full h-12 rounded-2xl mt-4 font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95",
                  currentVendor.isKitchenOpen ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20")}>
                {currentVendor.isKitchenOpen ? 'Pause All Orders' : 'Open Kitchen Now'}
              </button>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Low Stock
                </span>
              </CardTitle>
              <Badge variant={lowStockItems.length > 0 ? 'danger' : 'success'}>{lowStockItems.length} alert{lowStockItems.length === 1 ? '' : 's'}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-rose-500 flex-shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 dark:text-white truncate">{p.title}</p>
                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">{p.stock} units left</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-violet-600" onClick={() => navigate('/restaurant/menu')}>
                      Restock
                    </Button>
                  </div>
                ))}
                {lowStockItems.length === 0 && (
                  <p className="text-xs text-center py-6 text-gray-400 font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Menu is fully stocked
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Growth tip */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white shadow-xl shadow-purple-500/20">
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-white/20 uppercase tracking-[0.2em] text-[9px]">Growth Tip</Badge>
              </div>
              <h3 className="text-lg font-black leading-tight">Your restaurant is trending in {currentVendor.address?.split(',').pop() || 'your area'}!</h3>
              <p className="text-xs text-purple-100/90 leading-relaxed">Run a Happy Hour promotion to boost afternoon sales by up to 25%.</p>
              <Button className="w-full bg-white text-purple-600 hover:bg-purple-50 font-black rounded-2xl h-12 text-xs shadow-xl" onClick={() => navigate('/restaurant/promotions')}>
                Launch Promotion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MOST POPULAR MEALS ============ */}
      <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Most Popular Meals
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-gray-500 font-black text-[10px] uppercase tracking-widest" onClick={() => navigate('/restaurant/analytics')}>
            Full Analytics <BarChart3 className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="px-6 py-4">Meal Name</th>
                  <th className="px-6 py-4">Orders</th>
                  <th className="px-6 py-4">Revenue</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {bestSellers.map(meal => (
                  <tr key={meal.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={meal.images[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{meal.title}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{meal.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{productStats.get(meal.id)?.orders || 0}</td>
                    <td className="px-6 py-4 font-black text-emerald-600">{formatPrice(productStats.get(meal.id)?.revenue || 0)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={meal.stock > 0 ? 'success' : 'danger'} className="text-[9px] font-black px-2 py-0.5 uppercase tracking-widest">
                        {meal.stock > 0 ? 'AVAILABLE' : 'OUT OF STOCK'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="rounded-xl text-violet-600 font-bold hover:bg-violet-50" onClick={() => navigate('/restaurant/menu')}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Daily Report Modal */}
      <AnimatePresence>
        {showReport && (() => {
          const today = new Date().toDateString();
          const todays = vendorOrders.filter(o => new Date(o.createdAt).toDateString() === today);
          const revenue = todays.filter(o => !['cancelled', 'Cancelled'].includes(o.status)).reduce((s, o) => s + (o.totalAmount || 0), 0);
          const delivered = todays.filter(o => ['delivered', 'completed', 'Delivered'].includes(o.status));
          return (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
                <div className="om-receipt bg-white text-gray-900 p-6 font-mono text-sm">
                  <div className="text-center pb-4 border-b-2 border-dashed border-gray-300">
                    <p className="text-lg font-black tracking-widest">OMNIMARKET</p>
                    <p className="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Daily Sales Report</p>
                    <p className="text-[11px] font-bold text-gray-700 mt-2">{currentVendor.name}</p>
                    <p className="text-[10px] text-gray-500">{new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>

                  <div className="py-4 space-y-2 text-[11px] border-b border-dashed border-gray-300">
                    <div className="flex justify-between"><span className="text-gray-500">Orders Received</span><span className="font-bold">{todays.length}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Delivered</span><span className="font-bold">{delivered.length}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">In Progress</span><span className="font-bold">{todays.filter(o => !['delivered', 'completed', 'cancelled', 'Cancelled', 'Delivered'].includes(o.status)).length}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Daily Revenue</span><span className="font-bold text-emerald-600">{formatPrice(revenue)}</span></div>
                    {todays.length > 0 && (
                      <>
                        <p className="font-black uppercase tracking-wider text-gray-700 pt-3 pb-1">Orders</p>
                        {todays.slice(0, 20).map(o => (
                          <div key={o.id} className="flex justify-between gap-2">
                            <span className="flex-1 truncate">#{o.id.slice(0, 8)} · {o.customerName}</span>
                            <span className="font-bold whitespace-nowrap">{formatPrice(o.totalAmount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-300 text-sm font-black">
                      <span>NET TOTAL</span>
                      <span>{formatPrice(revenue)}</span>
                    </div>
                  </div>

                  <div className="text-center pt-3 text-[9px] text-gray-400">Generated by OmniMarket Vendor Portal</div>
                </div>
                <div className="om-receipt-nobutton flex gap-3 p-5 bg-gray-50 dark:bg-slate-800/60">
                  <button onClick={() => setShowReport(false)} className="flex-1 h-12 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                    Close
                  </button>
                  <button onClick={() => window.print()} className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                    <Printer className="w-4 h-4" /> Print / Save PDF
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
