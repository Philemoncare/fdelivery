/**
 * ============================================================
 * OMNIMARKET API SERVICE
 * ============================================================
 * Production-ready API gateway for OmniMarket Ghana.
 * Handles all modules: Vendors, Products, Orders, Riders, Wallet, etc.
 * Centered on Takoradi, Western Region.
 */

import {
  Vendor, Product, Order, OrderStatus, DispatchRider, RiderStatus, RiderLocationUpdate,
  CustomerProfile, Review, NotificationItem, WalletTransaction,
  Coupon, Address, OrderItem, PackageQuote, DeliveryLocation,
  PaymentGatewayConfig, PlatformSettings
} from '../types';
import { readRequestTokens } from '@/src/lib/auth/token-scope';

const API_BASE_URL = '/api';

// Production Real-Time Service using EventSource (SSE)
type EventCallback = (data: any) => void;
const eventListeners: Record<string, EventCallback[]> = {};
let eventSource: EventSource | null = null;
let lastRetry = 0;
const RETRY_DELAY = 5000;

export const RealTimeService = {
  subscribe: (event: string, callback: EventCallback) => {
    const now = Date.now();
    if (!eventSource && (now - lastRetry > RETRY_DELAY)) {
      const tokens = readRequestTokens();

      let urlStr = `${API_BASE_URL}/realtime`;
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(urlStr, window.location.origin);
          if (tokens?.accessToken) url.searchParams.set('token', tokens.accessToken);
          urlStr = url.toString();
        } catch (e) {
          console.error('Invalid URL for EventSource:', e);
        }
      }

      try {
        console.log('Connecting to Real-time Hub...');
        eventSource = new EventSource(urlStr);
        eventSource.onmessage = (e) => {
          try {
            const { event: ev, data } = JSON.parse(e.data);
            if (eventListeners[ev]) {
              eventListeners[ev].forEach(cb => cb(data));
            }
          } catch (err) {
            console.error('Error parsing real-time message:', err);
          }
        };
        eventSource.onerror = (e) => {
          console.warn('Real-time connection lost. Retrying in 5s...');
          eventSource?.close();
          eventSource = null;
          lastRetry = Date.now();
        };
      } catch (err) {
        console.error('Failed to create EventSource:', err);
        lastRetry = Date.now();
      }
    }

    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(callback);

    return () => {
      eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
      if (Object.values(eventListeners).every(arr => arr.length === 0)) {
        eventSource?.close();
        eventSource = null;
      }
    };
  },
  emit: (event: string, data: any) => {
    // In a real production app, we usually emit via HTTP requests that then broadcast
    // but for internal app events we can still use local dispatch if needed.
    if (eventListeners[event]) {
      eventListeners[event].forEach(cb => cb(data));
    }
  }
};

