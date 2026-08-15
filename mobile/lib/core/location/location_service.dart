import 'dart:async';

import 'package:geolocator/geolocator.dart';

import '../../utils/logger.dart';
import '../config/google_maps_config.dart';
import 'location_permission_service.dart';
import 'location_state.dart';

/// Result of a single position resolution.
class LocationResolution {
  const LocationResolution({this.point, this.error});

  final LocationPoint? point;
  final String? error;

  bool get ok => point != null && point!.hasValidCoords;
}

/// Device GPS access. Produces REAL device readings only - there is no code
/// path that fabricates coordinates.
class LocationService {
  LocationService({double distanceFilterMeters = 10})
      : _distanceFilterMeters = distanceFilterMeters;

  final double _distanceFilterMeters;

  /// Resolves the current position once. Callers must have permission already.
  /// On failure returns an honest [LocationResolution.error] instead of a fake
  /// point.
  Future<LocationResolution> currentPosition() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 15),
        ),
      );
      if (position == null) {
        return const LocationResolution(
          error: 'The device could not determine your location.',
        );
      }
      return LocationResolution(point: _fromPosition(position));
    } on TimeoutException {
      return const LocationResolution(
        error: 'Location request timed out. Check your device GPS.',
      );
    } on PermissionDeniedException {
      return const LocationResolution(
        error: 'Location permission was denied.',
      );
    } on LocationServiceDisabledException {
      return const LocationResolution(
        error: 'Location services are turned off for this device.',
      );
    } catch (e) {
      Logger.warning('currentPosition failed: $e');
      return const LocationResolution(
        error: 'Unable to determine location right now.',
      );
    }
  }

  /// Continuous GPS stream, throttled by the configured distance + time. The
  /// caller (RiderLocationController) decides whether updates are forwarded to
  /// the backend based on the rider's delivery state.
  Stream<LocationPoint> positionStream() {
    return Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: _distanceFilterMeters,
      ),
    ).map(_fromPosition).where((p) => p.hasValidCoords);
  }

  LocationPoint _fromPosition(Position p) => LocationPoint(
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy.isFinite && p.accuracy >= 0 ? p.accuracy : null,
        heading: p.heading.isFinite && p.heading >= 0 ? p.heading : null,
        speed: p.speed.isFinite && p.speed >= 0 ? p.speed : null,
        timestamp: p.timestamp,
      );

  /// Whether [point] is inside the configured service area. Used to warn the
  /// user at address selection; the backend remains authoritative for fees.
  static bool withinServiceArea(LocationPoint point) {
    final distance =
        haversineKm(ServiceAreaDefaults.centerLat, ServiceAreaDefaults.centerLng,
            point.latitude, point.longitude);
    return distance <= ServiceAreaDefaults.radiusKm;
  }

  /// Real distance (km) between two points, or null when coordinates are
  /// invalid. Never returns an invented figure.
  static double? distanceKmBetween(LocationPoint a, LocationPoint b) {
    if (!a.hasValidCoords || !b.hasValidCoords) return null;
    return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  }
}
