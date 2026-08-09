import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { AuthGuard, ModuleGuard, PublicOnlyRoute } from '@/src/lib/auth/middleware';
import { MarketplaceShell } from '@/src/components/layouts/marketplace-layout';
import { CustomerLayout } from '@/src/components/customer/CustomerLayout';
import { VendorLayout } from '@/src/components/vendor/VendorLayout';
import { RiderLayout } from '@/src/components/rider/RiderLayout';
import { AdminLayout } from '@/src/components/admin/AdminLayout';
import { SuperAdminLayout } from '@/src/components/super-admin/SuperAdminLayout';

import { LandingPage } from '@/src/pages/auth/landing';
import { PublicLoginPage } from '@/src/pages/auth/public-login';
import { AdminLoginPage } from '@/src/pages/auth/admin-login';
import { RegisterPage } from '@/src/pages/auth/register';
import { ForgotPasswordPage } from '@/src/pages/auth/forgot-password';
import { ChangePasswordPage } from '@/src/pages/auth/change-password';
import { AuthCallbackPage } from '@/src/pages/auth/callback';

import { HomePage } from '@/src/components/marketplace/HomePage';
import { ProductListingPage } from '@/src/components/marketplace/ProductListingPage';
import { ProductDetailPage } from '@/src/components/marketplace/ProductDetailPage';
import { VendorListingPage } from '@/src/components/marketplace/VendorListingPage';
import { VendorDetailPage } from '@/src/components/marketplace/VendorDetailPage';
import { CheckoutPage } from '@/src/components/marketplace/CheckoutPage';
import { OrderTrackingPage } from '@/src/components/marketplace/OrderTrackingPage';
import { DealsPage } from '@/src/components/marketplace/DealsPage';
import { BecomeVendorPage } from '@/src/components/static/BecomeVendorPage';
import { BecomeRiderPage } from '@/src/components/static/BecomeRiderPage';
import { StaticPages } from '@/src/components/static/StaticPages';

import { CustomerDashboardPage } from '@/src/pages/customer/dashboard';
import {
  CustomerOrdersPage, CustomerCartPage, CustomerWishlistPage, CustomerWalletPage,
  CustomerMessagesPage, CustomerAddressesPage, CustomerSettingsPage,
  CustomerNotificationsPage, CustomerReviewsPage,
  CustomerFavoritesPage, CustomerCouponsPage, CustomerPaymentMethodsPage,
  CustomerSupportPage
} from '@/src/pages/customer/sections';

import { VendorDashboardPage } from '@/src/pages/vendor/dashboard';
import { VendorProductsPage } from '@/src/pages/vendor/products';
import {
  VendorOrdersPage, VendorInventoryPage, VendorCustomersPage, VendorAnalyticsPage,
  VendorMarketingPage, VendorWalletPage, VendorStoreSettingsPage, VendorSubscriptionPage,
  VendorCategoriesPage, VendorCouponsPage, VendorWithdrawalsPage, VendorSupportPage,
  VendorNotificationsPage, VendorMessagesPage,
  VendorKitchenStatusPage, VendorOrderQueuePage, VendorDeliveryRequestsPage,
  VendorRidersPage, VendorReviewsPage, VendorPromotionsPage, VendorOpeningHoursPage,
} from '@/src/pages/vendor/sections';

import { RiderDashboardPage } from '@/src/pages/rider/dashboard';
import { RiderDeliveriesPage } from '@/src/pages/rider/deliveries';
import {
  RiderJobsPage, RiderNavigationPage, RiderHistoryPage,
  RiderWalletPage, RiderProfilePage, RiderSettingsPage,
  RiderRatingsPage, RiderMessagesPage, RiderNotificationsPage,
  RiderPickupQueuePage, RiderOrderStatusPage,
} from '@/src/pages/rider/sections';

