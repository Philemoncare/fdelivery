import 'package:flutter/material.dart';

import '../../../application/service_locator.dart';
import '../../../core/config/google_maps_config.dart';
import '../../../core/location/location_state.dart';
import '../../../core/maps/delivery_stage.dart';
import '../../../core/maps/google_map_service.dart';
import '../../../core/maps/map_controller.dart';
import '../../../core/maps/map_marker_service.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/order.dart';
import '../../../data/models/rider.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_indicator.dart';

/// Admin delivery monitoring.
///
/// Lists ACTIVE deliveries platform-wide (the admin is authorized for this)
/// with the assigned rider and real status. The map view shows the real
/// rider/destination coordinates from the backend - nothing is injected.
class AdminDeliveryMonitoringPage extends StatefulWidget {
  const AdminDeliveryMonitoringPage({super.key});

  @override
  State<AdminDeliveryMonitoringPage> createState() =>
      _AdminDeliveryMonitoringPageState();
}

class _AdminDeliveryMonitoringPageState extends State<AdminDeliveryMonitoringPage> {
  List<Order>? _orders;
  Map<String, Rider> _riders = {};
  String? _error;
  bool _showMap = false;
  final MapViewController _mapView = MapViewController();

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
    final user = ServiceLocator.instance.app.currentUser;
    if (user == null) return;
    try {
      final loc = ServiceLocator.instance;
      final orders = await loc.orderRepository.myOrders(user);
      final riders = await loc.riderRepository.riders();
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _riders = {for (final r in riders) r.id: r};
      });
      if (_showMap) _syncMap();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  List<Order> get _activeOrders =>
      _orders?.where((o) => !DeliveryStage.isTerminal(o.status)).toList() ?? const [];

  Rider? _riderFor(Order o) {
    if (o.riderId == null) return null;
    return _riders[o.riderId];
  }

  void _syncMap() {
    _mapView.clearMarkers();
    for (final order in _activeOrders) {
      final rider = _riderFor(order);
      final riderPoint = rider?.location;
      if (riderPoint != null) {
        MapMarkerService.rider(
          markerId: 'rider-${order.id}',
          position: LocationPoint(latitude: riderPoint.lat, longitude: riderPoint.lng),
          rider: rider!,
        ).then((marker) {
          if (mounted) _mapView.upsertMarker(marker);
        });
      }
      final cLat = order.customerLat;
      final cLng = order.customerLng;
      if (cLat != null && cLng != null) {
        _mapView.upsertMarker(MapMarkerService.customer(
          markerId: 'customer-${order.id}',
          position: LocationPoint(latitude: cLat, longitude: cLng),
          title: order.orderNumber,
        ));
      }
    }
    final points = <LocationPoint>[
      for (final order in _activeOrders)
        if (order.customerLat != null && order.customerLng != null)
          LocationPoint(latitude: order.customerLat!, longitude: order.customerLng!),
    ];
    if (points.isNotEmpty) _mapView.fitPoints(points);
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
      appBar: AppBar(
        title: const Text('Delivery Monitoring'),
        actions: [
          IconButton(
            tooltip: _showMap ? 'List view' : 'Map view',
            icon: Icon(_showMap ? Icons.list : Icons.map),
            onPressed: () {
              setState(() {
                _showMap = !_showMap;
                if (_showMap) _syncMap();
              });
            },
          ),
        ],
      ),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_orders == null) return const LoadingIndicator(message: 'Loading deliveries…');
    if (_activeOrders.isEmpty) {
      return const EmptyView(message: 'No active deliveries right now.', icon: Icons.delivery_dining);
    }
    if (_showMap) {
      if (!GoogleMapService.usable) {
        return MapUnavailableView(message: GoogleMapsConfig.missingKeyMessage);
      }
      return GoogleMapService.buildMap(
        view: _mapView,
        initialCamera: GoogleMapService.takoradiDefault(),
        myLocationEnabled: false,
      );
    }
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Text(
            '${_activeOrders.length} active delivery(ies)',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        ..._activeOrders.map(_deliveryTile),
      ],
    );
  }

  Widget _deliveryTile(Order o) {
    final rider = _riderFor(o);
    final stage = DeliveryStage.fromOrderStatus(o.status);
    return Card(
      child: ListTile(
        leading: rider != null
            ? CircleAvatar(
                backgroundImage: rider.avatar.isNotEmpty ? NetworkImage(rider.avatar) : null,
                child: rider.avatar.isEmpty && rider.name.isNotEmpty
                    ? Text(rider.name[0].toUpperCase())
                    : null,
              )
            : const CircleAvatar(child: Icon(Icons.person_outline)),
        title: Text('${o.orderNumber} • ${stage.apiLabel.replaceAll('_', ' ')}'),
        subtitle: Text(
          '${o.vendorName.isNotEmpty ? '${o.vendorName} → ' : ''}'
          '${rider?.name ?? 'No rider assigned'}'
          '${o.totalAmount > 0 ? ' • ${Formatters.ghs(o.totalAmount)}' : ''}',
        ),
        trailing: Text(o.status, style: Theme.of(context).textTheme.labelMedium),
      ),
    );
  }
}
