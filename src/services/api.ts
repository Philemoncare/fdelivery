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
  Coupon, Address, OrderItem
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
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const tokens = readRequestTokens();

  const headers = new Headers(options.headers);
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  headers.set('Content-Type', 'application/json');

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API Request] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      console.error(`[API Error] ${url} returned ${response.status}`);
      if (response.status === 401) {
        // Logic for token refresh could go here
      }
      const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`[API Success] ${url}`, data);
    return data;
  } catch (err: any) {
    console.error(`[API Network Error] ${url}:`, err.message);
    throw err;
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
  updateStatus: (id: string, status: OrderStatus) => request<Order>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  assignRider: (orderId: string, riderId: string) => request<Order>(`/orders/${orderId}/assign-rider`, {
    method: 'POST',
    body: JSON.stringify({ riderId })
  }),
  getTracking: (orderId: string) => request<any>(`/orders/${orderId}/tracking`),
  trackingLookup: (ref: string) => request<any>(`/orders/tracking/${encodeURIComponent(ref)}`),
};

// ------------------------------------------------------------
// 4. DISPATCH RIDERS
// ------------------------------------------------------------

export const RiderService = {
  getAll: () => request<DispatchRider[]>('/riders'),
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
  markNotifRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'POST' }),
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

// ------------------------------------------------------------
// 10. ADMIN / SUPER ADMIN
// ------------------------------------------------------------

export const AdminService = {
  getStats: () => request<any>('/admin/stats'),
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
  getAudit: () => request<any[]>('/audit'),
  getPlatformSettings: () => request<any>('/platform/settings'),
  updatePlatformSettings: (data: any) => request<any>('/platform/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getPaymentGateways: () => request<any[]>('/payment-gateways'),
  updatePaymentGateway: (id: string, data: any) => request<any[]>(`/payment-gateways/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  publishAnnouncement: (data: any) => request<any>('/announcements', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getAnnouncements: () => request<any[]>('/announcements'),
  getSystemHealth: () => request<any>('/system/health'),
  getBackup: () => request<any>('/system/backup'),
  createBackup: () => request<any>('/system/backup', { method: 'POST' }),
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
};
