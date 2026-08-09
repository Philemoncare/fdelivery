import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, ShoppingCart, Heart, Wallet, MessageSquare, MapPin,
  Settings, Bell, UserRound, Truck, Star, Gift, CreditCard, FileText,
  UtensilsCrossed, Store, TicketPercent, ChevronRight, Search,
  History, Plus, MessageCircle, Phone, Info, Trash2, ArrowRight,
  CheckCircle2, Clock, XCircle, MoreVertical, Download, LifeBuoy, AlertCircle,
  Sun, Moon, Smartphone, X, Send
} from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { MessagingService } from '@/src/services/api';
import { TAKORADI_LOCATIONS } from '@/src/lib/locations';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { AdminService, InteractionService, OrderService } from '@/src/services/api';

// ============================================================
// MY ORDERS
// ============================================================
export function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { orders, formatPrice, updateOrderStatus } = useApp();
  const [activeTab, setActiveTab] = useState<'Active' | 'Preparing' | 'On the Way' | 'Delivered' | 'Cancelled'>('Active');

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'Active') return ['pending', 'confirmed'].includes(o.status);
    if (activeTab === 'Preparing') return ['preparing', 'ready_for_pickup'].includes(o.status);
    if (activeTab === 'On the Way') return ['rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status);
    if (activeTab === 'Delivered') return ['delivered', 'completed'].includes(o.status);
    return o.status === 'cancelled';
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Food Orders</h1>
          <p className="text-sm text-gray-500">Track your delicious meals from Takoradi's best kitchens</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto scrollbar-none shadow-inner">
          {['Active', 'Preparing', 'On the Way', 'Delivered', 'Cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-5 py-2.5 text-[10px] font-black rounded-xl transition-all whitespace-nowrap uppercase tracking-widest",
                activeTab === tab
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <Card className="border-dashed border-2 py-16 text-center rounded-[2.5rem] bg-gray-50/30 dark:bg-slate-900/30">
            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 shadow-sm">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">No {activeTab.toLowerCase()} orders found</h3>
            <p className="text-sm text-gray-500 mt-1">Order something tasty to get started!</p>
            <Button variant="brand" className="mt-6 rounded-2xl px-8 py-6 font-bold shadow-lg" onClick={() => navigate('/products')}>Browse Menu</Button>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden rounded-[2.5rem] border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all group">
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center font-black text-2xl text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
                        {(order.vendorName || 'V').charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">{order.vendorName || 'Restaurant'}</h3>
                          <Badge variant={order.status === 'Cancelled' ? 'danger' : 'default'} className="text-[9px] font-black py-0.5 px-2 uppercase tracking-widest">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {order.items?.map(i => `${i.quantity}x ${i.productName || 'Meal'}`).join(', ') || 'No items'}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-400 pt-2 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> {order.id}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {order.customerAddress}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end justify-center">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] mb-1">Order Total</p>
                      <p className="text-3xl font-black text-emerald-600">{formatPrice(order.totalAmount)}</p>
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1 mt-1">
                        <CreditCard className="w-3 h-3" /> Paid via {order.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {order.dispatchRider && (
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-4 border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={order.dispatchRider.avatar} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Assigned Rider</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{order.dispatchRider.name} | {order.dispatchRider.vehicleNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="rounded-lg h-8 text-[10px] font-bold border-gray-200" onClick={() => navigate('/customer/messages')}><MessageCircle className="w-3 h-3 mr-1" /> Chat</Button>
                        <Button size="sm" variant="outline" className="rounded-lg h-8 text-[10px] font-bold border-gray-200" onClick={() => window.open(`tel:${order.dispatchRider?.phone}`)}><Phone className="w-3 h-3 mr-1" /> Call</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex gap-2">
                      <Button variant="ghost" className="rounded-xl text-[10px] font-bold text-gray-500 h-10 hover:bg-gray-100 dark:hover:bg-slate-800"><FileText className="w-3.5 h-3.5 mr-1.5" /> Download Invoice</Button>
                      <Button variant="ghost" className="rounded-xl text-[10px] font-bold text-gray-500 h-10 hover:bg-gray-100 dark:hover:bg-slate-800"><LifeBuoy className="w-3.5 h-3.5 mr-1.5" /> Help & Support</Button>
                    </div>
                    <div className="flex gap-3">
                      {['On the Way', 'Preparing Food', 'Order Received', 'Rider Assigned', 'Picked Up'].includes(order.status) ? (
                        <Button className="rounded-xl font-black bg-emerald-500 hover:bg-emerald-600 text-xs py-5 px-8 shadow-lg shadow-emerald-500/20" onClick={() => navigate('/track-order')}>
                          Track Live Map
                        </Button>
                      ) : (
                        <Button variant="brand" className="rounded-xl font-black text-xs py-5 px-8 shadow-lg" onClick={() => navigate('/products')}>
                          Reorder Meal
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// FAVORITES
// ============================================================
export function CustomerFavoritesPage() {
  const navigate = useNavigate();
  const { wishlist, favoriteVendors, formatPrice, addToCart, vendors } = useApp();
  const [favTab, setFavTab] = useState<'Meals' | 'Restaurants' | 'Recently Viewed'>('Meals');

  const recentlyViewed: any[] = []; // Could be implemented with local storage later

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Favorites</h1>
          <p className="text-sm text-gray-500">Your most-loved Ghanaian dishes and local kitchens in Takoradi</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
          {['Meals', 'Restaurants', 'Recently Viewed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFavTab(tab as any)}
              className={cn(
                "px-5 py-2.5 text-[10px] font-black rounded-xl transition-all whitespace-nowrap uppercase tracking-widest",
                favTab === tab
                  ? "bg-white dark:bg-slate-700 text-rose-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {favTab === 'Meals' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlist.length === 0 ? (
            <div className="col-span-full py-20 text-center rounded-[2.5rem] bg-gray-50/30 dark:bg-slate-900/30 border border-dashed border-gray-200">
              <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No favorite meals saved yet.</h3>
              <p className="text-sm text-gray-500 mt-1">Tap the heart on any meal to save it here.</p>
              <Button variant="brand" className="mt-6 rounded-xl" onClick={() => navigate('/products')}>Discover Meals</Button>
            </div>
          ) : (
            wishlist.map(meal => (
              <Card key={meal.id} className="rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all cursor-pointer border-gray-100 dark:border-slate-800" onClick={() => navigate(`/product/${meal.id}`)}>
                <div className="aspect-square relative overflow-hidden">
                  <img src={meal.images?.[0] || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 right-4">
                    <button className="p-2.5 rounded-2xl bg-white/90 shadow-xl text-rose-500"><Heart className="w-4 h-4 fill-current" /></button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">{meal.title}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{meal.vendorName}</p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-lg font-black text-emerald-600">{formatPrice(meal.price)}</p>
                    <Button size="sm" className="rounded-xl h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] px-4" onClick={(e) => { e.stopPropagation(); addToCart(meal); }}>
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : favTab === 'Restaurants' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {favoriteVendors.map(vendor => (
            <Card key={vendor.id} className="rounded-3xl overflow-hidden p-6 flex items-center gap-6 hover:shadow-xl transition-all cursor-pointer border-gray-100 dark:border-slate-800 group" onClick={() => navigate(`/vendors/${vendor.id}`)}>
              <div className="relative">
                <img src={vendor.logo} className="w-20 h-20 rounded-2xl object-cover shadow-inner group-hover:scale-105 transition-transform" />
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-md">
                   <Heart className="w-3 h-3 fill-current" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">{vendor.name}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500 font-bold pt-1">
                  <span className="flex items-center gap-1 text-amber-500"><Star className="w-3.5 h-3.5 fill-current" /> {vendor.rating}</span>
                  <span className="uppercase tracking-widest text-[9px]">{vendor.category}</span>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl font-black h-12 px-6 border-gray-100 dark:border-slate-800 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all">View Menu</Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recentlyViewed.map(v => (
             <div key={v.id} className="p-4 rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center gap-3 cursor-pointer group hover:shadow-lg transition-all" onClick={() => navigate(`/vendors/${v.id}`)}>
               <img src={v.logo} className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:scale-110 transition-transform" />
               <div>
                 <p className="text-xs font-bold text-gray-900 dark:text-white truncate w-full">{v.name}</p>
                 <p className="text-[9px] text-gray-500 uppercase tracking-tighter mt-0.5">{v.category}</p>
               </div>
             </div>
          ))}
        </div>
      )}

      {/* Recommended Section */}
      <div className="pt-10 border-t border-gray-100 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black text-gray-900 dark:text-white">Recommended for You</h3>
           <Button variant="ghost" className="text-emerald-600 font-bold text-xs" onClick={() => navigate('/products')}>Explore More</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {vendors.slice(0, 6).map(v => (
            <div key={v.id} className="p-4 rounded-3xl bg-gray-50/50 dark:bg-slate-800/30 flex flex-col items-center text-center gap-3 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-emerald-500/20 shadow-sm" onClick={() => navigate(`/vendors/${v.id}`)}>
              <img src={v.logo} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
              <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate w-full">{v.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WALLET
// ============================================================
export function CustomerWalletPage() {
  const { customerProfile, formatPrice, transactions } = useApp();

  if (!customerProfile) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">OmniWallet</h1>
          <p className="text-sm text-gray-500">Fast, secure payments for your favorite meals</p>
        </div>
        <Badge variant="success" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Secured by Paystack</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden p-8 flex flex-col justify-between h-72 group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
          <div className="space-y-1 relative z-10">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Available Balance</p>
            <p className="text-5xl font-black tracking-tighter">{formatPrice(customerProfile.walletBalance)}</p>
          </div>
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-center text-[10px] text-emerald-100 font-bold border-t border-white/20 pt-6">
              <span className="uppercase tracking-widest">Loyalty Points: {customerProfile.loyaltyPoints.toLocaleString()}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-lg">REDEEM</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl font-black py-6 shadow-xl text-xs">
                <Plus className="w-4 h-4 mr-2" /> Top Up
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-2xl font-black py-6 text-xs border border-white/20">
                Withdraw
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">Saved Payment Methods</h3>
            <Button variant="ghost" className="text-emerald-600 font-black text-[10px] h-8">+ ADD NEW METHOD</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-[2rem] border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between group relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-amber-400/20">MoMo</div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">MTN Mobile Money</p>
                  <p className="text-[10px] font-mono text-gray-500">024 **** 2011</p>
                </div>
              </div>
              <Badge variant="success" className="text-[8px] font-black absolute top-4 right-4">DEFAULT</Badge>
            </div>
            <div className="p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20"><CreditCard className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">Visa Card</p>
                  <p className="text-[10px] font-mono text-gray-500">**** **** **** 4421</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-all" />
            </div>
          </div>
          <div className="pt-4 flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/40">
            <Info className="w-5 h-5 text-blue-500" />
            <p className="text-[10px] text-blue-600 dark:text-blue-300 font-medium leading-relaxed">Your payment data is encrypted. We support MTN, Telecel, and AirtelTigo Mobile Money networks.</p>
          </div>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="border-b p-8">
          <CardTitle className="text-lg font-black uppercase tracking-widest">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] border-b bg-gray-50/50 dark:bg-slate-800/50">
                  <th className="px-8 py-5">Transaction ID</th>
                  <th className="px-8 py-5">Description</th>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5 font-mono text-xs text-gray-50">{tx.id}</td>
                    <td className="px-8 py-5">
                       <p className="font-black text-gray-900 dark:text-white text-sm">{tx.category.replace('_', ' ')}</p>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{tx.description}</p>
                    </td>
                    <td className="px-8 py-5 text-gray-500 font-medium">{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-8 py-5"><Badge variant="success" className="text-[9px] font-black uppercase px-2">{tx.status}</Badge></td>
                    <td className={cn("px-8 py-5 text-right font-black text-lg", tx.type === 'credit' ? "text-emerald-600" : "text-rose-600")}>
                      {tx.type === 'credit' ? '+' : '-'}{formatPrice(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 px-8 border-t text-center bg-gray-50/30 dark:bg-slate-800/20">
            <Button variant="ghost" className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-emerald-600">
              <Download className="w-4 h-4 mr-2" /> Download Full Statement <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// CART
// ============================================================
export function CustomerCartPage() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartQuantity, cartTotal, formatPrice } = useApp();

  const deliveryFee = cart.length > 0 ? 12.00 : 0;
  const tax = cartTotal * 0.05;
  const grandTotal = cartTotal + deliveryFee + tax;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Your Food Cart</h1>
          <p className="text-sm text-gray-500">Review your delicious selections before checkout</p>
        </div>
        {cart.length > 0 && <Badge variant="secondary" className="px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px]">{cart.length} MEALS SELECTED</Badge>}
      </div>

      {cart.length === 0 ? (
        <Card className="border-dashed border-2 py-24 text-center space-y-6 rounded-[3rem] bg-gray-50/30 dark:bg-slate-900/30">
          <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-xl">
            <ShoppingCart className="w-12 h-12" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Your cart is empty</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Order something delicious from the best local restaurants in Takoradi.</p>
          </div>
          <Button variant="brand" className="rounded-[1.5rem] px-12 py-7 font-black text-lg shadow-xl" onClick={() => navigate('/products')}>Browse Meals</Button>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <Card key={item.product.id} className="p-6 rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="flex gap-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                    <img src={item.product.images?.[0] || ''} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-gray-900 dark:text-white text-lg group-hover:text-emerald-500 transition-colors">{item.product.title}</h4>
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{item.product.vendorName}</p>
                        <div className="flex gap-3 mt-3">
                          <button className="text-[9px] font-black text-gray-400 hover:text-emerald-500 uppercase tracking-widest border border-gray-100 dark:border-slate-800 px-3 py-1.5 rounded-lg transition-colors">Add Extras</button>
                          <button className="text-[9px] font-black text-gray-400 hover:text-emerald-500 uppercase tracking-widest border border-gray-100 dark:border-slate-800 px-3 py-1.5 rounded-lg transition-colors">Special Note</button>
                        </div>
                      </div>
                      <button className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <p className="text-2xl font-black text-emerald-600">{formatPrice(item.product.price)}</p>
                      <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-1.5 shadow-inner">
                        <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-black text-xl" onClick={() => updateCartQuantity(item.product.id, -1)}>-</button>
                        <span className="w-12 text-center font-black text-base text-gray-900 dark:text-white">{item.quantity}</span>
                        <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-black text-xl" onClick={() => updateCartQuantity(item.product.id, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="rounded-[3rem] border-none bg-white dark:bg-slate-900 shadow-2xl overflow-hidden p-8 space-y-8 sticky top-24 border border-gray-100 dark:border-slate-800">
              <h3 className="font-black text-xl uppercase tracking-widest border-b pb-4">Order Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-gray-500 font-bold text-sm">
                  <span>Subtotal ({cart.length} items)</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-bold text-sm">
                  <span>Estimated Delivery Fee</span>
                  <span className="text-emerald-600">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-bold text-sm">
                  <span>Service Tax (5%)</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(tax)}</span>
                </div>
                <div className="pt-6 border-t border-dashed flex justify-between items-center">
                  <span className="text-lg font-black uppercase tracking-widest">Total</span>
                  <span className="text-3xl font-black text-emerald-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <div className="relative group">
                  <TicketPercent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input type="text" placeholder="Promo Code" className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-800 p-4 pl-12 rounded-[1.5rem] text-xs font-bold uppercase tracking-widest outline-none focus:border-emerald-500 transition-all" />
                  <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-[10px] px-4">APPLY</Button>
                </div>
                <Button className="w-full rounded-[1.5rem] bg-emerald-500 hover:bg-emerald-600 py-8 font-black text-lg shadow-xl shadow-emerald-500/20" onClick={() => navigate('/checkout')}>
                  Proceed to Checkout
                </Button>
              </div>
              <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest">Safe & Secure Payments</p>
            </Card>
            <div className="flex items-start gap-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/40">
              <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <p className="text-[11px] text-blue-600 dark:text-blue-300 font-medium leading-relaxed">Prices include VAT and NHIS levies. Delivery fees vary by distance from the restaurant in Takoradi.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADDRESSES
// ============================================================
export function CustomerAddressesPage() {
  const { customerProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, showToast } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [addrForm, setAddrForm] = useState({ title: 'Home', address: '', latitude: 4.8920, longitude: -1.7580 });

  const addresses = customerProfile?.addresses || [];

  const openAdd = () => { setEditing(null); setAddrForm({ title: 'Home', address: '', latitude: 4.8920, longitude: -1.7580 }); setModalOpen(true); };
  const openEdit = (addr: any) => { setEditing(addr); setAddrForm({ title: addr.title || 'Home', address: addr.address || '', latitude: addr.latitude || 4.8920, longitude: addr.longitude || -1.7580 }); setModalOpen(true); };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) { showToast('Not Supported', 'Location access is unavailable on this device.', 'warning'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setAddrForm(f => ({ ...f, latitude: Number(pos.coords.latitude.toFixed(6)), longitude: Number(pos.coords.longitude.toFixed(6)) })),
      () => showToast('Permission Denied', 'Allow location access to capture your exact position.', 'warning'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const saveAddress = async () => {
    if (!addrForm.address.trim()) { showToast('Address Required', 'Please pick or type a delivery area.', 'warning'); return; }
    const payload = { title: addrForm.title, address: addrForm.address, latitude: addrForm.latitude, longitude: addrForm.longitude };
    try {
      if (editing) await updateAddress(editing.id, payload);
      else await addAddress(payload);
      setModalOpen(false);
    } catch (err) {
      showToast('Save Failed', 'Could not save the address. Please try again.', 'warning');
    }
  };

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all";
  const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1";

  if (!customerProfile) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Saved Addresses</h1>
          <p className="text-sm text-gray-500">Manage your delivery and pickup locations across Takoradi</p>
        </div>
        <Button className="rounded-[1.25rem] bg-emerald-500 hover:bg-emerald-600 font-black text-xs py-6 px-8 shadow-lg shadow-emerald-500/20" onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Add New Address</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {addresses.map(addr => (
          <Card key={addr.id} className={cn("p-8 rounded-[2.5rem] border-2 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden", addr.isDefault ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" : "border-gray-100 dark:border-slate-800")}>
            {addr.isDefault && (
               <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">DEFAULT</div>
            )}
            <div className="flex items-start justify-between mb-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors", addr.isDefault ? "bg-white dark:bg-slate-800 text-emerald-500" : "bg-gray-50 dark:bg-slate-800 text-gray-400 group-hover:text-emerald-500 group-hover:bg-white")}>
                <MapPin className="w-7 h-7" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(addr)} className="p-3 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-emerald-500 transition-all border border-transparent hover:border-gray-100"><Settings className="w-5 h-5" /></button>
                <button onClick={() => deleteAddress(addr.id)} className="p-3 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-rose-500 transition-all border border-transparent hover:border-gray-100"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{addr.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">{addr.address}</p>
              {addr.latitude ? <p className="text-[10px] font-mono text-gray-400">📡 {addr.latitude}, {addr.longitude}</p> : null}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Takoradi, Western Region</span>
              {!addr.isDefault && <button className="text-emerald-600 hover:underline decoration-2 underline-offset-4" onClick={() => setDefaultAddress(addr.id)}>Set as default</button>}
            </div>
          </Card>
        ))}
        <button onClick={openAdd} className="p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-emerald-500 group">
           <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white transition-colors">
             <Plus className="w-8 h-8" />
           </div>
           <span className="font-black uppercase tracking-widest text-xs">Add another location</span>
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setModalOpen(false)} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{editing ? 'Edit Address' : 'Add New Address'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Label</label>
              <select value={addrForm.title} onChange={e => setAddrForm({ ...addrForm, title: e.target.value })} className={inputClass}>
                <option>Home</option>
                <option>Work</option>
                <option>School</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Delivery Area / Address</label>
              <input list="addr-takoradi" value={addrForm.address} onChange={e => setAddrForm({ ...addrForm, address: e.target.value })} placeholder="Select or type your neighbourhood" className={inputClass} />
              <datalist id="addr-takoradi">
                {TAKORADI_LOCATIONS.map((loc, i) => <option key={i} value={loc} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className={labelClass}>Latitude</label>
                <input type="number" step="any" value={addrForm.latitude} onChange={e => setAddrForm({ ...addrForm, latitude: Number(e.target.value) })} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Longitude</label>
                <input type="number" step="any" value={addrForm.longitude} onChange={e => setAddrForm({ ...addrForm, longitude: Number(e.target.value) })} className={inputClass} />
              </div>
            </div>

            <Button variant="outline" className="w-full rounded-2xl text-[10px] font-black h-12 border-gray-100 dark:border-slate-700" onClick={useCurrentLocation}>
               <MapPin className="w-4 h-4 mr-2" /> USE CURRENT LOCATION
            </Button>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={saveAddress}>{editing ? 'Save Changes' : 'Add Address'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MESSAGES
// ============================================================
export function CustomerMessagesPage() {
  const { conversations, showToast, sendMessage } = useApp();
  const { user } = useAuth();
  const [activeChatTab, setActiveChatTab] = useState<'Restaurant' | 'Rider' | 'Support'>('Restaurant');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const filteredChats = conversations.filter(c => {
    const typeOk =
      activeChatTab === 'Restaurant' ? c.type === 'customer_vendor' :
      activeChatTab === 'Rider' ? c.type === 'customer_rider' :
      c.type === 'customer_support';
    if (!typeOk) return false;
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
      showToast('Send Failed', 'Could not send the message. Please try again.', 'warning');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Messages</h1>
          <p className="text-sm text-gray-500">Chat with restaurants, riders, and our support team</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden flex">
        {/* Chat List */}
        <div className={cn("w-full md:w-80 border-r border-gray-50 dark:border-slate-800 flex flex-col", selectedConvId && "hidden md:flex")}>
          <div className="p-4 space-y-4">
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['Restaurant', 'Rider', 'Support'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveChatTab(tab); setSelectedConvId(null); }}
                  className={cn(
                    "flex-1 py-2 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest",
                    activeChatTab === tab
                      ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." className="w-full bg-gray-50 dark:bg-slate-800 border-none pl-10 py-3 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredChats.length === 0 ? (
               <div className="py-12 text-center">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No {activeChatTab} chats</p>
               </div>
            ) : filteredChats.map(chat => {
              const partner = chat.participants && chat.participants[0];
              return (
                <div key={chat.id} onClick={() => loadMessages(chat.id)} className={cn("p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all mb-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/20", selectedConvId === chat.id && "bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20")}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                    {partner?.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : (partner?.name?.charAt(0) || 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{partner?.name || chat.subject || 'User'}</p>
                      <span className="text-[9px] text-gray-400">{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{chat.lastMessage || 'Say hello to start chatting'}</p>
                  </div>
                  {chat.unreadCount > 0 && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Window */}
        <div className={cn("flex-1 flex flex-col", !selectedConvId && "hidden md:flex")}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30 dark:bg-slate-950/30">
              <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-inner">
                <MessageCircle className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Select a conversation</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-2">Choose a chat to view message history and talk to your restaurant or rider.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3 bg-gray-50/50 dark:bg-slate-950/30">
                <button onClick={() => setSelectedConvId(null)} className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {selectedConv.participants?.[0]?.avatar ? <img src={selectedConv.participants[0].avatar} className="w-full h-full object-cover" /> : (selectedConv.participants?.[0]?.name?.charAt(0) || 'U')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">{selectedConv.participants?.[0]?.name || selectedConv.subject}</p>
                  <p className="text-[10px] text-gray-500">{selectedConv.orderId ? `Order thread · ${selectedConv.subject || ''}` : activeChatTab}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-slate-950/20">
                {loading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-12">No messages yet — say hello!</p>
                ) : messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm", mine ? "bg-emerald-500 text-white rounded-br-md" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-md")}>
                        <p className="leading-relaxed">{m.content}</p>
                        <p className={cn("text-[9px] mt-1", mine ? "text-emerald-100" : "text-gray-400")}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3">
                <input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 dark:bg-slate-800 border-2 border-transparent px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                />
                <button onClick={handleSend} disabled={sending || !messageInput.trim()} className="p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg disabled:opacity-40 transition-all">
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

// ============================================================
// NOTIFICATIONS
// ============================================================
export function CustomerNotificationsPage() {
  const { notifications, markNotificationRead, clearNotifications } = useApp();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500">Stay updated on your food prep and deliveries</p>
        </div>
        {notifications.length > 0 && (
          <Button variant="ghost" className="text-[10px] font-black text-gray-400 hover:text-rose-500 uppercase tracking-widest" onClick={clearNotifications}>
            Clear All
          </Button>
        )}
      </div>

      <div className="max-w-3xl space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 rounded-[3rem] bg-gray-50/30 dark:bg-slate-900/30">
            <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">All caught up!</h3>
            <p className="text-sm text-gray-500">You have no new notifications at the moment.</p>
          </Card>
        ) : (
          notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <div onClick={() => markNotificationRead(n.id)}
                className={cn(
                  "p-6 rounded-[2.5rem] border transition-all cursor-pointer flex gap-5 items-start relative overflow-hidden group shadow-sm",
                  n.read
                    ? "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 opacity-60"
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20 shadow-md ring-1 ring-emerald-500/10"
                )}>
                {!n.read && <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />}
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform",
                  n.type === 'delivery' ? "bg-blue-100 text-blue-600" :
                  n.type === 'order' ? "bg-emerald-100 text-emerald-600" :
                  "bg-amber-100 text-amber-600"
                )}>
                  {n.type === 'delivery' ? <Truck className="w-7 h-7" /> :
                   n.type === 'order' ? <UtensilsCrossed className="w-7 h-7" /> :
                   <Gift className="w-7 h-7" />}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-gray-900 dark:text-white leading-tight text-base">{n.title}</h4>
                    <span className="text-[10px] font-black text-gray-400 whitespace-nowrap ml-4 uppercase tracking-tighter">{n.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{n.message}</p>
                </div>
                {!n.read && <div className="w-3 h-3 rounded-full bg-emerald-500 absolute top-6 right-6" />}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROFILE
// ============================================================
export function CustomerProfilePage() {
  const { customerProfile, formatPrice, updateProfile, isLoading, showToast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', avatar: '' });

  useEffect(() => {
    if (!customerProfile) return;
    setForm({
      name: customerProfile.name || '',
      email: customerProfile.email || '',
      phone: customerProfile.phone || '',
      avatar: customerProfile.avatar || '',
    });
  }, [customerProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickImage = () => {
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
          const MAX = 800;
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.4);
          setForm(f => ({ ...f, avatar: base64 }));
          showToast('Photo Processed', 'Tap Save Changes to update your picture.');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveProfile = async () => {
    try {
      await updateProfile({ name: form.name, email: form.email, phone: form.phone, avatar: form.avatar });
      showToast('Saved', 'Your profile has been updated.');
    } catch (err) {
      console.error(err);
      showToast('Save Failed', 'Could not save your profile. Please try again.', 'warning');
    }
  };

  if (isLoading || !customerProfile) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Profile</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[3.5rem] overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900 text-center p-8 pt-12 relative group">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10" />
            <div className="relative inline-block mx-auto mb-6">
              <img src={form.avatar} className="w-36 h-36 rounded-[2.5rem] object-cover ring-8 ring-emerald-500/10 shadow-2xl group-hover:scale-105 transition-transform duration-700" />
              <button onClick={pickImage} className="absolute bottom-2 right-2 p-3 rounded-2xl bg-emerald-500 text-white shadow-xl hover:scale-110 transition-transform ring-4 ring-white dark:ring-slate-900">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{form.name}</h2>
            <p className="text-sm text-gray-500 font-bold mb-8">{form.email}</p>

            <div className="flex bg-gray-50 dark:bg-slate-800 rounded-[2rem] p-5 gap-2 mb-8 shadow-inner">
              <div className="flex-1 text-center border-r border-gray-200 dark:border-slate-700">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Points</p>
                <p className="text-xl font-black text-emerald-600">{customerProfile.loyaltyPoints.toLocaleString()}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Wallet</p>
                <p className="text-xl font-black text-emerald-600">{formatPrice(customerProfile.walletBalance)}</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-900/40 text-left">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Gift className="w-4 h-4" /> Share & Earn</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-xl text-amber-700 dark:text-amber-400 tracking-wider">{customerProfile.referralCode}</span>
                <button className="text-[10px] font-black bg-white dark:bg-amber-900/40 px-4 py-2 rounded-xl shadow-sm hover:scale-105 transition-transform uppercase">Copy Code</button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] p-8 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-black text-xs uppercase tracking-widest border-b pb-4">Verification Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">Email Verification</span>
                <Badge variant="success" className="text-[9px] font-black px-2">VERIFIED</Badge>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">Phone Verification</span>
                <Badge variant="success" className="text-[9px] font-black px-2">VERIFIED</Badge>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">Ghana Card (ID)</span>
                <Badge variant="warning" className="text-[9px] font-black px-2">NOT VERIFIED</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full rounded-2xl text-[10px] font-black h-12 border-gray-100 hover:border-emerald-500 hover:text-emerald-500 transition-all uppercase tracking-widest">Upgrade to Premium</Button>
          </Card>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[3rem] border-gray-100 dark:border-slate-800 shadow-sm p-8 sm:p-12">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">Account Details</h3>
              <Button variant="brand" className="rounded-2xl px-10 py-6 font-black text-sm shadow-xl" onClick={saveProfile}>Save Changes</Button>
            </div>

            <form className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Emergency Contact (Ghana)</label>
                <input type="tel" placeholder="+233 2X XXX XXXX" className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Default Language</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none">
                  <option>English (Global)</option>
                  <option>Fante (Local)</option>
                  <option>Twi (Local)</option>
                  <option>Ga (Local)</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Food Preference</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none">
                  <option>Everything (Ghanaian & Continental)</option>
                  <option>Halal Only</option>
                  <option>Strictly Local Dishes</option>
                  <option>No Spicy Foods</option>
                </select>
              </div>
            </form>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] p-8 border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-xl" onClick={() => navigate('/customer/addresses')}>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 group-hover:bg-white transition-all">
                  <MapPin className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-lg">Delivery Locations</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">2 Active Addresses</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-white transition-all" />
            </Card>
            <Card className="rounded-[2.5rem] p-8 border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-xl" onClick={() => navigate('/customer/wallet')}>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 group-hover:bg-white transition-all">
                  <CreditCard className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-lg">Payment Options</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">3 Saved Methods</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-white transition-all" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
export function CustomerSettingsPage() {
  const { showToast, customerProfile, updateProfile, isLoading } = useApp();
  const [tab, setTab] = useState<'profile' | 'payment' | 'location'>('profile');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    momoProvider: 'MTN MoMo',
    momoNumber: '',
    momoAccountName: '',
    address: '',
    latitude: 0,
    longitude: 0,
  });

  // Seed from the loaded profile (loaded asynchronously) so nothing is lost.
  useEffect(() => {
    if (!customerProfile) return;
    const home = Array.isArray(customerProfile.addresses)
      ? customerProfile.addresses.find(a => a.isDefault) || customerProfile.addresses[0]
      : null;
    setForm(f => ({
      ...f,
      name: customerProfile.name || '',
      phone: customerProfile.phone || '',
      email: customerProfile.email || '',
      avatar: customerProfile.avatar || '',
      momoProvider: customerProfile.momo?.provider || 'MTN MoMo',
      momoNumber: customerProfile.momo?.number || '',
      momoAccountName: customerProfile.momo?.accountName || '',
      address: (home as any)?.address || customerProfile.location?.address || '',
      latitude: Number((home as any)?.latitude || customerProfile.location?.latitude || 4.8920),
      longitude: Number((home as any)?.longitude || customerProfile.location?.longitude || -1.7580),
    }));
  }, [customerProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickImage = (capture: boolean = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // On mobile browsers `capture` asks the device to use the camera,
    // otherwise the photos/gallery picker is shown.
    if (capture) (input as any).capture = 'user';
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
          const MAX = 800;
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.4);
          setForm(f => ({ ...f, avatar: base64 }));
          showToast('Photo Processed', 'Tap SAVE to update your profile picture.');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const setCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      showToast('Not Supported', 'Location access is not available on this device.', 'warning');
      return;
    }
    showToast('Requesting Permission', 'Allow location access so riders can find you.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setForm(f => ({ ...f, latitude: lat, longitude: lng }));
        showToast('Location Set', 'Your coordinates were captured. Pick your delivery area above, then Save.');
      },
      () => {
        showToast('Permission Denied', 'Allow location access to set your delivery area automatically.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async (section: 'profile' | 'payment' | 'location') => {
    if (!customerProfile) return;
    try {
      const patch: any = {};
      if (section === 'profile') {
        patch.name = form.name;
        patch.phone = form.phone;
        patch.email = form.email;
        patch.avatar = form.avatar;
      } else if (section === 'payment') {
        patch.momo = { provider: form.momoProvider, number: form.momoNumber, accountName: form.momoAccountName };
      } else {
        patch.address = form.address;
        patch.latitude = form.latitude;
        patch.longitude = form.longitude;
      }
      await updateProfile(patch);
      showToast('Saved', section === 'profile' ? 'Your profile has been updated.' : section === 'payment' ? 'Mobile money details saved.' : 'Delivery location saved for riders.');
    } catch (err) {
      console.error(err);
      showToast('Save Failed', 'Could not save changes. Please try again.', 'warning');
    }
  };

  if (isLoading || !customerProfile) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all";
  const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1";

  const TABS: { key: typeof tab; label: string; desc: string }[] = [
    { key: 'profile', label: 'My Profile', desc: 'Name, phone & profile picture' },
    { key: 'payment', label: 'Mobile Money (MoMo)', desc: 'Payout wallet riders use for collect' },
    { key: 'location', label: 'Delivery Location', desc: 'Where riders must find you' },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-sm text-gray-500">Update your profile, mobile money wallet and delivery location</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-5 py-3 rounded-2xl text-xs font-black transition-all border",
              tab === t.key
                ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                : "bg-white dark:bg-slate-900 text-gray-500 border-gray-100 dark:border-slate-800 hover:border-emerald-400"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative group">
              <img src={form.avatar} className="w-28 h-28 rounded-[2rem] object-cover ring-8 ring-emerald-500/10 shadow-xl group-hover:scale-105 transition-transform duration-700" />
              <button onClick={pickImage} className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-emerald-500 text-white shadow-xl hover:scale-110 transition-transform ring-4 ring-white dark:ring-slate-900">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Profile Picture</h3>
              <p className="text-xs text-gray-500 font-medium">On mobile you will be asked for camera / photos permission so you can take or pick a photo.</p>
              <div className="flex flex-wrap gap-2 pt-2 justify-center sm:justify-start">
                <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black" onClick={() => pickImage(true)}>
                  <Plus className="w-4 h-4 mr-1" /> TAKE PHOTO
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black" onClick={() => pickImage(false)}>
                  <Smartphone className="w-4 h-4 mr-1" /> CHOOSE FROM GALLERY
                </Button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelClass}>Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className={labelClass}>Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="brand" className="rounded-2xl px-10 py-6 font-black text-sm shadow-xl" onClick={() => handleSave('profile')}>
              Save Profile
            </Button>
          </div>
        </Card>
      )}

      {tab === 'payment' && (
        <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><Smartphone className="w-6 h-6" /></div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Mobile Money (MoMo)</h3>
              <p className="text-xs text-gray-500 font-medium">The wallet you pay with; integration works with MTN MoMo, Vodafone Cash & AirtelTigo Money</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2 sm:col-span-2">
              <label className={labelClass}>MoMo Provider</label>
              <select value={form.momoProvider} onChange={e => setForm({ ...form, momoProvider: e.target.value })} className={inputClass}>
                <option>MTN MoMo</option>
                <option>Vodafone Cash</option>
                <option>AirtelTigo Money</option>
                <option>Telecel Cash</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>MoMo Number</label>
              <input type="tel" placeholder="e.g. +233 24 000 0000" value={form.momoNumber} onChange={e => setForm({ ...form, momoNumber: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Account Name</label>
              <input type="text" value={form.momoAccountName || ''} onChange={e => setForm({ ...form, momoAccountName: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="w-full flex justify-end pt-2">
            <Button variant="brand" className="rounded-2xl px-10 py-6 font-black text-sm shadow-xl" onClick={() => handleSave('payment')}>
              Save Payment Options
            </Button>
          </div>
        </Card>
      )}

      {tab === 'location' && (
        <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500"><MapPin className="w-6 h-6" /></div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Delivery Location</h3>
              <p className="text-xs text-gray-500 font-medium">Riders use this address to bring your order. Set it to an area you are always in.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className={labelClass}>Your Location / Area</label>
              <input list="takoradi-locations" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Select or type your neighbourhood (e.g. Anaji, Takoradi)" className={inputClass} />
              <datalist id="takoradi-locations">
                {TAKORADI_LOCATIONS.map(loc => <option key={loc} value={loc} />)}
              </datalist>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={labelClass}>Latitude</label>
                <input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: Number(e.target.value) })} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Longitude</label>
                <input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: Number(e.target.value) })} className={inputClass} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-300"><MapPin className="w-4 h-4 inline mr-1 text-emerald-500" /> Allow this device to detect your current position</p>
              <Button variant="outline" className="rounded-xl text-[10px] font-black" onClick={setCurrentLocation}>
                <ArrowRight className="w-4 h-4 mr-2" /> USE CURRENT LOCATION
              </Button>
            </div>
          </div>

          <div className="w-full flex justify-end pt-2">
            <Button variant="brand" className="rounded-2xl px-10 py-6 font-black text-sm shadow-xl" onClick={() => handleSave('location')}>
              Save Location for Riders
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// REVIEWS
// ============================================================
export function CustomerReviewsPage() {
  const { formatPrice, reviews, vendors, products, showToast, orders } = useApp();
  const { user } = useAuth();
  const [rateModal, setRateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Real orders the customer can review (delivered / completed only)
  const reviewableOrders = orders.filter(o => o.customerId === user?.id && ['delivered', 'completed'].includes(o.status?.toLowerCase()));

  const openRate = () => {
    setRateModal(true);
    setSelectedOrder(reviewableOrders[0] || null);
    setRating(0);
    setComment('');
  };

  const submitReview = async () => {
    if (!selectedOrder || rating === 0) return;
    setPosting(true);
    try {
      await InteractionService.postReview({
        userId: user?.id,
        userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer',
        userAvatar: user?.avatarUrl || '',
        rating,
        comment,
        orderId: selectedOrder.id,
        vendorId: selectedOrder.vendorId,
        productId: selectedOrder.items?.[0]?.id,
        date: new Date().toISOString()
      });
      showToast('Review Submitted', 'Thank you for rating your order.');
      setRateModal(false);
      setTimeout(() => window.location.reload(), 600);
    } catch {
      showToast('Error', 'Unable to submit your review. Please try again.', 'warning');
    } finally { setPosting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Food Reviews</h1>
          <p className="text-sm text-gray-500">Help the community discover the best meals in Takoradi</p>
        </div>
        <Card className="p-5 px-8 flex items-center gap-6 border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-[2rem]">
          <div className="text-center border-r border-white/20 pr-6">
            <p className="text-[9px] font-black uppercase opacity-80 tracking-widest mb-1">Impact</p>
            <p className="text-2xl font-black">{(reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0).toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase opacity-80 tracking-widest mb-1">Total</p>
            <p className="text-2xl font-black">{reviews.length}</p>
          </div>
        </Card>
      </div>

      <div className="max-w-4xl space-y-6">
        {reviews.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 rounded-[3rem] bg-gray-50/30 dark:bg-slate-900/30">
            <Star className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reviews yet</h3>
            <p className="text-sm text-gray-500">Your food reviews will appear here after you rate your orders.</p>
          </Card>
        ) : (
          reviews.map(rev => {
            const vendor = vendors.find(v => v.id === rev.vendorId);
            const product = products.find(p => p.id === rev.productId);
            return (
              <Card key={rev.id} className="p-8 rounded-[3rem] border-gray-100 dark:border-slate-800 shadow-sm space-y-6 group hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center font-black text-xl text-emerald-600 shadow-inner">
                      {(vendor?.name || 'R').charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">{vendor?.name || 'Restaurant'}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{product?.title || 'Meal'} | {new Date(rev.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 rounded-2xl">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-4 h-4", i < rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                </div>
                <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed font-medium italic px-4 border-l-4 border-emerald-500/20">"{rev.comment}"</p>

                {rev.reply && (
                   <div className="mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                     <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Response from Restaurant</p>
                     <p className="text-sm text-gray-600 dark:text-gray-400">{rev.reply}</p>
                   </div>
                )}
              </Card>
            );
          })
        )}
        <Button variant="outline" className="w-full rounded-[2.5rem] border-dashed border-2 py-10 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all" onClick={openRate} disabled={reviewableOrders.length === 0}>
          <Plus className="w-5 h-5 mr-3" /> {reviewableOrders.length > 0 ? 'Rate a Recent Order from Takoradi' : 'No completed orders to review yet'}
        </Button>
      </div>

      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setRateModal(false)} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-5">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Rate Your Order</h3>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Order</label>
              <select
                value={selectedOrder?.id || ''}
                onChange={e => setSelectedOrder(reviewableOrders.find(o => o.id === e.target.value) || null)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                {reviewableOrders.map(o => (
                  <option key={o.id} value={o.id}>{o.orderNumber || o.id} — {o.vendorName} ({formatPrice(o.totalAmount)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} type="button" onClick={() => setRating(s)} className="p-1">
                    <Star className={cn("w-8 h-8", s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Your Review</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="How was your meal and delivery?" className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRateModal(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={submitReview} disabled={posting || rating === 0}>
                {posting ? 'Submitting…' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HELP & SUPPORT
// ============================================================
export function CustomerSupportPage() {
  const faqs = [
    { q: 'How do I top up my OmniWallet?', a: 'You can top up your wallet using any Mobile Money network (MTN, Telecel, AirtelTigo) or a Visa/Mastercard directly in the Wallet section.' },
    { q: 'What areas in Takoradi do you deliver to?', a: 'We currently deliver to Market Circle, Fijai, Anaji, Chapel Hill, Kwesimintsim, Sekondi, and surrounding areas.' },
    { q: 'How long does delivery take?', a: 'Average delivery time in Takoradi is 25-45 minutes depending on the restaurant prep time and rider distance.' },
    { q: 'My food arrived cold, what can I do?', a: 'We are sorry to hear that! Please use the "Report Order Issue" button below to open a ticket or start a Live Chat for immediate assistance.' }
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Help & Support</h1>
        <p className="text-sm text-gray-500">Our Takoradi-based support team is here to assist you 24/7</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="p-8 rounded-[3rem] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white space-y-5 shadow-2xl shadow-emerald-500/20 text-center group">
          <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform"><MessageCircle className="w-10 h-10" /></div>
          <h3 className="text-xl font-black">Live Support Chat</h3>
          <p className="text-xs text-emerald-50 font-medium opacity-90 leading-relaxed">Talk to our operations desk instantly for active order issues or refunds.</p>
          <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl font-black py-7 shadow-xl">Start Chat</Button>
        </Card>
        <Card className="p-8 rounded-[3rem] border-gray-100 dark:border-slate-800 shadow-sm space-y-5 text-center group hover:shadow-xl transition-all">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500 group-hover:scale-110 transition-transform shadow-sm"><Phone className="w-10 h-10" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Emergency Call</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">Reach our Takoradi office directly for urgent matters or rider complaints.</p>
          <Button variant="outline" className="w-full rounded-2xl font-black py-7 border-gray-100 hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm">Call 024 000 0001</Button>
        </Card>
        <Card className="p-8 rounded-[3rem] border-gray-100 dark:border-slate-800 shadow-sm space-y-5 text-center group hover:shadow-xl transition-all">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500 group-hover:scale-110 transition-transform shadow-sm"><AlertCircle className="w-10 h-10" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Report Order Issue</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">File a formal complaint about a meal quality or a refund request.</p>
          <Button variant="outline" className="w-full rounded-2xl font-black py-7 border-gray-100 hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm">Open Support Ticket</Button>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center">Frequently Asked Questions</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {faqs.map((faq, i) => (
            <Card key={i} className="p-8 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm group hover:border-emerald-500/30 transition-all hover:shadow-lg">
              <h4 className="font-black text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-widest">{faq.q}</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">{faq.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Map the old exports to new functional components
export function CustomerWishlistPage() { return <CustomerFavoritesPage />; }
export function CustomerPaymentMethodsPage() { return <CustomerWalletPage />; }
export function CustomerCouponsPage() {
  const { showToast } = useApp();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponState, setCouponState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [voucherCode, setVoucherCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = () => {
    setCouponState('loading');
    AdminService.getCoupons()
      .then(rows => { setCoupons(Array.isArray(rows) ? rows.filter(c => c.isActive) : []); setCouponState('ready'); })
      .catch(() => setCouponState('error'));
  };
  useEffect(() => { load(); }, []);

  const redeem = async () => {
    if (!voucherCode.trim()) return;
    setRedeeming(true);
    try {
      const res = await AdminService.validateCoupon(voucherCode.trim(), 100);
      showToast('Coupon Valid', res.message || 'This coupon can be applied at checkout.');
      setVoucherCode('');
      await load();
    } catch (e: any) {
      showToast('Invalid Code', e?.message || 'This voucher code is not valid or has expired.', 'warning');
    } finally { setRedeeming(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Food Coupons</h1>
          <p className="text-sm text-gray-500">Active promo codes on the platform. Apply them at checkout for discounts</p>
        </div>
      </div>

      {couponState === 'loading' && <p className="text-center text-gray-400 py-12">Loading coupons…</p>}
      {couponState === 'error' && (
        <div className="text-center py-12">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="text-gray-500">Unable to load coupons.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={load}>Retry</Button>
        </div>
      )}
      {couponState === 'ready' && coupons.length === 0 && (
        <div className="text-center py-12">
          <TicketPercent className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No active coupons right now</h3>
          <p className="text-sm text-gray-500 mt-1">Check back soon — new promo codes are added regularly.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-8">
        {coupons.map(c => {
          const discount = c.type === 'percentage' ? `${c.value}%` : c.type === 'free_delivery' ? 'FREE' : `GHS ${c.value}`;
          const color = c.type === 'percentage' ? 'from-emerald-500 to-emerald-600' : c.type === 'free_delivery' ? 'from-blue-500 to-indigo-600' : 'from-amber-400 to-amber-600';
          return (
            <div key={c.id} className={cn("relative p-10 rounded-[3rem] bg-gradient-to-br text-white shadow-2xl overflow-hidden group hover:scale-[1.02] transition-transform", color)}>
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
               <div className="relative z-10">
                  <p className="text-6xl font-black mb-2 tracking-tighter">{discount}</p>
                  <p className="text-sm font-black uppercase tracking-widest opacity-90 mb-8">{c.type === 'free_delivery' ? 'Free delivery on your order' : c.description || `${c.type.replace('_', ' ')} off`}{c.minSpend ? ` · Min. order GHS ${c.minSpend}` : ''}</p>
                  <div className="flex items-center justify-between border-t border-white/20 pt-8">
                    <div className="bg-white/20 px-6 py-3 rounded-2xl">
                      <span className="font-mono text-xl font-black tracking-[0.3em]">{c.code}</span>
                    </div>
                    {c.usageLimit != null && <Badge variant="outline" className="text-white border-white/40 text-[10px]">{(c.totalUsed || 0)}/{c.usageLimit} used</Badge>}
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      <Card className="p-10 rounded-[3rem] bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-800 text-center space-y-4">
         <TicketPercent className="w-12 h-12 text-gray-300 mx-auto" />
         <h3 className="text-xl font-black text-gray-900 dark:text-white">Have a physical voucher?</h3>
         <p className="text-sm text-gray-500 max-w-sm mx-auto">Enter your special code here to validate it against the platform database.</p>
         <div className="flex max-w-md mx-auto gap-3 pt-4">
            <input type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="Enter Voucher Code" className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-6 font-mono font-black tracking-widest outline-none focus:border-emerald-500" />
            <Button className="rounded-2xl bg-emerald-500 px-8 py-6 font-black uppercase tracking-widest shadow-lg" onClick={redeem} disabled={redeeming}>{redeeming ? 'Checking…' : 'Redeem'}</Button>
         </div>
      </Card>
    </div>
  );
}
