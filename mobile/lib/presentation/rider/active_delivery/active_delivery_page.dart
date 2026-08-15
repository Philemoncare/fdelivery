import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../application/rider_location_controller.dart';
import '../../../application/service_locator.dart';
import '../../../core/config/google_maps_config.dart';
import '../../../core/location/location_state.dart';
import '../../../core/maps/delivery_stage.dart';
import '../../../core/maps/google_map_service.dart';
import '../../../core/maps/map_controller.dart';
import '../../../core/maps/map_marker_service.dart';
import '../../../core/maps/map_route_service.dart';
import '../../../core/utils/logger.dart';
import '../../../data/models/order.dart';
import '../../../data/models/rider.dart';

/// Rider live-delivery screen: device GPS -> backend -> authorized customer.
///
/// Every state transition here goes through `PATCH /api/orders/:id/status` on
/// the backend - the UI can never declare an order delivered by itself.
class RiderActiveDeliveryPage extends StatefulWidget {
  const RiderActiveDeliveryPage({
    super.key,
    required this.order,
    required this.rider,
  });

  final Order order;
  final Rider rider;

  @override
  State<RiderActiveDeliveryPage> createState() => _RiderActiveDeliveryPageState();
}

class _RiderActiveDeliveryPageState extends State<RiderActiveDeliveryPage> {
  late final RiderLocationController _location;
  final MapViewController _mapView = MapViewController();

  late Order _order;
  MapRouteService? _routes;
  RouteResult? _route;
  bool _updating = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _mapView.addListener(_onMapChanged);
    _order = widget.order;
    _location = ServiceLocator.instance.createRiderLocationController();
    _routes = MapRouteService();
    _location.addListener(_onLocationChanged);
    _init();
  }

  void _onMapChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _init() async {
    final active = kRiderOnDeliveryStatuses.contains(_order.status);
    await _location.start(
      riderId: _order.riderId ?? widget.rider.id,
      rider: widget.rider,
      deliveryActive: active,
    );
    if (!mounted) return;
    setState(() => _initialized = true);
    _syncMarkers();
    _fitCamera();
    _fetchRoute();
  }

  void _onLocationChanged() {
    if (!mounted) return;
    setState(() {});
    final point = _location.currentPoint;
    if (point != null) {
      _mapView.upsertMarker(MapMarkerService.current(markerId: 'me', position: point));
    }
  }

  void _syncMarkers() {
    final origin = _order.pickupPoint;
    final destination = _order.dropoffPoint;
    if (origin != null) {
      _mapView.upsertMarker(MapMarkerService.restaurant(
        markerId: 'origin',
        position: origin,
        name: _order.pickupName,
      ));
    } else {
      _mapView.removeMarker('origin');
    }
    if (destination != null) {
      _mapView.upsertMarker(MapMarkerService.customer(
        markerId: 'destination',
        position: destination,
        title: _order.dropoffName,
      ));
    } else {
      _mapView.removeMarker('destination');
    }
    final me = _location.currentPoint;
    if (me != null) {
      _mapView.upsertMarker(MapMarkerService.current(markerId: 'me', position: me));
    }
  }

  void _fitCamera() {
    final points = <LocationPoint>[
      if (_order.pickupPoint != null)
        LocationPoint(latitude: _order.pickupPoint!.lat, longitude: _order.pickupPoint!.lng),
      if (_order.dropoffPoint != null)
        LocationPoint(latitude: _order.dropoffPoint!.lat, longitude: _order.dropoffPoint!.lng),
      if (_location.currentPoint != null) _location.currentPoint!,
    ];
    if (points.isEmpty) return;
    _mapView.fitPoints(points);
  }

  void _fetchRoute() {
    final me = _location.currentPoint;
    if (me == null) return;

    // Before pickup: route to the pickup point. After pickup: route to drop-off.
    final target = _order.status == 'picked_up' || _order.status == 'in_transit' || _order.status == 'arriving'
        ? _order.dropoffPoint
        : _order.pickupPoint;
    if (target == null) return;

    _routes!.between(
      origin: me,
      destination: LocationPoint(latitude: target.lat, longitude: target.lng),
    ).then((route) {
      if (!mounted) return;
      setState(() => _route = route);
      if (route.ok) {
        _mapView.setRoute(route.points.map((p) => LatLng(p.lat, p.lng)).toList());
      } else {
        _mapView.clearRoute();
        Logger.info('Rider route unavailable: ${route.error}');
      }
    });
  }

  Future<void> _updateStatus(String status) async {
    if (_updating) return;
    setState(() => _updating = true);
    try {
      // "Mark delivered" goes through the single idempotent completion endpoint
      // (`POST /api/orders/:id/complete`); the backend derives the legal
      // transition from the real order state and settles payout exactly once.
      // Everything else remains a normal PATCH status transition.
      final Order updated;
      if (status == 'delivered' || status == 'completed') {
        updated = await ServiceLocator.instance.orderRepository.completeDelivery(_order.id);
      } else {
        updated = await ServiceLocator.instance.orderRepository.updateStatus(_order.id, status);
      }
      if (!mounted) return;
      setState(() {
        _order = updated;
        _updating = false;
      });

      if (kRiderOnDeliveryStatuses.contains(updated.status)) {
        await _location.setDeliveryActive(active: true);
      }
      if (updated.status == 'delivered' || updated.status == 'completed') {
        // Delivery done: stop publishing + stop GPS (battery management).
        await _location.setDeliveryActive(active: false);
        _mapView.clearRoute();
      }
      _syncMarkers();
      _fetchRoute();
      _fitCamera();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Delivery status updated to ${updated.status}')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _updating = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  void dispose() {
    _mapView.removeListener(_onMapChanged);
    _location.removeListener(_onLocationChanged);
    _location.dispose();
    _mapView.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${_order.deliveryKindTitle} · ${_order.deliveryReference}')),
      body: !_initialized
          ? const Center(child: CircularProgressIndicator())
          : !GoogleMapService.usable
              ? MapUnavailableView(message: GoogleMapsConfig.missingKeyMessage)
              : _buildBody(),
    );
  }

  Widget _buildBody() {
    final stage = DeliveryStage.fromOrderStatus(_order.status);
    return Stack(
      children: [
        Positioned.fill(
          child: GoogleMapService.buildMap(
            view: _mapView,
            initialCamera: GoogleMapService.takoradiDefault(),
            myLocationEnabled: true,
          ),
        ),
        Positioned(
          left: 12,
          right: 12,
          top: 8,
          child: _LocationStatusCard(controller: _location),
        ),
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: _RiderDeliveryCard(
            order: _order,
            stage: stage,
            route: _route,
            updating: _updating,
            onStatus: _updateStatus,
          ),
        ),
      ],
    );
  }
}

