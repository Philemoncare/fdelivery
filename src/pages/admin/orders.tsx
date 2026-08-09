import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Store, Bike, ShoppingBag, DollarSign, Package,
  Tags, CreditCard, LifeBuoy, MessageSquare, TicketPercent,
  Megaphone, ShieldCheck, FileText, BarChart3, Activity,
  AlertCircle, Clock, CheckCircle, XCircle, Edit3, Trash2,
  TrendingUp, UserCheck, Calendar, MapPin, Phone, Mail,
  Search, Filter, Download, Upload, Plus, Minus, Eye, EyeOff,
  Save, RotateCcw, Users as UsersIcon, Store as StoreIcon,
  ChefHat, Utensils, Star, Award, Flag, ThumbsUp, Map,
  UserPlus, Clock as ClockIcon, CheckCircle as CheckCircleIcon,
  Package as PackageIcon, Star as StarIcon, Heart as HeartIcon,
  Truck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Progress } from '@/src/components/ui/progress';
import { useApp } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';

export function AdminOrdersPage() {
  const { orders = [], riders = [], formatPrice, updateOrderStatus, assignRiderToOrder } = useApp() || {};
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(o => {
      if (!o) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return o.status === 'pending';
      if (statusFilter === 'confirmed') return o.status === 'confirmed';
      if (statusFilter === 'preparing') return o.status === 'preparing';
      if (statusFilter === 'ready_for_pickup') return o.status === 'ready_for_pickup';
      if (statusFilter === 'rider_assigned') return o.status === 'rider_assigned';
      if (statusFilter === 'in_transit') return ['picked_up', 'in_transit', 'arriving'].includes(o.status);
      if (statusFilter === 'delivered') return o.status === 'delivered' || o.status === 'completed';
      if (statusFilter === 'cancelled') return o.status === 'cancelled' || o.status === 'failed';
      return false;
    }).filter(o => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.vendorName || '').toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, search]);


  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'confirmed': 'bg-blue-50 text-blue-700 border-blue-200',
      'preparing': 'bg-violet-50 text-violet-700 border-violet-200',
      'ready_for_pickup': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'rider_assigned': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'picked_up': 'bg-purple-50 text-purple-700 border-purple-200',
      'in_transit': 'bg-amber-50 text-amber-700 border-amber-200',
      'arriving': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'cancelled': 'bg-rose-50 text-rose-700 border-rose-200',
      'failed': 'bg-gray-50 text-gray-700 border-gray-200',
      'refunded': 'bg-blue-50 text-blue-700 border-blue-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'pending': ClockIcon,
      'confirmed': CheckCircleIcon,
      'preparing': ChefHat,
      'ready_for_pickup': PackageIcon,
      'rider_assigned': UserCheck,
      'picked_up': Truck,
      'in_transit': Bike,
      'arriving': MapPin,
      'delivered': CheckCircleIcon,
      'completed': CheckCircleIcon,
      'cancelled': XCircle,
      'failed': AlertCircle,
      'refunded': DollarSign
    };
    return icons[status as keyof typeof icons] || Activity;
  };

  const getNextStatusOptions = (currentStatus: string) => {
    const options: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready_for_pickup', 'cancelled'],
      'ready_for_pickup': ['rider_assigned', 'cancelled'],
      'rider_assigned': ['picked_up', 'cancelled'],
      'picked_up': ['in_transit', 'cancelled'],
      'in_transit': ['arriving', 'cancelled'],
      'arriving': ['delivered', 'cancelled'],
      'delivered': ['completed'],
      'completed': [],
      'cancelled': [],
      'failed': ['refunded'],
      'refunded': []
    };
    return options[currentStatus] || [];
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus as any);
    setShowOrderDetail(false);
    setSelectedOrder(null);
  };

  const handleAssignRider = async () => {
    if (!selectedOrder || !assignRiderId) return;
    setAssigning(true);
    try {
      await assignRiderToOrder(selectedOrder.id, assignRiderId);
      setAssignRiderId('');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Management</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage orders across the platform with real-time updates</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{orders.length} Total Orders</span>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{orders.filter(o => !['delivered', 'completed', 'cancelled', 'failed'].includes(o.status)).length} Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{orders.filter(o => o.status === 'pending').length}</p>
                <p className="text-xs text-amber-500 mt-1">Awaiting confirmation</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500">
                <ClockIcon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Preparing</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{orders.filter(o => o.status === 'preparing').length}</p>
                <p className="text-xs text-violet-500 mt-1">Kitchen active</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-500">
                <ChefHat className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Out for Delivery</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{orders.filter(o => ['picked_up', 'in_transit', 'arriving'].includes(o.status)).length}</p>
                <p className="text-xs text-blue-500 mt-1">En route to customers</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Revenue Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatPrice(orders.reduce((sum, o) => o.status === 'completed' ? sum + o.totalAmount : sum, 0))}</p>
                <p className="text-xs text-emerald-500 mt-1">Completed orders only</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm border-gray-100 dark:border-slate-800">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-500" /> Order Pipeline
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by order ID, customer, or restaurant..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-lg w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="rider_assigned">Rider Assigned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No orders found</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/30 dark:bg-slate-800/30 border-b text-xs font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Order ID</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Restaurant</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Total Amount</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const StatusIcon = getStatusIcon(order.status);

                    return (
                      <tr key={order.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-mono text-xs font-bold text-gray-500">#{order.orderNumber}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900 dark:text-white">{order.customerName}</div>
                          <div className="text-xs text-gray-500">{order.customerPhone}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900 dark:text-white">{order.vendorName}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${getStatusColor(order.status).split(' ')[0]} flex-shrink-0`}>                              <StatusIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-900 dark:text-white">{order.status.replace('_', ' ')}</div>
                              <div className="text-xs text-gray-500">ID: {order.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-900 dark:text-white">{formatPrice(order.totalAmount)}</div>
                          <div className="text-xs text-gray-500">${order.vendorPayout} to restaurant</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(order.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderDetail(true);
                              }}
                              className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-violet-50 hover:text-violet-500 transition-colors" title="Update Status">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {order.status === 'ready_for_pickup' && (
                              <button className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors" title="Assign Rider">
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showOrderDetail && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowOrderDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-6xl shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order #{selectedOrder.orderNumber}</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs font-medium ${getStatusColor(selectedOrder.status)}`} variant="outline">
                    {selectedOrder.status.replace('_', ' ')}
                  </Badge>
                  <Button
                    onClick={() => setShowOrderDetail(false)}
                    variant="ghost"
                    className="p-2 rounded-lg"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="details">Order Details</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="assign">Assign Rider</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-4">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Customer Information</Label>
                        <div className="mt-2 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                          <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.customerName}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{selectedOrder.customerEmail}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{selectedOrder.customerPhone}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">Address: {selectedOrder.customerAddress}</p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Restaurant Information</Label>
                        <div className="mt-2 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                          <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.vendorName}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Location: {selectedOrder.vendorAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Order Items</Label>
                        <div className="mt-2 space-y-2">
                          {selectedOrder.items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-500">Qty: {item.quantity} • ${item.unitPrice} each</p>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white">${item.subtotal}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Delivery Information</Label>
                        <div className="mt-2 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                          <p className="text-sm text-gray-600 dark:text-slate-400">Method: {selectedOrder.deliveryMethod}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Status: {selectedOrder.status.replace('_', ' ')}</p>
                          {selectedOrder.riderId && (
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Rider: Rider #{selectedOrder.riderId}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Payment Summary</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-slate-400">Subtotal:</span>
                            <span className="font-medium text-gray-900 dark:text-white">${selectedOrder.subtotal}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-slate-400">Tax:</span>
                            <span className="font-medium text-gray-900 dark:text-white">${selectedOrder.tax}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-slate-400">Delivery Fee:</span>
                            <span className="font-medium text-gray-900 dark:text-white">${selectedOrder.deliveryFee}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-slate-400">Discount:</span>
                            <span className="font-medium text-gray-900 dark:text-white">-${selectedOrder.discount}</span>
                          </div>
                          <div className="border-t border-gray-200 dark:border-slate-700 pt-2">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">Total:</span>
                              <span className="font-bold text-gray-900 dark:text-white">${selectedOrder.totalAmount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-gray-700 dark:text-slate-300">Quick Status Update</Label>
                        <div className="mt-2 space-y-2">
                          {getNextStatusOptions(selectedOrder.status).map((option: string) => (
                            <button
                              key={option}
                              onClick={() => handleStatusUpdate(selectedOrder.id, option)}
                              className="w-full p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors text-left"
                            >
                              Update to {option.replace('_', ' ')}
                            </button>
                          ))}
                          {getNextStatusOptions(selectedOrder.status).length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-slate-500">No further status changes available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Order Placed</p>
                          <p className="text-xs text-gray-500">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge variant="success">Pending → {selectedOrder.status.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Current status · {selectedOrder.estimatedDeliveryTime && `Estimated delivery ${selectedOrder.estimatedDeliveryTime}`}
                      </p>
                    </div>
                    {selectedOrder.deliveryMethod && (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Delivery Method</p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">{selectedOrder.deliveryMethod}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedOrder.paymentMethod || 'OmniWallet'}</p>
                        <p className="text-xs text-gray-500 mt-1">Payment method on this order</p>
                      </div>
                      <Badge variant={selectedOrder.paymentStatus === 'paid' ? 'success' : 'warning'}>{selectedOrder.paymentStatus || 'pending'}</Badge>
                    </div>
                    <div className="space-y-2">
                      {[
                        ['Platform Commission', formatPrice(selectedOrder.platformCommission || 0)],
                        ['Vendor Payout', formatPrice(selectedOrder.vendorPayout || 0)],
                        ['Payment Status', selectedOrder.paymentStatus || 'pending'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-slate-400">{label}</span>
                          <span className="font-bold text-gray-900 dark:text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assign" className="mt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Select an available rider to take this delivery.</p>
                    <Select value={selectedOrder.riderId || assignRiderId} onValueChange={setAssignRiderId}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Select a rider" />
                      </SelectTrigger>
                      <SelectContent>
                        {riders.filter(r => r.isOnline && r.isAvailable).map(rider => (
                          <SelectItem key={rider.id} value={rider.id}>
                            {rider.name} · {rider.vehicleType} · {rider.rating}★
                          </SelectItem>
                        ))}
                        {selectedOrder.riderId && (
                          <SelectItem value={selectedOrder.riderId}>Currently assigned rider</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={!assignRiderId || assigning}
                      onClick={handleAssignRider}
                      className="w-full rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      <UserCheck className="w-4 h-4 mr-2" /> {assigning ? 'Assigning…' : selectedOrder.riderId ? 'Reassign Rider' : 'Assign Rider'}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Created</p>
                      <span className="text-xs text-gray-500">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Last Updated</p>
                      <span className="text-xs text-gray-500">{new Date(selectedOrder.updatedAt || selectedOrder.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
