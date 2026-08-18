import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ShoppingBag, ShoppingCart, Heart, Wallet, MessageSquare, MapPin,
  Settings, Bell, UserRound, Truck, Star, Gift, CreditCard, FileText,
  UtensilsCrossed, Store, TicketPercent, ChevronRight, Search,
  History, Plus, MessageCircle, Phone, Info, Trash2, ArrowRight,
  CheckCircle2, Clock, XCircle, MoreVertical, Download, LifeBuoy, AlertCircle,
  Smartphone, X, Send, ShieldCheck, Tag,
  SlidersHorizontal, KeyRound, LogOut, Eye, EyeOff, Languages, Globe2, Coins
} from 'lucide-react';
import type { CurrencyCode, LanguageCode } from '@/src/types';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { MessagingService } from '@/src/services/api';
import { TAKORADI_LOCATIONS } from '@/src/lib/locations';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { AdminService, InteractionService, OrderService, WalletService } from '@/src/services/api';
import type { Message } from '@/src/services/api';
import { AuthApiService } from '@/src/services/auth-api';
import { ImageCropModal } from '@/src/components/common/ImageCropModal';
import { ReceiptModal, ReceiptOrder } from '@/src/components/common/ReceiptModal';
import { NotificationCenter } from '@/src/components/common/NotificationCenter';

