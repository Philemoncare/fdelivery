import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../data/models/rider.dart';
import '../location/location_state.dart';

/// Single place that builds map markers. Only the markers the current user is
/// authorized to see are ever created (the callers decide what to ask for).
class MapMarkerService {
  MapMarkerService._();

  static final Map<String, BitmapDescriptor> _iconCache = {};

  /// Rider marker. Uses the rider's REAL stored profile image when available
  /// (via Google's network BitmapDescriptor); otherwise the default pin is
  /// used - never a fake letter avatar that pretends to be a photo.
  static Future<Marker> rider({
    required String markerId,
    required LocationPoint position,
    required Rider rider,
  }) async {
    var icon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
    final avatar = rider.avatar;
    if (avatar.isNotEmpty) {
      if (!_iconCache.containsKey(avatar)) {
        try {
          _iconCache[avatar] = await BitmapDescriptor.fromNetworkImage(avatar);
        } catch (_) {
          _iconCache[avatar] = icon;
        }
      }
      icon = _iconCache[avatar]!;
    }
    return Marker(
      markerId: MarkerId(markerId),
      position: LatLng(position.latitude, position.longitude),
      icon: icon,
      infoWindow: InfoWindow(
        title: rider.name.isEmpty ? 'Rider' : rider.name,
        snippet: rider.vehicleType.isEmpty ? null : rider.vehicleType,
      ),
    );
  }

  static Marker restaurant({
    required String markerId,
    required LocationPoint position,
    required String name,
  }) {
    return Marker(
      markerId: MarkerId(markerId),
      position: LatLng(position.latitude, position.longitude),
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      infoWindow: InfoWindow(
        title: name.isEmpty ? 'Restaurant' : name,
        snippet: 'Pickup point',
      ),
    );
  }

  static Marker customer({
    required String markerId,
    required LocationPoint position,
    String? title,
  }) {
    return Marker(
      markerId: MarkerId(markerId),
      position: LatLng(position.latitude, position.longitude),
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
      infoWindow: InfoWindow(
        title: title ?? 'Your location',
        snippet: 'Delivery point',
      ),
    );
  }

  /// Blue dot for "my current location" on picker maps.
  static Marker current({
    required String markerId,
    required LocationPoint position,
  }) {
    return Marker(
      markerId: MarkerId(markerId),
      position: LatLng(position.latitude, position.longitude),
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      infoWindow: const InfoWindow(title: 'You are here'),
    );
  }

  static Polyline route({
    required List<LatLng> points,
    int colorValue = 0xFF1A73E8,
  }) {
    return Polyline(
      polylineId: const PolylineId('route'),
      points: points,
      color: Color(colorValue),
      width: 4,
    );
  }
}
