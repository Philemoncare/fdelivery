export type Role = 'customer' | 'vendor' | 'rider' | 'admin' | 'store-manager' | 'vendor-staff' | 'super-administrator';

/** Resolved theme actually applied to the document (never 'system'). */
export type ThemeMode = 'light' | 'dark';

/** User's theme preference — may follow the operating system. */
export type ThemeModePreference = ThemeMode | 'system';

export type AccentKey = 'omnimarket' | 'ocean' | 'emerald' | 'amber';

/** Unified, role-scoped portal theme. The primary header control cycles
 *  through these states in order; each state carries its own complete
 *  visual system (surfaces, text, borders, accent). `'system'` follows the
 *  operating system colour scheme at runtime (resolves to light/dark). */
export type ThemeKey = 'light' | 'dark' | 'system' | 'omnimarket' | 'ocean' | 'emerald' | 'amber';

export type CurrencyCode = 'GHS' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'JPY';

export type LanguageCode = 'EN' | 'FR' | 'ES' | 'DE' | 'ZH-CN' | 'AR';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'arriving'
  | 'awaiting_confirmation'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Address {
  id: string;
  userId: string;
  label: 'home' | 'work' | 'other' | string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  deliveryInstructions?: string;
  /** JSON API compatibility aliases for persisted delivery addresses. */
  title?: string;
  address?: string;
}

export interface Vendor {
  id: string;
  ownerId: string;
  categoryId: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  registrationNumber?: string;
  taxNumber?: string;
  logo: string;
  banner: string;
  description: string;
  about?: string;
  tags: string[];
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  commissionRate: number;
  isOpen: boolean;
  isKitchenOpen?: boolean;
  isFeatured: boolean;
  isTopRated: boolean;
  minOrder: number;
  deliveryFee: number;
  deliveryTime: string;
  averageDeliveryMinutes?: number;
  rating: number;
  totalSales: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  currency: CurrencyCode;
  timezone: string;
  joinedDate: string;
  businessHours?: {
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }[];
  /** Legacy dashboard aliases accepted by the JSON API. */
  category?: string;
  openHours?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: {
    label: string;
    priceModifier: number;
    stock?: number;
  }[];
}

export interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorLogo: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  rating: number;
  reviewsCount: number;
  category: string;
  images: string[];
  tags: string[];
  stock: number;
  lowStockThreshold?: number;
  prepTime: string;
  calories?: string;
  ingredients?: string[];
  spiceLevel?: 'Mild' | 'Medium' | 'Hot' | 'Extra Hot';
  addons?: string[];
  isVeg?: boolean;
  isPopular?: boolean;
  isTrending?: boolean;
  isFlashSale?: boolean;
  discountPercent?: number;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type RiderStatus =
  | 'OFFLINE'
  | 'ONLINE'
  | 'AVAILABLE'
  | 'BUSY'
  | 'ON_DELIVERY'
  | 'PAUSED'
  | 'LOCATION_PERMISSION_DENIED'
  | 'LOCATION_UNAVAILABLE';

export interface DispatchRider {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  phone: string;
  vehicleType: 'Motorcycle' | 'Scooter' | 'Bicycle' | 'Van' | 'Car';
  vehicleNumber: string;
  licenseNumber?: string;
  status: RiderStatus;
  isOnline: boolean;
  isAvailable: boolean;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  acceptanceRate: number;
  completionRate: number;
  currentLat: number;
  currentLng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  lastUpdate?: string;
  availableRadius: number;
  deliveryFee: number;
  etaMinutes: number;
  distanceKm: number;
  phoneSecondary?: string;
  about?: string;
  bannerUrl?: string;
  serviceArea?: string;
}

export interface RiderLocationUpdate {
  riderId: string;
  deliveryId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariants?: Record<string, string>;
  instructions?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variantLabel?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  deliveryRef?: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  vendorId: string;
  vendorName: string;
  riderId?: string;
  dispatchRider?: DispatchRider;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  platformFee: number;
  platformCommission: number;
  vendorPayout: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryMethod: 'delivery' | 'pickup';
  paymentMethod: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  estimatedDeliveryTime: string;
  specialInstructions?: string;
  vendorLat?: number;
  vendorLng?: number;
  customerLat?: number;
  customerLng?: number;
  currentRiderLocation?: { lat: number; lng: number };
  routeProgress?: number;
  statusUpdatedAt?: string;
  statusTimestamps?: Partial<Record<OrderStatus, string>>;
  /** Delivery-type discriminator — every booking reuses the same order engine. */
  deliveryType?: 'FOOD_ORDER' | 'PACKAGE' | 'PASS';
  /** Package / PASS booking fields. */
  pickupAddress?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupArea?: string;
  pickupCity?: string;
  pickupRegion?: string;
  pickupLandmark?: string;
  pickupInstructions?: string;
  dropoffAddress?: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffArea?: string;
  dropoffCity?: string;
  dropoffRegion?: string;
  dropoffLandmark?: string;
  dropoffInstructions?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverNote?: string;
  packageSize?: string;
  packageType?: string;
  weightKg?: number;
  service?: 'Standard' | 'Express';
  packageNote?: string;
  priceBreakdown?: PackagePriceBreakdown;
  confirmationCode?: string;
  receiverConfirmed?: boolean;
  receiverConfirmedAt?: string;
  confirmationMethod?: 'code' | 'sender' | 'admin';
}

