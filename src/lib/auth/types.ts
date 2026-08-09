// ============================================================
// OmniMarket Auth — Shared Types
// ============================================================

export type Role =
  | 'customer'
  | 'vendor'
  | 'vendor-staff'
  | 'store-manager'
  | 'rider'
  | 'administrator'
  | 'super-administrator';

export type AccountType =
  | 'CUSTOMER'
  | 'VENDOR'
  | 'RESTAURANT_MANAGER'
  | 'RIDER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'APPROVED' | 'SUSPENDED' | 'DISABLED';

export type Portal = 'public' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  displayName: string;
  name?: string; // Unified name field
  avatarUrl: string;
  role: Role;
  accountType?: AccountType;
  status: UserStatus | string;
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerified?: boolean; // Unified
  phoneVerified?: boolean; // Unified
  isApproved: boolean;
  isActive: boolean;
  isSuspended: boolean;
  vendorId?: string;
  restaurantId?: string; // Unified naming for restaurant/vendor
  riderId?: string;
  storeName?: string;
  twoFactorEnabled: boolean;
  lastLoginAt: string;
  createdAt: string;
  permissions?: Permission[];
  authenticationProvider?: 'password' | 'google' | 'apple';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  lastActivityAt: string;
  isCurrent: boolean;
}

export interface DecodedToken {
  sub: string;
  role: Role;
  portal: Portal;
  vendorId?: string;
  email: string;
  iat: number;
  exp: number;
  jti: string;
  sessionId: string;
}

export interface LoginResponse {
  success: boolean;
  tokens?: AuthTokens;
  user?: UserProfile;
  requires2FA?: boolean;
  requiresOtp?: boolean;
  otpSentTo?: string;
  message?: string;
}

export interface AuthResult {
  success: boolean;
  tokens?: AuthTokens;
  user?: UserProfile;
  requires2FA?: boolean;
  requiresOtp?: boolean;
  otpSentTo?: string;
  error?: string;
}

export interface RegisterPayload {
  role: Role;
  [key: string]: unknown;
}

