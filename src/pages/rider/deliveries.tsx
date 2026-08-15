import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Clock, CheckCircle, DollarSign, MapPin, Phone, Star, X, Download, Navigation, PackageCheck, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { ReceiptModal, type ReceiptOrder } from '@/src/components/common/ReceiptModal';
import { Order } from '@/src/types';
import {
  deliveryRef, deliveryKindLabel, deliveryKindBadge, deliveryKindTitle, deliveryKindOf, isPackageLike, pickupLabel, dropoffLabel, dropoffContact,
  ACTIVE_DELIVERY_STATUSES, COMPLETED_DELIVERY_STATUSES
} from '@/src/lib/rider-deliveries';

const STATUS_STEPS = ['confirmed', 'preparing', 'ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving', 'delivered', 'completed'];

export function RiderDeliveriesPage() {
  const { orders, riders, formatPrice, completeDelivery, receiverConfirmDelivery, showToast } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'FOOD_ORDER' | 'PACKAGE' | 'PASS'>('all');
  const [deliverConfirm, setDeliverConfirm] = useState<Order | null>(null);
  const [ticket, setTicket] = useState<ReceiptOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [openDelivery, setOpenDelivery] = useState<Order | null>(null);

  const riderRecord = riders.find(r => r.userId === user?.id || r.id === user?.id);

  const riderOrders = useMemo(() => {
    return orders.filter(o => o.riderId === user?.riderId);
  }, [orders, user]);

  const filtered = useMemo(() => {
    return riderOrders.filter(d => {
      if (filter === 'active') return ACTIVE_DELIVERY_STATUSES.includes(d.status);
      if (filter === 'completed') return COMPLETED_DELIVERY_STATUSES.includes(d.status);
      return true;
    }).filter(d => typeFilter === 'all' || deliveryKindOf(d) === typeFilter);
  }, [riderOrders, filter, typeFilter]);

  const activeCount = riderOrders.filter(d => ACTIVE_DELIVERY_STATUSES.includes(d.status)).length;

  const todayEarnings = useMemo(() => {
    const today = new Date().toDateString();
    return riderOrders
      .filter(d => COMPLETED_DELIVERY_STATUSES.includes(d.status) && new Date(d.createdAt).toDateString() === today)
      .reduce((a, d) => a + (d.deliveryFee || 0), 0);
  }, [riderOrders]);

  const avgRating = riderRecord?.rating != null ? riderRecord.rating.toFixed(1) : '—';

  const handleConfirmDelivered = async () => {
    const del = deliverConfirm;
    if (!del || confirming) return;
    setConfirming(true);
    try {
      const { alreadyCompleted } = await completeDelivery(del.id);
      setDeliverConfirm(null);
      setOpenDelivery(null);
      showToast('Delivery Completed', `Delivery ${deliveryRef(del)} ${alreadyCompleted ? 'was already marked' : 'marked'} as delivered. Earnings updated.`);
    } catch (err: any) {
      showToast('Delivery Failed', err?.message || 'Could not confirm the delivery. Please try again.', 'warning');
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmCode = async (del: Order) => {
    if (!confirmCode.trim() || confirmingCode) return;
    setConfirmingCode(true);
    try {
      const { alreadyConfirmed } = await receiverConfirmDelivery(del.id, confirmCode.trim());
      setConfirmCode('');
      setOpenDelivery(null);
      showToast('Recipient Confirmed', alreadyConfirmed ? 'This delivery was already confirmed.' : 'Confirmation code accepted. Delivery is complete.');
    } catch (err: any) {
      showToast('Confirmation Failed', err?.message || 'That code was not accepted. Ask the recipient for the confirmation code.', 'warning');
    } finally {
      setConfirmingCode(false);
    }
  };

  const openTicket = (del: Order) => {
    setTicket({
      id: del.id,
      orderNumber: del.orderNumber,
      invoiceNumber: del.invoiceNumber,
      vendorName: del.vendorName,
      customerName: del.customerName,
      customerAddress: del.customerAddress,
      customerPhone: del.customerPhone,
      items: del.items,
      deliveryFee: del.deliveryFee,
      totalAmount: del.totalAmount,
      paymentMethod: del.paymentMethod,
      createdAt: del.createdAt,
    });
  };

  const deliveryTimeline = (del: Order) => {
    const stamps = (del.statusTimestamps || {}) as Record<string, string>;
    const reachable = STATUS_STEPS.filter(s => stamps[s] || s === del.status);
    return reachable;
  };

  const statusDot = (s: string, del: Order) => {
    const idx = STATUS_STEPS.indexOf(s);
    const cur = STATUS_STEPS.indexOf(del.status);
    return idx < cur ? 'done' : idx === cur ? 'current' : 'future';
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Deliveries</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">{activeCount} active | {formatPrice(todayEarnings)} earned today</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: activeCount, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Completed', value: riderOrders.filter(d => COMPLETED_DELIVERY_STATUSES.includes(d.status)).length, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Earnings', value: formatPrice(riderOrders.filter(d => COMPLETED_DELIVERY_STATUSES.includes(d.status)).reduce((a, d) => a + (d.deliveryFee || 0), 0)), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Avg Rating', value: avgRating, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
              {(['all', 'active', 'completed'] as const).map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${filter === t ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}>{t}</button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { key: 'all', label: 'All types' },
                { key: 'FOOD_ORDER', label: 'FOOD' },
                { key: 'PASS', label: 'PASS' },
                { key: 'PACKAGE', label: 'PACKAGE' },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTypeFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${typeFilter === t.key ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-900 text-gray-500 border-gray-100 dark:border-slate-800'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((del, i) => {
              const p = pickupLabel(del);
              const d = dropoffLabel(del);
              const contact = dropoffContact(del);
              const isPkg = deliveryKindLabel(del.deliveryType) !== 'Food Order';
              return (
                <motion.div key={del.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => setOpenDelivery(del)}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      ACTIVE_DELIVERY_STATUSES.includes(del.status) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                      COMPLETED_DELIVERY_STATUSES.includes(del.status) ? 'bg-gray-100 dark:bg-slate-700 text-gray-500' :
                      'bg-red-50 dark:bg-red-900/20 text-red-500'
                    }`}>
                      {isPkg ? <PackageCheck className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-white">{d.name || contact.name}</p>
                        <Badge variant={COMPLETED_DELIVERY_STATUSES.includes(del.status) ? 'success' : 'info'} size="sm">
                          {del.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">{deliveryRef(del)}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          deliveryKindOf(del) === 'PACKAGE' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                          deliveryKindOf(del) === 'PASS' ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' :
                          'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          {deliveryKindBadge(del.deliveryType)} · {deliveryKindTitle(del.deliveryType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.address || d.name}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(del.createdAt).toLocaleTimeString()}</span>
                        <span>{p.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-emerald-600">{formatPrice(del.deliveryFee)}</p>
                    </div>
                    {ACTIVE_DELIVERY_STATUSES.includes(del.status) && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="p-2" aria-label={`Call ${contact.name}`} onClick={(e) => { e.stopPropagation(); if (contact.phone) window.open(`tel:${contact.phone}`); }}><Phone className="w-4 h-4" /></Button>
                        <Button size="sm" variant="primary" className="px-3" aria-label="Mark as delivered" onClick={(e) => { e.stopPropagation(); setDeliverConfirm(del); }}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {COMPLETED_DELIVERY_STATUSES.includes(del.status) && (
                      <Button size="sm" variant="outline" className="px-3 gap-1.5 text-amber-600" aria-label={`Download ticket for delivery ${deliveryRef(del)}`} onClick={(e) => { e.stopPropagation(); openTicket(del); }}>
                        <Download className="w-4 h-4" /> Ticket
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No deliveries found</p>
                <p className="text-sm">{filter === 'active' ? 'No active deliveries - go online to receive jobs' : 'No completed deliveries yet'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Detail Modal */}
      <AnimatePresence>
        {openDelivery && (() => {
          const del = openDelivery;
          const p = pickupLabel(del);
          const d = dropoffLabel(del);
          const contact = dropoffContact(del);
          const timeline = deliveryTimeline(del);
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpenDelivery(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        {deliveryRef(del)}
                        <Badge variant={COMPLETED_DELIVERY_STATUSES.includes(del.status) ? 'success' : 'info'} size="sm">{del.status.replace('_', ' ')}</Badge>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">related Order #{del.orderNumber} · {deliveryKindTitle(del.deliveryType)}</p>
                    </div>
                    <button onClick={() => setOpenDelivery(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Payout</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">{formatPrice(del.deliveryFee)}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Order Value</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{formatPrice(del.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pickup</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</p>
                        {p.address && <p className="text-xs text-gray-500 mt-0.5 break-words">{p.address}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Destination</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{d.name} {contact.phone ? `· ${contact.phone}` : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5 break-words">{d.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Timeline</p>
                    <div className="space-y-2.5">
                      {timeline.map((s, idx) => {
                        const st = statusDot(s, del);
                        return (
                          <div key={s} className="flex items-center gap-3">
                            <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                              st === 'done' ? 'bg-emerald-500' :
                              st === 'current' ? 'bg-amber-500 ring-4 ring-amber-500/20' : 'bg-gray-300 dark:bg-slate-600'
                            }`} />
                            <p className={`text-xs ${st === 'future' ? 'text-gray-400 dark:text-slate-500' : 'font-bold text-gray-900 dark:text-white'}`}>
                              {s.replace(/_/g, ' ')}
                            </p>
                            {idx === timeline.length - 1 && st === 'current' && (
                              <span className="text-[10px] text-gray-400 ml-auto">now</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button className="flex-1" size="sm" onClick={() => navigate('/rider/navigation')}><Navigation className="w-4 h-4" /> Navigate</Button>
                    <Button className="flex-1" variant="outline" size="sm" onClick={() => window.open(`tel:${contact.phone}`)}><Phone className="w-4 h-4" /> Call {contact.name}</Button>
                    <Button className="flex-1" variant="outline" size="sm" onClick={() => navigate('/rider/messages')}><MessageSquare className="w-4 h-4" /> Message</Button>
                  </div>

                  {ACTIVE_DELIVERY_STATUSES.includes(del.status) && isPackageLike(del.deliveryType) && !(del as any).receiverConfirmed && (del.status === 'picked_up' || del.status === 'in_transit' || del.status === 'arriving' || del.status === 'awaiting_confirmation') && (
                    <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/20 p-4 space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1.5">Receiver Confirmation Required</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Ask the recipient for the confirmation code to release this delivery.</p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={confirmCode}
                          onChange={e => setConfirmCode(String(e.target.value).toUpperCase())}
                          placeholder="Enter 6-digit code"
                          className="flex-1 h-11 rounded-xl font-mono uppercase tracking-[0.3em]"
                        />
                        <Button
                          className="h-11 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 font-bold disabled:opacity-50"
                          disabled={confirmingCode || !confirmCode.trim()}
                          onClick={() => handleConfirmCode(del)}
                        >
                          {confirmingCode ? '…' : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {ACTIVE_DELIVERY_STATUSES.includes(del.status) && (
                    <Button className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold" disabled={isPackageLike(del.deliveryType) && !(del as any).receiverConfirmed} onClick={() => setDeliverConfirm(del)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> {isPackageLike(del.deliveryType) ? ((del as any).receiverConfirmed ? 'Complete Delivery' : 'Awaiting Recipient Confirmation') : 'Mark as Delivered'}
                    </Button>
                  )}
                  {COMPLETED_DELIVERY_STATUSES.includes(del.status) && (
                    <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-amber-600" onClick={() => openTicket(del)}>
                      <Download className="w-4 h-4 mr-2" /> Delivery Ticket
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

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
                    Mark delivery <span className="font-bold text-gray-900 dark:text-white">{deliveryRef(deliverConfirm)}</span> (Order #{deliverConfirm.orderNumber}) as delivered to
                    <span className="font-bold text-gray-900 dark:text-white"> {dropoffLabel(deliverConfirm).name}</span>? Your payout and the rating will be unlocked.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" disabled={confirming} onClick={() => setDeliverConfirm(null)}>CANCEL</Button>
                  <Button className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold disabled:opacity-60" disabled={confirming} onClick={handleConfirmDelivered}>
                    {confirming ? 'CONFIRMING…' : 'CONFIRM'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReceiptModal open={!!ticket} order={ticket} onClose={() => setTicket(null)} heading="Delivery Ticket" />
    </div>
  );
}