class _LocationStatusCard extends StatelessWidget {
  const _LocationStatusCard({required this.controller});

  final RiderLocationController controller;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: controller.isPublishing ? Colors.green : Colors.black54,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(
              controller.isPublishing ? Icons.location_on : Icons.location_off,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                controller.statusMessage,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RiderDeliveryCard extends StatelessWidget {
  const _RiderDeliveryCard({
    required this.order,
    required this.stage,
    required this.route,
    required this.updating,
    required this.onStatus,
  });

  final Order order;
  final DeliveryStage stage;
  final RouteResult? route;
  final bool updating;
  final Future<void> Function(String) onStatus;

  @override
  Widget build(BuildContext context) {
    final eta = route == null ? 'ETA unavailable' : RouteFormatter.eta(route);
    final distance = route == null ? 'Distance unavailable' : RouteFormatter.distance(route);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.isPackageLike
                        ? '${order.dropoffName} • ${order.dropoffAddressLabel}'
                        : '${order.dropoffName} • ${order.dropoffAddressLabel}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: order.isPackageLike
                        ? const Color(0xFFEDE9FE)
                        : const Color(0xFFFFF3CD),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${order.deliveryKindBadge} · Order #${order.orderNumber}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: order.isPackageLike ? const Color(0xFF6D28D9) : const Color(0xFFB45309),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(stage.description, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            if (order.isPackageLike) ...[
              _InfoRow(label: 'Sender', value: order.senderName),
              _InfoRow(label: 'Receiver', value: order.dropoffName.isEmpty ? order.receiverName : order.dropoffName),
              if (order.packageSize.isNotEmpty || order.packageType.isNotEmpty)
                _InfoRow(label: 'Package', value: '${order.packageSize} ${order.packageType}'.trim()),
            ] else ...[
              _InfoRow(label: 'Restaurant', value: order.pickupName),
              _InfoRow(label: 'Customer', value: order.dropoffName),
            ],
            _InfoRow(label: 'ETA', value: eta),
            _InfoRow(label: 'Distance', value: distance),
            const SizedBox(height: 12),
            _StatusButtons(order: order, updating: updating, onStatus: onStatus),
          ],
        ),
      ),
    );
  }
}

class _StatusButtons extends StatelessWidget {
  const _StatusButtons({required this.order, required this.updating, required this.onStatus});

  final Order order;
  final bool updating;
  final Future<void> Function(String) onStatus;

  @override
  Widget build(BuildContext context) {
    final status = order.status;

    Widget button(String label, String target) {
      return SizedBox(
        width: double.infinity,
        child: FilledButton.tonal(
          onPressed: updating ? null : () => onStatus(target),
          child: Text(label),
        ),
      );
    }

    final isPackage = order.isPackageLike;
    final awaitConfirm = isPackage &&
        !order.receiverConfirmed &&
        const ['picked_up', 'in_transit', 'arriving'].contains(status);

    if (awaitConfirm) {
      return Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: updating ? null : () => onStatus('awaiting_confirmation'),
              child: const Text('Awaiting receiver confirmation'),
            ),
          ),
          const SizedBox(height: 8),
          Text('Confirm the delivery PIN with the recipient before marking it delivered.',
              style: Theme.of(context).textTheme.bodySmall),
        ],
      );
    }

    switch (status) {
      case 'ready_for_pickup':
      case 'rider_assigned':
        return Column(
          children: [
            button(isPackage ? 'Pick up item' : 'Pick up order', 'picked_up'),
            const SizedBox(height: 8),
            Text(isPackage
                    ? 'You have accepted this delivery. Navigate to the pickup point to collect the item.'
                    : 'You have accepted this delivery. Navigate to the restaurant to pick up the order.',
                style: Theme.of(context).textTheme.bodySmall),
          ],
        );
      case 'picked_up':
        return button('Start delivery', 'in_transit');
      case 'in_transit':
      case 'arriving':
        return Column(
          children: [
            button('I have arrived', 'arriving'),
            const SizedBox(height: 8),
            button('Mark delivered', 'delivered'),
          ],
        );
      default:
        return Text('Current status: ${order.status}', style: Theme.of(context).textTheme.bodySmall);
    }
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