export interface AuditEvent {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface RouteAccess {
  path: string;
  roles: Role[];
  permission?: string;
}

// ============================================================
// RBAC — Permission model
// ============================================================

export type Permission =
  // Customer
  | 'customer:order'
  | 'customer:checkout'
  | 'customer:wishlist'
  | 'customer:wallet'
  // Vendor
  | 'vendor:dashboard'
  | 'vendor:products'
  | 'vendor:orders'
  | 'vendor:categories'
  | 'vendor:inventory'
  | 'vendor:analytics'
  | 'vendor:customers'
  | 'vendor:messages'
  | 'vendor:store'
  | 'vendor:settings'
  | 'vendor:wallet'
  | 'vendor:withdrawals'
  | 'vendor:subscription'
  // Staff
  | 'staff:products'
  | 'staff:orders'
  | 'staff:inventory'
  | 'staff:support'
  | 'staff:finance'
  // Rider
  | 'rider:jobs'
  | 'rider:navigation'
  | 'rider:earnings'
  | 'rider:history'
  | 'rider:profile'
  | 'rider:settings'
  // Admin
  | 'admin:users'
  | 'admin:vendors'
  | 'admin:riders'
  | 'admin:orders'
  | 'admin:payments'
  | 'admin:reports'
  | 'admin:settings'
  | 'admin:security'
  | 'admin:content'
  // Super Admin
  | 'super:admins'
  | 'super:system'
  | 'super:roles'
  | 'super:database'
  | 'super:api'
  | 'super:audit'
  | 'super:platform'
  | 'super:security';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  customer: [
    'customer:order', 'customer:checkout', 'customer:wishlist', 'customer:wallet',
  ],
  vendor: [
    'vendor:dashboard', 'vendor:products', 'vendor:orders', 'vendor:categories',
    'vendor:inventory', 'vendor:analytics', 'vendor:customers', 'vendor:messages',
    'vendor:store', 'vendor:settings', 'vendor:wallet', 'vendor:withdrawals', 'vendor:subscription',
  ],
  'vendor-staff': ['staff:products', 'staff:orders', 'staff:inventory', 'staff:support'],
  'store-manager': [
    'vendor:dashboard', 'vendor:products', 'vendor:orders', 'vendor:categories',
    'vendor:inventory', 'vendor:analytics', 'vendor:customers', 'vendor:messages',
    'vendor:store', 'vendor:settings', 'staff:finance',
  ],
  rider: ['rider:jobs', 'rider:navigation', 'rider:earnings', 'rider:history', 'rider:profile', 'rider:settings'],
  administrator: [
    'admin:users', 'admin:vendors', 'admin:riders', 'admin:orders', 'admin:payments',
    'admin:reports', 'admin:settings', 'admin:security', 'admin:content',
  ],
  'super-administrator': [
    'admin:users', 'admin:vendors', 'admin:riders', 'admin:orders', 'admin:payments',
    'admin:reports', 'admin:settings', 'admin:security', 'admin:content',
    'super:admins', 'super:system', 'super:roles', 'super:database', 'super:api',
    'super:audit', 'super:platform', 'super:security',
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer',
  vendor: 'Restaurant Partner',
  'vendor-staff': 'Restaurant Staff',
  'store-manager': 'Restaurant Manager',
  rider: 'Dispatch Rider',
  administrator: 'Administrator',
  'super-administrator': 'Super Administrator',
};

export const ROLE_COLORS: Record<Role, string> = {
  customer: 'from-emerald-500 to-teal-500',
  vendor: 'from-violet-500 to-purple-600',
  'vendor-staff': 'from-indigo-500 to-violet-600',
  'store-manager': 'from-fuchsia-500 to-purple-600',
  rider: 'from-amber-500 to-orange-600',
  administrator: 'from-blue-600 to-indigo-600',
  'super-administrator': 'from-rose-500 to-purple-700',
};

export const ROLE_DASHBOARDS: Record<Role, string> = {
  customer: '/customer/dashboard',
  vendor: '/restaurant/dashboard',
  'vendor-staff': '/restaurant/dashboard',
  'store-manager': '/restaurant/dashboard',
  rider: '/rider/dashboard',
  administrator: '/admin/dashboard',
  'super-administrator': '/super-admin/dashboard',
};

// ============================================================
// Application modules — each is a fully separated experience
// ============================================================

export type AppModule = 'marketplace' | 'customer' | 'vendor' | 'rider' | 'admin' | 'super-admin';

export const ROLE_MODULES: Record<Role, AppModule> = {
  customer: 'customer',
  vendor: 'vendor',
  'vendor-staff': 'vendor',
  'store-manager': 'vendor',
  rider: 'rider',
  administrator: 'admin',
  'super-administrator': 'super-admin',
};

export const MODULE_LOGIN: Record<AppModule, string> = {
  marketplace: '/login',
  customer: '/login',
  vendor: '/login',
  rider: '/login',
  admin: '/admin/login',
  'super-admin': '/super-admin/login',
};

export const ROLE_PORTALS: Record<Role, Portal> = {
  customer: 'public',
  vendor: 'public',
  'vendor-staff': 'public',
  'store-manager': 'public',
  rider: 'public',
  administrator: 'admin',
  'super-administrator': 'admin',
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(role: Role): boolean {
  return role === 'administrator' || role === 'super-administrator';
}

/**
 * Centralized routing decision engine.
 * Evaluates the full user identity to determine the correct destination.
 */
export function resolvePostAuthenticationRoute(user: UserProfile): string {  const role = user.role;
  const status = (user.status || "").toUpperCase();
  const accountType = user.accountType;

  // 1. Handle Administrative Roles
  if (role === "super-administrator") return "/super-admin/dashboard";
  if (role === "administrator") return "/admin/dashboard";

  // 2. Handle Rider Flow
  if (role === "rider" || accountType === "RIDER") {
    if (status === "PENDING") return "/rider/application-status";
    if (!user.isVerified && !user.isApproved) return "/rider/onboarding";
    return "/rider/dashboard";
  }

  // 3. Handle Vendor / Restaurant Manager Flow
  if (
    role === "vendor" ||
    role === "store-manager" ||
    role === "vendor-staff" ||
    accountType === "VENDOR" ||
    accountType === "RESTAURANT_MANAGER"
  ) {
    if (status === "PENDING") return "/vendor/onboarding";
    if (!user.isApproved) return "/vendor/onboarding";
    return "/vendor/dashboard";
  }

  // 4. Handle Customer Flow
  if (role === "customer" || accountType === "CUSTOMER") {
    return "/customer/dashboard";
  }

  // Default fallback
  return ROLE_DASHBOARDS[role] || "/";
}

/**
 * Destination right after a successful login / registration for PUBLIC portal
 * roles. Customers land on the modern home hero (marketplace) first so they can
 * browse before jumping into their dashboard. Other roles keep their portal flow.
 */
export function resolvePostLoginRoute(user: UserProfile): string {
  if (user.role === "customer" || user.accountType === "CUSTOMER") return "/";
  return resolvePostAuthenticationRoute(user);
}