/** Package / PASS booking payload for POST /orders/package. */
export interface PackageDeliveryRequest {
  customerId: string;
  deliveryType?: 'PACKAGE' | 'PASS';
  riderId?: string;
  pickupAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupArea?: string;
  pickupCity?: string;
  pickupRegion?: string;
  pickupLandmark?: string;
  pickupInstructions?: string;
  dropoffAddress: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffArea?: string;
  dropoffCity?: string;
  dropoffRegion?: string;
  dropoffLandmark?: string;
  dropoffInstructions?: string;
  receiverName: string;
  receiverPhone: string;
  receiverNote?: string;
  packageSize?: string;
  packageType?: string;
  weightKg?: number;
  service?: 'Standard' | 'Express';
  note?: string;
  specialInstructions?: string;
  paymentMethod?: string;
  couponCode?: string;
}

/** Server-authoritative price breakdown for a PACKAGE / PASS booking. */
export interface PackagePriceBreakdown {
  baseFee: number;
  sizeFee: number;
  riderFee: number;
  distanceFee: number;
  weightFee: number;
  distanceKm: number | null;
  serviceMultiplier: number;
  serviceFee: number;
  subtotal: number;
  platformFee: number;
}

/** Response from POST /orders/package/quote. */
export interface PackageQuote {
  success: boolean;
  deliveryType: 'PACKAGE' | 'PASS';
  packageSize: string;
  weightKg: number;
  service: 'Standard' | 'Express';
  distanceKm: number | null;
  estimatedDeliveryTime: string;
  breakdown: PackagePriceBreakdown;
  discount: number;
  couponCode?: string | null;
  total: number;
  currency: string;
}

/** Structured delivery location used across the booking flow. */
export interface DeliveryLocation {
  address: string;
  area?: string;
  city?: string;
  region?: string;
  landmark?: string;
  instructions?: string;
  latitude?: number | null;
  longitude?: number | null;
  deliveryAddressId?: string;
  source?: 'geocoder' | 'seed' | 'saved' | 'manual' | 'gps';
}

/** Backend payment gateway configuration — single source of truth. */
export interface PaymentGatewayConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  configured: boolean;
  operational?: boolean;
}

/** Public platform configuration surfaced by GET /api/platform/settings. */
export interface PlatformSettings {
  platformName: string;
  currency: string;
  defaultCommissionRate: number;
  defaultDeliveryFee: number;
  distanceFeePerKm: number;
  platformFee: number;
  taxRate: number;
  vendorApprovalMode?: 'manual' | 'automatic';
  riderApprovalMode?: 'manual' | 'automatic';
  allowNewCustomers?: boolean;
  allowNewVendors?: boolean;
  allowNewRiders?: boolean;
  notificationsEnabled?: boolean;
  maintenanceMode?: boolean;
  paymentGateways?: PaymentGatewayConfig[];
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone: string;
  addresses: Address[];
  momo?: {
    provider: string;
    number: string;
    accountName: string;
  };
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  walletBalance: number;
  loyaltyPoints: number;
  referralCode: string;
  /** Back-end account verification flags (only present when the server reports them). */
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isVerified?: boolean;
  /** Back-end update payload fields used when saving a delivery location. */
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  reply?: string;
  date: string;
  orderId: string;
  deliveryId?: string;
  riderId?: string;
  target?: 'rider' | 'vendor' | 'product' | 'experience';
  vendorId?: string;
  productId?: string;
}

export type NotificationCategory = 'orders' | 'deliveries' | 'messages' | 'payments' | 'account' | 'system';
export type NotificationPriority = 'NORMAL' | 'IMPORTANT' | 'CRITICAL';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  time: string;
  createdAt?: string;
  read: boolean;
  readAt?: string | null;
  type: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  referenceId?: string;
  referenceType?: string;
  relatedOrderId?: string;
  relatedDeliveryId?: string;
  relatedConversationId?: string;
  relatedRestaurantId?: string;
  relatedUserId?: string;
  action?: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'refund';
  category: 'order_payment' | 'order_refund' | 'vendor_payout' | 'rider_earning' | 'withdrawal' | 'top_up' | 'commission' | 'bonus' | 'referral' | 'adjustment' | 'fee';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  referenceId?: string;
  referenceType?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_delivery';
  value: number;
  maxDiscount: number;
  minSpend: number;
  usageLimit?: number;
  totalUsed: number;
  vendorId?: string;
  isActive: boolean;
  startsAt?: string;
  expiryDate: string;
}
