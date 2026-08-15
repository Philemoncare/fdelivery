import 'dart:math' as math;

import '../../data/models/rider.dart';

/// A single device GPS reading. Backend rider-location payloads use the same
/// field names (`latitude`, `longitude`, `accuracy`, `heading`, `speed`,
/// `timestamp`), so this maps 1:1 to `POST /api/riders/:id/location`.
class LocationPoint {
  const LocationPoint({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.heading,
    this.speed,
    this.timestamp,
  });

  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? heading;
  final double? speed;
  final DateTime? timestamp;

  bool get hasValidCoords =>
      latitude.isFinite && longitude.isFinite && latitude.abs() <= 90 && longitude.abs() <= 180;

  Map<String, dynamic> toBackendPayload({String? riderId, String? deliveryId}) => {
        if (riderId != null) 'riderId': riderId,
        if (deliveryId != null) 'deliveryId': deliveryId,
        'latitude': latitude,
        'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        if (heading != null) 'heading': heading,
        if (speed != null) 'speed': speed,
        'timestamp':
            (timestamp ?? DateTime.now()).toUtc().toIso8601String(),
      };
}

/// Rider availability as the platform understands it.
///
/// The backend only persists ONLINE/OFFLINE (`PATCH /api/riders/:id/status`).
/// ON_DELIVERY is a derived state: the rider is ONLINE/Available AND has an
/// active order (status in picked_up / in_transit / arriving). PAUSED maps to
/// the backend's OFFLINE state. Nothing here is invented beyond what the
/// backend actually stores.
enum RiderAvailabilityState { offline, available, onDelivery, unknown }

/// Active delivery order statuses where the rider is actively carrying an
/// order (this is the ONLY window in which the backend broadcasts the rider's
/// live location to the customer).
const Set<String> kRiderOnDeliveryStatuses = {
  'picked_up',
  'in_transit',
  'arriving',
};

class RiderState {
  const RiderState({
    required this.availability,
    required this.hasActiveDelivery,
  });

  final RiderAvailabilityState availability;
  final bool hasActiveDelivery;

  static RiderState fromBackend({
    required Rider rider,
    bool hasActiveDelivery = false,
  }) {
    final isOnline = rider.isOnline || rider.status == 'ONLINE';
    final isAvailable = rider.isAvailable || rider.status == 'AVAILABLE';
    final availability = !isOnline && !isAvailable
        ? RiderAvailabilityState.offline
        : hasActiveDelivery
            ? RiderAvailabilityState.onDelivery
            : RiderAvailabilityState.available;
    return RiderState(
      availability: availability,
      hasActiveDelivery: hasActiveDelivery,
    );
  }

  bool get shouldPublishLocation => hasActiveDelivery;
}

/// Haversine distance in kilometres between two coordinate pairs.
double haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const earthRadiusKm = 6371.0;
  const rad = math.pi / 180.0;
  final dLat = (lat2 - lat1) * rad;
  final dLng = (lng2 - lng1) * rad;
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(lat1 * rad) *
          math.cos(lat2 * rad) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return earthRadiusKm * c;
}
