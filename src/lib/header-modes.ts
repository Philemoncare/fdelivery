import type { Order } from '@/src/types';

/**
 * Context-aware page header system.
 *
 * The consumer application should not render one identical header on every
 * page. Each page context gets a header appropriate to its task, driven by a
 * single reusable feature-flag model. The marketplace keeps the full consumer
 * header; transactional, tracking, booking, messaging and account pages get
 * compact, focused bars with only the controls the task needs.
 */

export type HeaderMode =
  | 'marketplace' // full consumer experience: home, browse, restaurants, deals, product/vendor detail
  | 'checkout' // focused transaction: cart / checkout
  | 'payment' // even more focused: payment steps
  | 'tracking' // order reference + status, minimal controls
  | 'booking' // package / pass logistics booking workflow
  | 'messaging' // communication-focused bar
  | 'settings' // account management — avatar is appropriate here
  | 'account' // personal account areas — avatar appropriate
  | 'account-money'; // transaction/account areas — avatar omitted

export interface HeaderFeatures {
  /** Compact height (transactional pages should not eat vertical space). */
  compact: boolean;
  /** Top announcement promo bar. */
  showAnnouncement: boolean;
  showBrowse: boolean;
  showSearch: boolean;
  showDeliveryLocation: boolean;
  showCurrency: boolean;
  showLanguage: boolean;
  showFavorites: boolean;
  showMessages: boolean;
  showNotifications: boolean;
  showCart: boolean;
  /** Whether the customer's identity needs to be visible on this screen. */
  showAvatar: boolean;
  showBack: boolean;
  /** Show live order reference in the bar (tracking). */
  showOrderReference: boolean;
  /** Show a status chip next to the order reference (tracking). */
  showStatus: boolean;
  /** Show the booking workflow progress (package / pass). */
  showProgress: boolean;
  /** Secure checkout / payment indicator. */
  secureContext: 'checkout' | 'payment' | null;
  /** Fallback destination when there is no history to go back to. */
  defaultBackTo: string;
}

const compactBase: HeaderFeatures = {
  compact: true,
  showAnnouncement: false,
  showBrowse: false,
  showSearch: false,
  showDeliveryLocation: false,
  showCurrency: false,
  showLanguage: false,
  showFavorites: false,
  showMessages: false,
  showNotifications: false,
  showCart: false,
  showAvatar: false,
  showBack: true,
  showOrderReference: false,
  showStatus: false,
  showProgress: false,
  secureContext: null,
  defaultBackTo: '/',
};

const FEATURES: Record<HeaderMode, HeaderFeatures> = {
  marketplace: {
    ...compactBase,
    compact: false,
    showAnnouncement: true,
    showBrowse: true,
    showSearch: true,
    showDeliveryLocation: true,
    showCurrency: true,
    showLanguage: true,
    showFavorites: true,
    showMessages: true,
    showNotifications: true,
    showCart: true,
    showAvatar: true,
    showBack: false,
  },
  checkout: {
    ...compactBase,
    showCart: true,
    secureContext: 'checkout',
    defaultBackTo: '/customer/cart',
  },
  payment: {
    ...compactBase,
    secureContext: 'payment',
    defaultBackTo: '/checkout',
  },
  tracking: {
    ...compactBase,
    showNotifications: true,
    showOrderReference: true,
    showStatus: true,
    defaultBackTo: '/customer/orders',
  },
  booking: {
    ...compactBase,
    showProgress: true,
    defaultBackTo: '/',
  },
  messaging: {
    ...compactBase,
    defaultBackTo: '/',
  },
  settings: {
    ...compactBase,
    showAvatar: true,
    defaultBackTo: '/',
  },
  account: {
    ...compactBase,
    showAvatar: true,
    defaultBackTo: '/',
  },
  'account-money': {
    ...compactBase,
    defaultBackTo: '/',
  },
};