import { AdminDashboardPage } from '@/src/pages/admin/dashboard';
import { AdminCustomersPage } from '@/src/pages/admin/customers';
import { AdminVendorsPage } from '@/src/pages/admin/vendors';
import { AdminOrdersPage } from '@/src/pages/admin/orders';
import { AdminDeliveriesPage } from '@/src/pages/admin/Deliveries';
import { AdminLiveOperationsPage } from '@/src/pages/admin/admin-live-operations';
import { AdminManagersPage, AdminReviewsPage, AdminAdministratorsPage, AdminAuditLogPage } from '@/src/pages/admin/admin-modules';
import {
  AdminUsersPage, AdminRidersPage, AdminPaymentsPage, AdminReportsPage, AdminSupportPage, AdminSettingsPage,
  AdminProductsPage, AdminCategoriesPage, AdminNotificationsPage, AdminMessagesPage,
  AdminCouponsPage, AdminPromotionsPage,
} from '@/src/pages/admin/sections';

import { SuperAdminDashboardPage } from '@/src/pages/super-admin/dashboard';
import { SuperAdminSettingsPage } from '@/src/pages/super-admin/settings';
import {
  SuperAdminAdminsPage, SuperAdminSecurityPage, SuperAdminSystemPage,
  SuperAdminDatabasePage, SuperAdminApiPage, SuperAdminAuditPage,
  SuperAdminRolesPage, SuperAdminPermissionsPage, SuperAdminBackupPage,
  SuperAdminNotificationsPage,
  SuperAdminRestaurantApprovalsPage, SuperAdminRiderApprovalsPage,
  SuperAdminPaymentGatewaysPage, SuperAdminUsersPage,
} from '@/src/pages/super-admin/sections';

/** Legacy redirect: maps old /vendor/* URLs to the restaurant portal. */
function LegacyVendorRedirect() {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/vendor/, '') || '';
  return <Navigate to={`/restaurant${rest}`} replace />;
}

