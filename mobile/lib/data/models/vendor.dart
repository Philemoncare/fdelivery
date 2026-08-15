import 'json_helpers.dart';

class BusinessHour {
  const BusinessHour({
    this.day = '',
    this.isOpen = false,
    this.open = '',
    this.close = '',
  });

  final String day;
  final bool isOpen;
  final String open;
  final String close;

  factory BusinessHour.fromJson(Map<String, dynamic> json) => BusinessHour(
        day: json.ss('day'),
        isOpen: json.b('isOpen'),
        open: json.ss('open'),
        close: json.ss('close'),
      );
}

/// A restaurant (backend `db.vendors`). Public lists return `publicVendor`,
/// owner/admin calls return the full aggregate record.
class Vendor {
  const Vendor({
    required this.id,
    this.ownerId = '',
    this.name = '',
    this.slug = '',
    this.logo = '',
    this.banner = '',
    this.category = '',
    this.address = '',
    this.openHours = '',
    this.phone = '',
    this.email = '',
    this.status = '',
    this.joinedDate,
    this.verificationStatus = '',
    this.isApproved = false,
    this.isKitchenOpen = false,
    this.isOpen = false,
    this.description = '',
    this.about = '',
    this.minOrder = 0,
    this.averageDeliveryMinutes = 0,
    this.deliveryFee = 0,
    this.tags = const [],
    this.rating = 0,
    this.deliveryTime = '',
    this.distanceKm = 0,
    this.city = '',
    this.totalSales = 0,
    this.isFeatured = false,
    this.businessHours = const [],
    this.totalOrders = 0,
    this.activeOrders = 0,
    this.ratingCount = 0,
    this.latitude,
    this.longitude,
  });

  final String id;
  final String ownerId;
  final String name;
  final String slug;
  final String logo;
  final String banner;
  final String category;
  final String address;
  final String openHours;
  final String phone;
  final String email;
  final String status;
  final String? joinedDate;
  final String verificationStatus;
  final bool isApproved;
  final bool isKitchenOpen;
  final bool isOpen;
  final String description;
  final String about;
  final num minOrder;
  final num averageDeliveryMinutes;
  final num deliveryFee;
  final List<String> tags;
  final double rating;
  final String deliveryTime;
  final num distanceKm;
  final String city;
  final num totalSales;
  final bool isFeatured;
  final List<BusinessHour> businessHours;

  // Aggregate fields present on owner/admin responses (`vendorAggregate`).
  final int totalOrders;
  final int activeOrders;
  final int ratingCount;

  /// Restaurant coordinates. Present on the owner/admin record only - the
  /// public marketplace shape deliberately omits them. May still be null if
  /// the restaurant never set a location.
  final double? latitude;
  final double? longitude;

  bool get isActive => status == 'active';

  factory Vendor.fromJson(Map<String, dynamic> json) {
    return Vendor(
      id: json.ss('id'),
      ownerId: json.ss('ownerId'),
      name: json.ss('name'),
      slug: json.ss('slug'),
      logo: json.ss('logo'),
      banner: json.ss('banner'),
      category: json.ss('category'),
      address: json.ss('address'),
      openHours: json.ss('openHours'),
      phone: json.ss('phone'),
      email: json.ss('email'),
      status: json.ss('status'),
      joinedDate: json.s('joinedDate'),
      verificationStatus: json.ss('verificationStatus'),
      isApproved: json.b('isApproved'),
      isKitchenOpen: json.b('isKitchenOpen'),
      isOpen: json.b('isOpen'),
      description: json.ss('description'),
      about: json.ss('about'),
      minOrder: json.dd('minOrder'),
      averageDeliveryMinutes: json.dd('averageDeliveryMinutes'),
      deliveryFee: json.dd('deliveryFee'),
      tags: json.ll('tags').map((e) => e.toString()).toList(),
      rating: json.dd('rating'),
      deliveryTime: json.ss('deliveryTime'),
      distanceKm: json.dd('distanceKm'),
      city: json.ss('city'),
      totalSales: json.dd('totalSales'),
      isFeatured: json.b('isFeatured'),
      businessHours: json.ol('businessHours', BusinessHour.fromJson),
      totalOrders: json.ii('totalOrders'),
      activeOrders: json.ii('activeOrders'),
      ratingCount: json.ii('ratingCount'),
      latitude: json.d('latitude'),
      longitude: json.d('longitude'),
    );
  }
}
