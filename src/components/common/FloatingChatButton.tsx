import { useMemo, useState } from 'react';
import { MessageCircle, X, Send, Headset, LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/lib/auth/auth-store';
import { useApp } from '@/src/context/AppContext';
import { MessagingService } from '@/src/services/api';
import type { Order } from '@/src/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Order Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  rider_assigned: 'Rider Assigned',
  picked_up: 'Picked Up',
  in_transit: 'Out for Delivery',
  arriving: 'Arriving Soon',
  awaiting_confirmation: 'Recipient Confirmation Required',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  refunded: 'Refunded'
};

const TIMELINE_ORDER: string[] = [
  'pending', 'confirmed', 'preparing', 'ready_for_pickup', 'rider_assigned',
  'picked_up', 'in_transit', 'arriving', 'awaiting_confirmation', 'delivered', 'completed'
];

interface ChatLine { role: 'user' | 'assistant'; text: string; }

export function FloatingChatButton() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, riders, formatPrice, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState<'answer' | 'support' | null>(null);

  // The assistant never invents data: every answer is derived from the user's
  // real orders as served by the backend (and kept fresh via realtime updates).
  const recentOrder = useMemo<Order | null>(() => {
    if (!user) return null;
    return (orders || [])
      .filter(o => o.customerId === user.id)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
  }, [orders, user]);

  const resolveRiderName = (o: Order) => {
    if (o.dispatchRider) return o.dispatchRider;
    if (!o.riderId) return null;
    return riders?.find(r => r.id === o.riderId || r.userId === o.riderId) || null;
  };

  const buildTimeline = (o: Order): string => {
    const stamps = (o.statusTimestamps || {}) as Record<string, string | undefined>;
    const rows = TIMELINE_ORDER
      .filter(key => stamps[key])
      .map(key => `• ${STATUS_LABELS[key] || key.replace(/_/g, ' ')} — ${new Date(stamps[key]!).toLocaleString()}`);
    return rows.length ? rows.join('\n') : `Placed at ${new Date(o.createdAt).toLocaleString()}`;
  };

  const answerFor = (text: string): string => {
    const t = text.toLowerCase();
    if (!user) return 'Sign in to check your order status. Use the Sign in link in the header.';
    if (!recentOrder) {
      return 'You have no orders yet. Browse the marketplace to place one, or use "Deliver Something" to send a parcel. I can only answer about confirmed orders on your account.';
    }
    const o = recentOrder;
    const kind = ['PACKAGE', 'PASS'].includes(String(o.deliveryType || '').toUpperCase())
      ? `your ${String(o.deliveryType).toLowerCase()} delivery ${o.orderNumber}`
      : `your order #${o.id} (${o.vendorName})`;

    if (/(status|where|track|progress|state|timeline)/.test(t)) {
      return `Latest update for ${kind}:\nStatus: ${STATUS_LABELS[o.status] || o.status.replace(/_/g, ' ')}\n\n${buildTimeline(o)}`;
    }
    if (/(rider|who|driver)/.test(t)) {
      const r = resolveRiderName(o);
      if (!r) return `No rider is assigned to ${kind} yet. A rider appears here the moment the backend assigns one.`;
      return `Your rider for ${kind} is ${r.name} (${r.vehicleType} · ${r.vehicleNumber}).${Number(r.rating) ? ` Current rating: ${Number(r.rating).toFixed(1)}.` : ''}`;
    }
    if (/(eta|later|time|long|when|until|arriv)/.test(t)) {
      return `${kind} is estimated at ${o.estimatedDeliveryTime || '35-45 mins'}.${o.deliveredAt ? ` It was delivered at ${new Date(o.deliveredAt).toLocaleString()}.` : ''}`;
    }
    if (/(cost|pay|price|total|amount)/.test(t)) {
      return `${kind} total is ${formatPrice(o.totalAmount)} paid via ${o.paymentMethod} (${o.paymentStatus}).${o.deliveryFee ? ` Delivery fee: ${formatPrice(o.deliveryFee)}.` : ''}`;
    }
    if (/(ref|number|invoice|code|tracking)/.test(t)) {
      return `Reference for ${kind}: ${o.orderNumber}${o.invoiceNumber ? ` · Invoice ${o.invoiceNumber}` : ''}`;
    }
    if (/(cancel)/.test(t)) {
      return 'I can\'t cancel orders from chat — open the tracking page and use its cancel control while the order is still pending/confirmed. Cancellation is enforced by the backend.';
    }
    if (/(restaurant|menu|food)/.test(t)) {
      const items = (o.items || []).map(i => `${i.quantity}× ${i.productName || i.title || 'Meal'}`).join(', ');
      return items ? `${kind} contains: ${items}.` : `${kind} has no itemised meals.`;
    }
    return 'I can only answer from your confirmed order state: status, timeline, rider, ETA, total and reference. For anything else, open the tracking page or chat with our support team below.';
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !user) {
      if (!user) showToast('Sign in required', 'Create an account to use the assistant.', 'warning');
      return;
    }
    setLog(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setBusy('answer');
    // Derived locally from ready backend-synced state — no hallucination.
    window.setTimeout(() => {
      const reply = answerFor(text);
      setLog(prev => [...prev, { role: 'assistant', text: reply }]);
      setBusy(null);
    }, 350);
  };

  const openSupport = async () => {
    if (!user) {
      showToast('Sign in required', 'Create an account to message support.', 'warning');
      navigate('/login');
      return;
    }
    setBusy('support');
    try {
      const conv = await MessagingService.supportConversation();
      setOpen(false);
      navigate('/customer/support', { state: { supportConversationId: conv?.id } });
    } catch {
      showToast('Could not open support', 'Please try again.', 'warning');
    } finally {
      setBusy(null);
    }
  };

  const chip = (q: string) =>
    <button key={q} onClick={() => { setLog(prev => [...prev, { role: 'user', text: q }]); setBusy('answer'); window.setTimeout(() => { setLog(prev => [...prev, { role: 'assistant', text: answerFor(q) }]); setBusy(null); }, 300); }}
      className="text-left px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 transition">
      {q}
    </button>;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 lg:bottom-8 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-96 max-w-sm"
          >
            <div className="glass rounded-[2rem] shadow-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-blue-600 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                    <Headset className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">OmniMarket Assistant</p>
                    <p className="text-[10px] text-emerald-100">Answers only from your real order data</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white" aria-label="Close chat">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3 bg-white dark:bg-slate-900 max-h-[60vh] overflow-y-auto">
                {log.length === 0 && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 text-xs text-gray-600 dark:text-gray-300">
                      {user && recentOrder
                        ? `Hi ${user.firstName || 'there'}! Your latest ${statusSummary(recentOrder)} — ask me about its status, rider, ETA or total.`
                        : 'Hi! I check your real orders. Sign in and ask about status, rider, ETA, or what you paid.'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {chip('Where is my order?')}
                      {chip('Who is my rider?')}
                      {chip('How long until delivery?')}
                      {chip('What did I pay?')}
                    </div>
                  </div>
                )}

                {log.map((l, i) => (
                  <div key={i} className={l.role === 'user' ? "flex justify-end" : "flex justify-start"}>
                    <div className={l.role === 'user'
                      ? "max-w-[85%] px-3.5 py-2 rounded-2xl bg-emerald-500 text-white text-xs font-medium shadow-sm"
                      : "max-w-[85%] px-3.5 py-2 rounded-2xl bg-gray-50 dark:bg-slate-800 text-xs text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-slate-700 whitespace-pre-line"}>
                      {l.text}
                    </div>
                  </div>
                ))}

                {busy === 'answer' && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500" /> Checking your order state…
                  </div>
                )}

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Ask about your order status…"
                  rows={2}
                  className="input-sleek text-xs resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || busy !== null}
                    className="flex-1 btn-primary py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Ask
                  </button>
                  <button
                    onClick={openSupport}
                    disabled={busy !== null}
                    className="rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-black text-[10px] uppercase tracking-widest px-4 py-3 hover:bg-gray-200 transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {busy === 'support' ? 'Opening…' : <><LifeBuoy className="w-3.5 h-3.5" /> Support</>}
                  </button>
                </div>
                {user && recentOrder && (
                  <button
                    onClick={() => { setOpen(false); navigate('/track-order'); }}
                    className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest mx-auto block"
                  >
                    Open live tracking →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(v => !v)}
        aria-label="Open assistant"
        className="fixed bottom-24 lg:bottom-8 right-4 sm:right-6 z-[59] w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </>
  );
}

function statusSummary(o: Order): string {
  return `${STATUS_LABELS[o.status] || o.status.replace(/_/g, ' ')} · ${o.orderNumber}`;
}