export function getHeaderMode(pathname: string): HeaderMode {
  if (pathname === '/checkout') return 'checkout';
  if (pathname === '/customer/cart') return 'checkout';
  if (pathname === '/track-order') return 'tracking';
  if (pathname.startsWith('/customer/orders/')) return 'tracking';
  if (pathname === '/customer/orders') return 'account-money';
  if (pathname === '/customer/deliver') return 'booking';
  if (pathname === '/customer/messages') return 'messaging';
  if (pathname === '/customer/settings' || pathname === '/customer/addresses' || pathname === '/customer/profile') return 'settings';
  if (
    pathname.startsWith('/customer/wishlist') ||
    pathname.startsWith('/customer/favorites') ||
    pathname.startsWith('/customer/notifications') ||
    pathname.startsWith('/customer/reviews') ||
    pathname.startsWith('/customer/support')
  ) return 'account';
  if (
    pathname.startsWith('/customer/wallet') ||
    pathname.startsWith('/customer/payment-methods') ||
    pathname.startsWith('/customer/coupons')
  ) return 'account-money';
  // Public marketplace / informational pages (home, browse, restaurants, deals,
  // about, blog, careers, privacy, faq, terms, become-vendor/rider, etc.)
  // keep the full public header so guests can keep browsing.
  return 'marketplace';
}

export function getHeaderFeatures(mode: HeaderMode): HeaderFeatures {
  return FEATURES[mode];
}

/**
 * Contextual footer policy. The marketing footer belongs only on public
 * discovery/informational pages; focused transactional and operational pages
 * get a minimal bar or nothing at all so the viewport stays on the task.
 */
export type FooterMode = 'full' | 'minimal' | 'none';

export function getFooterMode(pathname: string, headerMode: HeaderMode): FooterMode {
  switch (headerMode) {
    case 'marketplace':
      // Restaurant / meal detail pages keep a reduced footer; discovery and
      // public informational pages (home, browse, restaurants, deals, about,
      // blog, privacy, faq, terms, ...) keep the full public footer.
      if (pathname.startsWith('/vendors/') || pathname.startsWith('/product/')) return 'minimal';
      return 'full';
    case 'checkout':
    case 'payment':
    case 'tracking':
    case 'booking':
    case 'messaging':
      return 'none';
    case 'settings':
    case 'account':
    case 'account-money':
      return 'minimal';
    default:
      return 'full';
  }
}

export function getHeaderModeTitle(mode: HeaderMode, pathname: string): string {
  switch (mode) {
    case 'checkout':
      return pathname === '/customer/cart' ? 'Your Cart' : 'Checkout';
    case 'tracking':
      return 'Order Tracking';
    case 'booking':
      return 'Send a Package';
    case 'messaging':
      return 'Messages';
    case 'settings':
      return pathname === '/customer/addresses' ? 'Addresses' : 'Settings';
    case 'account': {
      if (pathname.startsWith('/customer/wishlist')) return 'Wishlist';
      if (pathname.startsWith('/customer/favorites')) return 'Favorites';
      if (pathname.startsWith('/customer/notifications')) return 'Notifications';
      if (pathname.startsWith('/customer/reviews')) return 'Reviews';
      if (pathname.startsWith('/customer/support')) return 'Help & Support';
      return 'My Account';
    }
    case 'account-money': {
      if (pathname === '/customer/orders') return 'My Orders';
      if (pathname.startsWith('/customer/wallet')) return 'Wallet';
      if (pathname.startsWith('/customer/payment-methods')) return 'Payment Methods';
      if (pathname.startsWith('/customer/coupons')) return 'Coupons';
      return 'My Account';
    }
    default:
      return 'OmniMarket';
  }
}

/**
 * Resolve the order currently in tracking context (from the route's order id,
 * otherwise the globally selected order) so the header can show its reference
 * and live status.
 */
export function resolveTrackingOrder(pathname: string, orders: Order[], selectedOrder: Order | null): Order | null {
  const match = pathname.match(/^\/customer\/orders\/(.+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    return orders.find(o => o.id === id) || null;
  }
  if (selectedOrder) return selectedOrder;
  return null;
}

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300',
  confirmed: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300',
  preparing: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300',
  ready_for_pickup: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300',
  rider_assigned: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300',
  picked_up: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300',
  in_transit: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300',
  arriving: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300',
  awaiting_confirmation: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300',
  failed: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300',
  refunded: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300',
};

export function orderStatusTone(status?: string): string {
  return STATUS_TONE[(status || '').toLowerCase()] || STATUS_TONE.pending;
}

export function orderStatusLabel(status?: string): string {
  return (status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
