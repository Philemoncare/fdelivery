import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../application/delivery_tracker.dart';
import '../../../application/service_locator.dart';
import '../../../core/config/google_maps_config.dart';
import '../../../core/location/location_state.dart';
import '../../../core/maps/google_map_service.dart';
import '../../../core/maps/map_controller.dart';
import '../../../core/maps/map_marker_service.dart';
import '../../../core/maps/map_route_service.dart';
import '../../../core/utils/logger.dart';
import '../../../data/models/delivery_tracking.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_indicator.dart';

/// Customer live delivery tracking.
///
/// Only reachable with a REAL order the customer owns. The backend authorizes
/// `GET /api/orders/:id` (403 otherwise), and the SSE channel only sends
/// `rider_location` for this order while it is picked_up/in_transit/arriving.
class DeliveryTrackingPage extends StatefulWidget {
  const DeliveryTrackingPage({super.key, required this.orderId});

  final String orderId;

  @override
  State<DeliveryTrackingPage> createState() => _DeliveryTrackingPageState();
}

class _DeliveryTrackingPageState extends State<DeliveryTrackingPage> {
  late final DeliveryTracker _tracker;
  final MapViewController _mapView = MapViewController();

  MapRouteService? _routes;
  RouteResult? _route;
  Timer? _routeDebounce;
  String _lastRouteKey = '';
  bool _fittedCamera = false;

  @override
  void initState() {
    super.initState();
    _mapView.addListener(_onMapChanged);
    _tracker = ServiceLocator.instance.createDeliveryTracker();
    _routes = MapRouteService();
    _tracker.addListener(_onTrackerChanged);
    _tracker.start(
      orderId: widget.orderId,
      realtimeStream: ServiceLocator.instance.app.realtimeEvents,
    );
  }

  void _onMapChanged() {
    if (mounted) setState(() {});
  }

  void _onTrackerChanged() {
    if (!mounted) return;
    setState(() {});
    _syncMarkers();
    _maybeFetchRoute();
    _maybeFitCamera();
  }

  void _syncMarkers() {
    final t = _tracker.tracking;
    if (t == null) return;
    final view = _mapView;

    final vendor = t.vendorPoint;
    if (vendor != null) {
      view.upsertMarker(MapMarkerService.restaurant(
        markerId: 'vendor',
        position: vendor,
        name: t.order.vendorName,
      ));
    } else {
      view.removeMarker('vendor');
    }

    final customer = t.customerPoint;
    if (customer != null) {
      view.upsertMarker(MapMarkerService.customer(
        markerId: 'customer',
        position: customer,
      ));
    } else {
      view.removeMarker('customer');
    }

    final riderPoint = t.riderPoint;
    final rider = t.order.dispatchRider;
    if (riderPoint != null) {
      final localRider = rider;
      if (localRider != null) {
        MapMarkerService.rider(
          markerId: 'rider',
          position: riderPoint,
          rider: localRider,
        ).then((marker) {
          if (mounted) _mapView.upsertMarker(marker);
        });
      } else {
        view.upsertMarker(MapMarkerService.current(markerId: 'rider', position: riderPoint));
      }
    } else {
      view.removeMarker('rider');
    }
  }

  void _maybeFetchRoute() {
    final t = _tracker.tracking;
    final riderPoint = t?.riderPoint;
    final customer = t?.customerPoint;
    final live = t?.isLive ?? false;
    if (riderPoint == null || customer == null || !live) {
      if (_route != null) {
        setState(() => _route = null);
      }
      return;
    }

    final key = '${riderPoint.latitude},${riderPoint.longitude}->${customer.latitude},${customer.longitude}';
    if (key == _lastRouteKey) return;
    _lastRouteKey = key;

    // Recompute route at most every 30s and only when the rider moved a
    // meaningful distance - never on every GPS tick.
    _routeDebounce?.cancel();
    _routeDebounce = Timer(const Duration(seconds: 3), () async {
      final route = await _routes!.between(origin: riderPoint, destination: customer);
      if (!mounted) return;
      setState(() => _route = route);
      if (route.ok) {
        _mapView.setRoute(
          route.points
              .map((p) => LatLng(p.lat, p.lng))
              .toList(),
        );
      } else {
        _mapView.clearRoute();
        Logger.info('Route unavailable: ${route.error}');
      }
    });
  }

