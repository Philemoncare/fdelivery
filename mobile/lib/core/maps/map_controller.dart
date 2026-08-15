import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../location/location_state.dart';
import '../utils/logger.dart';

/// Owns the live `GoogleMapController` plus the marker/polyline state shown on
/// a map. Pages rebuild only when this notifies (markers/polylines/camera),
/// avoiding full-map rebuilds on every GPS tick.
class MapViewController extends ChangeNotifier {
  GoogleMapController? _controller;
  final Set<Marker> _markers = <Marker>{};
  final Set<Polyline> _polylines = <Polyline>{};

  bool get attached => _controller != null;

  Set<Marker> get markers => _markers;
  Set<Polyline> get polylines => _polylines;

  /// Attach the platform controller once the GoogleMap widget reports ready.
  void attach(GoogleMapController controller) {
    _controller = controller;
    notifyListeners();
  }

  void detach() {
    _controller = null;
  }

  /// Moves a single marker without touching anything else.
  void upsertMarker(Marker marker) {
    _markers.remove(marker.markerId);
    _markers.add(marker);
    notifyListeners();
  }

  void removeMarker(String markerId) {
    final removed = _markers.remove(MarkerId(markerId));
    if (removed) notifyListeners();
  }

  void clearMarkers() {
    if (_markers.isEmpty) return;
    _markers.clear();
    notifyListeners();
  }

  void setRoute(List<LatLng> points) {
    if (points.isEmpty) {
      clearRoute();
      return;
    }
    final polyline = Polyline(
      polylineId: const PolylineId('route'),
      points: points,
      color: const Color(0xFF1A73E8),
      width: 4,
    );
    _polylines.removeWhere((p) => p.polylineId == polyline.polylineId);
    _polylines.add(polyline);
    notifyListeners();
  }

  void clearRoute() {
    if (_polylines.isEmpty) return;
    _polylines.clear();
    notifyListeners();
  }

  /// Animates the camera to fit every point on screen with padding.
  Future<void> fitPoints(Iterable<LocationPoint> points, {double padding = 100}) async {
    final valid = points.where((p) => p.hasValidCoords).toList();
    final controller = _controller;
    if (controller == null) return;
    if (valid.isEmpty) {
      await controller.animateCamera(CameraUpdate.newLatLngBounds(
        const LatLngBounds(southwest: LatLng(4.8, -1.85), northeast: LatLng(5.0, -1.65)),
        padding,
      ));
      return;
    }
    if (valid.length == 1) {
      await controller.animateCamera(CameraUpdate.newLatLngZoom(
        LatLng(valid.first.latitude, valid.first.longitude),
        15,
      ));
      return;
    }
    final bounds = _boundsFor(valid);
    await controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, padding));
  }

  LatLngBounds _boundsFor(List<LocationPoint> points) {
    var south = points.first.latitude, north = points.first.latitude;
    var west = points.first.longitude, east = points.first.longitude;
    for (final p in points) {
      if (p.latitude < south) south = p.latitude;
      if (p.latitude > north) north = p.latitude;
      if (p.longitude < west) west = p.longitude;
      if (p.longitude > east) east = p.longitude;
    }
    return LatLngBounds(
      southwest: LatLng(south, west),
      northeast: LatLng(north, east),
    );
  }

  Future<void> centerOn(LocationPoint point, {double zoom = 15}) async {
    final controller = _controller;
    if (controller == null || !point.hasValidCoords) return;
    await controller.animateCamera(CameraUpdate.newLatLngZoom(
      LatLng(point.latitude, point.longitude),
      zoom,
    ));
  }

  @override
  void dispose() {
    // The GoogleMap widget owns the platform controller lifecycle; we only
    // drop our reference.
    _controller = null;
    super.dispose();
  }
}
