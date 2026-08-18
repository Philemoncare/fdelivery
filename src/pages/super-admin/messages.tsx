import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '@/src/context/AppContext';
import { AdminService } from '@/src/services/api';
import {
  AdminPageHeader, AdminCard, AdminBadge, AdminTable,
  AdminEmptyState, AdminLoading, AdminError
} from '@/src/components/super-admin/AdminDesignSystem';

/*
 * ------------------------------------------------------------
 * NOTIFICATION DELIVERY LOG — end-to-end delivery telemetry
 * ------------------------------------------------------------
 * The /super-admin/messages route redirects to the consolidated
 * Notifications hub; this module provides the delivery trace used
 * by /super-admin/deliveries.
 */
export function SuperAdminDeliveryOperationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    AdminService.getNotificationDeliveries({ limit: 50 })
      .then(res => setRows(res?.items || []))
      .catch(e => setLoadError(e?.message || 'Could not load delivery telemetry.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Bell}
        title="Notification Trace"
        description="End-to-end delivery monitoring for all system and administrative communications."
        stats={<AdminBadge status="operational" label="Telemetry Active" />}
      />

      {loading ? (
        <AdminLoading message="Reading real-time delivery telemetry…" />
      ) : loadError ? (
        <AdminError message="Unable to load notification deliveries." detail={loadError} retry={load} />
      ) : (
        <AdminCard title="Delivery Registry" icon={Bell} noPadding>
          {rows.length === 0 ? (
            <AdminEmptyState
              icon={Bell}
              title="No notification deliveries yet"
              description="Messages and maintenance notifications will appear here once they are sent."
              action={<button onClick={load} className="text-sm font-semibold text-primary hover:underline">Refresh</button>}
            />
          ) : (
            <AdminTable headers={['Identity / Channel', 'Notification Ref', 'Status State', 'Dispatched']}>
              {rows.map(r => (
                <tr key={r.id} className="group hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-ink">{r.name || r.email}</div>
                    <div className="text-xs text-ink-3">{r.channel}</div>
                  </td>
                  <td className="max-w-xs truncate px-5 py-3.5 text-sm text-ink-2">
                    {r.refTitle}
                  </td>
                  <td className="px-5 py-3.5">
                    <AdminBadge status={r.status === 'delivered' || r.status === 'sent' ? 'success' : 'error'} label={r.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-3">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminCard>
      )}
    </div>
  );
}