  void _maybeFitCamera() {
    final t = _tracker.tracking;
    if (t == null || _fittedCamera) return;
    final points = <LocationPoint>[
      if (t.vendorPoint != null) t.vendorPoint!,
      if (t.customerPoint != null) t.customerPoint!,
      if (t.riderPoint != null) t.riderPoint!,
    ];
    if (points.isEmpty) return;
    _fittedCamera = true;
    _mapView.fitPoints(points);
  }

  @override
  void dispose() {
    _mapView.removeListener(_onMapChanged);
    _tracker.removeListener(_onTrackerChanged);
    _tracker.stop();
    _mapView.dispose();
    _routeDebounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tracker = _tracker;
    return Scaffold(
      appBar: AppBar(title: const Text('Track Delivery')),
      body: switch (tracker.state) {
        DeliveryLoadState.loading =>
          const LoadingIndicator(message: 'Loading delivery…'),
        DeliveryLoadState.error => ErrorView(
            message: tracker.error ?? 'Unable to load delivery.',
            onRetry: () => _tracker.refreshOrder(),
          ),
        DeliveryLoadState.loaded => _buildTracking(tracker),
      },
    );
  }

  Widget _buildTracking(DeliveryTracker tracker) {
    final t = tracker.tracking;
    if (t == null) return const LoadingIndicator(message: 'Loading delivery…');
    final stage = t.effectiveStage;

    if (t.isTerminal) {
      return _TerminalView(tracking: t);
    }

    if (!GoogleMapService.usable) {
      return MapUnavailableView(
        message: GoogleMapsConfig.missingKeyMessage,
        onRetry: () => _tracker.refreshOrder(),
      );
    }

    return Stack(
      children: [
        Positioned.fill(
          child: GoogleMapService.buildMap(
            view: _mapView,
            initialCamera: GoogleMapService.takoradiDefault(),
            myLocationEnabled: false,
          ),
        ),
        if (tracker.realtimeStale)
          const Positioned(
            top: 8,
            left: 12,
            right: 12,
            child: _StatusBanner(
              icon: Icons.wifi_off,
              message: 'Live connection interrupted. Reconnecting…',
              color: Colors.orange,
            ),
          ),
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: _DeliveryCard(
            tracking: t,
            route: _route,
          ),
        ),
      ],
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({
    required this.icon,
    required this.message,
    required this.color,
  });

  final IconData icon;
  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({required this.tracking, required this.route});

  final DeliveryTracking tracking;
  final RouteResult? route;

  @override
  Widget build(BuildContext context) {
    final order = tracking.order;
    final stage = tracking.effectiveStage;
    final riderPoint = tracking.riderPoint;
    final rider = order.dispatchRider;

    final eta = riderPoint != null && route != null
        ? RouteFormatter.eta(route)
        : 'ETA unavailable';
    final distance = riderPoint != null && route != null
        ? RouteFormatter.distance(route)
        : 'Distance unavailable';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Order ${order.orderNumber}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (stage.isLive)
                  const Chip(label: Text('LIVE'), backgroundColor: Colors.green),
              ],
            ),
            const SizedBox(height: 8),
            Text(stage.description, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 12),
            _InfoRow(label: 'ETA', value: eta),
            _InfoRow(label: 'Distance', value: distance),
            if (rider != null && rider.name.isNotEmpty) ...[
              const SizedBox(height: 4),
              _InfoRow(
                label: 'Rider',
                value: rider.vehicleType.isNotEmpty
                    ? '${rider.name} • ${rider.vehicleType}'
                    : rider.name,
              ),
            ],
            if (rider != null && rider.avatar.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  CircleAvatar(radius: 20, backgroundImage: NetworkImage(rider.avatar)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(rider.name, style: Theme.of(context).textTheme.bodyMedium)),
                ],
              ),
            ],
            if (riderPoint == null && stage.isLive) ...[
              const SizedBox(height: 8),
              const Text(
                'Waiting for rider location…',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label, style: const TextStyle(color: Colors.grey)),
          ),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

class _TerminalView extends StatelessWidget {
  const _TerminalView({required this.tracking});

  final DeliveryTracking tracking;

  @override
  Widget build(BuildContext context) {
    final order = tracking.order;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 56),
            const SizedBox(height: 12),
            Text('Order ${order.orderNumber}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Text(
              'Delivery completed. Live tracking has stopped.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
