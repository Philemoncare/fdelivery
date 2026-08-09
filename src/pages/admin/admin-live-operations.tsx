import { useState, useMemo } from 'react';
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
  ChefHat, Utensils, Star, Award, Flag, ThumbsUp,
  Truck, Settings
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
import { AdminService } from '@/src/services/api';
import { cn } from '@/src/lib/utils';

export function AdminLiveOperationsPage() {
  const { orders, riders, vendors, formatPrice, notifications, showToast } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', body: '' });
  const [publishing, setPublishing] = useState(false);

  // Calculate real metrics
  const liveMetrics = {
    activeOrders: orders.filter(o =>
      ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(o.status)
    ).length,
    activeDeliveries: orders.filter(o =>
      ['picked_up', 'in_transit', 'arriving'].includes(o.status)
    ).length,
    availableRiders: riders.filter(r => r.isOnline && r.isAvailable).length,
    busyRiders: riders.filter(r => r.isOnline && !r.isAvailable).length,
    activeRestaurants: vendors.filter(v => v.isOpen && v.isKitchenOpen).length,
    suspendedRestaurants: vendors.filter(v => !v.isOpen).length,
    unassignedOrders: orders.filter(o => o.status === 'ready_for_pickup').length,
    deliveryExceptions: orders.filter(o =>
      (['in_transit', 'arriving'].includes(o.status)) &&
      (!o.deliveryMethod || !o.estimatedDeliveryTime || o.status === 'in_transit')
    ).length,
  };

  // Live events derived from real platform data
  const liveEvents = useMemo(() => {
    const events: Array<{ id: string; type: string; message: string; time: string; status: string }> = [];

    vendors.filter(v => v.status === 'pending').forEach(v => events.push({
      id: `vendor-${v.id}`, type: 'vendor',
      message: `New vendor application from ${v.name}`,
      time: v.joinedDate ? new Date(v.joinedDate).toLocaleDateString() : 'pending', status: 'info',
    }));

    riders.filter(r => !r.isVerified).forEach(r => events.push({
      id: `rider-${r.id}`, type: 'rider',
      message: `Rider ${r.name} (${r.vehicleType}) awaiting verification`,
      time: 'unverified', status: 'warning',
    }));

    orders.filter(o => ['in_transit', 'arriving'].includes(o.status)).slice(0, 5).forEach(o => events.push({
      id: `order-${o.id}`, type: 'delivery',
      message: `Order ${o.orderNumber} in transit to ${o.customerName || 'customer'}`,
      time: 'in transit', status: 'success',
    }));

    notifications.filter(n => !n.read).slice(0, 5).forEach(n => events.push({
      id: `notif-${n.id}`, type: 'system',
      message: n.message,
      time: n.time || 'unread', status: 'info',
    }));

    return events.slice(0, 8);
  }, [vendors, riders, orders, notifications]);

  const getStatusColor = (type: string) => {
    const colors = {
      'order': 'bg-blue-50 text-blue-700 border-blue-200',
      'rider': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'delivery': 'bg-amber-50 text-amber-700 border-amber-200',
      'vendor': 'bg-violet-50 text-violet-700 border-violet-200',
      'system': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[type as keyof typeof colors] || colors.system;
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header with Auto-Refresh Toggle */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Operations Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Real-time platform monitoring and operations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm font-medium">
              Auto-refresh ({autoRefresh ? 'ON' : 'OFF'})
            </Label>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Live Connection {autoRefresh ? '• Active' : '• Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{liveMetrics.activeOrders}</p>
                <p className="text-xs text-blue-500 mt-1">
                  {liveMetrics.unassignedOrders} unassigned
                </p>
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
                <p className="text-sm text-gray-500 dark:text-slate-400">Active Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{liveMetrics.activeDeliveries}</p>
                <p className="text-xs text-amber-500 mt-1">
                  {liveMetrics.deliveryExceptions} exceptions
                </p>
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
                <p className="text-sm text-gray-500 dark:text-slate-400">Available Riders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{liveMetrics.availableRiders}</p>
                <p className="text-xs text-emerald-500 mt-1">
                  {liveMetrics.busyRiders} on duty
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
                <Bike className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Active Restaurants</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{liveMetrics.activeRestaurants}</p>
                <p className="text-xs text-violet-500 mt-1">
                  {liveMetrics.suspendedRestaurants} suspended
                </p>
              </div>
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-500">
                <StoreIcon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Events Feed */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Live Platform Events
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {liveEvents.map((event) => (
                <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(event.type).split(' ')[0]} flex-shrink-0`}>                      {event.type === 'order' && <ShoppingBag className="w-4 h-4" />}
                      {event.type === 'rider' && <Bike className="w-4 h-4" />}
                      {event.type === 'delivery' && <Truck className="w-4 h-4" />}
                      {event.type === 'vendor' && <StoreIcon className="w-4 h-4" />}
                      {event.type === 'system' && <Activity className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{event.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{event.time}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(event.type)}`}>                            {event.type}
                        </span>
                      </div>
                    </div>
                    <button className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <Button className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white" onClick={() => navigate('/admin/vendors')}>
              <Plus className="w-4 h-4 mr-2" /> New Vendor Approval
            </Button>
            <Button className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate('/admin/deliveries')}>
              <Plus className="w-4 h-4 mr-2" /> Assign Rider
            </Button>
            <Button className="w-full rounded-xl bg-violet-500 hover:bg-violet-600 text-white" onClick={() => { setAnnouncement({ title: '', body: '' }); setShowAnnouncement(true); }}>
              <Megaphone className="w-4 h-4 mr-2" /> Platform Announcement
            </Button>
            <Button className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate('/admin/reports')}>
              <FileText className="w-4 h-4 mr-2" /> Generate Report
            </Button>
            <Button className="w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white" onClick={() => navigate('/admin/settings')}>
              <Settings className="w-4 h-4 mr-2" /> System Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" /> System Health
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {
              [
                { metric: 'Pending Vendors', value: String(vendors.filter(v => v.status === 'pending').length), status: vendors.some(v => v.status === 'pending') ? 'warning' : 'success' },
                { metric: 'Unverified Riders', value: String(riders.filter(r => !r.isVerified).length), status: riders.some(r => !r.isVerified) ? 'warning' : 'success' },
                { metric: 'Active Orders', value: String(liveMetrics.activeOrders), status: liveMetrics.activeOrders > 0 ? 'success' : 'info' },
                { metric: 'Available Riders', value: String(liveMetrics.availableRiders), status: liveMetrics.availableRiders > 0 ? 'success' : 'info' },
                { metric: 'Active Restaurants', value: String(liveMetrics.activeRestaurants), status: liveMetrics.activeRestaurants > 0 ? 'success' : 'info' },
                { metric: 'In-Transit Deliveries', value: String(liveMetrics.activeDeliveries), status: liveMetrics.activeDeliveries > 0 ? 'success' : 'info' },
                { metric: 'Unassigned Orders', value: String(liveMetrics.unassignedOrders), status: liveMetrics.unassignedOrders > 0 ? 'warning' : 'success' },
                { metric: 'Unread Notifications', value: String(notifications.filter(n => !n.read).length), status: notifications.some(n => !n.read) ? 'info' : 'success' },
              ].map((item) => (
                <div key={item.metric} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{item.metric}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{item.value}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>

      {/* Platform Announcement Modal */}
      <AnimatePresence>
        {showAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAnnouncement(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Platform Announcement</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Send a message to every user, vendor, and rider.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5 block">Title</Label>
                  <Input
                    value={announcement.title}
                    onChange={e => setAnnouncement({ ...announcement, title: e.target.value })}
                    placeholder="e.g. System maintenance tonight at 2 AM"
                    className="rounded-xl h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5 block">Message</Label>
                  <Textarea
                    value={announcement.body}
                    onChange={e => setAnnouncement({ ...announcement, body: e.target.value })}
                    placeholder="Details of the announcement…"
                    className="rounded-xl"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={() => setShowAnnouncement(false)}>Cancel</Button>
                <Button
                  className="flex-1 rounded-xl bg-violet-500 hover:bg-violet-600 text-white h-10"
                  disabled={!announcement.title.trim() || !announcement.body.trim() || publishing}
                  onClick={async () => {
                    setPublishing(true);
                    try {
                      const res = await AdminService.publishAnnouncement({ title: announcement.title.trim(), message: announcement.body.trim() });
                      setShowAnnouncement(false);
                      setAnnouncement({ title: '', body: '' });
                      showToast('Announcement Published', `Broadcast to ${res?.recipients ?? 'all'} users.`, 'success');
                    } catch (e: any) {
                      showToast('Publish Failed', e?.message || 'Could not publish announcement.', 'warning');
                    } finally {
                      setPublishing(false);
                    }
                  }}
                >
                  <Megaphone className="w-4 h-4 mr-2" /> {publishing ? 'Publishing…' : 'Publish'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
