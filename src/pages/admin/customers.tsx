import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, User, DollarSign, ShieldCheck, AlertCircle, CheckCircle2, XCircle, X, Edit3, Trash2,
  Search, Eye, MapPin, Phone, Mail, UserCheck, RotateCcw, Ban
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Label } from '@/src/components/ui/label';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';

export function AdminCustomersPage() {
  const { formatPrice, showToast } = useApp();
  const { user } = useAuth();
  const isSuper = user?.role === 'super-administrator';

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [working, setWorking] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const rows = await AdminService.getCustomers();
      setCustomers(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      showToast('Load Failed', e?.message || 'Could not load customers.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openDetail = async (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
    setDetail(null);
    try {
      const full = await AdminService.getUser(customer.id);
      setDetail(full);
    } catch {
      setDetail(customer);
    }
  };

  const handleSuspend = async (cust: any) => {
    setWorking(true);
    try {
      await AdminService.updateUser(cust.id, { isSuspended: true });
      showToast('Customer Suspended', `${cust.name}'s account has been suspended.`);
      await loadCustomers();
    } catch (e: any) {
      showToast('Action Failed', e?.message || 'Could not suspend account.', 'warning');
    } finally {
      setWorking(false);
    }
  };

  const handleToggleSuspend = async (cust: any) => {
    if (cust.status === 'suspended') return handleReactivate(cust);
    return handleSuspend(cust);
  };

  const handleReactivate = async (cust: any) => {
    setWorking(true);
    try {
      await AdminService.updateUser(cust.id, { isSuspended: false, isActive: true });
      showToast('Customer Reactivated', `${cust.name}'s account is now active.`);
      await loadCustomers();
    } catch (e: any) {
      showToast('Action Failed', e?.message || 'Could not reactivate account.', 'warning');
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async (cust: any) => {
    if (isSuper) {
      setWorking(true);
      try {
        await AdminService.deleteUser(cust.id);
        showToast('Customer Deleted', `${cust.name}'s account was removed.`);
        setShowCustomerDetail(false);
        await loadCustomers();
      } catch (e: any) {
        showToast('Action Failed', e?.message || 'Only the Super Admin can delete accounts.', 'warning');
      } finally {
        setWorking(false);
      }
    } else {
      showToast('Permission Denied', 'Only the Super Admin can delete customer accounts.', 'warning');
    }
  };

  const totalSpent = customers.reduce((s: number, c: any) => s + (Number(c.totalSpent) || 0), 0);
  const avgSpend = customers.length ? totalSpent / customers.length : 0;

  const filteredCustomers = customers.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'active';
    if (filter === 'suspended') return c.status === 'suspended';
    return true;
  }).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.email || '').toLowerCase().includes(q) ||
      String(c.phone || '').toLowerCase().includes(q)
    );
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'suspended': 'bg-rose-50 text-rose-700 border-rose-200',
      'pending': 'bg-amber-50 text-amber-700 border-amber-200'
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Management</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage real customer accounts, status and activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{customers.length} Total Customers</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadCustomers}>
            <RotateCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{customers.length}</p>
            <p className="text-xs text-gray-400 mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">Active</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{customers.filter(c => c.status === 'active').length}</p>
            <p className="text-xs text-emerald-500 mt-1">Active accounts</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">Suspended</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{customers.filter(c => c.status === 'suspended').length}</p>
            <p className="text-xs text-rose-500 mt-1">Suspended accounts</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">Avg. Spend</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatPrice(avgSpend)}</p>
            <p className="text-xs text-violet-500 mt-1">Across all customers</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm border-gray-100 dark:border-slate-800">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> Customer Directory
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-lg w-64"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-36 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {customers.length === 0 ? 'No customers registered yet.' : 'No customers found'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {customers.length === 0 ? 'Once customers register they will appear here.' : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/30 dark:bg-slate-800/30 border-b text-xs font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Contact</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Join Date</th>
                    <th className="py-4 px-6">Total Orders</th>
                    <th className="py-4 px-6">Total Spent</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img src={customer.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{customer.name || 'Customer'}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900 dark:text-white">{customer.phone || '—'}</div>
                        <div className="text-xs text-gray-500">{customer.location || 'No orders yet'}</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`text-[10px] font-black uppercase px-2 py-1 ${getStatusColor(customer.status)}`} variant="outline">
                          {customer.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(customer.joinedDate)}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900 dark:text-white">{customer.totalOrders || 0}</div>
                        <div className="text-xs text-gray-500">Orders placed</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-emerald-600">{formatPrice(customer.totalSpent || 0)}</div>
                        <div className="text-xs text-gray-500">Lifetime value</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetail(customer)}
                            className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                            title="View Details"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          {customer.status === 'active' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSuspend(customer); }}
                              disabled={working}
                              className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition-colors"
                              title="Suspend Account"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReactivate(customer); }}
                              disabled={working}
                              className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors"
                              title="Reactivate Account"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showCustomerDetail && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCustomerDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <img src={selectedCustomer.avatar} className="w-16 h-16 rounded-xl object-cover" alt="" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Customer ID: {selectedCustomer.id}</p>
                    <Badge className={`mt-1 text-[10px] font-black uppercase px-2 py-0.5 ${getStatusColor(selectedCustomer.status)}`} variant="outline">
                      {selectedCustomer.status}
                    </Badge>
                  </div>
                </div>
                <Button onClick={() => setShowCustomerDetail(false)} variant="ghost" className="p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="wallet">Wallet</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Email</Label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Phone</Label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedCustomer.phone || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Joins Date</Label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(selectedCustomer.joinedDate)}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Recent Location</Label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{selectedCustomer.location || '—'}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="orders" className="mt-4">
                  {!detail?.orders || detail.orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">No orders placed yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {detail.orders.map((o: any) => (
                        <div key={o.id} className="flex items-center justify-between border border-gray-100 dark:border-slate-800 rounded-lg px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">{o.orderNumber}</div>
                            <div className="text-xs text-gray-500">{o.vendorName} · {formatDate(o.createdAt)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-emerald-600 text-sm">{formatPrice(o.totalAmount)}</div>
                            <Badge variant="outline" className="text-[10px] mt-1">{o.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="wallet" className="mt-4">
                  {!detail?.transactions || detail.transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">No wallet transactions yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {[...detail.transactions].slice(0, 20).map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between border border-gray-100 dark:border-slate-800 rounded-lg px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">{t.description}</div>
                            <div className="text-xs text-gray-500">{t.category} · {formatDate(t.createdAt)}</div>
                          </div>
                          <div className={cn("text-sm font-semibold", t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600')}>
                            {t.type === 'credit' ? '+' : '−'}{formatPrice(t.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
<Button
                  className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => handleToggleSuspend(selectedCustomer)}
                  disabled={working}
                >
                  {selectedCustomer.status === 'suspended' ? (
                    <><UserCheck className="w-4 h-4 mr-2" /> Reactivate Account</>
                  ) : (
                    <><Ban className="w-4 h-4 mr-2" /> Suspend Account</>
                  )}
                </Button>
                {isSuper && (
                  <Button
                    variant="outline"
                    className="rounded-xl text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedCustomer.name}'s account permanently?`)) handleDelete(selectedCustomer);
                    }}
                    disabled={working}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                  </Button>
                )}
                {!isSuper && (
                  <div className="flex items-center text-xs text-gray-400 gap-1 px-2">
                    <ShieldCheck className="w-4 h-4" /> Account deletion is a Super Admin action.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}