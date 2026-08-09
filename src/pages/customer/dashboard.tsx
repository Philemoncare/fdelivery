import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Clock, Star, Heart, Wallet, TrendingUp, MapPin, Gift,
  Truck, MessageSquare, Bell, Search, Utensils, History, CreditCard,
  ArrowRight, Phone, MessageCircle, XCircle, Zap, CloudSun, Store, Plus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    customerProfile,
    formatPrice,
    orders,
    vendors,
    products,
    searchQuery,
    setSearchQuery,
    updateOrderStatus,
    isLoading,
    currentAddressName
  } = useApp();

  if (isLoading || !customerProfile) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  const activeOrder = orders.find(o => ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status));
  const recentOrders = orders.filter(o => ['delivered', 'completed', 'cancelled'].includes(o.status)).slice(0, 3);
  const recommendedMeals = products.filter(p => p.isPopular || p.isTrending).slice(0, 8);
  const nearbyVendors = vendors.slice(0, 4);

  const firstName = user?.firstName || customerProfile?.name?.split(' ')[0] || 'Customer';
  const fullName = customerProfile?.name || user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Customer');
  const currentAddress = customerProfile?.addresses?.find(a => a.isDefault)?.address || currentAddressName || 'Takoradi';

  const handleCancelOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'cancelled');
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Welcome Section */}
      <section className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 sm:p-10 text-white shadow-xl shadow-emerald-500/20"
        >
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-4xl font-heading font-black leading-tight tracking-tight">Good Day, {firstName}</h1>
                <div className="flex items-center gap-2 text-emerald-50 text-xs sm:text-sm">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium opacity-90 truncate max-w-[200px] sm:max-w-none">Delivery to: {currentAddress}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <CloudSun className="w-5 h-5 text-amber-300" />
                <div className="text-[10px] leading-tight uppercase font-black tracking-widest">
                  <p>Weather</p>
                  <p className="opacity-60">Takoradi</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-200 group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  placeholder="Search Meals or Restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/products')}
                  className="w-full bg-white/15 border border-white/20 rounded-2xl pl-11 pr-4 py-4 text-sm placeholder:text-emerald-100 focus:outline-none focus:bg-white/20 transition-all shadow-inner font-bold"
                />
              </div>
              <Button className="bg-white text-emerald-600 hover:bg-emerald-50 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all" onClick={() => navigate('/products')}>
                Order Meal Now
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Wallet Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">OmniWallet</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{formatPrice(customerProfile.walletBalance)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="success" className="text-[9px] font-black uppercase tracking-widest">+{customerProfile.loyaltyPoints} POINTS</Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-8">
            <Button variant="outline" className="rounded-xl text-[10px] font-black py-6 border-gray-100 dark:border-slate-800 uppercase tracking-widest" onClick={() => navigate('/customer/wallet')}>
              HISTORY
            </Button>
            <Button className="rounded-xl text-[10px] font-black py-6 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-white" onClick={() => navigate('/customer/wallet')}>
              TOP UP
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Quick Actions - Scrollable on mobile */}
      <section className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible sm:pb-0">
        {[
          { label: 'Order Food', icon: Utensils, path: '/products', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Restaurants', icon: Store, path: '/vendors', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Track Order', icon: Truck, path: '/track-order', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
          { label: 'Order History', icon: History, path: '/customer/orders', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { label: 'My Wallet', icon: Wallet, path: '/customer/wallet', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40' },
          { label: 'Support', icon: Phone, path: '/customer/support', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/40' },
          { label: 'Coupons', icon: Gift, path: '/customer/coupons', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/40' },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all min-w-[100px] sm:min-w-0"
          >
            <div className={`p-3.5 rounded-2xl ${action.bg}`}>
              <action.icon className={`w-5 h-5 ${action.color}`} />
            </div>
            <span className="text-[9px] font-black text-gray-500 dark:text-gray-300 text-center leading-tight uppercase tracking-widest whitespace-nowrap">
              {action.label}
            </span>
          </motion.button>
        ))}
      </section>

      {/* Active Order Card */}
      {activeOrder ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 overflow-hidden rounded-[2.5rem]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/50 dark:border-emerald-900/50 pb-4 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-lg">Active Order from {activeOrder.vendorName}</CardTitle>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    {activeOrder.items.map(i => `${i.quantity}x ${i.productName || 'Meal'}`).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="success" className="animate-pulse py-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {activeOrder.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 grid md:grid-cols-4 gap-8">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned Rider</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={activeOrder.dispatchRider?.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{activeOrder.dispatchRider?.name}</p>
                    <p className="text-[10px] text-gray-500">{activeOrder.dispatchRider?.vehicleType} | {activeOrder.dispatchRider?.vehicleNumber}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estimated Arrival</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <Clock className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{activeOrder.estimatedDeliveryTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" className="flex-1 rounded-xl h-12 font-bold" onClick={() => window.open(`tel:${activeOrder.dispatchRider?.phone}`)}>
                   <Phone className="w-4 h-4 mr-2" /> Call Rider
                 </Button>
                 <Button variant="outline" size="sm" className="flex-1 rounded-xl h-12 font-bold" onClick={() => navigate('/customer/messages')}>
                   <MessageCircle className="w-4 h-4 mr-2" /> Chat
                 </Button>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="rounded-xl h-12 font-bold bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" onClick={() => navigate('/track-order')}>
                  Track Live Map
                </Button>
                {activeOrder.status === 'Order Received' && (
                  <Button variant="ghost" className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 h-8" onClick={() => handleCancelOrder(activeOrder.id)}>
                    Cancel Order
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card className="border-dashed border-2 border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 rounded-[2.5rem]">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-gray-300 shadow-inner">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">You don't have any active orders.</h3>
              <p className="text-sm text-gray-500 mt-1">Ready for some delicious Ghanaian Jollof or Banku?</p>
            </div>
            <Button variant="brand" className="rounded-2xl px-10 py-6 font-bold shadow-xl" onClick={() => navigate('/products')}>
              Order Food Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommended Meals */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-black text-gray-900 dark:text-white">Recommended for You</h2>
            <p className="text-sm text-gray-500">Based on your taste and popular meals in Takoradi</p>
          </div>
          <Button variant="ghost" size="sm" className="text-emerald-600 font-bold" onClick={() => navigate('/products')}>
            See All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {recommendedMeals.map((meal) => (
            <motion.div
              key={meal.id} whileHover={{ y: -8 }}
              className="group bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all cursor-pointer"
              onClick={() => navigate(`/product/${meal.id}`)}
            >
              <div className="aspect-square overflow-hidden relative">
                <img src={meal.images[0]} alt={meal.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button className="absolute top-4 right-4 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-rose-500 shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-2">
                    {meal.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" /> {meal.rating}
                  </div>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 leading-tight group-hover:text-emerald-500 transition-colors">{meal.title}</h4>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-lg font-black text-emerald-600">{formatPrice(meal.price)}</p>
                  <Button size="sm" className="w-8 h-8 rounded-xl p-0 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-emerald-500 hover:text-white transition-all">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Nearby Restaurants & Offers */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-black text-gray-900 dark:text-white">Restaurants Near {currentAddress.split(',')[0]}</h2>
              <p className="text-sm text-gray-500">Top-rated kitchens delivering to your area</p>
            </div>
            <Button variant="ghost" size="sm" className="text-emerald-600 font-bold" onClick={() => navigate('/vendors')}>
              View All
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {nearbyVendors.map(vendor => (
              <motion.div
                key={vendor.id} whileHover={{ y: -4 }}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => navigate(`/vendors/${vendor.id}`)}
              >
                <div className="flex gap-4">
                  <div className="relative">
                    <img src={vendor.logo} alt={vendor.name} className="w-20 h-20 rounded-2xl object-cover shadow-inner group-hover:scale-105 transition-transform" />
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">{vendor.name}</h3>
                      <Badge variant="success" className="text-[8px] px-1 py-0 font-black">OPEN</Badge>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{vendor.category}</p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery</span>
                        <span className="text-xs font-black text-gray-900 dark:text-white">{vendor.deliveryTime}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fee</span>
                        <span className="text-xs font-black text-emerald-600">GHS 12.00</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4 rounded-xl font-bold bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-emerald-500 hover:text-white group-hover:shadow-lg transition-all">
                  View Menu
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Saved Addresses & Promo */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-heading font-black text-gray-900 dark:text-white">Saved Locations</h2>
            <div className="space-y-3">
              {customerProfile.addresses.map(addr => (
                <div key={addr.id} className="p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:border-emerald-500/30 hover:bg-emerald-50/10 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 group-hover:text-emerald-500 group-hover:bg-white transition-all shadow-sm">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{addr.title}</p>
                      {addr.isDefault && <Badge className="text-[8px] bg-emerald-500/10 text-emerald-600 border-none">DEFAULT</Badge>}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate leading-relaxed">{addr.address}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full rounded-2xl border-dashed py-7 text-xs font-bold text-gray-500 hover:text-emerald-600 hover:border-emerald-500/40 transition-all" onClick={() => navigate('/customer/addresses')}>
                <Plus className="w-4 h-4 mr-2" /> Add New Address
              </Button>
            </div>
          </section>

          {/* Popular Deals Widget */}
          <section className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10 space-y-4">
              <Badge className="bg-white/20 text-white border-white/20 font-black uppercase tracking-widest text-[9px]">Today's Offers</Badge>
              <h3 className="text-2xl font-black leading-tight">Free Delivery on your first order!</h3>
              <p className="text-xs text-rose-100 opacity-90 leading-relaxed">Enjoy zero delivery fees from top kitchens in your area. Use code: <span className="font-mono font-black text-white">AKWAABA</span></p>
              <Button size="lg" className="w-full bg-white text-rose-600 hover:bg-rose-50 font-black rounded-2xl mt-4 shadow-xl">
                Claim Offer
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Recent Orders Section */}
      <section className="space-y-6 pt-10 border-t border-gray-100 dark:border-slate-800">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-heading font-black text-gray-900 dark:text-white">Your Recent Orders</h2>
          <p className="text-sm text-gray-500">Quickly reorder your favorite meals</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentOrders.map(order => (
            <Card key={order.id} className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center font-black text-sm text-emerald-600 shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        {(order.vendorName || 'V').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold group-hover:text-emerald-500 transition-colors">{order.vendorName}</p>
                        <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant={order.status === 'Cancelled' ? 'danger' : 'default'} className="text-[8px] font-black uppercase tracking-widest">
                      {order.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium line-clamp-1">
                      {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                    </p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{formatPrice(order.totalAmount)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-bold h-10">View Receipt</Button>
                    <Button size="sm" variant="brand" className="rounded-xl text-[10px] font-bold h-10 shadow-md">Reorder</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Button variant="ghost" className="text-gray-500 font-bold hover:text-emerald-600" onClick={() => navigate('/customer/orders')}>
            View Complete Order History <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
}
