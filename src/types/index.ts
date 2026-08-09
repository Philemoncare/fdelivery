export type Role = 'customer' | 'vendor' | 'rider' | 'admin' | 'store-manager' | 'vendor-staff' | 'super-administrator';

export type ThemeMode = 'light' | 'dark';

export type CurrencyCode = 'GHS' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'JPY';

export type LanguageCode = 'EN' | 'ES' | 'FR' | 'DE' | 'ZH';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'arriving'
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
  avatar?: string;
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
  paymentMethod: 'MTN MoMo' | 'Telecel Cash' | 'AirtelTigo Money' | 'Visa' | 'Mastercard' | 'OmniWallet' | 'Cash on Delivery';
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
  vendorId?: string;
  productId?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'order' | 'delivery' | 'promo' | 'system';
  referenceId?: string;
  referenceType?: 'order' | 'vendor' | 'message' | 'system';
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
  status: 'Completed' | 'Pending' | 'Failed';
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