export const router = createBrowserRouter([
  // --- Public (guest) routes ---
  { path: '/landing', element: <LandingPage /> },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <PublicLoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicOnlyRoute>
        <ForgotPasswordPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/change-password',
    element: (
      <AuthGuard roles={['customer', 'vendor', 'store-manager', 'vendor-staff', 'rider', 'administrator', 'super-administrator']}>
        <ChangePasswordPage />
      </AuthGuard>
    ),
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },

  // --- Separate console logins ---
  {
    path: '/admin/login',
    element: <AdminLoginPage variant="admin" />,
  },
  {
    path: '/super-admin/login',
    element: <AdminLoginPage variant="super-admin" />,
  },

  // --- Legacy auth namespace ---
  { path: '/auth', element: <Navigate to="/login" replace /> },

  // ===============================
  // Public Marketplace (root module)
  // ===============================
  {
    path: '/',
    element: <MarketplaceShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductListingPage /> },
      { path: 'categories', element: <Navigate to="/products" replace /> },
      { path: 'vendors', element: <VendorListingPage /> },
      { path: 'vendors/:id', element: <VendorDetailPage /> },
      { path: 'product/:id', element: <ProductDetailPage /> },
      { path: 'deals', element: <DealsPage /> },
      { path: 'track-order', element: <OrderTrackingPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'become-vendor', element: <BecomeVendorPage /> },
      { path: 'become-rider', element: <BecomeRiderPage /> },
      { path: 'how-delivery-works', element: <StaticPages type="how-it-works" /> },
      { path: 'about', element: <StaticPages type="about" /> },
      { path: 'faq', element: <StaticPages type="faq" /> },
      { path: 'contact', element: <StaticPages type="contact" /> },
      { path: 'terms', element: <StaticPages type="terms" /> },
    ],
  },

  // --- Legacy marketplace path ---
  { path: '/marketplace', element: <Navigate to="/" replace /> },

  // ===============================
  // Customer Application
  // ===============================
  {
    path: '/customer',
    element: (
      <AuthGuard portal="public" module="customer" roles={['customer']}>
        <ModuleGuard module="customer">
          <CustomerLayout />
        </ModuleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/customer/dashboard" replace /> },
      { path: 'dashboard', element: <CustomerDashboardPage /> },
      { path: 'orders', element: <CustomerOrdersPage /> },
      { path: 'cart', element: <CustomerCartPage /> },
      { path: 'wishlist', element: <CustomerWishlistPage /> },
      { path: 'favorites', element: <CustomerFavoritesPage /> },
      { path: 'coupons', element: <CustomerCouponsPage /> },
      { path: 'payment-methods', element: <CustomerPaymentMethodsPage /> },
      { path: 'wallet', element: <CustomerWalletPage /> },
      { path: 'messages', element: <CustomerMessagesPage /> },
      { path: 'addresses', element: <CustomerAddressesPage /> },
      { path: 'notifications', element: <CustomerNotificationsPage /> },
      { path: 'settings', element: <CustomerSettingsPage /> },
      { path: 'reviews', element: <CustomerReviewsPage /> },
      { path: 'profile', element: <Navigate to="/customer/settings" replace /> },
      { path: 'support', element: <CustomerSupportPage /> },
    ],
  },

  // ===============================
  // Restaurant Partner Portal
  // ===============================
  {
    path: '/restaurant',
    element: (
      <AuthGuard portal="public" module="vendor" roles={['vendor', 'store-manager', 'vendor-staff']}>
        <ModuleGuard module="vendor">
          <VendorLayout />
        </ModuleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/restaurant/dashboard" replace /> },
      { path: 'dashboard', element: <VendorDashboardPage /> },
      { path: 'menu', element: <VendorProductsPage /> },
      { path: 'products', element: <Navigate to="/restaurant/menu" replace /> },
      { path: 'orders', element: <VendorOrdersPage /> },
      { path: 'kitchen', element: <VendorKitchenStatusPage /> },
      { path: 'order-queue', element: <VendorOrderQueuePage /> },
      { path: 'delivery-requests', element: <VendorDeliveryRequestsPage /> },
      { path: 'riders', element: <VendorRidersPage /> },
      { path: 'inventory', element: <VendorInventoryPage /> },
      { path: 'customers', element: <VendorCustomersPage /> },
      { path: 'reviews', element: <VendorReviewsPage /> },
      { path: 'analytics', element: <VendorAnalyticsPage /> },
      { path: 'marketing', element: <VendorMarketingPage /> },
      { path: 'promotions', element: <VendorPromotionsPage /> },
      { path: 'wallet', element: <VendorWalletPage /> },
      { path: 'store-settings', element: <VendorStoreSettingsPage /> },
      { path: 'opening-hours', element: <VendorOpeningHoursPage /> },
      { path: 'subscription', element: <VendorSubscriptionPage /> },
      { path: 'categories', element: <VendorCategoriesPage /> },
      { path: 'coupons', element: <VendorCouponsPage /> },
      { path: 'withdrawals', element: <VendorWithdrawalsPage /> },
      { path: 'support', element: <VendorSupportPage /> },
      { path: 'notifications', element: <VendorNotificationsPage /> },
      { path: 'messages', element: <VendorMessagesPage /> },
    ],
  },

  // --- Legacy vendor URL ---
  { path: '/vendor/*', element: <LegacyVendorRedirect /> },

  // ===============================
  // Dispatch Rider Application
  // ===============================
  {
    path: '/rider',
    element: (
      <AuthGuard portal="public" module="rider" roles={['rider']}>
        <ModuleGuard module="rider">
          <RiderLayout />
        </ModuleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/rider/dashboard" replace /> },
      { path: 'dashboard', element: <RiderDashboardPage /> },
      { path: 'jobs', element: <RiderJobsPage /> },
      { path: 'pickup-queue', element: <RiderPickupQueuePage /> },
      { path: 'order-status', element: <RiderOrderStatusPage /> },
      { path: 'navigation', element: <RiderNavigationPage /> },
      { path: 'deliveries', element: <RiderDeliveriesPage /> },
      { path: 'active-delivery', element: <RiderDeliveriesPage /> }, // Unified view
      { path: 'history', element: <RiderHistoryPage /> },
      { path: 'wallet', element: <RiderWalletPage /> },
      { path: 'profile', element: <RiderProfilePage /> },
      { path: 'settings', element: <RiderSettingsPage /> },
      { path: 'earnings', element: <RiderWalletPage /> },
      { path: 'ratings', element: <RiderRatingsPage /> },
      { path: 'messages', element: <RiderMessagesPage /> },
      { path: 'notifications', element: <RiderNotificationsPage /> },
    ],
  },

  // ===============================
  // Platform Admin Console
  // ===============================
  {
    path: '/admin',
    element: (
      <AuthGuard portal="admin" module="admin" roles={['administrator', 'super-administrator']}>
        <ModuleGuard module="admin">
          <AdminLayout />
        </ModuleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'live-operations', element: <AdminLiveOperationsPage /> },
      { path: 'customers', element: <AdminCustomersPage /> },
      { path: 'vendors', element: <AdminVendorsPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'deliveries', element: <AdminDeliveriesPage /> },
      { path: 'managers', element: <AdminManagersPage /> },
      { path: 'riders', element: <AdminRidersPage /> },
      { path: 'restaurants', element: <AdminVendorsPage /> },
      { path: 'meals', element: <AdminProductsPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'coupons', element: <AdminCouponsPage /> },
      { path: 'promotions', element: <AdminPromotionsPage /> },
      { path: 'payments', element: <AdminPaymentsPage /> },
      { path: 'payouts', element: <AdminPaymentsPage /> },
      { path: 'reviews', element: <AdminReviewsPage /> },
      { path: 'support', element: <AdminSupportPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
      { path: 'analytics', element: <AdminReportsPage /> },
      { path: 'administrators', element: <AdminAdministratorsPage /> },
      { path: 'audit-log', element: <AdminAuditLogPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
    ],
  },

  // ===============================
  // Super Admin Console
  // ===============================
  {
    path: '/super-admin',
    element: (
      <AuthGuard portal="admin" module="super-admin" roles={['super-administrator']}>
        <ModuleGuard module="super-admin">
          <SuperAdminLayout />
        </ModuleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/super-admin/dashboard" replace /> },
      { path: 'dashboard', element: <SuperAdminDashboardPage /> },
      { path: 'admins', element: <SuperAdminAdminsPage /> },
      { path: 'security', element: <SuperAdminSecurityPage /> },
      { path: 'system', element: <SuperAdminSystemPage /> },
      { path: 'database', element: <SuperAdminDatabasePage /> },
      { path: 'api', element: <SuperAdminApiPage /> },
      { path: 'audit', element: <SuperAdminAuditPage /> },
      { path: 'settings', element: <SuperAdminSettingsPage /> },
      { path: 'roles', element: <SuperAdminRolesPage /> },
      { path: 'permissions', element: <SuperAdminPermissionsPage /> },
      { path: 'platform-settings', element: <SuperAdminSettingsPage /> },
      { path: 'users', element: <SuperAdminUsersPage /> },
      { path: 'restaurant-approvals', element: <SuperAdminRestaurantApprovalsPage /> },
      { path: 'rider-approvals', element: <SuperAdminRiderApprovalsPage /> },
      { path: 'payment-gateways', element: <SuperAdminPaymentGatewaysPage /> },
      { path: 'backup', element: <SuperAdminBackupPage /> },
      { path: 'notifications', element: <SuperAdminNotificationsPage /> },
    ],
  },

  // --- Catch-all ---
  { path: '*', element: <Navigate to="/" replace /> },
]);
