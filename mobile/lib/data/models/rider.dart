import 'json_helpers.dart';

/// A delivery rider (backend `db.riders`). Auth'd callers get the full
/// record; guests get `publicRider` (no phone/license/GPS/earnings).
class Rider {
  const Rider({
    required this.id,
    this.userId = '',
    this.name = '',
    this.avatar = '',
    this.vehicleType = '',
    this.vehicleNumber = '',
    this.phone = '',
    this.phoneSecondary = '',
    this.about = '',
    this.deliveryFee = 0,
    this.status = '',
    this.verificationStatus = '',
    this.isVerified = false,
    this.isOnline = false,
    this.isAvailable = false,
    this.rating = 0,
    this.totalDeliveries = 0,
    this.totalEarnings = 0,
    this.bannerUrl = '',
    this.currentLat,
    this.currentLng,
    this.accuracy,
    this.heading,
    this.speed,
    this.lastUpdate,
  });

  final String id;
  final String userId;
  final String name;
  final String avatar;
  final String vehicleType;
  final String vehicleNumber;
  final String phone;
  final String phoneSecondary;
  final String about;
  final num deliveryFee;
  final String status;
  final String verificationStatus;
  final bool isVerified;
  final bool isOnline;
  final bool isAvailable;
  final double rating;
  final int totalDeliveries;
  final num totalEarnings;
  final String bannerUrl;

  /// Live location last reported by the rider via `POST /api/riders/:id/location`.
  final double? currentLat;
  final double? currentLng;
  final double? accuracy;
  final double? heading;
  final double? speed;
  final String? lastUpdate;

  /// A valid coordinate pair, or null when the backend has no fix.
  ({double lat, double lng})? get location {
    final lat = currentLat;
    final lng = currentLng;
    if (lat == null || lng == null) return null;
    if (!lat.isFinite || !lng.isFinite) return null;
    return (lat: lat, lng: lng);
  }

  bool get isActive => isOnline && isAvailable;

  factory Rider.fromJson(Map<String, dynamic> json) => Rider(
        id: json.ss('id'),
        userId: json.ss('userId'),
        name: json.ss('name'),
        avatar: json.ss('avatar'),
        vehicleType: json.ss('vehicleType'),
        vehicleNumber: json.ss('vehicleNumber'),
        phone: json.ss('phone'),
        phoneSecondary: json.ss('phoneSecondary'),
        about: json.ss('about'),
        deliveryFee: json.dd('deliveryFee'),
        status: json.ss('status'),
        verificationStatus: json.ss('verificationStatus'),
        isVerified: json.b('isVerified'),
        isOnline: json.b('isOnline'),
        isAvailable: json.b('isAvailable'),
        rating: json.dd('rating'),
        totalDeliveries: json.ii('totalDeliveries'),
        totalEarnings: json.dd('totalEarnings'),
        bannerUrl: json.ss('bannerUrl'),
        currentLat: json.d('currentLat'),
        currentLng: json.d('currentLng'),
        accuracy: json.d('accuracy'),
        heading: json.d('heading'),
        speed: json.d('speed'),
        lastUpdate: json.s('lastUpdate'),
      );
}