// Generic API Client with Auth headers
async function request<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 60000): Promise<T> {
  const tokens = readRequestTokens();

  const headers = new Headers(options.headers);
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  headers.set('Content-Type', 'application/json');

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API Request] ${options.method || 'GET'} ${url}`);

  // Never hang forever: abort after the timeout and surface a clear message.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, headers, signal: controller.signal });

    if (!response.ok) {
      console.error(`[API Error] ${url} returned ${response.status}`);
      if (response.status === 401) {
        // Logic for token refresh could go here
      }
      const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      const e: any = new Error(error.message || `Request failed with status ${response.status}`);
      e.status = response.status;
      throw e;
    }

    const data = await response.json();
    console.log(`[API Success] ${url}`, data);
    return data;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const timeoutErr: any = new Error('Request timed out — the system could not confirm the operation.');
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    console.error(`[API Network Error] ${url}:`, err.message);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// 1. VENDORS & MENUS
// ------------------------------------------------------------

export const VendorService = {
  getAll: (params?: any) => request<Vendor[]>('/vendors'),
  getById: (id: string) => request<Vendor>(`/vendors/${id}`),
  create: (data: Partial<Vendor> & any) => request<Vendor>('/vendors', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<{ success: boolean }>(`/vendors/${id}`, { method: 'DELETE' }),
  updateProfile: (id: string, data: Partial<Vendor>) => request<Vendor>(`/vendors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  getMenu: (vendorId: string) => request<Product[]>(`/vendors/${vendorId}/products`),
  updateStatus: (id: string, isOpen: boolean) => request<Vendor>(`/vendors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isOpen })
  }),
  toggleKitchen: (id: string) => request<Vendor>(`/vendors/${id}/kitchen-toggle`, { method: 'POST' }),
  getDashboard: (vendorId: string) => request<any>(`/vendors/${vendorId}/dashboard`),
  getHours: (vendorId: string) => request<any>(`/vendors/${vendorId}/hours`),
  updateHours: (vendorId: string, hours: any) => request<any>(`/vendors/${vendorId}/hours`, {
    method: 'PUT',
    body: JSON.stringify(hours)
  }),
};

// ------------------------------------------------------------
// 2. PRODUCTS & CATEGORIES
// ------------------------------------------------------------

export const ProductService = {
  getAll: (params?: any) => request<Product[]>('/products'),
  getById: (id: string) => request<Product>(`/products/${id}`),
  create: (data: Partial<Product>) => request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Product>) => request<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  getCategories: (vendorId?: string) => request<any[]>(`/categories${vendorId ? `?vendorId=${vendorId}` : ''}`),
  createCategory: (data: any) => request<any>('/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCategory: (id: string, data: any) => request<any>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deleteCategory: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
};

// ------------------------------------------------------------
// 3. ORDERS & DELIVERY
// ------------------------------------------------------------

export const OrderService = {
  getAll: (role: string, id: string) => request<Order[]>(`/orders?role=${role}&id=${id}`),
  getById: (id: string) => request<Order>(`/orders/${id}`),
  placeOrder: (orderData: any) => request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  updateStatus: (id: string, status: OrderStatus, reason?: string) => request<Order>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason })
  }),
  completeDelivery: (id: string) => request<{ success: boolean; alreadyCompleted?: boolean; order: Order; message?: string }>(`/orders/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({})
  }),
  assignRider: (orderId: string, riderId: string) => request<Order>(`/orders/${orderId}/assign-rider`, {
    method: 'POST',
    body: JSON.stringify({ riderId })
  }),
  getTracking: (orderId: string) => request<any>(`/orders/${orderId}/tracking`),
  trackingLookup: (ref: string) => request<any>(`/orders/tracking/${encodeURIComponent(ref)}`),
  getAvailable: () => request<any[]>('/orders/available'),
  createPackage: (data: any) => request<Order>(`/orders/package`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  quotePackage: (data: any) => request<PackageQuote>(`/orders/package/quote`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  receiverConfirm: (id: string, code?: string) => request<{ success: boolean; alreadyConfirmed?: boolean; order: Order }>(`/orders/${id}/receiver-confirm`, {
    method: 'POST',
    body: JSON.stringify(code ? { code } : {})
  }),
  openRiderConversation: (id: string) => request<Conversation>(`/orders/${id}/conversation/rider`, {
    method: 'POST',
    body: JSON.stringify({})
  }),
  openVendorConversation: (id: string) => request<Conversation>(`/orders/${id}/conversation/vendor`, {
    method: 'POST',
    body: JSON.stringify({})
  }),
};

// ------------------------------------------------------------
// 4. DISPATCH RIDERS
// ------------------------------------------------------------

export const RiderService = {
  getAll: () => request<DispatchRider[]>('/riders'),
  // Backend-computed eligible riders for a booking (verified/approved, online,
  // available, under the active-delivery cap, and within radius when coords given).
  getEligible: (lat?: number, lng?: number) => request<DispatchRider[]>('/riders/eligible' + (lat != null && lng != null ? `?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}` : '')),
  getById: (id: string) => request<DispatchRider>(`/riders/${id}`),
  updateProfile: (id: string, data: Partial<DispatchRider>) => request<DispatchRider>(`/riders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  updateStatus: (id: string, status: RiderStatus) => request<DispatchRider>(`/riders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  updateLocation: (update: RiderLocationUpdate) => request<void>(`/riders/${update.riderId}/location`, {
    method: 'POST',
    body: JSON.stringify(update)
  }),
};

// ------------------------------------------------------------
// 5.1 PAYMENT GATEWAYS (customer-visible availability)
// ------------------------------------------------------------

export const PaymentService = {
  getGateways: () => request<PaymentGatewayConfig[]>('/payment-gateways'),
};

// ------------------------------------------------------------
// 5.1b PLATFORM CONFIG (public — the single source of truth for
// fees/tax/payment configuration). Consumed by every client.
// ------------------------------------------------------------
export const PlatformService = {
  getSettings: () => request<PlatformSettings>('/platform/settings'),
};

// ------------------------------------------------------------
// 5. CUSTOMERS & PROFILE
// ------------------------------------------------------------
export const CustomerService = {
  getProfile: (id: string) => request<CustomerProfile>(`/customers/${id}`),
  updateProfile: (id: string, data: Partial<CustomerProfile>) => request<CustomerProfile>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  getAddresses: (userId: string) => request<Address[]>(`/customers/${userId}/addresses`),
  addAddress: (userId: string, data: Partial<Address>) => request<Address>(`/customers/${userId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAddress: (userId: string, addressId: string, data: Partial<Address>) => request<Address>(`/customers/${userId}/addresses/${addressId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deleteAddress: (userId: string, addressId: string) => request<{ success: boolean }>(`/customers/${userId}/addresses/${addressId}`, {
    method: 'DELETE'
  }),
  getLoyalty: (userId: string) => request<any>(`/customers/${userId}/loyalty`),
};

// ------------------------------------------------------------
// 6. WALLET & PAYMENTS
// ------------------------------------------------------------

export const WalletService = {
  getBalance: (userId: string) => request<any>(`/wallets/${userId}/balance`),
  getTransactions: (userId: string) => request<WalletTransaction[]>(`/wallets/${userId}/transactions`),
  topUp: (userId: string, data: any) => request<WalletTransaction>(`/wallets/${userId}/topup`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  requestWithdrawal: (userId: string, data: any) => request<any>(`/wallets/${userId}/withdrawals`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
};

// ------------------------------------------------------------
// 7. NOTIFICATIONS & REVIEWS
// ------------------------------------------------------------

export const InteractionService = {
  getNotifications: (userId: string) => request<NotificationItem[]>(`/notifications/${userId}`),
  // Self-scoped, paginated feed + unread count (recipient derived from token).
  getNotificationFeed: (params: { category?: string; unread?: boolean; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.category && params.category !== 'all') q.set('category', params.category);
    if (params.unread) q.set('unread', '1');
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return request<{ items: NotificationItem[]; total: number; unreadCount: number }>(`/notifications?${q.toString()}`);
  },
  getUnreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markNotifRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotifRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),
  clearNotifs: () => request<{ success: boolean; deleted: number }>('/notifications/clear', { method: 'POST' }),
  deleteNotif: (id: string) => request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
  getReviews: (params: any) => {
    const q = new URLSearchParams(params).toString();
    return request<Review[]>(`/reviews?${q}`);
  },
  postReview: (data: any) => request<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
};

// ------------------------------------------------------------
// 9. MESSAGING
// ------------------------------------------------------------

export interface Conversation {
  id: string;
  type: string;
  participants: any[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  orderId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

// ------------------------------------------------------------
// 11. REFERRALS
// ------------------------------------------------------------

export interface ReferralRecord {
  id: string;
  referralCode: string;
  referrerUserId: string;
  referrerName?: string;
  referrerEmail?: string;
  referredUserId: string;
  referredEmail: string;
  referredName?: string;
  referredRole?: string;
  referredStatus?: string;
  referrerActive?: boolean;
  createdAt: string;
}

export interface MyReferral {
  success: boolean;
  code: string;
  totalReferred: number;
  byRole: Record<string, number>;
  records: ReferralRecord[];
}

export const ReferralService = {
  getMyReferral: () => request<MyReferral>('/referrals/me'),
  getAll: () => request<ReferralRecord[]>('/referrals'),
};

export const MessagingService = {
  getConversations: (userId: string) => request<Conversation[]>(`/messages/conversations?userId=${userId}`),
  getMessages: (conversationId: string) => request<Message[]>(`/messages/${conversationId}`),
  sendMessage: (data: any) => request<Message>('/messages', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  createConversation: (data: any) => request<Conversation>('/messages/conversations', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  supportConversation: (data?: { subject?: string }) => request<Conversation>('/messages/support', {
    method: 'POST',
    body: JSON.stringify(data || {})
  }),
};

// ------------------------------------------------------------
// 8. SEARCH & ANALYTICS
// ------------------------------------------------------------

export const DiscoveryService = {
  search: (query: string, category?: string) => request<any>(`/search?q=${query}&cat=${category || ''}`),
  getTrending: () => request<Product[]>('/products/trending'),
  getNearbyVendors: (lat: number, lng: number) => request<Vendor[]>(`/vendors/nearby?lat=${lat}&lng=${lng}`),
};

export const NewsletterService = {
  subscribe: (email: string) => request<{ success: boolean; alreadySubscribed?: boolean; message: string }>('/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  getSubscribers: () => request<any[]>('/newsletter/subscribers'),
};

export const LocationService = {
  reverseGeocode: (latitude: number, longitude: number) => request<{ address: string; area: string; city: string; region: string; country: string; latitude: number; longitude: number }>(`/geocoding/reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`),
  searchPlaces: (q: string) => request<{ ok: boolean; places: DeliveryLocation[]; error: string | null }>(`/geocoding/search?q=${encodeURIComponent(q)}`),
};

// ------------------------------------------------------------
// 10. ADMIN / SUPER ADMIN
// ------------------------------------------------------------

export const AdminService = {
  getStats: () => request<any>('/admin/stats'),
  getOrders: () => request<any[]>('/orders'),
  getWallets: () => request<any[]>('/wallets'),
  getEmailLog: () => request<any[]>('/email-log'),
  getUsers: () => request<any[]>('/users'),
  getUser: (id: string) => request<any>(`/users/${id}`),
  updateUser: (id: string, data: any) => request<any>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  createUser: (data: any) => request<any>('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteUser: (id: string) => request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  getCustomers: () => request<CustomerProfile[] & any[]>('/customers'),
  getTransactions: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/transactions${q ? `?${q}` : ''}`);
  },
  getPayments: () => request<any[]>('/payments'),
  getPayouts: () => request<any[]>('/payouts'),
  getRiderEarnings: () => request<any[]>('/rider-earnings'),
  createCoupon: (data: any) => request<Coupon>('/coupons', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCoupon: (id: string, data: any) => request<Coupon>(`/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  getCoupons: () => request<Coupon[]>('/coupons'),
  deleteCoupon: (id: string) => request<{ success: boolean }>(`/coupons/${id}`, { method: 'DELETE' }),
  validateCoupon: (code: string, amount: number) => request<any>(`/coupons/validate?code=${encodeURIComponent(code)}&amount=${amount}`),
  getTickets: (userId?: string) => request<any>(`/support/tickets${userId ? `?userId=${userId}` : ''}`),
  createTicket: (data: any) => request<any>('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  replyToTicket: (id: string, data: any) => request<any>(`/support/tickets/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateTicket: (id: string, data: any) => request<any>(`/support/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  getAudit: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<any>(`/audit${q ? `?${q}` : ''}`);
  },
  getAuditFacets: () => request<any>('/audit/facets'),
  getAuditSummary: () => request<any>('/audit/summary'),
  exportAudit: async (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    const tokens = readRequestTokens();
    const headers = new Headers();
    if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    const res = await fetch(`${API_BASE_URL}/audit/export${q ? `?${q}` : ''}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(err.message || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnimarket-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { success: true };
  },
  getPlatformSettings: () => request<any>('/platform/settings'),
  updatePlatformSettings: (data: any, password?: string) => request<any>('/platform/settings', {
    method: 'PUT',
    body: JSON.stringify(password ? { ...data, password } : data)
  }),
  verifyPassword: (password: string) => request<{ success: boolean; verifiedAt?: string }>('/auth/verify-password', {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  getPaymentGateways: () => request<any[]>('/payment-gateways'),
  updatePaymentGateway: (id: string, data: any, password?: string) => request<any[]>(`/payment-gateways/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(password ? { ...data, password } : data)
  }),
  publishAnnouncement: (data: any) => request<any>('/announcements', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getAnnouncements: () => request<any[]>('/announcements'),
  getSystemHealth: () => request<any>('/system/health'),
  getBackups: () => request<any[]>('/system/backups'),
  createBackup: () => request<any>('/system/backup', { method: 'POST' }),
  restoreBackup: (backupId: string) => request<any>('/system/restore', {
    method: 'POST',
    body: JSON.stringify({ backupId, confirm: true })
  }),
  getReports: (range: string) => request<any>(`/admin/reports?range=${range}`),
  adminResetPassword: (payload: any) => request<any>('/auth/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  adminGenerateTempPassword: (userId: string) => request<any>('/auth/admin/generate-temp-password', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),
  adminForceReset: (userId: string) => request<any>('/auth/admin/force-reset', {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),
  adminRevokeSessions: (userId: string) => request<any>(`/auth/sessions/${userId}`, {
    method: 'DELETE'
  }),
  getSessions: () => request<any[]>('/admin/sessions'),
  accountAction: (userId: string, action: string, note?: string) => request<any>(`/admin/users/${userId}/account`, {
    method: 'POST',
    body: JSON.stringify({ action, note })
  }),
  getRoles: () => request<{ roles: any[]; userCounts?: Record<string, number> }>('/roles'),
  getPermissions: () => request<{ permissions: { id: string; label: string; description: string; domain: string; risk: string }[] }>('/permissions'),
  updateRolePermissions: (roleId: string, permissions: string[], password?: string) => request<any>(`/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(password ? { permissions, password } : { permissions })
  }),
  assignRole: (userId: string, role: string, password?: string) => request<any>(`/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify(password ? { role, password } : { role })
  }),
  // ---- Maintenance Management ----
  getMaintenanceStatus: () => request<any>('/maintenance'),
  getMaintenanceWindows: () => request<{ items: any[] }>('/maintenance/windows'),
  createMaintenanceWindow: (data: any, password?: string) => request<any>('/maintenance/windows', {
    method: 'POST',
    body: JSON.stringify(password ? { ...data, password } : data)
  }),
  updateMaintenanceWindow: (id: string, data: any, password?: string) => request<any>(`/maintenance/windows/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(password ? { ...data, password } : data)
  }),
  activateMaintenanceWindow: (id: string, password: string) => request<any>(`/maintenance/windows/${id}/activate`, {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  cancelMaintenanceWindow: (id: string, password: string) => request<any>(`/maintenance/windows/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  completeMaintenanceWindow: (id: string, password: string) => request<any>(`/maintenance/windows/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  extendMaintenanceWindow: (id: string, scheduledEnd: string, password: string) => request<any>(`/maintenance/windows/${id}/extend`, {
    method: 'POST',
    body: JSON.stringify({ scheduledEnd, password })
  }),
  resendMaintenanceNotification: (id: string, kind: string) => request<any>(`/maintenance/windows/${id}/notify`, {
    method: 'POST',
    body: JSON.stringify({ kind })
  }),
  // ---- Platform Messages ----
  previewPlatformMessage: (data: any) => request<{ success: boolean; recipients: number; channels: string[] }>('/platform/messages/preview', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getPlatformMessages: () => request<{ items: any[] }>('/platform/messages'),
  createPlatformMessage: (data: any, password?: string) => request<any>('/platform/messages', {
    method: 'POST',
    body: JSON.stringify(password ? { ...data, password } : data)
  }, 45000),
  getMessageDeliveries: (id: string) => request<{ items: any[] }>(`/platform/messages/${id}/deliveries`),
  getPlatformMessageStatus: (id: string) => request<any>(`/platform/messages/${id}/status`),
  resendPlatformMessage: (id: string, password: string) => request<any>(`/platform/messages/${id}/resend`, {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  // ---- Notification deliveries (delivery log) ----
  getNotificationDeliveries: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<{ items: any[]; total: number; limit: number; offset: number }>(`/notifications/deliveries${q ? `?${q}` : ''}`);
  },
  // ---- API Operations & Security Console ----
  getApiConsole: () => request<any>('/admin/api-console'),
  toggleApiEndpoint: (method: string, path: string, enabled: boolean, password?: string) => request<any>('/admin/api-console/endpoints/toggle', {
    method: 'POST',
    body: JSON.stringify(password ? { method, path, enabled, password } : { method, path, enabled })
  }),
  // ---- Infrastructure / Payments / Notifications admin consoles ----
  getSystemOverview: () => request<any>('/admin/system'),
  runSystemHealthCheck: () => request<any>('/admin/system/check', { method: 'POST' }),
  getPaymentOverview: () => request<any>('/admin/payments/overview'),
  getNotificationSummary: () => request<any>('/admin/notifications/summary'),
  // ---- Security Center (server-backed event feed) ----
  getSecurityOverview: () => request<any>('/security/overview'),
  getSecurityEvents: (params?: any) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<{ items: any[]; total: number; totalPages: number; page: number; pageSize: number }>(`/security/events${q ? `?${q}` : ''}`);
  },
  getSecurityEvent: (id: string) => request<any>(`/security/events/${id}`),
  respondSecurityEvent: (id: string, action: string, note?: string, password?: string) => request<any>(`/security/events/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action, note, ...(password ? { password } : {}) })
  }),
  resolveSecurityEvent: (id: string, note?: string, password?: string) => request<any>(`/security/events/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ note, ...(password ? { password } : {}) })
  }),
  getSecuritySettings: () => request<any>('/security/settings'),
};
