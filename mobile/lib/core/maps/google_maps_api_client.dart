import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/google_maps_config.dart';
import '../utils/logger.dart';

/// Thrown when a Google Maps Platform REST call fails. The message is always
/// user-facing and honest - never a fabricated value.
class GoogleMapsApiException implements Exception {
  const GoogleMapsApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// A decoded route from the Directions API.
class RouteResult {
  const RouteResult({
    this.points = const [],
    this.distanceMeters,
    this.durationSeconds,
    this.error,
  });

  final List<({double lat, double lng})> points;
  final int? distanceMeters;
  final int? durationSeconds;
  final String? error;

  bool get ok => points.isNotEmpty && error == null;

  static RouteResult unavailable([String reason = 'Route unavailable']) =>
      RouteResult(error: reason);
}

/// Low-level HTTP client for the Google Maps Platform REST APIs (Geocoding +
/// Directions).
///
/// The API key comes from `--dart-define=OMNIMARKET_GOOGLE_MAPS_API_KEY`.
/// The key is NEVER written to logs - request logging is disabled for these
/// calls, and the key only ever travels inside an HTTPS query parameter to
/// Google.
class GoogleMapsApiClient {
  GoogleMapsApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  final http.Client _http;

  static const _timeout = Duration(seconds: 15);

  bool get _configured => GoogleMapsConfig.isConfigured;

  Future<Map<String, dynamic>> _getJson(Uri url) async {
    if (!_configured) {
      throw const GoogleMapsApiException(GoogleMapsConfig.missingKeyMessage);
    }
    try {
      final response =
          await _http.get(url, headers: {'Accept': 'application/json'}).timeout(_timeout);
      if (response.statusCode != 200) {
        throw GoogleMapsApiException(
            'Google Maps service error (${response.statusCode}).');
      }
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is! Map<String, dynamic>) {
        throw const GoogleMapsApiException('Unexpected Google Maps response.');
      }
      final status = decoded['status'] as String? ?? 'OK';
      if (status != 'OK' && status != 'ZERO_RESULTS') {
        final msg = decoded['error_message'] as String? ?? status;
        throw GoogleMapsApiException(
            'Maps error: ${msg.isEmpty ? 'no result' : msg}');
      }
      return decoded;
    } on TimeoutException {
      throw const GoogleMapsApiException('Maps request timed out.');
    } on SocketException {
      throw const GoogleMapsApiException('No connection to Maps services.');
    } on http.ClientException {
      throw const GoogleMapsApiException('Maps request failed.');
    } on FormatException {
      throw const GoogleMapsApiException('Unexpected Maps response.');
    }
  }

  /// Reverse-geocodes a coordinate to a human-readable address, or null when
  /// Google returns no result.
  Future<String?> reverseGeocode(double lat, double lng) async {
    try {
      final data = await _getJson(
          GoogleApiUrl.geocodeUrl(apiKey: GoogleMapsConfig.apiKey, lat: lat, lng: lng));
      final results = data['results'] as List<dynamic>? ?? const [];
      if (results.isEmpty) return null;
      final first = results.first;
      if (first is Map<String, dynamic>) return first['formatted_address'] as String?;
      return null;
    } on GoogleMapsApiException catch (e) {
      Logger.warning('reverseGeocode failed: ${e.message}');
      return null;
    }
  }

  /// Forward-geocodes an address string to coordinates, or null on failure.
  Future<({double lat, double lng})?> geocode(String address) async {
    try {
      final data = await _getJson(
          GoogleApiUrl.geocodeUrl(apiKey: GoogleMapsConfig.apiKey, address: address));
      final results = data['results'] as List<dynamic>? ?? const [];
      if (results.isEmpty) return null;
      final first = results.first;
      if (first is Map<String, dynamic>) {
        final geometry = first['geometry'];
        if (geometry is Map<String, dynamic>) {
          final location = geometry['location'];
          if (location is Map<String, dynamic>) {
            final lat = location['lat'];
            final lng = location['lng'];
            if (lat is num && lng is num) {
              return (lat: lat.toDouble(), lng: lng.toDouble());
            }
          }
        }
      }
      return null;
    } on GoogleMapsApiException catch (e) {
      Logger.warning('geocode failed: ${e.message}');
      return null;
    }
  }

  /// Requests a driving route. Returns real distance/duration from Google, or
  /// [RouteResult.unavailable] - never a guessed ETA.
  Future<RouteResult> directions({
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
  }) async {
    try {
      final data = await _getJson(GoogleApiUrl.directionsUrl(
        apiKey: GoogleMapsConfig.apiKey,
        originLat: originLat,
        originLng: originLng,
        destLat: destLat,
        destLng: destLng,
      ));
      final routes = data['routes'] as List<dynamic>? ?? const [];
      if (routes.isEmpty) return RouteResult.unavailable('No route found.');
      final route = routes.first;
      if (route is! Map<String, dynamic>) return RouteResult.unavailable('No route found.');

      final overviewPolyline = route['overview_polyline'];
      final encoded = overviewPolyline is Map<String, dynamic>
          ? (overviewPolyline['points'] as String? ?? '')
          : '';

      var distanceMeters = 0;
      var durationSeconds = 0;
      final legs = route['legs'] as List<dynamic>? ?? const [];
      for (final leg in legs) {
        if (leg is! Map<String, dynamic>) continue;
        final d = leg['distance'];
        final t = leg['duration'];
        if (d is Map<String, dynamic>) distanceMeters += (d['value'] as num?)?.toInt() ?? 0;
        if (t is Map<String, dynamic>) durationSeconds += (t['value'] as num?)?.toInt() ?? 0;
      }

      final points = PolylineDecoder.decode(encoded);
      if (points.isEmpty) return RouteResult.unavailable('No route found.');
      return RouteResult(
        points: points,
        distanceMeters: distanceMeters > 0 ? distanceMeters : null,
        durationSeconds: durationSeconds > 0 ? durationSeconds : null,
      );
    } on GoogleMapsApiException catch (e) {
      return RouteResult.unavailable(e.message);
    }
  }
}
