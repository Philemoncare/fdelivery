import 'json_helpers.dart';

/// `GET /api/admin/stats` (admin + super-admin).
class AdminStats {
  const AdminStats({
    this.customers = 0,
    this.vendors = 0,
    this.pendingVendors = 0,
    this.riders = 0,
    this.pendingRiders = 0,
    this.orders = 0,
    this.activeOrders = 0,
    this.todayOrders = 0,
    this.revenue = 0,
    this.platformCommission = 0,
    this.vendorPayout = 0,
    this.riderEarnings = 0,
    this.totalUsers = 0,
  });

  final int customers;
  final int vendors;
  final int pendingVendors;
  final int riders;
  final int pendingRiders;
  final int orders;
  final int activeOrders;
  final int todayOrders;
  final num revenue;
  final num platformCommission;
  final num vendorPayout;
  final num riderEarnings;
  final int totalUsers;

  factory AdminStats.fromJson(Map<String, dynamic> json) => AdminStats(
        customers: json.ii('customers'),
        vendors: json.ii('vendors'),
        pendingVendors: json.ii('pendingVendors'),
        riders: json.ii('riders'),
        pendingRiders: json.ii('pendingRiders'),
        orders: json.ii('orders'),
        activeOrders: json.ii('activeOrders'),
        todayOrders: json.ii('todayOrders'),
        revenue: json.dd('revenue'),
        platformCommission: json.dd('platformCommission'),
        vendorPayout: json.dd('vendorPayout'),
        riderEarnings: json.dd('riderEarnings'),
        totalUsers: json.ii('totalUsers'),
      );
}

/// `GET /api/vendors/:id/dashboard` (vendor owner or admin).
class VendorDashboard {
  const VendorDashboard({
    this.vendorId = '',
    this.totalOrders = 0,
    this.todayOrdersTotal = 0,
    this.todayActive = 0,
    this.revenueToday = 0,
    this.revenueTotal = 0,
    this.reviewsCount = 0,
    this.reviewsRating = 0,
    this.walletBalance = 0,
    this.lowStock = 0,
  });

  final String vendorId;
  final int totalOrders;
  final int todayOrdersTotal;
  final int todayActive;
  final num revenueToday;
  final num revenueTotal;
  final int reviewsCount;
  final double reviewsRating;
  final num walletBalance;
  final int lowStock;

  factory VendorDashboard.fromJson(Map<String, dynamic> json) {
    final today = json.m('todayOrders');
    final revenue = json.m('revenue');
    final reviews = json.m('reviews');
    return VendorDashboard(
      vendorId: json.ss('vendorId'),
      totalOrders: json.ii('totalOrders'),
      todayOrdersTotal: today?.ii('total') ?? 0,
      todayActive: today?.ii('active') ?? 0,
      revenueToday: revenue?.dd('today') ?? 0,
      revenueTotal: revenue?.dd('total') ?? 0,
      reviewsCount: reviews?.ii('count') ?? 0,
      reviewsRating: reviews?.dd('rating') ?? 0,
      walletBalance: json.dd('walletBalance'),
      lowStock: json.ii('lowStock'),
    );
  }
}
