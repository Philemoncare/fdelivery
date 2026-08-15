import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Role, ThemeMode, ThemeModePreference, CurrencyCode, LanguageCode, OrderStatus,
  Vendor, Product, DispatchRider, CartItem, Order, CustomerProfile,
  Coupon, NotificationItem, WalletTransaction, Address, PaymentStatus,
  Review, RiderStatus, RiderLocationUpdate, AccentKey, ThemeKey
} from '../types';
import {
  readThemePreference, applyTheme, cycleTheme, themeToMode
} from '@/src/lib/theme';
import { useAuth } from '@/src/lib/auth/auth-store';
import {
  VendorService, ProductService, OrderService, RiderService,
  CustomerService, WalletService, InteractionService, DiscoveryService,
  RealTimeService, MessagingService, AdminService
} from '../services/api';
import { requestGeoFix, watchGeo, describeGeoResult, queryGeoPermissionState } from '@/src/lib/location/geolocation';
import { translate } from '@/src/lib/i18n';

const CART_STORAGE_KEY = 'om_cart';
const PENDING_CART_KEY = 'om_pending_cart';

interface AppContextType {
  // UI State
  isLoading: boolean;
  /** Effective theme currently applied (always 'light' | 'dark'). */
  theme: ThemeMode;
  /** Unified role-scoped theme key (Light | Dark | OmniMarket | Ocean | Emerald | Amber). */
  themeKey: ThemeKey;
  setThemeKey: (t: ThemeKey) => void;
  /** Advance the unified theme to the next state in the cycle. */
  cycleNextTheme: () => void;
  /** User's mode preference ('light' | 'dark' | 'system'). */
  themeMode: ThemeModePreference;
  setThemeMode: (mode: ThemeModePreference) => void;
  toggleTheme: () => void;
  accent: AccentKey;
  setAccent: (a: AccentKey) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amount: number) => string;
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  t: (key: string, values?: Record<string, string | number>) => string;

  // Data
  products: Product[];
  vendors: Vendor[];
  riders: DispatchRider[];
  orders: Order[];
  customers: CustomerLite[];
  categories: any[];
  notifications: NotificationItem[];
  unreadNotifications: number;
  withdrawals: any[];
  transactions: WalletTransaction[];
  coupons: Coupon[];
  reviews: Review[];
  conversations: any[];
  availableDeliveries: any[];
  refreshAvailableDeliveries: () => Promise<void>;
  vendorDashboard: any | null;

  // Selection
  selectedVendor: Vendor | null;
  setSelectedVendor: (v: Vendor | null) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  selectedOrder: Order | null;
  setSelectedOrder: (o: Order | null) => void;
  selectedRider: DispatchRider | null;
  setSelectedRider: (r: DispatchRider | null) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;

  // Cart & Logic
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, selectedVariants?: Record<string, string>) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  deliveryFee: number;
  estimatedTax: number;
  discountAmount: number;
  grandTotal: number;

  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;

  favoriteVendors: Vendor[];
  toggleFavoriteVendor: (vendor: Vendor) => void;
  isFavoriteVendor: (vendorId: string) => boolean;

  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchCategory: string;
  setSearchCategory: (c: string) => void;

  // Operations
  refreshData: () => Promise<void>;
  updateVendorProfile: (id: string, data: Partial<Vendor>) => Promise<void>;
  updateRiderProfile: (id: string, data: Partial<DispatchRider>) => Promise<void>;
  createVendor: (data: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  updateVendorHours: (id: string, hours: any) => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (data: any) => Promise<void>;
  updateCategory: (id: string, data: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  toggleKitchenStatus: (vendorId: string) => Promise<void>;
  placeOrder: (checkoutData: any) => Promise<Order>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  assignRiderToOrder: (orderId: string, riderId: string) => Promise<void>;
  completeDelivery: (orderId: string) => Promise<{ alreadyCompleted: boolean; order: Order }>;
  createPackageDelivery: (data: any) => Promise<Order>;
  receiverConfirmDelivery: (orderId: string, code?: string) => Promise<{ alreadyConfirmed: boolean; order: Order }>;
  openOrderConversation: (orderId: string, party: 'rider' | 'vendor') => Promise<any>;

  // Profile
  customerProfile: CustomerProfile | null;
  updateProfile: (data: Partial<CustomerProfile>) => Promise<void>;
  addAddress: (data: Partial<Address>) => Promise<void>;
  updateAddress: (addressId: string, data: Partial<Address>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  requestWithdrawal: (data: any) => Promise<void>;
  currentAddressName: string;
  setCurrentAddressName: (name: string) => void;

  // Messaging
  startConversation: (participantIds: string[], opts?: { type?: string; orderId?: string; subject?: string }) => Promise<any>;
  sendMessage: (conversationId: string, content: string) => Promise<any>;

  // Rider specific
  riderStatus: RiderStatus;
  updateRiderStatus: (status: RiderStatus) => Promise<void>;
  currentRiderLocation: RiderLocationUpdate | null;
  riderLocationError: string | null;
  geoActive: boolean;
  enableLiveGps: () => Promise<void>;

  // Feedback
  toast: { title: string; desc: string; type?: 'success' | 'info' | 'warning' } | null;
  showToast: (title: string, desc: string, type?: 'success' | 'info' | 'warning') => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export interface CustomerLite {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'active' | 'suspended' | 'pending';
  verified: boolean;
  joinedDate: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
}

const CURRENCY_RATES: Record<CurrencyCode, { symbol: string; rate: number }> = {
  GHS: { symbol: 'GH₵ ', rate: 1.0 },
  USD: { symbol: '$', rate: 0.065 },
  EUR: { symbol: '€ ', rate: 0.060 },
  GBP: { symbol: '£ ', rate: 0.051 },
  NGN: { symbol: '₦ ', rate: 100.0 },
  JPY: { symbol: '¥ ', rate: 10.0 },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, vendorId, riderId, updateUser } = useAuth();

  // App State
  const [isLoading, setIsLoading] = useState(true);
  // `themeKey` is the user's stored unified theme (Light | Dark | OmniMarket |
  // Ocean | Emerald | Amber). `theme` is the effective light/dark mode derived
  // from it, so all existing `theme === 'dark'` checks keep working unchanged.
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(readThemePreference);
  const theme: ThemeMode = themeToMode(themeKey);
  const themeMode: ThemeModePreference = themeToMode(themeKey);
  const setThemeKey = useCallback((next: ThemeKey) => {
    setThemeKeyState(prev => (next === prev ? prev : next));
    applyTheme(next);
  }, []);
  const cycleNextTheme = useCallback(() => {
    setThemeKeyState(prev => {
      const next = cycleTheme(prev);
      applyTheme(next);
      return next;
    });
  }, []);
  const setAccent = useCallback((next: AccentKey) => {
    applyTheme(next);
  }, []);
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === 'undefined') return 'GHS';
    const saved = window.localStorage.getItem('om_currency');
    return (saved && saved in CURRENCY_RATES) ? saved as CurrencyCode : 'GHS';
  });
  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next in CURRENCY_RATES ? next : 'GHS');
    try { window.localStorage.setItem('om_currency', next in CURRENCY_RATES ? next : 'GHS'); } catch { /* ignore */ }
  }, []);
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return 'EN';
    const saved = window.localStorage.getItem('om_language');
    const valid = ['EN', 'FR', 'ES', 'DE', 'ZH-CN', 'AR'];
    return (saved && valid.includes(saved)) ? (saved as LanguageCode) : 'EN';
  });
  const setLanguage = useCallback((next: LanguageCode) => setLanguageState(next), []);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(language, key, values), [language]);

  // Keep the unified theme applied to <html> (survives refreshes, syncs
  // everywhere). Applied on mount so a persisted theme is restored before paint.
  useEffect(() => {
    applyTheme(themeKey);
  }, [themeKey]);

  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
    try { window.localStorage.setItem('om_language', language); } catch { /* storage unavailable */ }
  }, [language]);

  // Data Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [riders, setRiders] = useState<DispatchRider[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<any[]>([]);
  const [vendorDashboard, setVendorDashboard] = useState<any | null>(null);

  // Derive the customer directory from real order data (unique customers who have ordered).
  const customers: CustomerLite[] = useMemo(() => {
    const map = new Map<string, CustomerLite>();
    if (!Array.isArray(orders)) return [];
    orders.forEach(o => {
      if (!o) return;
      const key = o.customerId || o.customerEmail || o.customerName;
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += o.totalAmount;
        existing.lastOrderDate = o.createdAt || existing.lastOrderDate;
        return;
      }
      map.set(key, {
        id: o.customerId || `cust-${key}`,
        name: o.customerName || o.customerEmail,
        email: o.customerEmail || '',
        phone: o.customerPhone || '',
        avatar: '',
        status: o.status === 'cancelled' || o.status === 'refunded' || o.status === 'failed' ? 'pending' : 'active',
        verified: o.isPaid || o.paymentStatus === 'paid',
        joinedDate: o.createdAt || new Date().toISOString(),
        totalOrders: 1,
        totalSpent: o.totalAmount,
        lastOrderDate: o.createdAt,
      });
    });
      return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);
  const accent: AccentKey = themeKey === 'light' || themeKey === 'dark' ? 'omnimarket' : themeKey;
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [currentAddressName, setCurrentAddressName] = useState<string>('Current Location');

  // Rider State
  const [riderStatus, setRiderStatus] = useState<RiderStatus>('OFFLINE');
  const [currentRiderLocation, setCurrentRiderLocation] = useState<RiderLocationUpdate | null>(null);
  const [riderLocationError, setRiderLocationError] = useState<string | null>(null);
  const [geoRestartTick, setGeoRestartTick] = useState(0);
  const [geoActive, setGeoActive] = useState(false);

  const ordersRef = useRef(orders);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // Restore the rider's online state across tabs/reloads so GPS reconnects and
  // the browser location prompt appears automatically (no need to toggle again).
  useEffect(() => {
    if (!user || user.role !== 'rider') return;
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(`om_rider_status_${user.id}`) : null;
    if (saved === 'ONLINE' && riderStatus !== 'ONLINE') {
      setRiderStatus('ONLINE');
      RiderService.updateStatus(user.id, 'ONLINE').catch(() => {});
    }
  }, [user]);

  // Auto-reconnect live GPS when the rider reloads the page and the browser
  // permission is already granted — no need to tap "Allow GPS" again.
  useEffect(() => {
    if (!user || user.role !== 'rider' || riderStatus !== 'ONLINE' || geoActive) return;
    let cancelled = false;
    queryGeoPermissionState()
      .then((state) => {
        if (!cancelled && state === 'granted' && user.role === 'rider') {
          setGeoActive(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, riderStatus]);

  // Selection
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRider, setSelectedRider] = useState<DispatchRider | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Cart
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [favoriteVendors, setFavoriteVendors] = useState<Vendor[]>([]);
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');
  // UI
  const [toast, setToast] = useState<{ title: string; desc: string; type?: 'success' | 'info' | 'warning' } | null>(null);

  // Formatting
  const formatPrice = useCallback((amount: any): string => {
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(numericAmount)) return 'GH₵ 0.00';

    const info = CURRENCY_RATES[currency];
    const converted = numericAmount * info.rate;
    return `${info.symbol}${converted.toFixed(2)}`;
  }, [currency]);

  const showToast = useCallback((title: string, desc: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshAvailableDeliveries = useCallback(async () => {
    if (!user || user.role !== 'rider') return;
    try {
      const data = await OrderService.getAvailable();
      setAvailableDeliveries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch available deliveries:', err);
    }
  }, [user]);

  // ------------------------------------------------------------
  // DATA FETCHING (Production Patterns)
  // ------------------------------------------------------------

  const refreshData = useCallback(async () => {
    console.log('Fetching application data...');
    setIsLoading(true);
    try {
      const isPublic = !user || user.role === 'customer';
      const isConsumerCatalog = isPublic || user?.role === 'administrator' || user?.role === 'super-administrator';

      const results = await Promise.allSettled([
        VendorService.getAll(),
        isConsumerCatalog ? ProductService.getAll() : Promise.resolve([]),
        RiderService.getAll(),
        ProductService.getCategories(user?.vendorId)
      ]);

      const [vData, pData, rData, cData] = results.map(r => r.status === 'fulfilled' ? r.value : []);

      setVendors(Array.isArray(vData) ? vData : []);
      setProducts(Array.isArray(pData) ? pData : []);
      setRiders(Array.isArray(rData) ? rData : []);
      setCategories(Array.isArray(cData) ? cData : []);

      if (user) {
        console.log('Fetching user-specific data for:', user.id, 'Role:', user.role);
        try {
          const promises: Promise<any>[] = [
            OrderService.getAll(user.role, user.id),
            InteractionService.getNotifications(user.id),
            CustomerService.getProfile(user.id),
            WalletService.getTransactions(user.id),
            InteractionService.getReviews({ userId: user.id }),
            MessagingService.getConversations(user.id)
          ];

          if (user.role === 'vendor' || user.role === 'store-manager' || user.role === 'vendor-staff') {
            const vId = user.vendorId;
            if (vId) {
              promises.push(VendorService.getMenu(vId));
              promises.push(VendorService.getDashboard(vId));
            }
          }

          const [oData, nData, profile, tData, revData, convs] = await Promise.all(promises);

          setOrders(Array.isArray(oData) ? oData : []);
          setNotifications(Array.isArray(nData) ? nData : []);
          setReviews(Array.isArray(revData) ? revData : []);
          setConversations(Array.isArray(convs) ? convs : []);

          if (user.role === 'vendor' || user.role === 'store-manager' || user.role === 'vendor-staff') {
            const vId = user.vendorId;
            if (vId) {
              const [vProducts, vDash] = await Promise.allSettled([
                VendorService.getMenu(vId),
                VendorService.getDashboard(vId)
              ]);
              if (vProducts.status === 'fulfilled') setProducts(vProducts.value);
              if (vDash.status === 'fulfilled') setVendorDashboard(vDash.value);
            }
          }

          setCustomerProfile(profile || {
            id: user.id,
            name: user.displayName || `${user.firstName} ${user.lastName}`,
            email: user.email,
            avatar: user.avatarUrl || '',
            phone: user.phone,
            addresses: [],
            walletBalance: 0,
            loyaltyPoints: 0,
            referralCode: `OM-${user.id.slice(0, 4).toUpperCase()}`
          });
          setTransactions(Array.isArray(tData) ? tData : []);
        } catch (err) {
          console.error('User data fetch failed:', err);
        }
      }
      console.log('Data fetch complete.');
    } catch (error) {
      console.error('Failed to load application data:', error);
      showToast('Connection Error', 'Unable to reach the OmniMarket servers. Operating in offline mode.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeOrder = RealTimeService.subscribe('order_update', (updatedOrder: Order) => {
      setOrders(prev => {
        const isRelevant = user?.id === updatedOrder.customerId ||
                           vendorId === updatedOrder.vendorId ||
                           riderId === updatedOrder.riderId ||
                           user?.role === 'administrator' ||
                           user?.role === 'super-administrator';

        if (!isRelevant) return prev;

        const exists = prev.some(o => o.id === updatedOrder.id);
        if (exists) {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        } else {
          return [updatedOrder, ...prev];
        }
      });

      const isRelevant = user?.id === updatedOrder.customerId ||
                         vendorId === updatedOrder.vendorId ||
                         riderId === updatedOrder.riderId;

      if (isRelevant) {
        showToast('Order Update', `Order #${updatedOrder.orderNumber || updatedOrder.id} is now ${updatedOrder.status.replace('_', ' ')}`);
      }
    });

    const unsubscribeNotif = RealTimeService.subscribe('notification', (notif: NotificationItem) => {
      if (user?.id === notif.userId) {
        setNotifications(prev => prev.some(n => n.id === notif.id) ? prev : [notif, ...prev]);
        showToast(notif.title, notif.message, 'info');
      }
    });

    const unsubscribeNotifRead = RealTimeService.subscribe('notification_read', (data: { id: string; userId: string }) => {
      if (user?.id === data.userId) {
        setNotifications(prev => prev.map(n => n.id === data.id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
      }
    });

    const unsubscribeNotifReadAll = RealTimeService.subscribe('notifications_read_all', (data: { userId: string }) => {
      if (user?.id === data.userId) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: n.readAt || new Date().toISOString() })));
      }
    });

    const unsubscribeNotifCleared = RealTimeService.subscribe('notifications_cleared', (data: { userId: string }) => {
      if (user?.id === data.userId) setNotifications([]);
    });

    const unsubscribeNotifDeleted = RealTimeService.subscribe('notification_deleted', (data: { id: string; userId: string }) => {
      if (user?.id === data.userId) setNotifications(prev => prev.filter(n => n.id !== data.id));
    });

    const unsubscribeRiderLoc = RealTimeService.subscribe('rider_location', (data: any) => {
      setOrders(prev => prev.map(o => o.id === data.orderId ? {
        ...o,
        currentRiderLocation: { lat: data.latitude, lng: data.longitude }
      } : o));
    });

    const unsubscribeRiderUpdate = RealTimeService.subscribe('rider_update', (rider: DispatchRider) => {
      setRiders(prev =>
        prev.some(r => r.id === rider.id)
          ? prev.map(r => r.id === rider.id ? { ...r, ...rider } : r)
          : [...prev, rider]
      );
    });

    const unsubscribeVendor = RealTimeService.subscribe('vendor_update', (updatedVendor: Vendor) => {
      setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    });

    const unsubscribeProduct = RealTimeService.subscribe('product_update', (updatedProduct: Product) => {
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    });

    // Delivery pool changes: a job became available or was taken. Rider pages
    // react immediately instead of waiting for a manual refresh.
    const unsubscribeJobAvail = RealTimeService.subscribe('delivery_available', () => {
      refreshAvailableDeliveries();
    });
    const unsubscribeJobGone = RealTimeService.subscribe('delivery_unavailable', () => {
      refreshAvailableDeliveries();
    });

    // A new chat message arrived for me, or a thread I'm in updated.
    const unsubscribeMessage = RealTimeService.subscribe('message', (msg: any) => {
      if (!user) return;
      MessagingService.getConversations(user.id).then(c => {
        if (Array.isArray(c)) setConversations(c);
      }).catch(() => {});
    });
    const unsubscribeConvUpd = RealTimeService.subscribe('conversation_updated', () => {
      if (user) {
        MessagingService.getConversations(user.id).then(c => {
          if (Array.isArray(c)) setConversations(c);
        }).catch(() => {});
      }
    });

    return () => {
      unsubscribeOrder();
      unsubscribeNotif();
      unsubscribeNotifRead();
      unsubscribeNotifReadAll();
      unsubscribeNotifCleared();
      unsubscribeNotifDeleted();
      unsubscribeRiderLoc();
      unsubscribeRiderUpdate();
      unsubscribeVendor();
      unsubscribeProduct();
      unsubscribeJobAvail();
      unsubscribeJobGone();
      unsubscribeMessage();
      unsubscribeConvUpd();
    };
  }, [user, showToast, vendorId, riderId, refreshAvailableDeliveries, refreshData]);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          const data = await res.json();
          const addr = data.address;
          const shortName = addr.suburb || addr.neighbourhood || addr.road || addr.city || addr.town || 'Takoradi';
          setCurrentAddressName(shortName);

          if (user && user.role === 'customer') {
            try {
              const savedKey = `om_geo_saved_${user.id}`;
              const already = typeof window !== 'undefined' && sessionStorage.getItem(savedKey);
              if (!already) {
                const profile = await CustomerService.getProfile(user.id);
                const hasRealAddress = (profile.addresses || []).some((a: any) => !a._placeholder && a.address && a.address !== 'Market Circle, Takoradi');
                if (!hasRealAddress) {
                  await CustomerService.updateProfile(user.id, {
                    address: `${shortName}, Takoradi`,
                    latitude,
                    longitude
                  });
                  const fresh = await CustomerService.getProfile(user.id);
                  setCustomerProfile(fresh);
                }
                sessionStorage.setItem(savedKey, '1');
              }
            } catch {}
          }
        } catch (err) {
          console.error('[Location] Reverse geocoding failed:', err);
          setCurrentAddressName('Takoradi');
        }
      },
      (err) => {
        console.warn('[Location] Access denied or unavailable:', err.message);
        setCurrentAddressName('Takoradi Central');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'rider' || riderStatus === 'OFFLINE' || !geoActive) {
      setCurrentRiderLocation(null);
      return;
    }

    let lastPushedAt = 0;
    let disposed = false;

    const seedLocation = (fix: { latitude: number; longitude: number; accuracy: number; heading?: number; speed?: number; timestamp: number }) => {
      setCurrentRiderLocation({
        riderId: user.id,
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        heading: fix.heading,
        speed: fix.speed,
        timestamp: new Date(fix.timestamp).toISOString(),
      });
      setRiderLocationError(null);
    };

    // No silent retries: Chrome auto-denies background geolocation requests and
    // can flip the site to "Blocked". GPS only ever reactivates from a user click.
    const clearWatch = watchGeo({
      onFix: (fix) => {
        const update: RiderLocationUpdate = {
          riderId: user.id,
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          heading: fix.heading,
          speed: fix.speed,
          timestamp: new Date(fix.timestamp).toISOString(),
        };

        seedLocation(fix);

        const activeOrder = ordersRef.current.find(o =>
          o.riderId === user.riderId &&
          ['picked_up', 'in_transit', 'arriving'].includes(o.status)
        );
        if (activeOrder) {
          update.deliveryId = activeOrder.id;
          const now = Date.now();
          if (now - lastPushedAt >= 10000) {
            lastPushedAt = now;
            RiderService.updateLocation(update).catch(err => {
              console.error('Failed to sync location to server:', err);
            });
          }
        }
      },
      onError: (result) => {
        // GPS failure never takes the rider offline — it only disables live
        // tracking. The rider stays visible as online/available everywhere.
        setRiderLocationError(describeGeoResult(result));
        setGeoActive(false);
      }
    });

    return () => {
      disposed = true;
      clearWatch();
      setCurrentRiderLocation(null);
    };
  }, [user, riderStatus, geoActive, geoRestartTick]);

  // ------------------------------------------------------------
  // OPERATIONS
  // ------------------------------------------------------------

  const addToCart = (product: Product, quantity = 1, variants?: any) => {
    if (!user) {
      showToast('Sign In Required', 'Please login to continue ordering.', 'warning');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const next = existing
        ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i)
        : [...prev, { product, quantity, selectedVariants: variants }];
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    showToast('Added to Cart', `${product.title} has been added.`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const next = prev.filter(i => i.product.id !== productId);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const next = prev.map(i => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  const deliveryFee = useMemo(() => (cart.length > 0 ? (selectedRider ? selectedRider.deliveryFee : 3.00) : 0), [cart.length, selectedRider]);
  const estimatedTax = useMemo(() => Number((cartTotal * 0.05).toFixed(2)), [cartTotal]);
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percentage') {
      return Math.min((cartTotal * appliedCoupon.value) / 100, appliedCoupon.maxDiscount || Infinity);
    }
    if (appliedCoupon.type === 'fixed_amount') {
      return Math.min(appliedCoupon.value, cartTotal);
    }
    if (appliedCoupon.type === 'free_delivery') {
      return deliveryFee;
    }
    return 0;
  }, [appliedCoupon, cartTotal, deliveryFee]);

  const grandTotal = useMemo(() => Math.max(0, cartTotal + deliveryFee + estimatedTax - discountAmount), [cartTotal, deliveryFee, estimatedTax, discountAmount]);

  const isInWishlist = useCallback((id: string) => wishlist.some(p => p.id === id), [wishlist]);
  const isFavoriteVendor = useCallback((id: string) => favoriteVendors.some(v => v.id === id), [favoriteVendors]);

  // Persist wishlist / favorite restaurants per account (survives refresh).
  const wishlistKey = user ? `om_wishlist_${user.id}` : null;
  const favVendorsKey = user ? `om_fav_vendors_${user.id}` : null;

  useEffect(() => {
    if (!wishlistKey || wishlist.length > 0) return;
    try {
      const raw = window.localStorage.getItem(wishlistKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setWishlist(parsed);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistKey]);

  useEffect(() => {
    if (!favVendorsKey || favoriteVendors.length > 0) return;
    try {
      const raw = window.localStorage.getItem(favVendorsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFavoriteVendors(parsed);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favVendorsKey]);

  useEffect(() => {
    if (!wishlistKey) return;
    try { window.localStorage.setItem(wishlistKey, JSON.stringify(wishlist)); } catch { /* ignore */ }
  }, [wishlist, wishlistKey]);

  useEffect(() => {
    if (!favVendorsKey) return;
    try { window.localStorage.setItem(favVendorsKey, JSON.stringify(favoriteVendors)); } catch { /* ignore */ }
  }, [favoriteVendors, favVendorsKey]);

  const toggleWishlist = (product: Product) => {
    if (!user) {
      showToast('Sign In Required', 'Please login to save your favorite meals.', 'warning');
      return;
    }
    setWishlist(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const toggleFavoriteVendor = (vendor: Vendor) => {
    if (!user) {
      showToast('Sign In Required', 'Please login to save your favorite restaurants.', 'warning');
      return;
    }
    setFavoriteVendors(prev => {
      const exists = prev.some(v => v.id === vendor.id);
      if (exists) return prev.filter(v => v.id !== vendor.id);
      return [...prev, vendor];
    });
  };

  const updateVendorProfile = async (id: string, data: Partial<Vendor>) => {
    const updated = await VendorService.updateProfile(id, data);
    setVendors(prev => prev.map(v => v.id === id ? updated : v));
    showToast('Success', 'Restaurant profile updated.');
  };

  const updateRiderProfile = async (id: string, data: Partial<DispatchRider>) => {
    const updated = await RiderService.updateProfile(id, data);
    setRiders(prev => prev.map(r => r.id === id ? updated : r));
    showToast('Success', 'Rider record updated.');
  };

  const createVendor = async (data: Partial<Vendor>) => {
    const created = await VendorService.create(data as any);
    setVendors(prev => [created, ...prev]);
    showToast('Success', `${created.name} added to the platform.`);
  };

  const deleteVendor = async (id: string) => {
    await VendorService.delete(id);
    setVendors(prev => prev.filter(v => v.id !== id));
    showToast('Success', 'Restaurant removed from the platform.');
  };

  const updateVendorHours = async (id: string, hours: any) => {
    await VendorService.updateHours(id, hours);
    showToast('Success', 'Operating hours updated.');
  };

  const addProduct = async (data: Partial<Product>) => {
    const newP = await ProductService.create(data);
    setProducts(prev => [newP, ...prev]);
    showToast('Success', 'Meal added to menu.');
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    const updated = await ProductService.update(id, data);
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
  };

  const deleteProduct = async (id: string) => {
    await ProductService.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addCategory = async (data: any) => {
    const newC = await ProductService.createCategory(data);
    setCategories(prev => [...prev, newC]);
    showToast('Success', 'Category created.');
  };

  const updateCategory = async (id: string, data: any) => {
    const updated = await ProductService.updateCategory(id, data);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
  };

  const deleteCategory = async (id: string) => {
    await ProductService.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const toggleKitchenStatus = async (vendorId: string) => {
    const updated = await VendorService.toggleKitchen(vendorId);
    setVendors(prev => prev.map(v => v.id === vendorId ? updated : v));
  };

  const placeOrder = async (checkoutData: any): Promise<Order> => {
    const vendor = vendors.find(v => v.id === cart[0].product.vendorId);
    const selected = customerProfile?.addresses || [];
    const address = selected.find(a => a.address === checkoutData.address) || selected.find(a => a.isDefault);
    const loc = checkoutData.location ?? null;

    const newOrder = await OrderService.placeOrder({
      ...checkoutData,
      vendorId: cart[0].product.vendorId,
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.title,
        productImage: i.product.images?.[0] || '',
        productCategory: i.product.category,
        quantity: i.quantity,
        price: i.product.price
      })),
      customerId: user?.id,
      vendorLat: vendor?.latitude,
      vendorLng: vendor?.longitude,
      customerLat: checkoutData.customerLat ?? loc?.latitude ?? address?.latitude ?? customerProfile?.location?.latitude ?? null,
      customerLng: checkoutData.customerLng ?? loc?.longitude ?? address?.longitude ?? customerProfile?.location?.longitude ?? null,
      city: checkoutData.city ?? loc?.city ?? address?.city ?? '',
      country: checkoutData.country ?? loc?.region ?? '',
      customerAddress: checkoutData.address || checkoutData.customerAddress || address?.address || currentAddressName,
    });
    setOrders(prev => [newOrder, ...prev]);
    clearCart();

    // Refresh wallet + transaction history after any order so balances stay accurate.
    if (user) {
      WalletService.getBalance(user.id).then(w => {
        setCustomerProfile(prev => prev ? { ...prev, walletBalance: Number(w.balance) || 0 } : prev);
      }).catch(() => {});
      WalletService.getTransactions(user.id).then(setTransactions).catch(() => {});
    }

    if (vendor && user && vendor.ownerId && vendor.ownerId !== user.id) {
      MessagingService.createConversation({
        type: 'customer_vendor',
        participantIds: [user.id, vendor.ownerId],
        orderId: newOrder.id,
        subject: `Order chat — ${vendor.name}`
      }).catch(() => {});
    }
    if (user) {
      MessagingService.getConversations(user.id).then(setConversations).catch(() => {});
    }
    return newOrder;
  };

  const updateOrderStatus = async (id: string, status: OrderStatus, reason?: string) => {
    const updated = await OrderService.updateStatus(id, status, reason);
    setOrders(prev => prev.map(o => o.id === id ? updated : o));
    RealTimeService.emit('order_update', updated);
  };

  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    const updated = await OrderService.assignRider(orderId, riderId);
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
  };

  const completeDelivery = async (orderId: string) => {
    const res = await OrderService.completeDelivery(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
    RealTimeService.emit('order_update', res.order);
    return { alreadyCompleted: !!res.alreadyCompleted, order: res.order };
  };

  const createPackageDelivery = async (data: any): Promise<Order> => {
    const newDelivery = await OrderService.createPackage({ ...data, customerId: user?.id });
    setOrders(prev => [newDelivery, ...prev]);
    showToast('Rider Requested', `${newDelivery.deliveryType === 'PASS' ? 'Pass' : 'Package'} delivery ${newDelivery.orderNumber} is being arranged.`);
    return newDelivery;
  };

  const receiverConfirmDelivery = async (orderId: string, code?: string) => {
    const res = await OrderService.receiverConfirm(orderId, code);
    setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
    RealTimeService.emit('order_update', res.order);
    if (!res.alreadyConfirmed) {
      showToast('Receipt Confirmed', 'The recipient confirmed this delivery. Thank you!');
    }
    return { alreadyConfirmed: !!res.alreadyConfirmed, order: res.order };
  };

  const openOrderConversation = async (orderId: string, party: 'rider' | 'vendor') => {
    const conv = party === 'rider'
      ? await OrderService.openRiderConversation(orderId)
      : await OrderService.openVendorConversation(orderId);
    if (user && conv?.id) {
      const convs = await MessagingService.getConversations(user.id).catch(() => null);
      if (Array.isArray(convs)) setConversations(convs);
    }
    return conv;
  };

  const updateProfile = async (data: Partial<CustomerProfile>) => {
    if (!user) return;
    const updated = await CustomerService.updateProfile(user.id, data);
    setCustomerProfile(updated);
    if (updated.name) {
      const parts = updated.name.split(/\s+/);
      updateUser({
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        displayName: updated.name,
        name: updated.name,
        phone: updated.phone || user.phone,
        avatarUrl: updated.avatar || user.avatarUrl,
      });
    }
    showToast('Success', 'Profile updated successfully.');
  };

  const addAddress = async (data: Partial<Address>) => {
    if (!user) return;
    const created = await CustomerService.addAddress(user.id, data);
    setCustomerProfile(prev => prev ? { ...prev, addresses: [created, ...(prev.addresses || []).filter(a => a.id !== created.id)] } : prev);
    showToast('Address Saved', `${created.title || 'Address'} added to your saved locations.`);
  };

  const updateAddress = async (addressId: string, data: Partial<Address>) => {
    if (!user) return;
    const updated = await CustomerService.updateAddress(user.id, addressId, data);
    setCustomerProfile(prev => prev ? {
      ...prev,
      addresses: (prev.addresses || []).map(a => a.id === addressId ? updated : a)
    } : prev);
    showToast('Address Updated', 'Your saved address has been updated.');
  };

  const deleteAddress = async (addressId: string) => {
    if (!user) return;
    await CustomerService.deleteAddress(user.id, addressId);
    setCustomerProfile(prev => prev ? {
      ...prev,
      addresses: (prev.addresses || []).filter(a => a.id !== addressId)
    } : prev);
    showToast('Address Removed', 'The saved address has been deleted.');
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!user) return;
    const current = (customerProfile?.addresses || []).find(a => a.id === addressId);
    if (!current) return;
    await CustomerService.updateAddress(user.id, addressId, { ...current, isDefault: true });
    setCustomerProfile(prev => prev ? {
      ...prev,
      addresses: (prev.addresses || []).map(a => ({ ...a, isDefault: a.id === addressId }))
    } : prev);
    setCurrentAddressName(current.address || current.title || 'Current Location');
    showToast('Default set', `${current.title || 'This address'} is now your default.`);
  };

  const startConversation = async (participantIds: string[], opts?: any) => {
    return MessagingService.createConversation({
      type: opts?.type || 'customer_vendor',
      participantIds,
      orderId: opts?.orderId,
      subject: opts?.subject
    });
  };

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user) throw new Error('Not authenticated');
    return MessagingService.sendMessage({ conversationId, senderId: user.id, content });
  };

  const markNotificationRead = async (id: string) => {
    try {
      await InteractionService.markNotifRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt: n.readAt || new Date().toISOString() } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await InteractionService.markAllNotifRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: n.readAt || new Date().toISOString() })));
      showToast('Notifications', 'All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      showToast('Error', 'Could not mark all notifications as read.', 'warning');
    }
  };

  const refreshNotifications = async () => {
    if (!user) return;
    try {
      const res = await InteractionService.getNotificationFeed({ limit: 50 });
      setNotifications((prev: NotificationItem[]) => {
        const seen = new Map<string, NotificationItem>(prev.map((n): [string, NotificationItem] => [n.id, n]));
        res.items.forEach((n: any) => seen.set(n.id, n));
        return Array.from(seen.values()).sort((a, b) => String((b as any).createdAt || (b as any).time).localeCompare(String((a as any).createdAt || (a as any).time)));
      });
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await InteractionService.deleteNotif(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const applyCoupon = async (code: string) => {
    try {
      // Validate against the server so the UI never accepts a coupon the order
      // endpoint would reject (expired, usage-limit reached, below min spend).
      const res = await AdminService.validateCoupon(code.trim(), cartTotal);
      if (res && res.valid) {
        setAppliedCoupon(res.coupon);
        showToast('Coupon Applied', `Code ${code} added to your cart.`);
      } else {
        showToast('Invalid Coupon', 'The code you entered is not valid or expired.', 'warning');
      }
    } catch (err: any) {
      showToast('Invalid Coupon', err?.message || 'The code you entered is not valid or expired.', 'warning');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const clearNotifications = async () => {
    try {
      const res = await InteractionService.clearNotifs();
      setNotifications([]);
      showToast('Notifications', `${res?.deleted ?? 0} notification${(res?.deleted ?? 0) === 1 ? '' : 's'} cleared.`);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      showToast('Error', 'Could not clear notifications.', 'warning');
    }
  };

  const requestWithdrawal = async (data: any) => {
    if (!user) return;
    try {
      await WalletService.requestWithdrawal(user.id, data);
      showToast('Success', 'Withdrawal request submitted.');
    } catch (err) {
      console.error('Withdrawal failed:', err);
      showToast('Error', 'Failed to submit withdrawal request.', 'warning');
    }
  };

  const setThemeMode = useCallback((next: ThemeModePreference) => {
    setThemeKey(next === 'dark' ? 'dark' : 'light');
  }, [setThemeKey]);

  const toggleTheme = useCallback(() => {
    setThemeKey(theme === 'light' ? 'dark' : 'light');
  }, [theme, setThemeKey]);

  const updateRiderStatus = async (status: RiderStatus) => {
    if (!user) return;

    let gpsWarning: string | null = null;

    if (status === 'OFFLINE') {
      setCurrentRiderLocation(null);
      setRiderLocationError(null);
      setGeoActive(false);
    }

    if (status === 'ONLINE') {
      // Runs inside the click gesture, so Chrome shows the location prompt.
      const granted = await requestGeoFix();
      if (granted.ok && granted.fix) {
        const fix = granted.fix;
        setCurrentRiderLocation({
          riderId: user.id,
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          heading: fix.heading,
          speed: fix.speed,
          timestamp: new Date(fix.timestamp).toISOString(),
        });
        setRiderLocationError(null);
        setGeoActive(true);
      } else {
        // GPS is blocked/unavailable but we still go online — the rider stays
        // visible to admins, vendors and customers. Live tracking is just off.
        gpsWarning = describeGeoResult(granted);
        setRiderLocationError(gpsWarning);
        setGeoActive(false);
      }
    }

    try {
      await RiderService.updateStatus(user.id, status);
      setRiderStatus(status);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`om_rider_status_${user.id}`, status);
      }
      showToast(
        'GPS Allowed Successfully',
        status === 'ONLINE' && gpsWarning
          ? `You are online. Live tracking is off — ${gpsWarning}`
          : status === 'ONLINE'
            ? "You're online and ready to run deliveries. GPS is live."
            : `You are now ${status.replace('_', ' ')}`
      );
    } catch (err) {
      console.error('Failed to update rider status:', err);
      showToast('Update Failed', 'Unable to change status. Check connection.', 'warning');
    }
  };

  // Explicitly request live GPS from a user click — Chrome only shows the
  // location prompt for requests made inside a user gesture.
  const enableLiveGps = async () => {
    if (!user) return;
    const granted = await requestGeoFix();
    if (granted.ok && granted.fix) {
      const fix = granted.fix;
      setCurrentRiderLocation({
        riderId: user.id,
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        heading: fix.heading,
        speed: fix.speed,
        timestamp: new Date(fix.timestamp).toISOString(),
      });
      setRiderLocationError(null);
      setGeoActive(true);
      showToast('GPS Allowed Successfully', "You're ready to go — live location is now sharing.");
    } else {
      const msg = describeGeoResult(granted);
      setRiderLocationError(msg);
      setGeoActive(false);
      showToast('GPS Unavailable', msg, 'warning');
    }
  };

  const unreadNotifications = useMemo(() => Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0, [notifications]);

  const value: AppContextType = useMemo(() => ({
    isLoading, theme, themeKey, setThemeKey, cycleNextTheme, themeMode, setThemeMode, toggleTheme, accent, setAccent, currency, setCurrency, formatPrice, language, setLanguage, t,
    products, vendors, riders, orders, customers, categories, notifications, unreadNotifications, withdrawals, transactions, coupons, reviews, vendorDashboard,
    selectedVendor, setSelectedVendor, selectedProduct, setSelectedProduct,
    selectedOrder, setSelectedOrder, selectedRider, setSelectedRider,
    quickViewProduct, setQuickViewProduct,
    cart, isCartOpen, setIsCartOpen, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, cartCount,
    deliveryFee, estimatedTax, discountAmount, grandTotal,
    wishlist, toggleWishlist, isInWishlist,
    searchQuery, setSearchQuery, searchCategory, setSearchCategory,
    refreshData, updateVendorProfile, updateRiderProfile, createVendor, deleteVendor, updateVendorHours,
    addProduct, updateProduct, deleteProduct,
    addCategory, updateCategory, deleteCategory,
    toggleKitchenStatus,
    placeOrder, updateOrderStatus, assignRiderToOrder, completeDelivery,
    createPackageDelivery, receiverConfirmDelivery, openOrderConversation,
    customerProfile, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, requestWithdrawal,
    currentAddressName, setCurrentAddressName,
    startConversation, sendMessage,
    riderStatus, updateRiderStatus, currentRiderLocation, riderLocationError, geoActive, enableLiveGps,
    appliedCoupon, applyCoupon, removeCoupon,
    favoriteVendors, toggleFavoriteVendor, isFavoriteVendor,
    conversations, availableDeliveries, refreshAvailableDeliveries,
    toast, showToast, markNotificationRead, markAllNotificationsRead, clearNotifications, deleteNotification, refreshNotifications
  }), [
    isLoading, theme, themeKey, setThemeKey, cycleNextTheme, themeMode, setThemeMode, toggleTheme, accent, setAccent, currency, setCurrency, formatPrice, language, setLanguage, t,
products, vendors, riders, orders, customers, categories, notifications, unreadNotifications, withdrawals, transactions, coupons, reviews, vendorDashboard,
    conversations, availableDeliveries, refreshAvailableDeliveries,
    selectedVendor, setSelectedVendor, selectedProduct, setSelectedProduct,
    selectedOrder, setSelectedOrder, selectedRider, setSelectedRider,
    quickViewProduct, setQuickViewProduct,
    cart, isCartOpen, setIsCartOpen, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, cartCount,
    deliveryFee, estimatedTax, discountAmount, grandTotal,
    wishlist, toggleWishlist, isInWishlist,
    searchQuery, setSearchQuery, searchCategory, setSearchCategory,
    refreshData, updateVendorProfile, updateRiderProfile, createVendor, deleteVendor, updateVendorHours,
    addProduct, updateProduct, deleteProduct,
    addCategory, updateCategory, deleteCategory,
    toggleKitchenStatus,
    placeOrder, updateOrderStatus, assignRiderToOrder, completeDelivery,
    createPackageDelivery, receiverConfirmDelivery, openOrderConversation,
    customerProfile, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, requestWithdrawal,
    currentAddressName, setCurrentAddressName,
    startConversation, sendMessage,
    riderStatus, updateRiderStatus, currentRiderLocation, riderLocationError, geoActive, enableLiveGps,
    appliedCoupon, applyCoupon, removeCoupon,
    favoriteVendors, toggleFavoriteVendor, isFavoriteVendor,
    toast, showToast, markNotificationRead, markAllNotificationsRead, clearNotifications, deleteNotification, refreshNotifications
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
