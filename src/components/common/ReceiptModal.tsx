import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ReceiptItem {
  productName?: string;
  quantity?: number;
  price?: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface ReceiptOrder {
  id?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  vendorName?: string;
  items?: ReceiptItem[];
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  createdAt?: string;
}

export function formatMoney(n: number | undefined | null) {
  const v = Number(n) || 0;
  return `GH₵ ${v.toFixed(2)}`;
}

export function formatReceiptDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

interface ReceiptModalProps {
  open: boolean;
  order: ReceiptOrder | null;
  onClose: () => void;
  heading?: string;
  showItems?: boolean;
}

export function ReceiptModal({ open, order, onClose, heading = 'Official Receipt', showItems = true }: ReceiptModalProps) {
  if (!open || !order) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((s, i) => s + (Number(i.price || i.unitPrice) || 0) * (Number(i.quantity) || 1), 0);
  const deliveryFee = Number(order.deliveryFee) || 0;
  const tax = Number(order.tax) || 0;
  const discount = Number(order.discount) || 0;
  const total = Number(order.totalAmount) || Math.max(0, subtotal + deliveryFee + tax - discount);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        {/* Receipt paper */}
        <div className="om-receipt bg-white text-gray-900 p-6 font-mono text-sm">
          <div className="text-center pb-4 border-b-2 border-dashed border-gray-300">
            <p className="text-lg font-black tracking-widest">OMNIMARKET</p>
            <p className="text-[10px] tracking-widest text-gray-500 mt-1 uppercase">Express Multi-Restaurant Delivery</p>
            <p className="text-[10px] text-gray-500 mt-1">Market Circle, Takoradi, Ghana</p>
            <p className="text-[10px] text-gray-400 mt-0.5">+233 20 000 0000 • support@omnimarket.com</p>
          </div>

          <div className="py-4 space-y-1.5 text-[11px] border-b border-dashed border-gray-300">
            <p className="font-black uppercase tracking-wider text-gray-800">{heading}</p>
            <div className="flex justify-between"><span className="text-gray-500">Receipt No</span><span className="font-bold">{order.invoiceNumber || order.id || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Order Ref</span><span className="font-bold">{order.orderNumber || order.id || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-bold">{formatReceiptDate(order.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-bold">{order.paymentMethod || '—'}</span></div>
          </div>

          <div className="py-4 space-y-1.5 text-[11px] border-b border-dashed border-gray-300">
            <p className="font-black uppercase tracking-wider text-gray-800">Restaurant</p>
            <p className="font-bold">{order.vendorName || '—'}</p>
            <p className="font-black uppercase tracking-wider text-gray-800 pt-2">Billed To</p>
            <p className="font-bold">{order.customerName || 'Customer'}</p>
            {order.customerAddress && <p className="text-gray-600">{order.customerAddress}</p>}
            {order.customerPhone && <p className="text-gray-600">{order.customerPhone}</p>}
          </div>

          {showItems && (
            <div className="py-4 border-b border-dashed border-gray-300">
              <p className="font-black uppercase tracking-wider text-[10px] mb-2">Items</p>
              {items.length === 0 && <p className="text-[11px] text-gray-500">No line items.</p>}
              <div className="space-y-1.5">
                {items.map((i, idx) => {
                  const unit = Number(i.price || i.unitPrice) || 0;
                  const qty = Number(i.quantity) || 1;
                  return (
                    <div key={idx} className="flex justify-between gap-2 text-[11px]">
                      <span className="flex-1">{qty} x {i.productName || 'Item'}</span>
                      <span className="font-bold whitespace-nowrap">{formatMoney(unit * qty)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="py-4 space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatMoney(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span>{formatMoney(deliveryFee)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax (5%)</span><span>{formatMoney(tax)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>- {formatMoney(discount)}</span></div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300 text-sm font-black">
              <span>GRAND TOTAL</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>

          <div className="text-center pt-3 pb-1 border-t-2 border-dashed border-gray-300">
            <div className="inline-flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Thank you for your order
            </div>
            <p className="text-[9px] text-gray-400 mt-1">Powered by OmniMarket Delivery Platform</p>
          </div>
        </div>

        {/* Controls (hidden when printing) */}
        <div className="om-receipt-nobutton flex gap-3 p-5 bg-gray-50 dark:bg-slate-800/60">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Close
          </button>
          <button onClick={() => window.print()} className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}