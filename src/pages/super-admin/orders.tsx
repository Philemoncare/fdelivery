import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart, Search, RefreshCw, Package, CreditCard, Banknote,
  Clock, Truck, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { AdminService } from '@/src/services/api';
import { cn } from '@/src/lib/utils';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminLoading, AdminError, AdminEmptyState, AdminDrawer, AdminPagination
} from '@/src/components/super-admin/AdminDesignSystem';

const ORDER_STATUS: AdminStatus[] = [
  'pending', 'active', 'processing', 'warning', 'info', 'suspended', 'failed', 'disabled', 'success'
];

function statusBadge(s: string): AdminStatus {
  if (s === 'completed' || s === 'delivered') return 'success';
  if (s === 'cancelled' || s === 'failed' || s === 'refunded') return 'failed';
  if (s === 'ready_for_pickup' || s === 'out_for_delivery') return 'processing';
  if (s === 'pending') return 'pending';
  return 'info';
}

function payStatusBadge(s: string): AdminStatus {
  if (s === 'paid') return 'success';
  if (s === 'pending') return 'pending';
  if (s === 'failed' || s === 'refunded') return 'failed';
  return 'info';
}

function fmtCurrency(n: any): string {
  const v = Number(n);
  return Number.isFinite(v) ? `GHS${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
}

const PER_PAGE = 15;

export function SuperAdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [delivery, setDelivery] = useState('all');
  const [payment, setPayment] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setLoadError(null);
    try {
      const rows = await AdminService.getOrders();
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter(o => {
        if (q && ![o.orderNumber, o.customerName, o.customerEmail, o.vendorName, o.id].some((v: any) => String(v || '').toLowerCase().includes(q))) return false;
        if (status !== 'all' && o.status !== status) return false;
        if (delivery !== 'all' && (o.deliveryMethod || 'delivery') !== delivery) return false;
        if (payment !== 'all' && (o.paymentStatus || 'pending') !== payment) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, search, status, delivery, payment]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, status, delivery, payment]);

  const activeCount = orders.filter(o => !['completed', 'delivered', 'cancelled', 'failed', 'refunded'].includes(o.status)).length;
  const todayCount = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length;
  const revenue = orders.filter(o => o.status === 'completed' || o.status === 'delivered').reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

  if (loading) return <AdminLoading message="Loading order registry…" />;
  if (loadError && !orders.length) return <AdminError message="Unable to load orders." detail={loadError} retry={() => load()} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={ShoppingCart}
        title="Orders"
        description="Full order registry across the marketplace — food orders, deliveries and packages."
        stats={<AdminBadge status="info" label={`${orders.length} Total`} />}
        actions={
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={cn(refreshing ? 'animate-spin' : '', 'w-3.5 h-3.5 mr-2')} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total Orders" value={orders.length} icon={ShoppingCart} status="info" />
        <AdminStatCard label="Active" value={activeCount} icon={Truck} status="processing" />
        <AdminStatCard label="Today" value={todayCount} icon={Clock} status="active" />
        <AdminStatCard label="Completed Revenue" value={fmtCurrency(revenue)} icon={Banknote} status="success" />
      </div>

      <AdminCard
        title="Order Registry"
        subtitle="All platform orders, newest first"
        icon={ShoppingCart}
        noPadding
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
              <Input placeholder="Search order, customer, vendor…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-48 rounded-xl pl-9 text-xs lg:w-60" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={delivery} onValueChange={setDelivery}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue placeholder="Delivery" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="package">Package</SelectItem>
              </SelectContent>
            </Select>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {visible.length === 0 ? (
          <AdminEmptyState
            icon={ShoppingCart}
            title={orders.length === 0 ? 'No orders yet' : 'No matching orders'}
            description={orders.length === 0 ? 'Orders placed across the platform will appear here.' : 'No orders match the current filters.'}
            action={<Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatus('all'); setDelivery('all'); setPayment('all'); }}>Clear Filters</Button>}
          />
        ) : (
          <AdminTable headers={['Order', 'Customer', 'Vendor', 'Delivery', 'Total', 'Payment', 'Status', 'Placed']}>
            {visible.map(o => (
              <tr key={o.id} className="group hover:bg-surface-2/40 transition-colors cursor-pointer" onClick={() => setSelected(o)}>
                <td className="px-5 py-3.5">
                  <p className="font-mono text-xs font-bold text-ink">{o.orderNumber}</p>
                  <p className="text-[10px] text-ink-3">{o.deliveryType || 'FOOD_ORDER'}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink">{o.customerName}</p>
                  <p className="text-[10px] text-ink-3">{o.customerEmail}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-ink-2">{o.vendorName}</td>
                <td className="px-5 py-3.5">
                  <AdminBadge status="info" label={o.deliveryMethod || 'delivery'} />
                  {o.deliveryDistanceKm != null && <p className="mt-0.5 text-[10px] text-ink-3">{o.deliveryDistanceKm} km</p>}
                </td>
                <td className="px-5 py-3.5 text-sm font-bold text-ink">{fmtCurrency(o.totalAmount)}</td>
                <td className="px-5 py-3.5">
                  <AdminBadge status={payStatusBadge(o.paymentStatus)} label={o.paymentStatus} />
                  <p className="mt-0.5 text-[10px] text-ink-3">{o.paymentMethod}</p>
                </td>
                <td className="px-5 py-3.5"><AdminBadge status={statusBadge(o.status)} label={o.status} /></td>
                <td className="px-5 py-3.5 text-xs text-ink-3">{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </AdminTable>
        )}
        {filtered.length > PER_PAGE && (
          <AdminPagination
            page={page}
            totalPages={pageCount}
            showingFrom={filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}
            showingTo={Math.min((page - 1) * PER_PAGE + visible.length, filtered.length)}
            total={filtered.length}
            onPrev={() => setPage(p => Math.max(1, p - 1))}
            onNext={() => setPage(p => p + 1)}
          />
        )}
      </AdminCard>

      {selected && (
        <AdminDrawer
          open
          onClose={() => setSelected(null)}
          icon={Package}
          title={selected.orderNumber}
          subtitle={selected.id}
          footer={<Button variant="outline" className="w-full rounded-xl" onClick={() => setSelected(null)}>Close</Button>}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <AdminBadge status={statusBadge(selected.status)} label={selected.status} />
              <AdminBadge status={payStatusBadge(selected.paymentStatus)} label={selected.paymentStatus} />
              <AdminBadge status="info" label={selected.paymentMethod} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Customer</p>
                <p className="text-sm font-medium text-ink">{selected.customerName}</p>
                <p className="text-xs text-ink-3">{selected.customerEmail}</p>
                {selected.customerPhone && <p className="text-xs text-ink-3">{selected.customerPhone}</p>}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Vendor</p>
                <p className="text-sm font-medium text-ink">{selected.vendorName}</p>
                <p className="text-xs text-ink-3">{selected.deliveryMethod || 'delivery'}</p>
              </div>
              <div className="col-span-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Delivery Address</p>
                <p className="text-sm text-ink">{selected.customerAddress || 'Pickup'}</p>
              </div>
              {selected.dispatchRider && (
                <div className="col-span-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Dispatch Rider</p>
                  <p className="text-sm text-ink">{selected.dispatchRider.name} · {selected.dispatchRider.phone || '—'}</p>
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Items</p>
              <div className="space-y-2">
                {(selected.items || []).map((i: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{i.title || i.productName}</p>
                      <p className="text-[10px] text-ink-3">×{i.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-ink">{fmtCurrency((Number(i.price) || 0) * (Number(i.quantity) || 1))}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface-2 p-4 space-y-1.5">
              <div className="flex justify-between text-xs text-ink-2"><span>Subtotal</span><span>{fmtCurrency(selected.subtotal)}</span></div>
              <div className="flex justify-between text-xs text-ink-2"><span>Delivery</span><span>{fmtCurrency(selected.deliveryFee)}</span></div>
              <div className="flex justify-between text-xs text-ink-2"><span>Tax</span><span>{fmtCurrency(selected.tax)}</span></div>
              {Number(selected.discount) > 0 && <div className="flex justify-between text-xs text-ok"><span>Discount</span><span>-{fmtCurrency(selected.discount)}</span></div>}
              <div className="flex justify-between border-t border-line pt-1.5 text-sm font-bold text-ink"><span>Total</span><span>{fmtCurrency(selected.totalAmount)}</span></div>
            </div>
            {selected.specialInstructions && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Instructions</p>
                <p className="text-sm text-ink-2">{selected.specialInstructions}</p>
              </div>
            )}
            <p className="text-xs text-ink-3">Placed {new Date(selected.createdAt).toLocaleString()}</p>
          </div>
        </AdminDrawer>
      )}
    </div>
  );
}