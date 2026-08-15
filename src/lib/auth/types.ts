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
  /** Legacy API alias retained while clients migrate to avatarUrl. */
  avatar?: string;
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
  mustChangePassword?: boolean;
  walletBalance?: number;
  vendorId?: string;
  restaurantId?: string; // Unified naming for restaurant/vendor
  riderId?: string;
  storeName?: string;
  referralCode?: string; // Server-generated referral code
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

/**
 * The authoritative permission list. Two families:
 *
 * 1. MANAGEMENT permissions — the platform's administrative capability
 *    surface. Every one of these is enforced server-side by the
 *    `requirePermission` guard in `server.ts` on a real endpoint, and it is
 *    these that the Super Admin Permissions Matrix displays.
 * 2. SELF-SERVICE permissions (customer:* / vendor:* / staff:* / rider:*) —
 *    capabilities a role holds for its own marketplace workflow. They are
 *    enforced by role + ownership checks in the existing API guards and are
 *    NOT shown in the management matrix.
 */
export type Permission =
  // ---- Management: Identity ----
  | 'users:view'
  | 'users:create'
  | 'users:update'
  | 'users:suspend'
  | 'users:delete'
  | 'roles:view'
  | 'roles:update'
  | 'roles:assign'
  | 'permissions:view'
  | 'permissions:assign'
  | 'sessions:manage'
  // ---- Management: Marketplace ----
  | 'restaurants:view'
  | 'restaurants:approve'
  | 'restaurants:suspend'
  | 'restaurants:delete'
  | 'riders:view'
  | 'riders:approve'
  // ---- Management: Operations ----
  | 'orders:view'
  | 'orders:manage'
  | 'deliveries:view'
  | 'deliveries:assign'
  | 'announcements:publish'
  // ---- Management: Finance ----
  | 'payments:view'
  | 'payments:configure'
  // ---- Management: System ----
  | 'database:view'
  | 'database:backup'
  | 'database:restore'
  | 'api:view'
  | 'reports:view'
  | 'settings:update'
  // ---- Management: Security ----
  | 'security:view'
  | 'security:manage'
  | 'audit:view'
  // ---- Self-service: Customer ----
  | 'customer:order'
  | 'customer:checkout'
  | 'customer:wishlist'
  | 'customer:wallet'
  // ---- Self-service: Vendor ----
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
  // ---- Self-service: Staff ----
  | 'staff:products'
  | 'staff:orders'
  | 'staff:inventory'
  | 'staff:support'
  | 'staff:finance'
  // ---- Self-service: Rider ----
  | 'rider:jobs'
  | 'rider:navigation'
  | 'rider:earnings'
  | 'rider:history'
  | 'rider:profile'
  | 'rider:settings';

// ============================================================
// Permission registry (management surface shown in the matrix)
// ============================================================

export type PermissionDomain = 'IDENTITY' | 'MARKETPLACE' | 'OPERATIONS' | 'FINANCE' | 'SYSTEM' | 'SECURITY';
export type PermissionRisk = 'low' | 'medium' | 'high';

/** The management permissions the Permissions Matrix displays — all server-enforced. */
export const MANAGEMENT_PERMISSIONS: readonly Permission[] = [
  // Identity
  'users:view', 'users:create', 'users:update', 'users:suspend', 'users:delete',
  'roles:view', 'roles:update', 'roles:assign',
  'permissions:view', 'permissions:assign',
  'sessions:manage',
  // Marketplace
  'restaurants:view', 'restaurants:approve', 'restaurants:suspend', 'restaurants:delete',
  'riders:view', 'riders:approve',
  // Operations
  'orders:view', 'orders:manage', 'deliveries:view', 'deliveries:assign', 'announcements:publish',
  // Finance
  'payments:view', 'payments:configure',
  // System
  'database:view', 'database:backup', 'database:restore', 'api:view', 'reports:view', 'settings:update',
  // Security
  'security:view', 'security:manage', 'audit:view',
] as const;

