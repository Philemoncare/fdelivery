import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Role, ThemeMode, CurrencyCode, LanguageCode, OrderStatus,
  Vendor, Product, DispatchRider, CartItem, Order, CustomerProfile,
  Coupon, NotificationItem, WalletTransaction, Address, PaymentStatus,
  Review, RiderStatus, RiderLocationUpdate
} from '../types';
import { useAuth } from '@/src/lib/auth/auth-store';
import {
  VendorService, ProductService, OrderService, RiderService,
  CustomerService, WalletService, InteractionService, DiscoveryService,
  RealTimeService, MessagingService
} from '../services/api';

const CART_STORAGE_KEY = 'om_cart';
const PENDING_CART_KEY = 'om_pending_cart';

interface AppContextType {
  // UI State
  isLoading: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amount: number) => string;
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;

  // Data
  products: Product[];
  vendors: Vendor[];
  riders: DispatchRider[];
  orders: Order[];
  customers: CustomerLite[];
  categories: any[];
  notifications: NotificationItem[];
  withdrawals: any[];
  transactions: WalletTransaction[];
  coupons: Coupon[];
  reviews: Review[];
  conversations: any[];
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

  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;

  favoriteVendors: Vendor[];
  toggleFavoriteVendor: (vendor: Vendor) => void;
  isFavoriteVendor: (vendorId: string) => boolean;

  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => void;
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

  isLiveSimulationActive: boolean;
  toggleLiveSimulation: () => void;

  // Feedback
  toast: { title: string; desc: string; type?: 'success' | 'info' | 'warning' } | null;
  showToast: (title: string, desc: string, type?: 'success' | 'info' | 'warning') => void;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => void;
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
  GHS: { symbol: 'GHS ', rate: 1.0 },
  USD: { symbol: '$', rate: 0.065 },
  EUR: { symbol: 'EUR ', rate: 0.060 },
  GBP: { symbol: 'GBP ', rate: 0.051 },
  NGN: { symbol: 'NGN ', rate: 100.0 },
  JPY: { symbol: 'JPY ', rate: 10.0 },
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, vendorId, riderId, updateUser } = useAuth();

  // App State
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [currency, setCurrency] = useState<CurrencyCode>('GHS');
  const [language, setLanguage] = useState<LanguageCode>('EN');

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
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [currentAddressName, setCurrentAddressName] = useState<string>('Current Location');

  // Rider State
  const [riderStatus, setRiderStatus] = useState<RiderStatus>('OFFLINE');
  const [currentRiderLocation, setCurrentRiderLocation] = useState<RiderLocationUpdate | null>(null);

  // Selection
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRider, setSelectedRider] = useState<DispatchRider | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isLiveSimulationActive, setIsLiveSimulationActive] = useState(true);

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
    if (isNaN(numericAmount)) return 'GHS 0.00';

    const info = CURRENCY_RATES[currency];
    const converted = numericAmount * info.rate;
    return `${info.symbol}${converted.toFixed(2)}`;
  }, [currency]);

  const showToast = useCallback((title: string, desc: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ------------------------------------------------------------
  // DATA FETCHING (Production Patterns)
  // ------------------------------------------------------------

  const refreshData = useCallback(async () => {
    console.log('Fetching application data...');
    setIsLoading(true);
    try {
      // Base data for everyone (e.g., for exploration)
      // For strict isolation, we might skip these if user is a vendor/rider
      // Admins and super-admins get the full product catalog for moderation.
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

          // If vendor, also fetch their specific products
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

          // Fetch vendor specific data separately to avoid destructuring issues
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
            name: `${user.firstName} ${user.lastName}`,
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

  // Real-time synchronization listeners (guests do not open an SSE connection)
  useEffect(() => {
    if (!user) return;
    const unsubscribeOrder = RealTimeService.subscribe('order_update', (updatedOrder: Order) => {
      setOrders(prev => {
        // Only update if it's relevant to the current user to maintain strict isolation
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
        setNotifications(prev => [notif, ...prev]);
        showToast(notif.title, notif.message, 'info');
      }
    });

    const unsubscribeRiderLoc = RealTimeService.subscribe('rider_location', (data: any) => {
      setOrders(prev => prev.map(o => o.id === data.orderId ? {
        ...o,
        currentRiderLocation: { lat: data.latitude, lng: data.longitude }
      } : o));
    });

    const unsubscribeVendor = RealTimeService.subscribe('vendor_update', (updatedVendor: Vendor) => {
      setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    });

    const unsubscribeProduct = RealTimeService.subscribe('product_update', (updatedProduct: Product) => {
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    });

    return () => {
      unsubscribeOrder();
      unsubscribeNotif();
      unsubscribeRiderLoc();
      unsubscribeVendor();
      unsubscribeProduct();
    };
  }, [user, showToast]);

  // User Location Auto-Detection (only for signed-in users; guests must not
  // trigger a browser GPS permission prompt or have their location broadcast).
  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use Nominatim for free reverse geocoding
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          const data = await res.json();

          // Try to get a clean short name (suburb, road, or city)
          const addr = data.address;
          const shortName = addr.suburb || addr.neighbourhood || addr.road || addr.city || addr.town || 'Takoradi';
          const fullName = data.display_name?.split(',').slice(0, 2).join(',');

          setCurrentAddressName(shortName);

          // Persist the detected GPS location to THIS user's profile (each
          // logged-in person keeps their own tracked location - like Uber).
          // Only auto-save once per login and only when the user has not yet
          // set a real default address on purpose.
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
            } catch {
              /* auto-save is best-effort; never block the app */
            }
          }

          console.log('[Location] Resolved to:', fullName || shortName);
        } catch (err) {
          console.error('[Location] Reverse geocoding failed:', err);
          setCurrentAddressName('Takoradi');
        }
      },
      (err) => {
        console.warn('[Location] Access denied or unavailable:', err.message);
        setCurrentAddressName('Takoradi Central');
      },
      { enableHighAccuracy: true }
    );
  }, [user]);

  // Rider Location Tracking
  useEffect(() => {
    if (!user || user.role !== 'rider' || riderStatus === 'OFFLINE') {
      setCurrentRiderLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      setRiderStatus('LOCATION_UNAVAILABLE');
      return;
    }

    console.log('Starting real-time rider location tracking...');
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const update: RiderLocationUpdate = {
          riderId: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          timestamp: new Date(position.timestamp).toISOString(),
        };

        // If there's an active delivery, attach its ID
        const activeOrder = orders.find(o =>
          o.riderId === user.id &&
          ['picked_up', 'in_transit', 'arriving'].includes(o.status)
        );
        if (activeOrder) {
          update.deliveryId = activeOrder.id;
        }

        setCurrentRiderLocation(update);

        // Push update to server
        RiderService.updateLocation(update).catch(err => {
          console.error('Failed to sync location to server:', err);
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setRiderStatus('LOCATION_PERMISSION_DENIED');
        } else {
          setRiderStatus('LOCATION_UNAVAILABLE');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      console.log('Stopping rider location tracking.');
      navigator.geolocation.clearWatch(watchId);
    };
  }, [user, riderStatus, orders]);

  // ------------------------------------------------------------
  // OPERATIONS
  // ------------------------------------------------------------

  const addToCart = (product: Product, quantity = 1, variants?: any) => {
    if (!user) {
      showToast('Sign In Required', 'Please log in to add items to your cart.', 'warning');
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

  const isInWishlist = useCallback((id: string) => wishlist.some(p => p.id === id), [wishlist]);
  const isFavoriteVendor = useCallback((id: string) => favoriteVendors.some(v => v.id === id), [favoriteVendors]);

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const toggleFavoriteVendor = (vendor: Vendor) => {
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

    const newOrder = await OrderService.placeOrder({
      ...checkoutData,
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
      customerLat: address?.latitude ?? customerProfile?.location?.latitude,
      customerLng: address?.longitude ?? customerProfile?.location?.longitude,
      customerAddress: checkoutData.address || address?.address || currentAddressName,
    });
    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    showToast('Order Placed!', `Your order #${newOrder.orderNumber} is confirmed.`);

    // Open an order chat thread so the customer can message the restaurant.
    if (vendor && user && vendor.ownerId && vendor.ownerId !== user.id) {
      MessagingService.createConversation({
        type: 'customer_vendor',
        participantIds: [user.id, vendor.ownerId],
        orderId: newOrder.id,
        subject: `Order chat — ${vendor.name}`
      }).catch(() => {});
    }
    // Refresh conversations so the new order thread appears in Messages.
    if (user) {
      MessagingService.getConversations(user.id).then(setConversations).catch(() => {});
    }
    return newOrder;
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const updated = await OrderService.updateStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? updated : o));
    RealTimeService.emit('order_update', updated);
  };

  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    const updated = await OrderService.assignRider(orderId, riderId);
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
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
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const applyCoupon = (code: string) => {
    const coupon = coupons.find(c => c.code.toLowerCase() === code.toLowerCase() && c.isActive);
    if (coupon) {
      setAppliedCoupon(coupon);
      showToast('Coupon Applied', `Code ${code} added to your cart.`);
    } else {
      showToast('Invalid Coupon', 'The code you entered is not valid or expired.', 'warning');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const clearNotifications = () => {
    setNotifications([]);
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

  const toggleLiveSimulation = () => {
    setIsLiveSimulationActive(prev => !prev);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const updateRiderStatus = async (status: RiderStatus) => {
    if (!user) return;
    try {
      await RiderService.updateStatus(user.id, status);
      setRiderStatus(status);
      showToast('Status Updated', `You are now ${status.replace('_', ' ')}`);
    } catch (err) {
      console.error('Failed to update rider status:', err);
      showToast('Update Failed', 'Unable to change status. Check connection.', 'warning');
    }
  };

  const value: AppContextType = useMemo(() => ({
    isLoading, theme, toggleTheme, currency, setCurrency, formatPrice, language, setLanguage,
    products, vendors, riders, orders, customers, categories, notifications, withdrawals, transactions, coupons, reviews, vendorDashboard,
    selectedVendor, setSelectedVendor, selectedProduct, setSelectedProduct,
    selectedOrder, setSelectedOrder, selectedRider, setSelectedRider,
    quickViewProduct, setQuickViewProduct,
    cart, isCartOpen, setIsCartOpen, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, cartCount,
    wishlist, toggleWishlist, isInWishlist,
    searchQuery, setSearchQuery, searchCategory, setSearchCategory,
    refreshData, updateVendorProfile, updateRiderProfile, createVendor, deleteVendor, updateVendorHours,
    addProduct, updateProduct, deleteProduct,
    addCategory, updateCategory, deleteCategory,
    toggleKitchenStatus,
    placeOrder, updateOrderStatus, assignRiderToOrder,
    customerProfile, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, requestWithdrawal,
    currentAddressName, setCurrentAddressName,
    startConversation, sendMessage,
    riderStatus, updateRiderStatus, currentRiderLocation,
    appliedCoupon, applyCoupon, removeCoupon,
    isLiveSimulationActive, toggleLiveSimulation,
    favoriteVendors, toggleFavoriteVendor, isFavoriteVendor,
    conversations,
    toast, showToast, markNotificationRead, clearNotifications
  }), [
    isLoading, theme, toggleTheme, currency, setCurrency, formatPrice, language, setLanguage,
    products, vendors, riders, orders, customers, categories, notifications, withdrawals, transactions, coupons, reviews, vendorDashboard, conversations,
    selectedVendor, setSelectedVendor, selectedProduct, setSelectedProduct,
    selectedOrder, setSelectedOrder, selectedRider, setSelectedRider,
    quickViewProduct, setQuickViewProduct,
    cart, isCartOpen, setIsCartOpen, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, cartCount,
    wishlist, toggleWishlist, isInWishlist,
    searchQuery, setSearchQuery, searchCategory, setSearchCategory,
    refreshData, updateVendorProfile, updateRiderProfile, createVendor, deleteVendor, updateVendorHours,
    addProduct, updateProduct, deleteProduct,
    addCategory, updateCategory, deleteCategory,
    toggleKitchenStatus,
    placeOrder, updateOrderStatus, assignRiderToOrder,
    customerProfile, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, requestWithdrawal,
    currentAddressName, setCurrentAddressName,
    startConversation, sendMessage,
    riderStatus, updateRiderStatus, currentRiderLocation,
    appliedCoupon, applyCoupon, removeCoupon,
    isLiveSimulationActive, toggleLiveSimulation,
    favoriteVendors, toggleFavoriteVendor, isFavoriteVendor,
    toast, showToast, markNotificationRead, clearNotifications
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
