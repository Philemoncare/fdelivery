import type { NotificationCategory, NotificationItem, NotificationPriority } from '@/src/types';
import { formatRelativeTime } from '@/src/lib/utils';

// Order of the filter chips. A category is only rendered when at least one real
// notification carries it, so no empty/placeholder filters ever appear.
export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'deliveries', label: 'Deliveries' },
  { key: 'messages', label: 'Messages' },
  { key: 'payments', label: 'Payments' },
  { key: 'account', label: 'Account' },
  { key: 'system', label: 'System' },
];

export function notifCategoryLabel(category?: NotificationCategory): string {
  return NOTIFICATION_CATEGORIES.find(c => c.key === category)?.label ?? 'System';
}

// Metadata used by the notification center and the header dropdown: category
// icon + color treatment. Type strings from the backend fall back to category.
export interface NotifMeta {
  icon: 'order' | 'delivery' | 'message' | 'payment' | 'account' | 'system';
  color: string;
  chip: string;
}

export function notifMeta(n: NotificationItem): NotifMeta {
  const cat = n.category || 'system';
  switch (cat) {
    case 'orders':
      return { icon: 'order', color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' };
    case 'deliveries':
      return { icon: 'delivery', color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10', chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' };
    case 'messages':
      return { icon: 'message', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10', chip: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' };
    case 'payments':
      return { icon: 'payment', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' };
    case 'account':
      return { icon: 'account', color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10', chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' };
    default:
      return { icon: 'system', color: 'text-gray-500 bg-gray-100 dark:bg-slate-700/50', chip: 'bg-gray-100 text-gray-600 dark:bg-slate-700/50 dark:text-gray-300' };
  }
}

export function priorityMeta(priority?: NotificationPriority): { label: string; chip: string } {
  switch (priority) {
    case 'CRITICAL':
      return { label: 'Critical', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' };
    case 'IMPORTANT':
      return { label: 'Important', chip: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' };
    default:
      return { label: '', chip: '' };
  }
}

// Best-effort destination for a notification. Backend-supplied `action` wins;
// otherwise fall back to a category-based route with role-aware bases. Message
// notifications always target the exact conversation, never a generic inbox.
export function notifDestination(n: NotificationItem, basePath: string): string {
  if (n.action) return n.action;
  const cat = n.category || 'system';
  const conv = n.relatedConversationId;
  const orderId = n.relatedOrderId;
  switch (cat) {
    case 'orders':
      return orderId ? `${basePath}/orders/${orderId}` : `${basePath}/orders`;
    case 'deliveries':
      return orderId ? `${basePath}/orders/${orderId}` : `${basePath}/deliveries`;
    case 'messages':
      return conv ? `${basePath}/messages?convId=${conv}` : `${basePath}/messages`;
    case 'payments':
      return `${basePath}/wallet`;
    case 'account':
      return `${basePath}/profile`;
    default:
      return basePath;
  }
}

export function notifTime(n: NotificationItem): string {
  return formatRelativeTime(n.createdAt || n.time || '');
}

// Merge two notification lists by id, newest first (used to keep the paginated
// feed in sync with live context pushes without duplicates).
export function mergeNotifications(a: NotificationItem[], b: NotificationItem[]): NotificationItem[] {
  const seen = new Map<string, NotificationItem>();
  [...a, ...b].forEach(n => seen.set(n.id, n));
  return Array.from(seen.values()).sort((x, y) =>
    String(y.createdAt || y.time).localeCompare(String(x.createdAt || x.time)));
}
