/// Every HTTP path this app uses. Mirrors the routes actually registered in
/// `server.ts` (verified against the running backend). No invented endpoints.
class ApiPaths {
  ApiPaths._();

  // ---- auth ---------------------------------------------------------------
  static const login = '/auth/login';
  static const verifyOtp = '/auth/verify-otp';
  static const sendOtp = '/auth/send-otp';
  static const sendVerification = '/auth/send-verification';
  static const verifyEmail = '/auth/verify-email';
  static const me = '/auth/me';
  static const register = '/auth/register';
  static const refresh = '/auth/refresh';
  static const requestPasswordReset = '/auth/request-password-reset';
  static const resetPassword = '/auth/reset-password';
  static const changePassword = '/auth/change-password';
  static const adminResetPassword = '/auth/admin/reset-password';
  static const adminGenerateTempPassword = '/auth/admin/generate-temp-password';
  static const adminForceReset = '/auth/admin/force-reset';
  static String sessionsOf(String userId) => '/auth/sessions/$userId';
  static String sessionOf(String userId, String sessionId) =>
      '/auth/sessions/$userId/$sessionId';

  // ---- catalog ------------------------------------------------------------
  static const vendors = '/vendors';
  static String vendor(String id) => '/vendors/$id';
  static String vendorProducts(String id) => '/vendors/$id/products';
  static String vendorDashboard(String id) => '/vendors/$id/dashboard';
  static String vendorHours(String id) => '/vendors/$id/hours';
  static String vendorKitchenToggle(String id) => '/vendors/$id/kitchen-toggle';
  static const products = '/products';
  static String product(String id) => '/products/$id';
  static const trendingProducts = '/products/trending';
  static const categories = '/categories';
  static String category(String id) => '/categories/$id';
  static const search = '/search';

  // ---- orders --------------------------------------------------------------
  static const orders = '/orders';
  static String order(String id) => '/orders/$id';
  static String orderTracking(String ref) => '/orders/tracking/$ref';
  static String orderStatus(String id) => '/orders/$id/status';
  static String orderAssignRider(String id) => '/orders/$id/assign-rider';
  static String orderComplete(String id) => '/orders/$id/complete';
  static String orderReceiverConfirm(String id) => '/orders/$id/receiver-confirm';
  static const ordersAvailable = '/orders/available';
  static const packageOrders = '/orders/package';
  static const packageQuote = '/orders/package/quote';

  // ---- location --------------------------------------------------------------
  static const geocodingSearch = '/geocoding/search';
  static const geocodingReverse = '/geocoding/reverse';

  // ---- wallets ---------------------------------------------------------------
  static String walletBalance(String userId) => '/wallets/$userId/balance';
  static String walletTransactions(String userId) => '/wallets/$userId/transactions';
  static String walletTopup(String userId) => '/wallets/$userId/topup';
  static String walletWithdrawals(String userId) => '/wallets/$userId/withdrawals';

  // ---- riders ----------------------------------------------------------------
  static const riders = '/riders';
  static String rider(String id) => '/riders/$id';
  static String riderStatus(String id) => '/riders/$id/status';
  static String riderLocation(String id) => '/riders/$id/location';

  // ---- customers ---------------------------------------------------------------
  static String customer(String id) => '/customers/$id';
  static String customerAddresses(String id) => '/customers/$id/addresses';
  static String customerAddress(String id, String addrId) =>
      '/customers/$id/addresses/$addrId';

  // ---- notifications ------------------------------------------------------------
  static const notificationsMe = '/notifications';
  static const notificationsUnreadCount = '/notifications/unread-count';
  static const notificationsReadAll = '/notifications/read-all';
  static const notificationsClear = '/notifications/clear';
  static String notifications(String userId) => '/notifications/$userId';
  static String notificationRead(String id) => '/notifications/$id/read';
  static String notification(String id) => '/notifications/$id';

  // ---- reviews / coupons ----------------------------------------------------------
  static const reviews = '/reviews';
  static const coupons = '/coupons';
  static String coupon(String id) => '/coupons/$id';
  static const couponValidate = '/coupons/validate';

  // ---- messaging -------------------------------------------------------------------
  static const conversations = '/messages/conversations';
  static String conversation(String conversationId) => '/messages/$conversationId';
  static const messages = '/messages';
  static const supportMessage = '/messages/support';

  // ---- admin --------------------------------------------------------------------------
  static const adminStats = '/admin/stats';
  static const adminReports = '/admin/reports';
  static const users = '/users';
  static String user(String id) => '/users/$id';
  static const customers = '/customers';
  static const transactions = '/transactions';
  static const emailLog = '/email-log';
  static const payments = '/payments';
  static const payouts = '/payouts';
  static const riderEarnings = '/rider-earnings';

  // ---- support -------------------------------------------------------------------------
  static const supportTickets = '/support/tickets';
  static String supportTicketReply(String id) => '/support/tickets/$id/reply';
  static String supportTicket(String id) => '/support/tickets/$id';

  // ---- super admin -----------------------------------------------------------------------
  static const audit = '/audit';
  static const platformSettings = '/platform/settings';
  static const paymentGateways = '/payment-gateways';
  static String paymentGateway(String id) => '/payment-gateways/$id';
  static const announcements = '/announcements';
  static const systemHealth = '/system/health';
  static const systemBackup = '/system/backup';

  // ---- realtime --------------------------------------------------------------------------
  static const realtime = '/realtime';
}
