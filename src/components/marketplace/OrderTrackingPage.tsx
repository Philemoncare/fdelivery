import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import {
  Bike,
  Store,
  MapPin,
  Star,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  ShieldCheck,
  AlertCircle,
  Play,
  Search,
  Lock,
  ArrowRight
} from 'lucide-react';
import { OrderStatus } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { LiveMap } from '../common/LiveMap';
import { OrderService } from '@/src/services/api';

export const OrderTrackingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    orders,
    selectedOrder,
    setSelectedOrder,
    formatPrice,
    updateOrderStatus,
    riders,
    isLoading
  } = useApp();

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [foundOrder, setFoundOrder] = useState<any>(null);

  useEffect(() => {
    if (!isInvoiceOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isInvoiceOpen]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    setVerifying(true);
    setFoundOrder(null);
    try {
      const order = await OrderService.trackingLookup(trackingNumber.trim());
      setFoundOrder(order || 'not_found');
    } catch {
      setFoundOrder('not_found');
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>;
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Track Your Meal</h1>
          <p className="text-gray-500 dark:text-gray-400">Enter your order ID to see the status of your delivery.</p>
        </div>

        <form onSubmit={handleTrack} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order ID / Tracking Number</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. ord-9041"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl focus:border-emerald-500 outline-none font-mono text-lg transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
          >
            {verifying ? 'Verifying...' : <>Track Order <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {foundOrder === 'not_found' && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center gap-3 text-sm font-medium animate-shake">
            <AlertCircle className="w-5 h-5" /> No order found with that ID. Please check and try again.
          </div>
        )}

        {foundOrder && foundOrder !== 'not_found' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-lg space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Current Status</p>
                <h3 className="text-xl font-black text-emerald-600 uppercase">{foundOrder.status}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Restaurant</p>
                <p className="font-bold text-gray-900 dark:text-white">{foundOrder.vendorName}</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-start gap-4">
              <Lock className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Live GPS Tracking Locked</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  For security, live rider locations and maps are only available to logged-in customers.
                </p>
                <Link to="/login" className="inline-block text-xs font-black text-emerald-600 mt-2 hover:underline flex items-center gap-1">
                  <span>Login to view live map</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const myOrders = (orders || []).filter(o => o.userId === user?.id);
  const tracked = foundOrder && foundOrder !== 'not_found' && (orders || []).find(o => o.id === foundOrder.id) ? (orders || []).find(o => o.id === foundOrder.id) : null;
  const activeOrder = tracked || selectedOrder || (myOrders?.length > 0 ? myOrders[0] : null);

  const changeOrder = (id: string) => {
    const next = (orders || []).find(o => o.id === id);
    if (next) setSelectedOrder(next);
  };

  if (!activeOrder) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <h3 className="text-lg font-bold">No active orders found</h3>
      </div>
    );
  }

  const steps: { key: OrderStatus; label: string }[] = [
    { key: 'confirmed', label: 'Accepted' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready_for_pickup', label: 'Ready' },
    { key: 'rider_assigned', label: 'Rider Paired' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'in_transit', label: 'On the Way' },
    { key: 'arriving', label: 'Arriving' },
    { key: 'delivered', label: 'Delivered' }
  ];
  const currentStepIndex = steps.findIndex(s => s.key === activeOrder.status);
  const progressPercent = activeOrder.routeProgress ?? (currentStepIndex >= 0 ? (currentStepIndex + 1) * (100 / steps.length) : 5);

  const rider = activeOrder.dispatchRider || (riders?.length > 0 ? riders[0] : null);

  if (!rider) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-amber-800 dark:text-amber-200">Assigning a Rider...</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">We are matching your order #{activeOrder.id} with the nearest dispatch rider in Takoradi. Your order is confirmed — keep this reference handy.</p>
          </div>
        </div>

        {/* Printable confirmation receipt */}
        <div className="om-receipt bg-white text-gray-900 rounded-3xl border border-gray-200 shadow-xl p-6 font-mono text-sm">
          <div className="flex items-center justify-between border-b-2 border-dashed border-gray-300 pb-4">
            <div>
              <p className="text-lg font-black tracking-widest">OMNIMARKET</p>
              <p className="text-[10px] tracking-widest text-gray-500 uppercase">Order Confirmation</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">#{activeOrder.orderNumber || activeOrder.id}</p>
              <p className="text-[10px] text-gray-400">{new Date(activeOrder.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="py-4 space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-500">Restaurant</span><span className="font-bold">{activeOrder.vendorName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-bold uppercase">{activeOrder.status.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-bold">{activeOrder.paymentMethod}</span></div>
          </div>

          <div className="py-4 border-t border-dashed border-gray-300 space-y-1.5">
            {(activeOrder.items || []).map((it: any, idx: number) => (
              <div key={idx} className="flex justify-between gap-2 text-[11px]">
                <span className="flex-1">{it.quantity} x {it.productName || 'Meal'}</span>
                <span className="font-bold whitespace-nowrap">{formatPrice((it.unitPrice || it.price || 0) * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="py-4 border-t border-dashed border-gray-300 space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-bold">{formatPrice(activeOrder.subtotal || activeOrder.totalAmount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span className="font-bold">{formatPrice(activeOrder.deliveryFee || 0)}</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-300 text-sm font-black">
              <span>GRAND TOTAL</span>
              <span className="text-emerald-600">{formatPrice(activeOrder.totalAmount)}</span>
            </div>
          </div>

          <p className="text-[9px] text-gray-400 text-center pt-2">Keep this reference for rider coordination. Thank you for ordering with OmniMarket.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print / Save Receipt
          </button>
          <button
            onClick={() => navigate('/customer/orders')}
            className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" /> View My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Bar with Order Selector & Printable Invoice Trigger */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Rider Dispatch Tracking</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold flex items-center gap-2">
            Order #{activeOrder.id} ({activeOrder.vendorName})
          </h1>
        </div>

        <div className="flex items-center space-x-3 flex-wrap justify-center">
          {myOrders.length > 1 && (
            <div className="flex items-center space-x-2 bg-slate-700 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <select
                value={activeOrder?.id}
                onChange={(e) => changeOrder(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer [&>option]:text-gray-900"
              >
                {myOrders.map(o => (
                  <option key={o.id} value={o.id}>Order #{o.id}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => setIsInvoiceOpen(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Digital Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map Simulation & Status Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Map View */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Real Map View */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-0 relative overflow-hidden shadow-2xl h-80 sm:h-[450px] flex flex-col">
            <LiveMap
              riderLocation={activeOrder.currentRiderLocation}
              restaurantLocation={activeOrder.vendorLat && activeOrder.vendorLng ? { lat: activeOrder.vendorLat, lng: activeOrder.vendorLng } : undefined}
              customerLocation={activeOrder.customerLat && activeOrder.customerLng ? { lat: activeOrder.customerLat, lng: activeOrder.customerLng } : undefined}
            />

            {/* Map Header Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700 text-xs text-white">
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{activeOrder.vendorName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{activeOrder.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Map Footer Info Overlay */}
            {activeOrder.currentRiderLocation && (
              <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-[10px] z-10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">Live Tracking Active</span>
                </div>
                <p className="text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
              </div>
            )}
          </div>

          {/* Status Stepper Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
              Order Timeline Milestones
            </h3>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-[10px]">
              {steps.map((st, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <div key={st.key} className="space-y-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto font-bold transition ${
                        isPassed
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <p className={`font-bold leading-tight ${isPassed ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                      {st.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Rider Info & Order Items */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Dispatch Rider Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-800">
              <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-emerald-500" /> Assigned Dispatch Rider
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Star className="w-3 h-3 fill-emerald-700" /> {rider.rating} Rating
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <img src={rider.avatar} alt={rider.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500" />
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  {rider.name} <ShieldCheck className="w-4 h-4 text-blue-500" />
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{rider.vehicleType} | {rider.vehicleNumber}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{rider.totalDeliveries} Completed Deliveries</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href={`tel:${rider.phone}`}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Rider</span>
              </a>
              <button
                onClick={() => navigate('/customer/messages')}
                className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Rider</span>
              </button>
            </div>

            <button
              onClick={() => navigate('/customer/messages')}
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
            >
              <Store className="w-4 h-4 text-amber-400" />
              <span>Message Restaurant</span>
            </button>
          </div>

          {/* Order Details Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white border-b pb-3 border-gray-100 dark:border-slate-800">
              Ordered Meals & Payment
            </h3>

            <div className="space-y-3">
              {activeOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-emerald-600">{it.quantity}x</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{it.productName || 'Meal'}</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{formatPrice((it.unitPrice || it.price || 0) * it.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="font-bold text-gray-900 dark:text-white">{activeOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-2 border-t">
                <span>Total Paid</span>
                <span className="text-emerald-600">{formatPrice(activeOrder.totalAmount)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Digital Invoice Printable Modal */}
      {isInvoiceOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsInvoiceOpen(false)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />

          <div className="relative bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl shadow-2xl border p-8 z-10 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">OFFICIAL DIGITAL INVOICE</h2>
                <p className="text-xs text-gray-500">OmniMarket Express Multi-Restaurant Receipt</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold text-emerald-600">{activeOrder.invoiceNumber}</p>
                <p className="text-[10px] text-gray-400">{activeOrder.createdAt.split('T')[0]}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-gray-400 uppercase text-[10px]">Billed To:</p>
                <p className="font-bold text-gray-900 dark:text-white">{activeOrder.customerName}</p>
                <p className="text-gray-500">{activeOrder.customerAddress}</p>
              </div>
              <div>
                <p className="font-bold text-gray-400 uppercase text-[10px]">Restaurant:</p>
                <p className="font-bold text-gray-900 dark:text-white">{activeOrder.vendorName}</p>
                <p className="text-gray-500">Tax ID: TX-88402910</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b text-gray-400">
                    <th className="py-2">Item</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">{item.productName || 'Meal'}</td>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2">{formatPrice(item.unitPrice || item.price || 0)}</td>
                      <td className="py-2 text-right font-bold">{formatPrice((item.unitPrice || item.price || 0) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 flex justify-between items-center text-sm font-bold">
              <span>Grand Total</span>
              <span className="text-emerald-600">{formatPrice(activeOrder.totalAmount)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => window.print()}
                className="bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setIsInvoiceOpen(false)}
                className="bg-gray-200 text-gray-800 font-bold text-xs px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
