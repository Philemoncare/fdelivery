import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Clock, CheckCircle, DollarSign, MapPin, Phone, Star, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { Order } from '@/src/types';

import { useNavigate } from 'react-router-dom';

export function RiderDeliveriesPage() {
  const { orders, riders, formatPrice, updateOrderStatus, showToast } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [deliverConfirm, setDeliverConfirm] = useState<Order | null>(null);

  const riderRecord = riders.find(r => r.userId === user?.id || r.id === user?.id);

  const riderOrders = useMemo(() => {
    return orders.filter(o => o.riderId === user?.id);
  }, [orders, user]);

  const filtered = useMemo(() => {
    return riderOrders.filter(d => {
      if (filter === 'active') return ['rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(d.status);
      if (filter === 'completed') return ['delivered', 'completed'].includes(d.status);
      return true;
    });
  }, [riderOrders, filter]);

  const activeCount = riderOrders.filter(d => ['rider_assigned', 'picked_up', 'in_transit', 'arriving'].includes(d.status)).length;

  const todayEarnings = useMemo(() => {
    const today = new Date().toDateString();
    return riderOrders
      .filter(d => ['delivered', 'completed'].includes(d.status) && new Date(d.createdAt).toDateString() === today)
      .reduce((a, d) => a + (d.deliveryFee || 0), 0);
  }, [riderOrders]);

  const avgRating = riderRecord?.rating !== undefined ? riderRecord.rating.toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Deliveries</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">{activeCount} active | {formatPrice(todayEarnings)} earned today</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: activeCount, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Completed', value: riderOrders.filter(d => ['delivered', 'completed'].includes(d.status)).length, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Earnings', value: formatPrice(riderOrders.filter(d => ['delivered', 'completed'].includes(d.status)).reduce((a, d) => a + (d.deliveryFee || 0), 0)), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
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
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            {(['all', 'active', 'completed'] as const).map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${filter === t ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}>{t}</button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((del, i) => (
              <motion.div key={del.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
                onClick={() => navigate(`/rider/deliveries/${del.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ['in_transit', 'arriving'].includes(del.status) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                    del.status === 'rider_assigned' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                    ['delivered', 'completed'].includes(del.status) ? 'bg-gray-100 dark:bg-slate-700 text-gray-500' :
                    'bg-red-50 dark:bg-red-900/20 text-red-500'
                  }`}>
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{del.customerName}</p>
                      <Badge variant={['in_transit', 'delivered', 'completed'].includes(del.status) ? 'success' : 'info'} size="sm">
                        {del.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {del.customerAddress}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(del.createdAt).toLocaleTimeString()}</span>
                      <span>{del.items.length} items</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-emerald-600">{formatPrice(del.deliveryFee)}</p>
                  </div>
                  {['rider_assigned', 'picked_up', 'in_transit'].includes(del.status) && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="p-2"><Phone className="w-4 h-4" /></Button>
                      <Button size="sm" variant="primary" className="px-3" onClick={(e) => { e.stopPropagation(); updateOrderStatus(del.id, 'delivered'); }}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
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
    </div>
  );
}
