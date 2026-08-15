import '../location/location_service.dart';
import '../location/location_state.dart';
import '../utils/logger.dart';
import 'google_maps_api_client.dart';

/// Formats a real route duration/distance from [RouteResult] into the strings
/// the UI shows. If the route has no real data, these return the documented
/// "unavailable" values instead of inventing a number.
class RouteFormatter {
  RouteFormatter._();

  static String eta(RouteResult route) {
    final seconds = route.durationSeconds;
    if (seconds == null || seconds <= 0) return 'ETA unavailable';
    final minutes = (seconds / 60).round();
    if (minutes < 1) return 'Arriving now';
    if (minutes < 60) return '$minutes min';
    final hours = minutes ~/ 60;
    final rem = minutes % 60;
    return rem == 0 ? '$hours hr' : '$hours hr $rem min';
  }

  static String distance(RouteResult route) {
    final meters = route.distanceMeters;
    if (meters == null || meters <= 0) return 'Distance unavailable';
    if (meters < 1000) return '$meters m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }
}

/// Convenience wrapper around the Directions/Geocoding API used by maps.
class MapRouteService {
  MapRouteService({GoogleMapsApiClient? api}) : _api = api ?? GoogleMapsApiClient();

  final GoogleMapsApiClient _api;

  Future<RouteResult> between({
    required LocationPoint origin,
    required LocationPoint destination,
  }) {
    if (!origin.hasValidCoords || !destination.hasValidCoords) {
      return Future.value(
          RouteResult.unavailable('Invalid coordinates - route unavailable.'));
    }
    return _api.directions(
      originLat: origin.latitude,
      originLng: origin.longitude,
      destLat: destination.latitude,
      destLng: destination.longitude,
    );
  }

  Future<RouteResult> riderToRestaurant({
    required LocationPoint rider,
    required LocationPoint restaurant,
  }) =>
      between(origin: rider, destination: restaurant);

  Future<RouteResult> riderToCustomer({
    required LocationPoint rider,
    required LocationPoint customer,
  }) =>
      between(origin: rider, destination: customer);

  Future<String?> reverseGeocode(LocationPoint point) {
    if (!point.hasValidCoords) return Future.value(null);
    return _api.reverseGeocode(point.latitude, point.longitude);
  }

  Future<({double lat, double lng})?> geocode(String address) =>
      _api.geocode(address);

  /// Calculates straight-line distance from real coordinates for cases where
  /// routing data is unavailable. Returns null instead of fabricating.
  static double? straightLineKm(LocationPoint a, LocationPoint b) =>
      LocationService.distanceKmBetween(a, b);

  /// Best-effort human-readable address label for a point.
  Future<String> describe(LocationPoint point) async {
    if (!point.hasValidCoords) return 'Location unavailable';
    try {
      final label = await _api.reverseGeocode(point.latitude, point.longitude);
      if (label != null && label.isNotEmpty) return label;
    } catch (e) {
      Logger.warning('describe failed: $e');
    }
    return '${point.latitude.toStringAsFixed(5)}, ${point.longitude.toStringAsFixed(5)}';
  }
}
