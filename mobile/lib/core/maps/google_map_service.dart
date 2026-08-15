import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../config/google_maps_config.dart';
import '../utils/logger.dart';
import 'map_controller.dart';

/// Builds `GoogleMap` widgets consistently and renders the documented error
/// states so a map is never left blank without an explanation.
class GoogleMapService {
  GoogleMapService._();

  /// True when the current build can render a Google map.
  static bool get usable => GoogleMapsConfig.isConfigured && GoogleMapsConfig.supportedOnThisPlatform;

  static GoogleMap buildMap({
    required MapViewController view,
    required CameraPosition initialCamera,
    bool myLocationEnabled = true,
    void Function(LatLng)? onTap,
  }) {
    return GoogleMap(
      initialCameraPosition: initialCamera,
      markers: view.markers,
      polylines: view.polylines,
      myLocationEnabled: myLocationEnabled,
      myLocationButtonEnabled: myLocationEnabled,
      zoomControlsEnabled: true,
      onMapCreated: (controller) {
        view.attach(controller);
        Logger.info('GoogleMap created and attached to MapViewController.');
      },
      onTap: onTap,
    );
  }

  static CameraPosition cameraFor({
    required double latitude,
    required double longitude,
    double zoom = 15,
  }) =>
      CameraPosition(target: LatLng(latitude, longitude), zoom: zoom);

  static CameraPosition takoradiDefault() => CameraPosition(
        target: LatLng(ServiceAreaDefaults.centerLat, ServiceAreaDefaults.centerLng),
        zoom: 13,
      );
}

/// Friendly map error panel used when the map cannot be shown.
class MapUnavailableView extends StatelessWidget {
  const MapUnavailableView({
    super.key,
    required this.message,
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.map_outlined, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