// ============================================================
// ORDER DETAILS
// ============================================================
export function CustomerOrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, formatPrice, t } = useApp();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const order = orders.find(o => o.id === id);

  if (!order) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold">{t('common.noResults')}</h3>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/customer/orders')}>{t('common.back')}</Button>
      </div>
    );
  }

  const receiptOrder: ReceiptOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    customerAddress: order.customerAddress,
    customerPhone: order.customerPhone,
    vendorName: order.vendorName,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    tax: order.tax,
    discount: order.discount,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
  };

  const statusColor =
    order.status === 'delivered' ? 'text-emerald-500' :
    order.status === 'cancelled' ? 'text-rose-500' :
    'text-amber-500';

  return (
    <div className="space-y-8 pb-20 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customer/orders')} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('orders.details')}</h1>
          <p className="text-sm text-gray-500">#{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-2xl font-black shadow-inner">
                    {(order.vendorName || 'V').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{order.vendorName}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{order.items?.length || 0} {t('orders.itemsOrdered')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-xs font-black uppercase tracking-widest mb-1", statusColor)}>{t(`status.${order.status}`) || order.status.replace('_', ' ')}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm font-bold">
                    <span className="text-gray-500"><span className="text-emerald-600 me-2">{item.quantity}x</span> {item.productName}</span>
                    <span className="text-gray-900 dark:text-white">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-dashed border-gray-200 dark:border-slate-700">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>{t('cart.subtotal')}</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>{t('cart.deliveryFee')}</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>{t('cart.tax')}</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(order.tax)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-widest">
                    <span>{t('cart.promo')}</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">{t('cart.total')}</span>
                  <span className="text-3xl font-black text-emerald-600">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="rounded-[2rem] p-6 border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {t('checkout.details')}</h4>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed">{order.customerAddress}</p>
            </Card>
            <Card className="rounded-[2rem] p-6 border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> {t('checkout.payment')}</h4>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{order.paymentMethod}</p>
              <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'} className="text-[9px] font-black">{order.paymentStatus.toUpperCase()}</Badge>
            </Card>
          </div>
        </div>

        <aside className="space-y-6">
          {order.dispatchRider ? (
            <Card className="rounded-[2rem] p-6 border-none bg-emerald-500 text-white shadow-xl space-y-4">
              <div className="flex items-center gap-4">
                <img src={order.dispatchRider.avatar} className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest opacity-80">{t('common.rider')}</p>
                  <p className="text-lg font-black truncate">{order.dispatchRider.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button className="bg-white text-emerald-600 hover:bg-white/90 rounded-xl font-black text-[10px] h-11" onClick={() => window.open(`tel:${order.dispatchRider.phone}`)}><Phone className="w-3.5 h-3.5 me-1.5" /> {t('common.close').toUpperCase()}</Button>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-[10px] h-11" onClick={() => navigate('/customer/messages')}><MessageSquare className="w-3.5 h-3.5 me-1.5" /> {t('nav.messages').toUpperCase()}</Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-[2rem] p-6 border-gray-100 dark:border-slate-800 shadow-sm text-center py-10 space-y-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Truck className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('orders.assigningRider')}</p>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400">{t('orders.findingRider')}</p>
            </Card>
          )}

          <div className="space-y-2">
            <Button variant="outline" className="w-full rounded-[1.25rem] h-14 font-black uppercase text-[10px] tracking-widest border-gray-200" onClick={() => setReceiptOpen(true)}>
              <FileText className="w-4 h-4 me-2" /> {t('orders.viewReceipt')}
            </Button>
            <Button variant="outline" className="w-full rounded-[1.25rem] h-14 font-black uppercase text-[10px] tracking-widest border-gray-200" onClick={() => navigate(`/track-order?order=${order.id}`)}>
              <MapPin className="w-4 h-4 me-2" /> {t('orders.trackMap')}
            </Button>
            <Button variant="outline" className="w-full rounded-[1.25rem] h-14 font-black uppercase text-[10px] tracking-widest border-gray-200" onClick={() => navigate('/customer/support')}>
              <LifeBuoy className="w-4 h-4 me-2" /> {t('orders.getHelp')}
            </Button>
          </div>
        </aside>
      </div>

      <ReceiptModal open={receiptOpen} order={receiptOrder} onClose={() => setReceiptOpen(false)} />
    </div>
  );
}

// ============================================================
// MY ORDERS
// ============================================================
export function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { orders, formatPrice, updateOrderStatus, t } = useApp();
  const [activeTab, setActiveTab] = useState<'Active' | 'Preparing' | 'On the Way' | 'Delivered' | 'Cancelled'>('Active');
  const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null);

  const openReceipt = (order: any) => {
    setReceiptOrder({
      id: order.id,
      orderNumber: order.orderNumber || order.invoiceNumber || order.id,
      invoiceNumber: order.invoiceNumber || order.id,
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      customerPhone: order.customerPhone,
      vendorName: order.vendorName,
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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('orders.title')}</h1>
          <p className="text-sm text-gray-500">{t('orders.subtitle')}</p>
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
              {tab === 'Active' ? t('status.confirmed') : tab === 'Preparing' ? t('status.preparing') : tab === 'On the Way' ? t('status.in_transit') : tab === 'Delivered' ? t('status.delivered') : t('status.cancelled')}
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('orders.empty')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('orders.emptyDesc')}</p>
            <Button variant="brand" className="mt-6 rounded-2xl px-8 py-6 font-bold shadow-lg" onClick={() => navigate('/products')}>{t('nav.browse').toUpperCase()}</Button>
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
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">{order.vendorName || t('msg.restaurant')}</h3>
                          <Badge variant={order.status === 'Cancelled' ? 'danger' : 'default'} className="text-[9px] font-black py-0.5 px-2 uppercase tracking-widest">{t(`status.${order.status.toLowerCase()}`) || order.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {order.items?.map(i => `${i.quantity}x ${i.productName || t('nav.products')}`).join(', ') || t('common.noResults')}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-400 pt-2 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> {order.id}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {order.customerAddress}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end justify-center">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] mb-1">{t('orders.total')}</p>
                      <p className="text-3xl font-black text-emerald-600">{formatPrice(order.totalAmount)}</p>
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1 mt-1">
                        <CreditCard className="w-3 h-3" /> {t('orders.paidVia')} {order.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {order.dispatchRider && (
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-4 border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={order.dispatchRider.avatar} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t('orders.assigningRider')}</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{order.dispatchRider.name} | {order.dispatchRider.vehicleNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="rounded-lg h-8 text-[10px] font-bold border-gray-200" onClick={() => navigate('/customer/messages')}><MessageCircle className="w-3 h-3 me-1" /> {t('nav.messages')}</Button>
                        <Button size="sm" variant="outline" className="rounded-lg h-8 text-[10px] font-bold border-gray-200" onClick={() => window.open(`tel:${order.dispatchRider?.phone}`)}><Phone className="w-3 h-3 me-1" /> {t('support.emergency')}</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex gap-2">
                      <Button variant="ghost" className="rounded-xl text-[10px] font-bold text-gray-500 h-10 hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => openReceipt(order)}><FileText className="w-3.5 h-3.5 me-1.5" /> {t('orders.viewReceipt')}</Button>
                      <Button variant="ghost" className="rounded-xl text-[10px] font-bold text-gray-500 h-10 hover:bg-gray-100 dark:hover:bg-slate-800"><LifeBuoy className="w-3.5 h-3.5 me-1.5" /> {t('orders.getHelp')}</Button>
                    </div>
                    <div className="flex gap-3">
                      {['On the Way', 'Preparing Food', 'Order Received', 'Rider Assigned', 'Picked Up'].includes(order.status) ? (
                        <Button className="rounded-xl font-black bg-emerald-500 hover:bg-emerald-600 text-xs py-5 px-8 shadow-lg shadow-emerald-500/20" onClick={() => navigate('/track-order')}>
                          {t('orders.trackMap')}
                        </Button>
                      ) : (
                        <Button variant="brand" className="rounded-xl font-black text-xs py-5 px-8 shadow-lg" onClick={() => navigate('/products')}>
                          {t('orders.reorder')}
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

      <ReceiptModal open={!!receiptOrder} order={receiptOrder} onClose={() => setReceiptOrder(null)} heading="Customer Receipt" />
    </div>
  );
}

// ============================================================
// FAVORITES
// ============================================================
export function CustomerFavoritesPage() {
  const navigate = useNavigate();
  const { wishlist, favoriteVendors, formatPrice, addToCart, vendors, t } = useApp();
  const [favTab, setFavTab] = useState<'Meals' | 'Restaurants' | 'Recently Viewed'>('Meals');

  const recentlyViewed: any[] = []; // Could be implemented with local storage later

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('fav.title')}</h1>
          <p className="text-sm text-gray-500">{t('fav.subtitle')}</p>
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
              {tab === 'Meals' ? t('fav.meals') : tab === 'Restaurants' ? t('fav.restaurants') : t('fav.recent')}
            </button>
          ))}
        </div>
      </div>

      {favTab === 'Meals' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlist.length === 0 ? (
            <div className="col-span-full py-20 text-center rounded-[2.5rem] bg-gray-50/30 dark:bg-slate-900/30 border border-dashed border-gray-200">
              <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold">{t('fav.emptyMeals')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('fav.emptyMealsDesc')}</p>
              <Button variant="brand" className="mt-6 rounded-xl" onClick={() => navigate('/products')}>{t('fav.discoverMeals')}</Button>
            </div>
          ) : (
            wishlist.map(meal => (
              <Card key={meal.id} className="rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all cursor-pointer border-gray-100 dark:border-slate-800" onClick={() => navigate(`/product/${meal.id}`)}>
                <div className="aspect-square relative overflow-hidden">
                  <img src={meal.images?.[0] || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 end-4">
                    <button className="p-2.5 rounded-2xl bg-white/90 shadow-xl text-rose-500"><Heart className="w-4 h-4 fill-current" /></button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">{meal.title}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{meal.vendorName}</p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-lg font-black text-emerald-600">{formatPrice(meal.price)}</p>
                    <Button size="sm" className="rounded-xl h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] px-4" onClick={(e) => { e.stopPropagation(); addToCart(meal); }}>
                      {t('common.addToCart')}
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
                <div className="absolute -top-2 -start-2 w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-md">
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
              <Button variant="outline" className="rounded-xl font-black h-12 px-6 border-gray-100 dark:border-slate-800 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all">{t('common.viewMenu')}</Button>
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
           <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('fav.recommended')}</h3>
           <Button variant="ghost" className="text-emerald-600 font-bold text-xs" onClick={() => navigate('/products')}>{t('home.viewAll')}</Button>
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
  const { customerProfile, formatPrice, transactions, requestWithdrawal, showToast, t } = useApp();
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(customerProfile?.walletBalance || 0);
  const [depositAmt, setDepositAmt] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('MTN Mobile Money');
  const [momoNumber, setMomoNumber] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!user) return;
    WalletService.getBalance(user.id).then(w => setBalance(Number(w.balance) || 0)).catch(() => setBalance(0));
  }, [user]);

  if (!customerProfile) return null;

  const handleTopUp = async () => {
    const amt = Number(depositAmt);
    if (!amt || amt <= 0) return showToast('Enter Amount', 'Please enter a valid amount to top up.', 'warning');
    if (amt > 100000) return showToast('Amount Too High', 'Maximum single top-up is GHS 100,000.', 'warning');
    setDepositing(true);
    try {
      const tx = await WalletService.topUp(user!.id, { amount: amt, method: 'Mobile Money' });
      if (tx && tx.status === 'completed') {
        setBalance(b => b + amt);
        showToast('Top-Up Complete', `GHS ${amt.toLocaleString()} added to your wallet.`);
      } else {
        showToast('Payment Pending', 'Your top-up has been queued for payment confirmation.', 'info');
      }
      setDepositAmt('');
      setShowDeposit(false);
    } catch {
      showToast('Top-Up Failed', 'Could not process the top-up. Please try again.', 'warning');
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmt);
    if (!amt || amt <= 0) return showToast('Enter Amount', 'Please enter a valid amount to withdraw.', 'warning');
    if (amt > balance) return showToast('Insufficient Balance', 'Your wallet balance is too low for this withdrawal.', 'warning');
    if (!momoNumber.trim()) return showToast('Number Required', 'Enter the mobile money number to receive funds.', 'warning');
    setWithdrawing(true);
    try {
      await requestWithdrawal({ amount: amt, method: withdrawMethod, account: momoNumber.trim() });
      setBalance(b => b - amt);
      setWithdrawAmt('');
      setMomoNumber('');
      showToast('Withdrawal Requested', 'Our finance team will pay out within 24 hours.');
    } catch {
      // toast already shown by context
    } finally {
      setWithdrawing(false);
    }
  };

  const downloadCsv = () => {
    const header = 'ID,Type,Category,Amount,Status,Date,Description';
    const rows = transactions.map(t => [
      t.id, t.type, t.category, Number(t.amount) || 0, t.status || 'completed',
      new Date(t.date || t.createdAt).toISOString(),
      (t.description || t.category || '').replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnimarket-wallet-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Statement Downloaded', 'Your transaction history has been saved as CSV.');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('wallet.title')}</h1>
          <p className="text-sm text-gray-500">{t('wallet.subtitle')}</p>
        </div>
        <Badge variant="success" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">{t('wallet.secured')}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden p-8 flex flex-col justify-between h-72 group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
          <div className="space-y-1 relative z-10">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{t('wallet.balance')}</p>
            <p className="text-5xl font-black tracking-tighter">{formatPrice(balance)}</p>
          </div>
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-center text-[10px] text-emerald-100 font-bold border-t border-white/20 pt-6">
              <span className="uppercase tracking-widest">{t('wallet.points')}: {customerProfile.loyaltyPoints.toLocaleString()}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-lg">{t('wallet.redeem')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl font-black py-6 shadow-xl text-xs" onClick={() => setShowDeposit(true)}>
                <Plus className="w-4 h-4 me-2" /> {t('wallet.topUp')}
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-2xl font-black py-6 text-xs border border-white/20" onClick={() => setShowDeposit(true)}>
                {t('wallet.withdraw')}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">{t('wallet.paymentMethods')}</h3>
            <Button variant="ghost" className="text-emerald-600 font-black text-[10px] h-8" onClick={() => showToast('Coming Soon', 'Card and bank payment methods will be available soon.', 'info')}>{t('wallet.addNew')}</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-[2rem] border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between group relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-amber-400/20">MoMo</div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">MTN Mobile Money</p>
                  <p className="text-[10px] font-mono text-gray-500">{user?.phone || '024 **** 2011'}</p>
                </div>
              </div>
              <Badge variant="success" className="text-[8px] font-black absolute top-4 right-4">{t('address.default')}</Badge>
            </div>
            <button onClick={() => showToast('Coming Soon', 'Card linking will be available soon.', 'info')} className="p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all cursor-pointer text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20"><CreditCard className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">Visa Card</p>
                  <p className="text-[10px] font-mono text-gray-500">Not linked yet</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-all" />
            </button>
          </div>
          <div className="pt-4 flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/40">
            <Info className="w-5 h-5 text-blue-500" />
            <p className="text-[10px] text-blue-600 dark:text-blue-300 font-medium leading-relaxed">Your payment data is encrypted. We support MTN, Telecel, and AirtelTigo Mobile Money networks.</p>
          </div>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="border-b p-8">
          <CardTitle className="text-lg font-black uppercase tracking-widest">{t('wallet.history')}</CardTitle>
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
                    <td className="px-8 py-5 font-mono text-xs text-gray-400">{tx.id}</td>
                    <td className="px-8 py-5">
                       <p className="font-black text-gray-900 dark:text-white text-sm">{tx.category.replace('_', ' ')}</p>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{tx.description}</p>
                    </td>
                    <td className="px-8 py-5 text-gray-500 font-medium">{new Date(tx.date || tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-8 py-5"><Badge variant={tx.status === 'failed' ? 'danger' : tx.status === 'pending' ? 'warning' : 'success'} className="text-[9px] font-black uppercase px-2">{t(`status.${tx.status}`) || tx.status}</Badge></td>
                    <td className={cn("px-8 py-5 text-right font-black text-lg", tx.type === 'credit' ? "text-emerald-600" : "text-rose-600")}>
                      {tx.type === 'credit' ? '+' : '-'}{formatPrice(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <p className="text-sm font-black text-gray-900 dark:text-white">{t('wallet.noTransactions')}</p>
                      <p className="text-xs text-gray-400 mt-1">{t('wallet.noTransactionsDesc')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-6 px-8 border-t text-center bg-gray-50/30 dark:bg-slate-800/20">
            <Button variant="ghost" className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-emerald-600" onClick={downloadCsv}>
              <Download className="w-4 h-4 me-2" /> {t('wallet.downloadCsv')} <ArrowRight className="w-4 h-4 ms-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Up / Withdraw Modal */}
      <AnimatePresence>
        {showDeposit && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeposit(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Top Up Wallet</h3>
              <p className="text-xs text-gray-500 mt-1">Add funds instantly via mobile money. In development mode funds credit immediately.</p>
              <div className="space-y-3 mt-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Amount (GHS)</label>
                <input type="number" min="1" max="100000" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="e.g. 50.00" className="w-full rounded-xl border border-gray-200 dark:border-slate-700 h-12 px-4 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800" />
                <div className="flex gap-2 flex-wrap">
                  {[10, 20, 50, 100, 200].map(p => (
                    <button key={p} onClick={() => setDepositAmt(String(p))} className="px-4 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-black hover:bg-emerald-100 transition-all">GHS {p}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => setShowDeposit(false)} className="h-12 rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                <button onClick={handleTopUp} disabled={depositing} className="h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60">
                  {depositing ? 'Processing…' : 'Top Up Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// CART
// ============================================================
export function CustomerCartPage() {
  const navigate = useNavigate();
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    cartTotal,
    formatPrice,
    deliveryFee,
    estimatedTax,
    discountAmount,
    grandTotal,
    appliedCoupon,
    removeCoupon,
    t
  } = useApp();

  if (cart.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('cart.title')}</h1>
        <Card className="border-dashed border-2 py-24 text-center space-y-6 rounded-[3rem] bg-white dark:bg-slate-900 shadow-sm">
          <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-gray-300 shadow-inner">
            <ShoppingCart className="w-12 h-12" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t('cart.empty')}</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">{t('cart.emptyDesc')}</p>
          </div>
          <Button variant="brand" className="rounded-2xl px-12 py-7 font-black text-lg shadow-xl" onClick={() => navigate('/products')}>{t('nav.browse').toUpperCase()}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('cart.title')}</h1>
          <p className="text-sm text-gray-500">{cart.length} {t('cart.items')} {cart[0]?.product.vendorName}</p>
        </div>
        <button onClick={() => navigate('/products')} className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">{t('cart.addMore')}</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Items List */}
        <div className="space-y-4">
          {cart.map((item) => (
            <Card key={item.product.id} className="p-4 sm:p-6 rounded-[2.5rem] border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white dark:bg-slate-900">
              <div className="flex gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden flex-shrink-0 shadow-sm">
                  <img src={item.product.images?.[0] || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h4 className="font-black text-gray-900 dark:text-white text-base sm:text-lg truncate">{item.product.title}</h4>
                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{item.product.vendorName}</p>
                    </div>
                    <button className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm" onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-lg font-black text-gray-900 dark:text-white">{formatPrice(item.product.price)}</p>
                    <div className="flex items-center bg-gray-50 dark:bg-slate-800 rounded-xl p-1 shadow-inner ring-1 ring-gray-100 dark:ring-slate-700">
                      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white font-black text-lg" onClick={() => updateCartQuantity(item.product.id, -1)}>-</button>
                      <span className="w-10 text-center font-black text-sm text-gray-900 dark:text-white">{item.quantity}</span>
                      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white font-black text-lg" onClick={() => updateCartQuantity(item.product.id, 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <aside className="space-y-6">
          <Card className="rounded-[3rem] border-none bg-white dark:bg-slate-900 shadow-2xl p-8 space-y-6 border border-gray-100 dark:border-slate-800 lg:sticky lg:top-24">
            <h3 className="font-black text-xl uppercase tracking-widest border-b pb-4">{t('cart.summary')}</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>{t('cart.subtotal')}</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>{t('cart.tax')}</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(estimatedTax)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>{t('cart.deliveryFee')}</span>
                <span className="text-emerald-600 font-black">{formatPrice(deliveryFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs font-black text-emerald-600 uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> {t('cart.promo')}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-[0.2em]">{t('cart.total')}</span>
                <span className="text-3xl font-black text-emerald-600">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('deliver.route')}</p>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{appliedCoupon.code}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-widest">{t('cart.remove')}</button>
                </div>
              ) : (
                <div className="relative group">
                  <Tag className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input type="text" placeholder={t('cart.voucher')} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 ps-12 rounded-2xl text-[10px] font-black tracking-[0.3em] outline-none focus:border-emerald-500 focus:bg-white transition-all uppercase" />
                  <button className="absolute end-3 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-[10px] uppercase hover:underline">{t('cart.apply')}</button>
                </div>
              )}

              <Button className="w-full rounded-3xl bg-emerald-500 hover:bg-emerald-600 py-8 font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] uppercase tracking-widest" onClick={() => navigate('/checkout')}>
                {t('cart.checkout')}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
               <ShieldCheck className="w-4 h-4" /> {t('cart.ssl')}
            </div>
          </Card>

          <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/40 flex items-start gap-4">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="text-[10px] text-blue-600 dark:text-blue-300 font-medium leading-relaxed">{t('cart.terms')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ============================================================
// ADDRESSES
// ============================================================
export function CustomerAddressesPage() {
  const { customerProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, showToast, t } = useApp();

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
  const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ms-1";

  if (!customerProfile) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('address.title')}</h1>
          <p className="text-sm text-gray-500">{t('address.subtitle')}</p>
        </div>
        <Button className="rounded-[1.25rem] bg-emerald-500 hover:bg-emerald-600 font-black text-xs py-6 px-8 shadow-lg shadow-emerald-500/20" onClick={openAdd}><Plus className="w-4 h-4 me-2" /> {t('address.addNew')}</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {addresses.map(addr => (
          <Card key={addr.id} className={cn("p-8 rounded-[2.5rem] border-2 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden", addr.isDefault ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" : "border-gray-100 dark:border-slate-800")}>
            {addr.isDefault && (
               <div className="absolute top-0 end-0 bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-be-2xl uppercase tracking-widest">{t('address.default')}</div>
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
           <span className="font-black uppercase tracking-widest text-xs">{t('address.addNew')}</span>
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setModalOpen(false)} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{editing ? t('common.edit') + ' ' + t('nav.addresses') : t('address.addNew')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>{t('address.label')}</label>
              <select value={addrForm.title} onChange={e => setAddrForm({ ...addrForm, title: e.target.value })} className={inputClass}>
                <option>Home</option>
                <option>Work</option>
                <option>School</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>{t('address.deliveryArea')}</label>
              <input list="addr-takoradi" value={addrForm.address} onChange={e => setAddrForm({ ...addrForm, address: e.target.value })} placeholder={t('address.placeholder')} className={inputClass} />
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
               <MapPin className="w-4 h-4 me-2" /> {t('address.currentLocation')}
            </Button>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={saveAddress}>{editing ? t('common.save') : t('common.confirm')}</Button>
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
  const { conversations, showToast, sendMessage, t } = useApp();
  const { user } = useAuth();
  const location = useLocation();
  const [activeChatTab, setActiveChatTab] = useState<'Restaurant' | 'Rider'>('Restaurant');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  // Open a specific order-linked conversation when the tracking page routes here
  // with navigation state (conversationId + tab) instead of just dumping the user
  // on a generic inbox.
  useEffect(() => {
    const state = (location.state as any) || {};
    const convId = state.conversationId ? String(state.conversationId) : null;
    if (!convId) return;
    if (state.tab === 'Rider' || state.tab === 'Vendor') {
      setActiveChatTab(state.tab === 'Vendor' ? 'Restaurant' : state.tab);
    }
    setSelectedConvId(convId);
    setLoading(true);
    MessagingService.getMessages(convId)
      .then(rows => setMessages(Array.isArray(rows) ? rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)) : []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.conversationId]);

  const filteredChats = conversations.filter(c => {
    const typeOk =
      activeChatTab === 'Restaurant' ? c.type === 'customer_vendor' :
      c.type === 'customer_rider';
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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('msg.title')}</h1>
          <p className="text-sm text-gray-500">{t('msg.subtitle')}</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden flex">
        {/* Chat List */}
        <div className={cn("w-full md:w-80 border-r border-gray-50 dark:border-slate-800 flex flex-col", selectedConvId && "hidden md:flex")}>
          <div className="p-4 space-y-4">
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['Restaurant', 'Rider'] as const).map((tab) => (
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
                  {tab === 'Restaurant' ? t('msg.restaurant') : t('msg.rider')}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('msg.search')} className="w-full bg-gray-50 dark:bg-slate-800 border-none ps-10 py-3 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredChats.length === 0 ? (
               <div className="py-12 text-center">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('msg.noChats')} {activeChatTab === 'Restaurant' ? t('msg.restaurant') : t('msg.rider')}</p>
               </div>
            ) : filteredChats.map(chat => {
              const partner = chat.participants && chat.participants[0];
              return (
                <div key={chat.id} onClick={() => loadMessages(chat.id)} className={cn("p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all mb-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/20", selectedConvId === chat.id && "bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20")}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                    {partner?.avatar ? <img src={partner.avatar} className="w-full h-full object-cover" /> : (partner?.name ? partner.name.charAt(0) : '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{partner?.name || chat.subject || t('msg.unknownParticipant')}</p>
                      <span className="text-[9px] text-gray-400">{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{chat.lastMessage || t('msg.emptyDesc')}</p>
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
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('msg.empty')}</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-2">{t('msg.emptyDesc')}</p>
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
                  <p className="text-[10px] text-gray-500">{selectedConv.orderId ? `${t('msg.orderThread')} · ${selectedConv.subject || ''}` : activeChatTab}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-slate-950/20">
                {loading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-12">{t('msg.noChats')} — say hello!</p>
                ) : messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm", mine ? "bg-emerald-500 text-white rounded-be-md" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bs-md")}>
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
                  placeholder={t('msg.typePlaceholder')}
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
  return <NotificationCenter role="customer" />;
}

// ============================================================
// PROFILE
// ============================================================
export function CustomerProfilePage() {
  const { customerProfile, formatPrice, updateProfile, isLoading, showToast, t, language, setLanguage } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', avatar: '' });
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
        const src = event.target?.result as string;
        if (src) setCropSrc(src);
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
      <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('nav.profile')}</h1>

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
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('wallet.points')}</p>
                <p className="text-xl font-black text-emerald-600">{customerProfile.loyaltyPoints.toLocaleString()}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('nav.wallet')}</p>
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
                {customerProfile.isEmailVerified ? (
                  <Badge variant="success" className="text-[9px] font-black px-2">VERIFIED</Badge>
                ) : (
                  <Badge variant="warning" className="text-[9px] font-black px-2">NOT VERIFIED</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">Phone Verification</span>
                {customerProfile.isPhoneVerified ? (
                  <Badge variant="success" className="text-[9px] font-black px-2">VERIFIED</Badge>
                ) : (
                  <Badge variant="warning" className="text-[9px] font-black px-2">NOT VERIFIED</Badge>
                )}
              </div>
              {(customerProfile as any).idVerified ? (
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-500">Ghana Card (ID)</span>
                  <Badge variant="success" className="text-[9px] font-black px-2">VERIFIED</Badge>
                </div>
              ) : null}
            </div>
            <Button variant="outline" className="w-full rounded-2xl text-[10px] font-black h-12 border-gray-100 hover:border-emerald-500 hover:text-emerald-500 transition-all uppercase tracking-widest">Upgrade to Premium</Button>
          </Card>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[3rem] border-gray-100 dark:border-slate-800 shadow-sm p-8 sm:p-12">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t('settings.account')}</h3>
              <Button variant="brand" className="rounded-2xl px-10 py-6 font-black text-sm shadow-xl" onClick={saveProfile}>{t('common.save')}</Button>
            </div>

            <form className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.fullName')}</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.email')}</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.phone')}</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Emergency Contact (Ghana)</label>
                <input type="tel" placeholder="+233 2X XXX XXXX" className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('nav.language')}</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as any)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none"
                >
                  <option value="EN">English (Global)</option>
                  <option value="FR">Français (Global)</option>
                  <option value="ES">Español (Global)</option>
                  <option value="DE">Deutsch (Global)</option>
                  <option value="ZH-CN">中文 (简体)</option>
                  <option value="AR">العربية (Global)</option>
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

      <ImageCropModal
        open={!!cropSrc}
        imageSrc={cropSrc || ''}
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => {
          setForm(f => ({ ...f, avatar: dataUrl }));
          showToast('Photo Processed', 'Tap Save Changes to update your picture.');
          setCropSrc(null);
        }}
        aspect={1}
        maxOutputSize={500}
        title="Crop Profile Photo"
      />
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
export function CustomerSettingsPage() {
  const navigate = useNavigate();
  const { showToast, customerProfile, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, isLoading, formatPrice, currency, setCurrency, language, setLanguage, t } = useApp();
  const { user, updateUser, logout, changePassword } = useAuth();
  const [section, setSection] = useState<'account' | 'delivery' | 'payments' | 'preferences' | 'security' | 'support'>('account');

  const changeSection = (s: typeof section) => {
    setSection(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [emailStep, setEmailStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [emailCode, setEmailCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const emailVerified = !!(user?.isEmailVerified || user?.isVerified);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    momoProvider: 'MTN MoMo',
    momoNumber: '',
    momoAccountName: '',
  });

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const addresses = Array.isArray(customerProfile?.addresses) ? customerProfile.addresses : [];
  const [addrModal, setAddrModal] = useState(false);
  const [editingAddr, setEditingAddr] = useState<any>(null);
  const [addrForm, setAddrForm] = useState({ title: 'Home', address: '', latitude: 4.8920, longitude: -1.7580 });

  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Seed from the loaded profile (loaded asynchronously) so nothing is lost.
  useEffect(() => {
    if (!customerProfile) return;
    setForm(f => ({
      ...f,
      name: customerProfile.name || '',
      phone: customerProfile.phone || '',
      email: customerProfile.email || '',
      avatar: customerProfile.avatar || '',
      momoProvider: customerProfile.momo?.provider || 'MTN MoMo',
      momoNumber: customerProfile.momo?.number || '',
      momoAccountName: customerProfile.momo?.accountName || '',
    }));
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
        const src = event.target?.result as string;
        if (src) setCropSrc(src);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSave = async (sectionName: 'profile' | 'payment') => {
    if (!customerProfile) return;
    try {
      const patch: any = {};
      if (sectionName === 'profile') {
        patch.name = form.name;
        patch.phone = form.phone;
        patch.email = form.email;
        patch.avatar = form.avatar;
      } else {
        patch.momo = { provider: form.momoProvider, number: form.momoNumber, accountName: form.momoAccountName };
      }
      await updateProfile(patch);
      showToast('Saved', sectionName === 'profile' ? 'Your profile has been updated.' : 'Mobile money details saved.');
    } catch (err) {
      console.error(err);
      showToast('Save Failed', 'Could not save changes. Please try again.', 'warning');
    }
  };

  const requestEmailVerification = async () => {
    setEmailBusy(true);
    try {
      const res = await AuthApiService.sendVerification();
      if (res.emailVerified) {
        setEmailStep('verified');
        updateUser({ isEmailVerified: true, isVerified: true });
        showToast('Email Verified', 'Your email is verified.');
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
      showToast('Email Verified', 'Your email is now verified.');
    } catch (err: any) {
      console.error(err);
      showToast('Invalid Code', err?.message || 'The code could not be verified.', 'warning');
    } finally {
      setEmailBusy(false);
    }
  };

  const openAddAddr = () => {
    setEditingAddr(null);
    setAddrForm({ title: 'Home', address: '', latitude: 4.8920, longitude: -1.7580 });
    setAddrModal(true);
  };
  const openEditAddr = (a: any) => {
    setEditingAddr(a);
    setAddrForm({ title: a.title || 'Home', address: a.address || '', latitude: Number(a.latitude) || 4.8920, longitude: Number(a.longitude) || -1.7580 });
    setAddrModal(true);
  };
  const useAddrLocation = () => {
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
      if (editingAddr) await updateAddress(editingAddr.id, payload);
      else await addAddress(payload);
      setAddrModal(false);
      showToast('Saved', editingAddr ? 'Address updated.' : 'Address added to your delivery list.');
    } catch (err) {
      showToast('Save Failed', 'Could not save the address. Please try again.', 'warning');
    }
  };

  const handleChangePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) { showToast('Missing Fields', 'Fill in all password fields.', 'warning'); return; }
    if (pw.next.length < 8) { showToast('Weak Password', 'New password must be at least 8 characters.', 'warning'); return; }
    if (pw.next !== pw.confirm) { showToast('Passwords Do Not Match', 'Confirm your new password before saving.', 'warning'); return; }
    setPwBusy(true);
    try {
      const res = await changePassword(pw.current, pw.next);
      if (res.success) {
        setPw({ current: '', next: '', confirm: '' });
        showToast('Password Updated', 'Use your new password next time you sign in.');
      } else {
        showToast('Change Failed', res.error || 'Could not update your password.', 'warning');
      }
    } catch (err: any) {
      showToast('Change Failed', err?.message || 'Could not update your password.', 'warning');
    } finally {
      setPwBusy(false);
    }
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const CURRENCIES: { code: CurrencyCode; label: string }[] = [
    { code: 'GHS', label: 'Ghana Cedi (GH₵)' },
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'GBP', label: 'British Pound (£)' },
    { code: 'NGN', label: 'Nigerian Naira (₦)' },
    { code: 'JPY', label: 'Japanese Yen (¥)' },
  ];

  if (isLoading || !customerProfile) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all";
  const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ms-1";

  const NAV = (t: any): { key: typeof section; icon: any; label: string; desc: string }[] => [
    { key: 'account', icon: UserRound, label: t('settings.account'), desc: t('settings.accountDesc') },
    { key: 'delivery', icon: MapPin, label: t('settings.delivery'), desc: t('settings.deliveryDesc') },
    { key: 'payments', icon: Wallet, label: t('settings.payments'), desc: t('settings.paymentsDesc') },
    { key: 'preferences', icon: SlidersHorizontal, label: t('settings.preferences'), desc: t('settings.preferencesDesc') },
    { key: 'security', icon: ShieldCheck, label: t('settings.security'), desc: t('settings.securityDesc') },
    { key: 'support', icon: LifeBuoy, label: t('settings.support'), desc: t('settings.supportDesc') },
  ];

  const navItems = NAV(t);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500">{t('settings.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Sidebar nav */}
        <aside className="lg:sticky lg:top-24">
          <div className="flex gap-2 lg:flex-col overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {navItems.map(n => (
              <button
                key={n.key}
                onClick={() => changeSection(n.key)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all shrink-0",
                  section === n.key
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-white dark:bg-slate-900 text-gray-500 border border-gray-100 dark:border-slate-800 hover:border-emerald-400"
                )}
              >
                <n.icon className="w-5 h-5" />
                <span className="hidden lg:block">
                  <span className="block text-xs font-black">{n.label}</span>
                  <span className={cn("block text-[10px] font-medium", section === n.key ? "text-emerald-100" : "text-gray-400")}>{n.desc}</span>
                </span>
              </button>
            ))}
            <button
              onClick={() => setLogoutConfirm(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all shrink-0 bg-white dark:bg-slate-900 text-rose-500 border border-rose-100 dark:border-rose-900/40 hover:border-rose-400"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden lg:block text-xs font-black">{t('nav.logout')}</span>
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 max-w-3xl space-y-6">
          {section === 'account' && (
            <>
              <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative group">
                    <img src={form.avatar} className="w-28 h-28 rounded-[2rem] object-cover ring-8 ring-emerald-500/10 shadow-xl group-hover:scale-105 transition-transform duration-700" />
                    <button onClick={() => pickImage()} className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-emerald-500 text-white shadow-xl hover:scale-110 transition-transform ring-4 ring-white dark:ring-slate-900">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('settings.profilePicture')}</h3>
                    <p className="text-xs text-gray-500 font-medium">{t('settings.accountDesc')}</p>
                    <div className="flex flex-wrap gap-2 pt-2 justify-center sm:justify-start">
                      <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black" onClick={() => pickImage()}>
                        <Smartphone className="w-4 h-4 me-1" /> {t('fav.recent').toUpperCase()}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={labelClass}>{t('settings.fullName')}</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>{t('settings.phone')}</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className={labelClass}>{t('settings.email')}</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="brand" className="rounded-2xl px-10 py-6 font-black text-sm shadow-xl" onClick={() => handleSave('profile')}>
                    {t('settings.saveProfile')}
                  </Button>
                </div>
              </Card>

              <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600"><ShieldCheck className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Email Verification</h3>
                    <p className="text-xs text-gray-500 font-medium">Verified emails unlock order receipts and swifter support. Demo code: 123456</p>
                  </div>
                </div>

                {emailVerified ? (
                  <div className="flex items-center gap-3 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">Email Verified</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">{form.email || user?.email}</p>
                    </div>
                  </div>
                ) : emailStep === 'sent' ? (
                  <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit verification code"
                      value={emailCode}
                      onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-14 rounded-2xl border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-5 text-sm font-bold outline-none focus:ring-2 ring-violet-400"
                    />
                    <Button variant="brand" className="rounded-2xl px-8 font-black text-xs" onClick={submitEmailVerification} disabled={emailBusy || emailCode.length < 6}>
                      {emailBusy ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <p className="flex-1 text-sm font-bold text-gray-600 dark:text-gray-300">
                      Verify <span className="text-violet-600">{form.email || user?.email || 'your email'}</span> to secure your account.
                    </p>
                    <Button variant="brand" className="rounded-2xl px-8 font-black text-xs" onClick={requestEmailVerification} disabled={emailBusy}>
                      {emailBusy ? 'Sending...' : 'Verify Email'}
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}

          {section === 'delivery' && (
            <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500"><MapPin className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Delivery Addresses</h3>
                    <p className="text-xs text-gray-500 font-medium">Places riders deliver to or you pick up from</p>
                  </div>
                </div>
                <Button className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-black text-xs py-5" onClick={openAddAddr}><Plus className="w-4 h-4 me-2" /> Add Address</Button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-gray-500">No saved addresses yet</p>
                  <Button className="rounded-2xl font-black text-xs" onClick={openAddAddr}><Plus className="w-4 h-4 me-2" /> Add your first address</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(addr => (
                    <div key={addr.id} className={cn("p-5 rounded-2xl border-2 flex items-center gap-4 transition-all", addr.isDefault ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" : "border-gray-100 dark:border-slate-800 hover:border-emerald-200")}>
                      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0", addr.isDefault ? "bg-emerald-500 text-white" : "bg-gray-50 dark:bg-slate-800 text-gray-400")}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-gray-900 dark:text-white">{addr.title || 'Address'}</p>
                          {addr.isDefault && <Badge variant="success" className="rounded-lg text-[8px] uppercase tracking-widest">Default</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 font-medium truncate">{addr.address}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {!addr.isDefault && (
                          <Button size="sm" variant="ghost" className="rounded-xl text-[9px] font-black text-emerald-600" onClick={() => setDefaultAddress(addr.id)}>Set default</Button>
                        )}
                        <button onClick={() => openEditAddr(addr)} className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-emerald-500 transition-all"><Settings className="w-4 h-4" /></button>
                        <button onClick={() => deleteAddress(addr.id)} className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {section === 'payments' && (
            <>
              <Card className="rounded-[2.5rem] p-8 sm:p-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl space-y-5 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Wallet Balance</p>
                  <Coins className="w-6 h-6 opacity-80" />
                </div>
                <p className="text-4xl font-black">{formatPrice(customerProfile.walletBalance)}</p>
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl font-black text-xs py-5" onClick={() => navigate('/customer/wallet')}>Manage Wallet</Button>
                  <Button variant="ghost" className="text-white hover:bg-white/10 rounded-2xl font-black text-xs py-5" onClick={() => navigate('/customer/wallet')}>View Transactions</Button>
                </div>
              </Card>

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
            </>
          )}

          {section === 'preferences' && (
            <>
              <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600"><Globe2 className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('nav.currency')}</h3>
                    <p className="text-xs text-gray-500 font-medium">{t('settings.currencyDesc')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>{t('nav.currency')}</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as CurrencyCode)}
                    className={inputClass}
                  >
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              </Card>

              <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><Languages className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('nav.language')}</h3>
                    <p className="text-xs text-gray-500 font-medium">{t('settings.languageDesc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { code: 'EN', label: 'English' },
                    { code: 'FR', label: 'Français' },
                    { code: 'ES', label: 'Español' },
                    { code: 'DE', label: 'Deutsch' },
                    { code: 'ZH-CN', label: '中文' },
                    { code: 'AR', label: 'العربية' }
                  ].map((langOption) => (
                    <button
                      key={langOption.code}
                      onClick={() => setLanguage(langOption.code as any)}
                      className={cn("p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                        language === langOption.code ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-gray-100 bg-gray-50 dark:bg-slate-800 text-gray-400")}
                    >
                      <span className="text-sm font-black uppercase tracking-widest">{langOption.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}

          {section === 'security' && (
            <Card className="rounded-[2.5rem] p-8 sm:p-10 border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500"><KeyRound className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('settings.changePassword')}</h3>
                  <p className="text-xs text-gray-500 font-medium">{t('auth.remember')} <b className="text-gray-700 dark:text-gray-300">{user?.email}</b></p>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>{t('settings.currentPassword')}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} placeholder={t('settings.currentPassword')} className={cn(inputClass, "pr-14")} />
                  <button onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500" type="button">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>{t('settings.newPassword')}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} placeholder="At least 8 characters" className={cn(inputClass, "pe-14")} />
                  <button onClick={() => setShowPw(v => !v)} className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500" type="button">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>{t('settings.confirmPassword')}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} placeholder="Repeat your new password" className={cn(inputClass, "pe-14")} />
                  <button onClick={() => setShowPw(v => !v)} className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500" type="button">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="brand" className="rounded-2xl px-10 py-6 font-black text-sm shadow-xl" onClick={handleChangePassword} disabled={pwBusy}>
                  {pwBusy ? t('common.loading') : t('settings.updatePassword')}
                </Button>
              </div>
            </Card>
          )}

          {section === 'support' && (
            <>
              <p className="text-xs text-gray-500 font-medium">{t('support.subtitle')}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: LifeBuoy, title: t('support.title'), desc: t('support.liveChatDesc'), path: '/customer/support' },
                  { icon: MessageSquare, title: t('msg.title'), desc: t('msg.emptyDesc'), path: '/customer/messages' },
                  { icon: Star, title: t('rev.title'), desc: t('rev.emptyDesc'), path: '/customer/reviews' },
                  { icon: FileText, title: t('nav.orders'), desc: t('orders.subtitle'), path: '/customer/orders' },
                  { icon: MapPin, title: t('nav.addresses'), desc: t('address.subtitle'), path: '/customer/addresses' },
                  { icon: Bell, title: t('nav.notifications'), desc: t('nav.notifications'), path: '/customer/notifications' },
                ].map(item => (
                  <button key={item.path} onClick={() => navigate(item.path)} className="p-6 rounded-[2rem] border-2 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-left flex items-center gap-4 shadow-sm hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-800 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-[10px] text-gray-400 font-medium truncate">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ImageCropModal
        open={!!cropSrc}
        imageSrc={cropSrc || ''}
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => {
          setForm(f => ({ ...f, avatar: dataUrl }));
          showToast('Photo Processed', 'Tap SAVE to update your profile picture.');
          setCropSrc(null);
        }}
        aspect={1}
        maxOutputSize={500}
        title="Crop Profile Photo"
      />

      {addrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setAddrModal(false)} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{editingAddr ? 'Edit Address' : 'Add New Address'}</h3>
              <button onClick={() => setAddrModal(false)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
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
              <input list="settings-addr-takoradi" value={addrForm.address} onChange={e => setAddrForm({ ...addrForm, address: e.target.value })} placeholder="Select or type your neighbourhood" className={inputClass} />
              <datalist id="settings-addr-takoradi">
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

            <p className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Takoradi, Western Region
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-2xl font-black text-xs" onClick={useAddrLocation}>
                <ArrowRight className="w-4 h-4 me-2" /> USE CURRENT LOCATION
              </Button>
              <Button className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-black text-xs" onClick={saveAddress}>
                {editingAddr ? 'Update' : 'Add'} Address
              </Button>
            </div>
          </div>
        </div>
      )}

      {logoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setLogoutConfirm(false)} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 max-w-sm w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto text-rose-500">
              <LogOut className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Log out of OmniMarket?</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">You will need to sign in again on this device.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-2xl font-black text-xs" onClick={() => setLogoutConfirm(false)}>Cancel</Button>
              <Button variant="danger" className="rounded-2xl font-black text-xs" onClick={confirmLogout}>Log Out</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// REVIEWS
// ============================================================
export function CustomerReviewsPage() {
  const { formatPrice, reviews, vendors, products, showToast, orders, t } = useApp();
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
        productId: selectedOrder.items?.[0]?.productId,
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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('rev.title')}</h1>
          <p className="text-sm text-gray-500">{t('rev.subtitle')}</p>
        </div>
        <Card className="p-5 px-8 flex items-center gap-6 border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-[2rem]">
          <div className="text-center border-r border-white/20 pr-6">
            <p className="text-[9px] font-black uppercase opacity-80 tracking-widest mb-1">{t('rev.impact')}</p>
            <p className="text-2xl font-black">{(reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0).toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase opacity-80 tracking-widest mb-1">{t('rev.total')}</p>
            <p className="text-2xl font-black">{reviews.length}</p>
          </div>
        </Card>
      </div>

      <div className="max-w-4xl space-y-6">
        {reviews.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 rounded-[3rem] bg-gray-50/30 dark:bg-slate-900/30">
            <Star className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('rev.empty')}</h3>
            <p className="text-sm text-gray-500">{t('rev.emptyDesc')}</p>
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
                      <h4 className="font-black text-lg text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">{vendor?.name || t('msg.restaurant')}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{product?.title || t('nav.products')} | {new Date(rev.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 rounded-2xl">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-4 h-4", i < rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                </div>
                <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed font-medium italic px-4 border-s-4 border-emerald-500/20">"{rev.comment}"</p>

                {rev.reply && (
                   <div className="mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                     <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">{t('rev.responseFrom')}</p>
                     <p className="text-sm text-gray-600 dark:text-gray-400">{rev.reply}</p>
                   </div>
                )}
              </Card>
            );
          })
        )}
        <Button variant="outline" className="w-full rounded-[2.5rem] border-dashed border-2 py-10 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all" onClick={openRate} disabled={reviewableOrders.length === 0}>
          <Plus className="w-5 h-5 me-3" /> {reviewableOrders.length > 0 ? t('rev.rateOrder') : t('rev.empty')}
        </Button>
      </div>

      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setRateModal(false)} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-5">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('rev.rateOrder')}</h3>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('nav.orders')}</label>
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
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('rev.rating')}</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} type="button" onClick={() => setRating(s)} className="p-1">
                    <Star className={cn("w-8 h-8", s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('rev.yourReview')}</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={t('rev.commentPlaceholder')} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRateModal(false)}>{t('common.cancel')}</Button>
              <Button className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={submitReview} disabled={posting || rating === 0}>
                {posting ? t('common.loading') : t('rev.submit')}
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
  const { showToast, t } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // A pre-created support conversation may be forwarded here via navigation state.
  useEffect(() => {
    const state = (location.state as any) || {};
    const convId = state.supportConversationId ? String(state.supportConversationId) : null;
    if (convId) {
      setChatConversationId(convId);
      setChatOpen(true);
      openChatLog(convId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.supportConversationId]);

  const openChatLog = async (convId: string) => {
    setChatLoading(true);
    try {
      const rows = await MessagingService.getMessages(convId);
      setChatLog(Array.isArray(rows) ? rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)) : []);
    } catch {
      setChatLog([]);
    } finally {
      setChatLoading(false);
    }
  };

  const startChat = async () => {
    if (!user) {
      showToast('Sign in required', 'Create an account to message our support team.', 'warning');
      navigate('/login');
      return;
    }
    setChatBusy(true);
    try {
      const conv = await MessagingService.supportConversation({
        subject: `Support Request - ${user.displayName || user.firstName || 'Customer'}`,
      });
      setChatConversationId(conv.id);
      setChatOpen(true);
      await openChatLog(conv.id);
    } catch {
      showToast('Could not open support', 'Please try again.', 'warning');
    } finally {
      setChatBusy(false);
    }
  };

  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content || !chatConversationId || !user) return;
    setChatSending(true);
    try {
      await MessagingService.sendMessage({ conversationId: chatConversationId, senderId: user.id, content });
      setChatInput('');
      await openChatLog(chatConversationId);
    } catch {
      showToast('Send Failed', 'Could not send the message. Please try again.', 'warning');
    } finally {
      setChatSending(false);
    }
  };

  const faqs = [
    { q: 'How do I top up my OmniWallet?', a: 'You can top up your wallet using any Mobile Money network (MTN, Telecel, AirtelTigo) or a Visa/Mastercard directly in the Wallet section.' },
    { q: 'What areas in Takoradi do you deliver to?', a: 'We currently deliver to Market Circle, Fijai, Anaji, Chapel Hill, Kwesimintsim, Sekondi, and surrounding areas.' },
    { q: 'How long does delivery take?', a: 'Average delivery time in Takoradi is 25-45 minutes depending on the restaurant prep time and rider distance.' },
    { q: 'My food arrived cold, what can I do?', a: 'We are sorry to hear that! Please use the "Report Order Issue" button below to open a ticket or start a Live Chat for immediate assistance.' }
  ];

  const submitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      return showToast('Missing Details', 'Please add both a subject and a message.', 'warning');
    }
    setSubmittingTicket(true);
    try {
      await AdminService.createTicket({
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        priority: 'normal'
      });
      showToast('Ticket Created', 'Our support team will respond within 15 minutes.');
      setTicketOpen(false);
      setTicketSubject('');
      setTicketMessage('');
    } catch {
      showToast('Error', 'Could not submit your ticket. Please try again.', 'warning');
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('support.title')}</h1>
        <p className="text-sm text-gray-500">{t('support.subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="p-8 rounded-[3rem] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white space-y-5 shadow-2xl shadow-emerald-500/20 text-center group">
          <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform"><MessageCircle className="w-10 h-10" /></div>
          <h3 className="text-xl font-black">{t('support.liveChat')}</h3>
          <p className="text-xs text-emerald-50 font-medium opacity-90 leading-relaxed">{t('support.liveChatDesc')}</p>
          <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl font-black py-7 shadow-xl" onClick={startChat} disabled={chatBusy}>{chatBusy ? t('support.opening') : t('support.startChat')}</Button>
        </Card>
        <Card className="p-8 rounded-[3rem] border-gray-100 dark:border-slate-800 shadow-sm space-y-5 text-center group hover:shadow-xl transition-all">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-blue-500 group-hover:scale-110 transition-transform shadow-sm"><Phone className="w-10 h-10" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('support.emergency')}</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{t('support.emergencyDesc')}</p>
          <Button variant="outline" className="w-full rounded-2xl font-black py-7 border-gray-100 hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm" onClick={() => window.open('tel:+233240000001')}>Call 024 000 0001</Button>
        </Card>
        <Card className="p-8 rounded-[3rem] border-gray-100 dark:border-slate-800 shadow-sm space-y-5 text-center group hover:shadow-xl transition-all">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500 group-hover:scale-110 transition-transform shadow-sm"><AlertCircle className="w-10 h-10" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('support.reportIssue')}</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{t('support.reportIssueDesc')}</p>
          <Button variant="outline" className="w-full rounded-2xl font-black py-7 border-gray-100 hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm" onClick={() => setTicketOpen(true)}>{t('support.ticket')}</Button>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center">{t('support.faq')}</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {faqs.map((faq, i) => (
            <Card key={i} className="p-8 rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm group hover:border-emerald-500/30 transition-all hover:shadow-lg">
              <h4 className="font-black text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-widest">{faq.q}</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">{faq.a}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Live support chat (thread with the operations desk) */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs font-black">Live Support Chat</p>
                  <p className="text-[10px] text-emerald-100">OmniMarket operations desk · 24/7</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20" aria-label="Close support chat"><X className="w-4 h-4" /></button>
            </div>
            <div className="h-72 overflow-y-auto p-4 space-y-3 bg-gray-50/30 dark:bg-slate-950/30">
              {chatLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
              ) : chatLog.length === 0 ? (
                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-12">No messages yet — say hello!</p>
              ) : chatLog.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm", mine ? "bg-emerald-500 text-white rounded-be-md" : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bs-md")}>
                      <p className="leading-relaxed">{m.content}</p>
                      <p className={cn("text-[9px] mt-1", mine ? "text-emerald-100" : "text-gray-400")}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                placeholder="Type a message…"
                className="flex-1 bg-gray-50 dark:bg-slate-800 border-2 border-transparent px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
              />
              <button onClick={sendChat} disabled={chatSending || !chatInput.trim()} className="p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg disabled:opacity-40 transition-all">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Ticket Modal */}
      <AnimatePresence>
        {ticketOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setTicketOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Report an Issue</h3>
              <p className="text-xs text-gray-500 mt-1">Our support team reviews every ticket within 15 minutes.</p>
              <div className="space-y-3 mt-6">
                <input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Subject (e.g. Cold meal)" className="w-full rounded-xl border border-gray-200 dark:border-slate-700 h-12 px-4 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800" />
                <textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} rows={5} placeholder="Describe the issue in detail…" className="w-full rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => setTicketOpen(false)} className="h-12 rounded-2xl border-2 border-gray-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                <button onClick={submitTicket} disabled={submittingTicket} className="h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all disabled:opacity-60">
                  {submittingTicket ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Map the old exports to new functional components
export function CustomerWishlistPage() { return <CustomerFavoritesPage />; }
export function CustomerPaymentMethodsPage() { return <CustomerWalletPage />; }
export function CustomerCouponsPage() {
  const { showToast, t } = useApp();
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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('nav.coupons')}</h1>
          <p className="text-sm text-gray-500">Active promo codes on the platform. Apply them at checkout for discounts</p>
        </div>
      </div>

      {couponState === 'loading' && <p className="text-center text-gray-400 py-12">{t('common.loading')}</p>}
      {couponState === 'error' && (
        <div className="text-center py-12">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="text-gray-500">{t('common.error')}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={load}>{t('common.retry')}</Button>
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
