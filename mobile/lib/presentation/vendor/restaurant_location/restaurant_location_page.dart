import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../application/service_locator.dart';
import '../../../core/config/google_maps_config.dart';
import '../../../core/location/location_permission_service.dart';
import '../../../core/location/location_service.dart';
import '../../../core/location/location_state.dart';
import '../../../core/maps/google_map_service.dart';
import '../../../core/maps/map_controller.dart';
import '../../../core/maps/map_marker_service.dart';
import '../../../core/maps/map_route_service.dart';
import '../../../data/models/vendor.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_indicator.dart';

/// Vendor restaurant-location management.
///
/// Reads the REAL saved coordinates from `GET /api/vendors/:id` (owner/admin
/// record) and persists changes with `PATCH /api/vendors/:id { latitude,
/// longitude, address }`. No location is hardcoded.
class VendorRestaurantLocationPage extends StatefulWidget {
  const VendorRestaurantLocationPage({super.key, required this.vendorId});

  final String vendorId;

  @override
  State<VendorRestaurantLocationPage> createState() =>
      _VendorRestaurantLocationPageState();
}

class _VendorRestaurantLocationPageState extends State<VendorRestaurantLocationPage> {
  final MapViewController _mapView = MapViewController();
  final MapRouteService _routes = MapRouteService();
  final LocationService _location = LocationService();

  Vendor? _vendor;
  String? _error;
  LocationPoint? _selected;
  String? _addressLabel;
  bool _saving = false;
  bool _gettingLocation = false;

  @override
  void initState() {
    super.initState();
    _mapView.addListener(_onMapChanged);
    _load();
  }

  void _onMapChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final vendor = await ServiceLocator.instance.catalogRepository.vendor(widget.vendorId);
      if (!mounted) return;
      setState(() {
        _vendor = vendor;
        if (vendor.latitude != null && vendor.longitude != null) {
          _selected = LocationPoint(latitude: vendor.latitude!, longitude: vendor.longitude!);
          _addressLabel = vendor.address.isNotEmpty ? vendor.address : null;
        }
      });
      _syncMarker();
      _fitCamera();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  void _syncMarker() {
    final point = _selected;
    if (point == null) {
      _mapView.clearMarkers();
      return;
    }
    _mapView.upsertMarker(MapMarkerService.restaurant(
      markerId: 'restaurant',
      position: point,
      name: _vendor?.name ?? 'Restaurant',
    ));
  }

  void _fitCamera() {
    final point = _selected;
    if (point == null) return;
    _mapView.centerOn(point);
  }

  Future<void> _useCurrentLocation() async {
    final permission = await LocationPermissionService.check();
    if (permission != LocationPermissionStatus.granted) {
      final requested = await LocationPermissionService.request();
      if (requested != LocationPermissionStatus.granted) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Location permission is needed to use your current position.'),
            action: SnackBarAction(label: 'Settings', onPressed: () => LocationPermissionService.openSettings()),
          ),
        );
        return;
      }
    }

    setState(() => _gettingLocation = true);
    final result = await _location.currentPosition();
    if (!mounted) return;
    setState(() => _gettingLocation = false);

    if (!result.ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.error ?? 'Unable to determine location.')),
      );
      return;
    }

    final point = result.point!;
    if (!LocationService.withinServiceArea(point)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This location is outside the configured service area.')),
      );
      return;
    }

    setState(() {
      _selected = point;
      _addressLabel = null;
    });
    _syncMarker();
    _fitCamera();
    _reverseGeocode(point);
  }

  Future<void> _reverseGeocode(LocationPoint point) async {
    final label = await _routes.reverseGeocode(point);
    if (!mounted) return;
    setState(() => _addressLabel = label);
  }

  Future<void> _save() async {
    final point = _selected;
    if (point == null || _saving) return;
    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        'latitude': point.latitude,
        'longitude': point.longitude,
        if (_addressLabel != null && _addressLabel!.isNotEmpty)
          'address': _addressLabel,
      };
      final updated = await ServiceLocator.instance.catalogRepository.updateVendor(widget.vendorId, payload);
      if (!mounted) return;
      setState(() {
        _vendor = updated;
        _saving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Restaurant location saved.')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _onMapTap(LatLng latLng) {
    final point = LocationPoint(latitude: latLng.latitude, longitude: latLng.longitude);
    if (!LocationService.withinServiceArea(point)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That point is outside the configured service area.')),
      );
      return;
    }
    setState(() {
      _selected = point;
      _addressLabel = null;
    });
    _syncMarker();
    _reverseGeocode(point);
  }

  @override
  void dispose() {
    _mapView.removeListener(_onMapChanged);
    _mapView.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Restaurant Location')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_vendor == null) return const LoadingIndicator(message: 'Loading restaurant…');

    return Column(
      children: [
        if (!GoogleMapService.usable)
          Expanded(
            child: MapUnavailableView(message: GoogleMapsConfig.missingKeyMessage),
          )
        else
          Expanded(
            child: GoogleMapService.buildMap(
              view: _mapView,
              initialCamera: GoogleMapService.takoradiDefault(),
              myLocationEnabled: false,
              onTap: _onMapTap,
            ),
          ),
        _ControlPanel(
          saving: _saving,
          gettingLocation: _gettingLocation,
          addressLabel: _addressLabel,
          hasSelection: _selected != null,
          onUseCurrent: _useCurrentLocation,
          onSave: _save,
        ),
      ],
    );
  }
}

class _ControlPanel extends StatelessWidget {
  const _ControlPanel({
    required this.saving,
    required this.gettingLocation,
    required this.addressLabel,
    required this.hasSelection,
    required this.onUseCurrent,
    required this.onSave,
  });

  final bool saving;
  final bool gettingLocation;
  final String? addressLabel;
  final bool hasSelection;
  final Future<void> Function() onUseCurrent;
  final Future<void> Function() onSave;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              addressLabel ?? (hasSelection ? 'Address label pending…' : 'No location set yet.'),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: gettingLocation || saving ? null : onUseCurrent,
                    icon: const Icon(Icons.my_location),
                    label: Text(gettingLocation ? 'Locating…' : 'Use current location'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: !hasSelection || gettingLocation || saving ? null : onSave,
                    icon: const Icon(Icons.save),
                    label: Text(saving ? 'Saving…' : 'Save location'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Tip: tap the map to set the restaurant position.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