export const PERMISSION_DOMAINS: { id: PermissionDomain; label: string; description: string }[] = [
  { id: 'IDENTITY', label: 'Identity & Access', description: 'Users, roles, permissions and sessions.' },
  { id: 'MARKETPLACE', label: 'Marketplace', description: 'Restaurants and riders governance.' },
  { id: 'OPERATIONS', label: 'Operations', description: 'Orders, deliveries and announcements.' },
  { id: 'FINANCE', label: 'Finance', description: 'Payments and gateway configuration.' },
  { id: 'SYSTEM', label: 'System', description: 'Configuration, database, API and reports.' },
  { id: 'SECURITY', label: 'Security & Audit', description: 'Security posture and the audit trail.' },
];

export const PERMISSION_META: Record<Permission, { label: string; description: string; domain: PermissionDomain; risk: PermissionRisk }> = {
  // Identity
  'users:view': { label: 'View users', description: 'View the platform user directory and account details.', domain: 'IDENTITY', risk: 'low' },
  'users:create': { label: 'Create users', description: 'Create administrator accounts on the platform.', domain: 'IDENTITY', risk: 'high' },
  'users:update': { label: 'Update users', description: 'Edit user profiles and account details.', domain: 'IDENTITY', risk: 'medium' },
  'users:suspend': { label: 'Suspend / reactivate users', description: 'Suspend, reactivate, force-reset or revoke sessions for accounts.', domain: 'IDENTITY', risk: 'high' },
  'users:delete': { label: 'Delete users', description: 'Permanently delete user accounts.', domain: 'IDENTITY', risk: 'high' },
  'roles:view': { label: 'View roles', description: 'View roles and their granted permission sets.', domain: 'IDENTITY', risk: 'low' },
  'roles:update': { label: 'Update roles', description: 'Change the permission set granted to a role.', domain: 'IDENTITY', risk: 'high' },
  'roles:assign': { label: 'Assign roles', description: 'Change the role assigned to a user account.', domain: 'IDENTITY', risk: 'high' },
  'permissions:view': { label: 'View permissions', description: 'View the permission registry.', domain: 'IDENTITY', risk: 'low' },
  'permissions:assign': { label: 'Assign permissions', description: 'Grant or revoke a permission on a role.', domain: 'IDENTITY', risk: 'high' },
  'sessions:manage': { label: 'Manage sessions', description: 'View the platform session registry and revoke sessions.', domain: 'IDENTITY', risk: 'medium' },
  // Marketplace
  'restaurants:view': { label: 'View restaurants', description: 'View restaurant records including private owner details.', domain: 'MARKETPLACE', risk: 'low' },
  'restaurants:approve': { label: 'Approve restaurants', description: 'Approve, verify or reject restaurant applications.', domain: 'MARKETPLACE', risk: 'medium' },
  'restaurants:suspend': { label: 'Suspend restaurants', description: 'Suspend or reinstate a restaurant on the platform.', domain: 'MARKETPLACE', risk: 'medium' },
  'restaurants:delete': { label: 'Delete restaurants', description: 'Permanently remove a restaurant and its menu.', domain: 'MARKETPLACE', risk: 'high' },
  'riders:view': { label: 'View riders', description: 'View rider records including private fleet details.', domain: 'MARKETPLACE', risk: 'low' },
  'riders:approve': { label: 'Approve riders', description: 'Approve, verify or reject rider applications.', domain: 'MARKETPLACE', risk: 'medium' },
  // Operations
  'orders:view': { label: 'View orders', description: 'View orders across the platform.', domain: 'OPERATIONS', risk: 'medium' },
  'orders:manage': { label: 'Manage orders', description: 'Change order status platform-wide.', domain: 'OPERATIONS', risk: 'medium' },
  'deliveries:view': { label: 'View deliveries', description: 'View delivery jobs across the platform.', domain: 'OPERATIONS', risk: 'medium' },
  'deliveries:assign': { label: 'Assign deliveries', description: 'Assign delivery jobs to riders.', domain: 'OPERATIONS', risk: 'medium' },
  'announcements:publish': { label: 'Publish announcements', description: 'Broadcast platform announcements to all accounts.', domain: 'OPERATIONS', risk: 'medium' },
  // Finance
  'payments:view': { label: 'View payments', description: 'View transactions and payment activity.', domain: 'FINANCE', risk: 'medium' },
  'payments:configure': { label: 'Configure payments', description: 'Enable, disable and configure payment gateways.', domain: 'FINANCE', risk: 'high' },
  // System
  'database:view': { label: 'View database', description: 'View database statistics, backups and system state.', domain: 'SYSTEM', risk: 'low' },
  'database:backup': { label: 'Create backups', description: 'Create database backup snapshots.', domain: 'SYSTEM', risk: 'high' },
  'database:restore': { label: 'Restore backups', description: 'Restore the database from a backup snapshot.', domain: 'SYSTEM', risk: 'high' },
  'api:view': { label: 'View API & health', description: 'View the API surface and system health status.', domain: 'SYSTEM', risk: 'low' },
  'reports:view': { label: 'View reports', description: 'View platform analytics and reports.', domain: 'SYSTEM', risk: 'low' },
  'settings:update': { label: 'Update settings', description: 'Update platform configuration and system settings.', domain: 'SYSTEM', risk: 'high' },
  // Security
  'security:view': { label: 'View security', description: 'View security posture and audit summaries.', domain: 'SECURITY', risk: 'medium' },
  'security:manage': { label: 'Manage security', description: 'Perform security enforcement actions such as forced resets.', domain: 'SECURITY', risk: 'high' },
  'audit:view': { label: 'View audit log', description: 'View the immutable server audit trail.', domain: 'SECURITY', risk: 'high' },
  // Self-service (not shown in the management matrix)
  'customer:order': { label: 'Place orders', description: 'Self-service: place marketplace orders.', domain: 'OPERATIONS', risk: 'low' },
  'customer:checkout': { label: 'Checkout', description: 'Self-service: complete checkout.', domain: 'OPERATIONS', risk: 'low' },
  'customer:wishlist': { label: 'Wishlist', description: 'Self-service: manage wishlists.', domain: 'OPERATIONS', risk: 'low' },
  'customer:wallet': { label: 'Customer wallet', description: 'Self-service: use the customer wallet.', domain: 'FINANCE', risk: 'low' },
  'vendor:dashboard': { label: 'Restaurant dashboard', description: 'Self-service: view the restaurant dashboard.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:products': { label: 'Manage products', description: 'Self-service: manage the restaurant menu.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:orders': { label: 'Manage orders', description: 'Self-service: manage the restaurant orders.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:categories': { label: 'Manage categories', description: 'Self-service: manage menu categories.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:inventory': { label: 'Manage inventory', description: 'Self-service: manage stock levels.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:analytics': { label: 'View analytics', description: 'Self-service: view restaurant analytics.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:customers': { label: 'View customers', description: 'Self-service: view restaurant customers.', domain: 'IDENTITY', risk: 'low' },
  'vendor:messages': { label: 'Messages', description: 'Self-service: messaging for the restaurant.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:store': { label: 'Manage store', description: 'Self-service: manage the restaurant storefront.', domain: 'OPERATIONS', risk: 'low' },
  'vendor:settings': { label: 'Restaurant settings', description: 'Self-service: manage restaurant settings.', domain: 'SYSTEM', risk: 'low' },
  'vendor:wallet': { label: 'Vendor wallet', description: 'Self-service: use the vendor wallet.', domain: 'FINANCE', risk: 'low' },
  'vendor:withdrawals': { label: 'Withdrawals', description: 'Self-service: request wallet withdrawals.', domain: 'FINANCE', risk: 'low' },
  'vendor:subscription': { label: 'Subscription', description: 'Self-service: manage the restaurant subscription.', domain: 'FINANCE', risk: 'low' },
  'staff:products': { label: 'Staff: products', description: 'Self-service: staff menu management.', domain: 'OPERATIONS', risk: 'low' },
  'staff:orders': { label: 'Staff: orders', description: 'Self-service: staff order management.', domain: 'OPERATIONS', risk: 'low' },
  'staff:inventory': { label: 'Staff: inventory', description: 'Self-service: staff inventory management.', domain: 'OPERATIONS', risk: 'low' },
  'staff:support': { label: 'Staff: support', description: 'Self-service: staff support tools.', domain: 'OPERATIONS', risk: 'low' },
  'staff:finance': { label: 'Staff: finance', description: 'Self-service: staff finance view.', domain: 'FINANCE', risk: 'low' },
  'rider:jobs': { label: 'Rider jobs', description: 'Self-service: claim and manage delivery jobs.', domain: 'OPERATIONS', risk: 'low' },
  'rider:navigation': { label: 'Rider navigation', description: 'Self-service: delivery navigation.', domain: 'OPERATIONS', risk: 'low' },
  'rider:earnings': { label: 'Rider earnings', description: 'Self-service: view rider earnings.', domain: 'FINANCE', risk: 'low' },
  'rider:history': { label: 'Rider history', description: 'Self-service: delivery history.', domain: 'OPERATIONS', risk: 'low' },
  'rider:profile': { label: 'Rider profile', description: 'Self-service: manage the rider profile.', domain: 'IDENTITY', risk: 'low' },
  'rider:settings': { label: 'Rider settings', description: 'Self-service: rider settings.', domain: 'SYSTEM', risk: 'low' },
};

// ============================================================
// Role definitions
// ============================================================

/** Default management permissions for the Administrator role (assigned admin duties only). */
export const ADMIN_MANAGEMENT_PERMISSIONS: readonly Permission[] = [
  'users:view', 'users:update',
  'sessions:manage',
  'restaurants:view', 'restaurants:approve', 'restaurants:suspend',
  'riders:view', 'riders:approve',
  'orders:view', 'orders:manage', 'deliveries:view', 'deliveries:assign',
  'announcements:publish',
  'payments:view',
  'database:view', 'api:view', 'reports:view',
  'security:view',
];

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
  administrator: [...ADMIN_MANAGEMENT_PERMISSIONS],
  'super-administrator': [...MANAGEMENT_PERMISSIONS],
};

/** Roles that carry management permissions. */
export const MANAGEMENT_ROLES: readonly Role[] = ['administrator', 'super-administrator'];

/** Display order for the role summary / matrix columns. */
export const ROLE_ORDER: readonly Role[] = [
  'customer', 'vendor', 'vendor-staff', 'store-manager', 'rider', 'administrator', 'super-administrator',
];

/**
 * Human-readable, unambiguous role labels. Each label is unique so a matrix
 * can never render two columns with the same name (the earlier
 * "Restaurant" / "Restaurant" / "Restaurant" duplication came from labelling
 * vendor, vendor-staff and store-manager all with the same first word).
 */
export const ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer',
  vendor: 'Restaurant',
  'vendor-staff': 'Restaurant Staff',
  'store-manager': 'Restaurant Manager',
  rider: 'Rider',
  administrator: 'Administrator',
  'super-administrator': 'Super Admin',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  customer: 'Limited marketplace access — browse, order and manage their own account.',
  vendor: 'Restaurant operations — manage their own restaurant, menu and orders.',
  'vendor-staff': 'Restaurant staff — assist with products, orders and inventory.',
  'store-manager': 'Restaurant manager — full operations for their own restaurant.',
  rider: 'Delivery operations — claim, complete and manage their own deliveries.',
  administrator: 'Platform operations — day-to-day administration within assigned management permissions.',
  'super-administrator': 'Global platform control — every permission including RBAC, security and system management.',
};

/** Role → account type consistency (used by role assignment enforcement). */
export const ROLE_ACCOUNT_TYPES: Record<Role, AccountType> = {
  customer: 'CUSTOMER',
  vendor: 'VENDOR',
  'vendor-staff': 'VENDOR',
  'store-manager': 'RESTAURANT_MANAGER',
  rider: 'RIDER',
  administrator: 'ADMIN',
  'super-administrator': 'SUPER_ADMIN',
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
  customer: '/',
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

export function isSuperAdminRole(role: Role): boolean {
  return role === 'super-administrator';
}

/** Whether a role has any management permissions at all. */
export function isManagementRole(role: Role): boolean {
  return ROLE_PERMISSIONS[role]?.some(p => MANAGEMENT_PERMISSIONS.includes(p)) ?? false;
}

/**
 * Centralized routing decision engine.
 * Evaluates the full user identity to determine the correct destination.
 */
export function resolvePostAuthenticationRoute(user: UserProfile): string {
  const role = user.role;
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

  // 4. Handle Customer Flow — customers land on the consumer home experience,
  // never an operational dashboard.
  if (role === "customer" || accountType === "CUSTOMER") {
    return "/";
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
