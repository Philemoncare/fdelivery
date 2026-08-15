import 'dart:io' show Platform;

/// Google Maps Platform configuration.
///
/// SECURITY: the API key is NEVER stored in source. It is supplied at build /
/// run time through `--dart-define=OMNIMARKET_GOOGLE_MAPS_API_KEY=...`, and the
/// native Android key is injected through a manifest placeholder / iOS build
/// setting (see README "Google Maps setup"). The key must be restricted in the
/// Google Cloud Console (package name + SHA-1/SHA-256 for Android, bundle id
/// for iOS) with only the APIs this app actually uses.
class GoogleMapsConfig {
  GoogleMapsConfig._();

  static const String apiKey =
      String.fromEnvironment('OMNIMARKET_GOOGLE_MAPS_API_KEY');

  static bool get isConfigured => apiKey.isNotEmpty;

  /// Whether the current platform can render the Google map.
  static bool get supportedOnThisPlatform =>
      Platform.isAndroid || Platform.isIOS;

  /// Human-readable reason shown on the map error state when the key is
  /// missing, so the user is never left staring at a blank map.
  static String get missingKeyMessage =>
      'Google Maps is not configured for this build. '
      'Provide OMNIMARKET_GOOGLE_MAPS_API_KEY at build time with a restricted '
      'Google Maps API key.';
}

/// Map/route display options.
class MapStyleConfig {
  MapStyleConfig._();

  /// Marker colors by role.
  static const ColorHint restaurant = ColorHint(0xFFEA4335); // red
  static const ColorHint customer = ColorHint(0xFF4285F4); // blue
  static const ColorHint rider = ColorHint(0xFF34A853); // green
  static const ColorHint current = ColorHint(0xFF1A73E8); // location dot
}

/// Simple color holder so `maps` config does not depend on Flutter directly.
class ColorHint {
  const ColorHint(this.value);
  final int value;
}

/// Takoradi service-area default (center + radius).
///
/// Configurable per build with `--dart-define`:
///   OMNIMARKET_SERVICE_CENTER_LAT, OMNIMARKET_SERVICE_CENTER_LNG,
///   OMNIMARKET_SERVICE_RADIUS_KM
/// The backend/admin is the eventual source of truth for zones/fees; this
/// client-side config only powers the "outside service area" warning at
/// address selection - it never gates a backend operation.
class ServiceAreaDefaults {
  ServiceAreaDefaults._();

  static const double centerLat =
      double.fromEnvironment('OMNIMARKET_SERVICE_CENTER_LAT', defaultValue: 4.8920);

  static const double centerLng =
      double.fromEnvironment('OMNIMARKET_SERVICE_CENTER_LNG', defaultValue: -1.7580);

  static const double radiusKm =
      double.fromEnvironment('OMNIMARKET_SERVICE_RADIUS_KM', defaultValue: 30.0);

  static const String name = 'Takoradi & environs';
}

/// Small helpers for building Google REST API URLs without leaking the key.
class GoogleApiUrl {
  GoogleApiUrl._();

  static Uri geocodeUrl({
    required String apiKey,
    String? address,
    double? lat,
    double? lng,
  }) {
    final params = <String, String>{
      'key': apiKey,
    };
    if (address != null && address.isNotEmpty) {
      params['address'] = address;
    } else if (lat != null && lng != null) {
      params['latlng'] = '$lat,$lng';
    } else {
      throw ArgumentError('Provide either an address or lat/lng.');
    }
    return Uri.https('maps.googleapis.com', '/maps/api/geocode/json', params);
  }

  static Uri directionsUrl({
    required String apiKey,
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
    String mode = 'driving',
  }) {
    return Uri.https('maps.googleapis.com', '/maps/api/directions/json', {
      'key': apiKey,
      'origin': '$originLat,$originLng',
      'destination': '$destLat,$destLng',
      'mode': mode,
      'alternatives': 'false',
      'units': 'metric',
    });
  }
}

/// Decodes Google's encoded polyline (used by Directions API).
class PolylineDecoder {
  PolylineDecoder._();

  static List<({double lat, double lng})> decode(String encoded) {
    final points = <({double lat, double lng})>[];
    int index = 0, len = encoded.length;
    int lat = 0, lng = 0;

    while (index < len) {
      int b, shift = 0, result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add((lat: lat / 1e5, lng: lng / 1e5));
    }
    return points;
  }
}
