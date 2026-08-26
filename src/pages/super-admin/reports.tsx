import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Package, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Button } from '@/src/components/ui/button';
import { AdminService } from '@/src/services/api';
import { AnimatedTooltip } from '@/src/components/ui/animated-tooltip';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable, AdminStatCard,
  AdminStatus, AdminEmptyState, AdminLoading, AdminError
} from '@/src/components/super-admin/AdminDesignSystem';

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString('en-US');

function statusBadge(s: string): AdminStatus {
  if (s === 'active' || s === 'completed' || s === 'paid') return 'success';
  if (s === 'pending') return 'pending';
  if (s === 'suspended' || s === 'failed') return 'failed';
  return 'info';
}

export function SuperAdminReportsPage() {
  const [range, setRange] = useState('7');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (r: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await AdminService.getReports(r);
      setReport(data || {});
    } catch (e: any) {
      setError(e?.message || 'Failed to load financial report.');
    } finally {
      setLoading(false);
    }
  };

  useState(() => { load(range); });

  const setRangeSafe = (r: string) => { setRange(r); load(r); };

  const revenue = report?.revenue ?? [];
  const totalRevenue = revenue.reduce((s: number, d: any) => s + (Number(d.revenue || d.amount || 0)), 0);
  const ordersCount = report?.orders?.total ?? report?.totalOrders ?? 0;
  const commission = report?.commission?.total ?? report?.totalCommission ?? 0;
  const payouts = report?.payouts?.total ?? report?.totalPayouts ?? 0;
  const avgOrder = ordersCount ? totalRevenue / ordersCount : 0;

  const peakRevenue = useMemo(() => {
    if (!revenue.length) return null;
    return revenue.reduce((a: any, b: any) => (Number(b.revenue || b.amount || 0) > Number(a.revenue || a.amount || 0) ? b : a), revenue[0]);
  }, [revenue]);

  const topVendors = report?.topVendors ?? report?.topVendorsByRevenue ?? [];
  const topProducts = report?.topProducts ?? [];

  if (loading) return <AdminLoading message="Preparing financial report…" />;
  if (error) return <AdminError message="Failed to load report" detail={error} retry={() => load(range)} />;

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={BarChart3}
        title="Financial Reports"
        description="Revenue, orders, commission and payout summaries across the marketplace."
        stats={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRangeSafe}>
              <SelectTrigger className="h-9 w-36 rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 text-xs" onClick={() => load(range)}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Revenue" hint="Gross revenue generated across all completed orders in this period" value={`$${fmt(totalRevenue)}`} icon={TrendingUp} status="success" />
        <AdminStatCard label="Orders" hint="Total orders placed across every vendor in this period" value={fmtN(ordersCount)} icon={Package} status="info" />
        <AdminStatCard label="Commission" hint="Platform commission earned on completed orders in this period" value={`$${fmt(commission)}`} icon={ArrowUpRight} status="warning" />
        <AdminStatCard label="Payouts" hint="Payouts made to vendors and riders in this period" value={`$${fmt(payouts)}`} icon={ArrowDownRight} status="info" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AdminCard title="Revenue Trend" subtitle={`Daily revenue — last ${range} days`} icon={TrendingUp} noPadding>
          {revenue.length === 0 ? (
            <AdminEmptyState icon={TrendingUp} title="No revenue data" description="No revenue recorded in this period." />
          ) : (
            <div className="px-5 py-4">
              <div className="flex h-44 items-end gap-2">
                {revenue.slice(-14).map((d: any, i: number) => {
                  const v = Number(d.revenue || d.amount || 0);
                  const max = Math.max(...revenue.map((x: any) => Number(x.revenue || x.amount || 0)), 1);
                  return (
                    <div key={i} className="group relative flex-1" title={`${d.date || d.day || d._id || ''} — $${fmt(v)}`}>
                      <div className="mx-auto w-full rounded-t-md bg-gradient-to-t from-primary/10 to-primary/30 transition-colors group-hover:from-primary/20 group-hover:to-primary/50" style={{ height: `${Math.max(4, (v / max) * 160)}px` }} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-ink-3">
                <span>Start</span>
                {peakRevenue && <span className="font-semibold text-ink">Peak ${fmt(Number(peakRevenue.revenue || peakRevenue.amount || 0))}</span>}
                <span>Today</span>
              </div>
            </div>
          )}
        </AdminCard>

        <AdminCard title="Highlights" subtitle={`${range}-day performance summary`} icon={Users} noPadding>
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-4 py-3">
              <AnimatedTooltip variant="gram" content="Average spend per order across this period" triggerClassName="px-1 py-0.5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Average Order Value</p>
                  <p className="text-sm font-black text-ink">${fmt(avgOrder)}</p>
                </div>
              </AnimatedTooltip>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">New Customers</p>
                <p className="text-sm font-black text-ink">{fmtN(report?.newCustomers ?? report?.newUsers ?? 0)}</p>
              </div>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Active Vendors</p>
                <p className="text-sm font-black text-ink">{fmtN(report?.activeVendors ?? report?.vendors ?? 0)}</p>
              </div>
              <Package className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </AdminCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AdminCard title="Top Vendors" subtitle={`By revenue — last ${range} days`} icon={Package} noPadding>
          {topVendors.length === 0 ? (
            <AdminEmptyState icon={Package} title="No vendor data" description="No vendor performance recorded in this period." />
          ) : (
            <AdminTable headers={['Vendor', 'Orders', 'Revenue']}>
              {topVendors.slice(0, 10).map((v: any, i: number) => (
                <tr key={v.id || i} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                      <span className="font-mono text-[10px] text-ink-3">#{i + 1}</span> {v.name || v.vendorName || v.id}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-2">{fmtN(Number(v.orders ?? v.orderCount ?? 0))}</td>
                  <td className="px-5 py-3 text-xs font-black text-ink">${fmt(Number(v.revenue ?? v.totalRevenue ?? 0))}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminCard>

        <AdminCard title="Top Products" subtitle={`Best sellers — last ${range} days`} icon={TrendingUp} noPadding>
          {topProducts.length === 0 ? (
            <AdminEmptyState icon={TrendingUp} title="No product data" description="No product performance recorded in this period." />
          ) : (
            <AdminTable headers={['Product', 'Sold', 'Revenue']}>
              {topProducts.slice(0, 10).map((p: any, i: number) => (
                <tr key={p.id || i} className="hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                      <span className="font-mono text-[10px] text-ink-3">#{i + 1}</span> {p.name || p.productName || p.id}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-2">{fmtN(Number(p.sold ?? p.quantity ?? 0))}</td>
                  <td className="px-5 py-3 text-xs font-black text-ink">${fmt(Number(p.revenue ?? p.totalRevenue ?? 0))}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminCard>
      </div>

      {report?.statuses && report.statuses.length > 0 && (
        <AdminCard title="Order Status Breakdown" subtitle={`Orders by status — last ${range} days`} icon={Package} noPadding>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {report.statuses.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                <AdminBadge status={statusBadge(s.status || s._id)} label={s.status || s._id} />
                <span className="text-sm font-black text-ink">{fmtN(Number(s.count ?? 0))}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      )}
    </div>
  );
}