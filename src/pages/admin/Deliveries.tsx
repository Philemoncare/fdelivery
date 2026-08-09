import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Store, Bike, ShoppingBag, DollarSign, Package,
  Tags, CreditCard, LifeBuoy, MessageSquare, TicketPercent,
  Megaphone, ShieldCheck, FileText, BarChart3, Activity,
  AlertCircle, Clock, CheckCircle, XCircle, Edit3, Trash2,
  TrendingUp, UserCheck, Calendar, MapPin, Phone, Mail,
  Search, Filter, Download, Upload, Plus, Minus, Eye, EyeOff,
  Save, RotateCcw, Truck
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

export function AdminDeliveriesPage() {
  const { orders, riders, formatPrice, updateOrderStatus, assignRiderToOrder } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');

  const activeDeliveries = orders.filter(o => 
    ['rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status)
  );

  const availableRiders = riders.filter(r => r.isOnline && r.isAvailable);

  const etaMinutes = (o: any) => {
    if (o.estimatedArrivalMinutes) return Number(o.estimatedArrivalMinutes);
    if (o.estimatedDeliveryTime) return Math.round((new Date(o.estimatedDeliveryTime).getTime() - Date.now()) / 60000);
    return null;
  };
  const ordersWithEta = activeDeliveries.map(etaMinutes).filter((m): m is number => m !== null);
  const avgEta = ordersWithEta.length ? Math.max(1, Math.round(ordersWithEta.reduce((s, m) => s + m, 0) / ordersWithEta.length)) : 0;

  const filteredDeliveries = activeDeliveries.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'rider_assigned') return o.status === 'rider_assigned';
    if (filter === 'in_transit') return ['picked_up', 'in_transit', 'arriving'].includes(o.status);
    return false;
  }).filter(o => {
    if (!search) return true;
    return (
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.riderId && riders.find(r => r.id === o.riderId)?.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleAssignRider = async () => {
    if (!assigningOrderId || !selectedRiderId) return;
    await assignRiderToOrder(assigningOrderId, selectedRiderId);
    setShowAssignModal(false);
    setAssigningOrderId(null);
    setSelectedRiderId('');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'rider_assigned': 'bg-blue-50 text-blue-700 border-blue-200',
      'picked_up': 'bg-purple-50 text-purple-700 border-purple-200',
      'in_transit': 'bg-amber-50 text-amber-700 border-amber-200',
      'arriving': 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Operations</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage active deliveries and assign riders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{activeDeliveries.length} Active Deliveries</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Riders On Duty</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{riders.filter(r => r.isOnline).length}</p>
                <p className="text-xs text-emerald-500 mt-1">All online</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                <Bike className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Assigned Orders</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{activeDeliveries.filter(o => o.status === 'rider_assigned').length}</p>
                <p className="text-xs text-blue-500 mt-1">Waiting for pickup</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">In Transit</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{activeDeliveries.filter(o => ['picked_up', 'in_transit', 'arriving'].includes(o.status)).length}</p>
                <p className="text-xs text-amber-500 mt-1">En route to customers</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500">
                <Truck className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Delivery ETA</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{avgEta} min</p>
                <p className="text-xs text-emerald-500 mt-1">{ordersWithEta.length} tracked orders</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm border-gray-100 dark:border-slate-800">
        <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" /> Active Deliveries
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by order ID or customer..."
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
                  <SelectItem value="all">All Deliveries</SelectItem>
                  <SelectItem value="rider_assigned">Awaiting Pickup</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No active deliveries</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">All deliveries are completed or none assigned</p>
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
                    <th className="py-4 px-6">ETA</th>
                    <th className="py-4 px-6">Rider</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.map(o => {
                    const rider = o.riderId ? riders.find(r => r.id === o.riderId) : null;
                    const eta = etaMinutes(o);

                    return (
                      <tr key={o.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-mono text-xs font-bold text-gray-500">#{o.orderNumber}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900 dark:text-white">{o.customerName}</div>
                          <div className="text-xs text-gray-500">{o.customerPhone}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900 dark:text-white">{o.vendorName}</div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={`text-[10px] font-black uppercase px-2 py-1 ${getStatusColor(o.status)}`} variant="outline">
                            {o.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-900 dark:text-white">{eta ? `${eta} min` : '—'}</div>
                          <div className="text-xs text-gray-500">Est. arrival</div>
                        </td>
                        <td className="py-4 px-6">
                          {rider ? (
                            <div className="flex items-center gap-2">
                              <img src={rider.avatar} className="w-6 h-6 rounded-lg object-cover" />
                              <div>
                                <div className="text-xs font-medium text-gray-900 dark:text-white">{rider.name}</div>
                                <div className="text-xs text-gray-500">{rider.vehicleType}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic">Unassigned</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setAssigningOrderId(o.id);
                                setShowAssignModal(true);
                              }}
                              className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                              title="Assign Rider"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedOrder(o.id)}
                              className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
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
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Assign Rider</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Select an available rider for this order</p>

              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2 block">Available Riders</Label>
                  <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Select a rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRiders.map(rider => (
                        <SelectItem key={rider.id} value={rider.id} label={rider.name}>
                          <div className="flex items-center gap-3">
                            <img src={rider.avatar} className="w-6 h-6 rounded-lg object-cover" />
                            <div>
                              <div className="text-xs font-medium">{rider.name}</div>
                              <div className="text-xs text-gray-500">{rider.vehicleType} • {rider.rating} ★</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAssignModal(false)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignRider}
                  className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!selectedRiderId}
                >
                  Assign Rider
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
