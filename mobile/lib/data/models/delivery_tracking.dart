import '../core/location/location_state.dart';
import '../core/maps/delivery_stage.dart';
import 'order.dart';

/// Real-time snapshot shown on a customer's delivery tracking screen.
///
/// Every field is derived from REAL backend data:
///  - [order]  : the authoritative order (fetched or from `order_update` SSE)
///  - [riderPoint] : the latest `rider_location` SSE event (only sent while the
///    order is picked_up / in_transit / arriving)
///  - [vendorPoint]/[customerPoint]: coordinates stored on the order, if any
///
/// Nothing here is fabricated. When a value is missing, callers show an
/// honest unavailable state.
class DeliveryTracking {
  const DeliveryTracking({
    required this.order,
    this.riderPoint,
    this.stage = DeliveryStage.unknown,
    this.lastLocationUpdateAt,
    this.connectionMessage,
  });

  final Order order;
  final LocationPoint? riderPoint;
  final DeliveryStage stage;
  final DateTime? lastLocationUpdateAt;
  final String? connectionMessage;

  DeliveryStage get _derivedStage => DeliveryStage.fromOrderStatus(order.status);

  /// The stage to display, preferring the realtime-updated stage.
  DeliveryStage get effectiveStage =>
      stage == DeliveryStage.unknown ? _derivedStage : stage;

  LocationPoint? get vendorPoint {
    final lat = order.vendorLat;
    final lng = order.vendorLng;
    if (lat == null || lng == null) return null;
    return LocationPoint(latitude: lat, longitude: lng);
  }

  LocationPoint? get customerPoint {
    final lat = order.customerLat;
    final lng = order.customerLng;
    if (lat == null || lng == null) return null;
    return LocationPoint(latitude: lat, longitude: lng);
  }

  bool get isTerminal => DeliveryStage.isTerminal(order.status);
  bool get isLive => effectiveStage.isLive;

  DeliveryTracking copyWith({
    Order? order,
    LocationPoint? riderPoint,
    DeliveryStage? stage,
    DateTime? lastLocationUpdateAt,
    String? connectionMessage,
  }) {
    return DeliveryTracking(
      order: order ?? this.order,
      riderPoint: riderPoint ?? this.riderPoint,
      stage: stage ?? this.stage,
      lastLocationUpdateAt: lastLocationUpdateAt ?? this.lastLocationUpdateAt,
      connectionMessage: connectionMessage ?? this.connectionMessage,
    );
  }
}
