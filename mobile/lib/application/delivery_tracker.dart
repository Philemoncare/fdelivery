import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/location/location_state.dart';
import '../core/maps/delivery_stage.dart';
import '../core/network/api_exception.dart';
import '../core/realtime/realtime_service.dart';
import '../core/utils/logger.dart';
import '../data/models/delivery_tracking.dart';
import '../data/models/order.dart';
import '../data/repositories/order_repository.dart';

enum DeliveryLoadState { loading, loaded, error }

/// Customer-facing live delivery tracker.
///
/// Pipeline (Prompt 3):
///   1. Load the authoritative order via `GET /api/orders/:id` (ownership is
///      enforced by the backend - a 403 surfaces here honestly).
///   2. Subscribe to the SAME SSE stream the app already uses and apply only
///      events for THIS order:
///        - `order_update`  -> full updated order (drives the stage)
///        - `rider_location`-> {orderId, riderId, latitude, longitude, ...}
///   3. If the SSE channel goes quiet (disconnect), show
///      "Live connection interrupted. Reconnecting..." and re-fetch the
///      authoritative order state on reconnect - never rely on missed events.
class DeliveryTracker extends ChangeNotifier {
  DeliveryTracker({
    required OrderRepository repository,
    Stream<RealtimeEvent>? realtimeStream,
  })  : _repository = repository,
        _realtimeStream = realtimeStream;

  final OrderRepository _repository;
  Stream<RealtimeEvent>? _realtimeStream;

  StreamSubscription<RealtimeEvent>? _sub;
  Timer? _stalenessTimer;
  String? _orderId;

  DeliveryLoadState state = DeliveryLoadState.loading;
  String? error;
  DeliveryTracking? tracking;

  /// Set once the SSE channel delivers any event while tracking.
  bool realtimeConnected = false;
  DateTime? _lastEventAt;

  /// True when we haven't heard from the SSE channel recently while the order
  /// is still live - drives the "Live connection interrupted" banner.
  bool get realtimeStale =>
      tracking?.isLive == true &&
      _lastEventAt != null &&
      DateTime.now().difference(_lastEventAt!) > const Duration(seconds: 20);

  Future<void> start({
    required String orderId,
    Stream<RealtimeEvent>? realtimeStream,
  }) async {
    _orderId = orderId;
    if (realtimeStream != null) _realtimeStream = realtimeStream;
    state = DeliveryLoadState.loading;
    error = null;
    notifyListeners();

    // 1. Authoritative snapshot.
    await _loadOrder();

    // 2. Listen for this order's events.
    await _subscribe();

    // 3. Staleness watchdog.
    _stalenessTimer?.cancel();
    _stalenessTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (realtimeStale) notifyListeners();
    });
  }

  Future<void> _loadOrder() async {
    final id = _orderId;
    if (id == null) return;
    try {
      final order = await _repository.order(id);
      _applyOrder(order);
      state = DeliveryLoadState.loaded;
      error = null;
    } on ApiException catch (e) {
      state = DeliveryLoadState.error;
      error = e.message;
      Logger.warning('DeliveryTracker load failed: ${e.code} - ${e.message}');
    } catch (e) {
      state = DeliveryLoadState.error;
      error = 'Unable to load delivery.';
      Logger.warning('DeliveryTracker load failed: $e');
    }
    notifyListeners();
  }

  /// Re-fetches authoritative order state (used on reconnect / manual retry).
  Future<void> refreshOrder() async {
    await _loadOrder();
  }

  Future<void> _subscribe() async {
    await _sub?.cancel();
    final stream = _realtimeStream;
    if (stream == null) return;
    final orderId = _orderId;
    if (orderId == null) return;

    _sub = stream.listen((event) {
      switch (event.event) {
        case 'order_update':
          final data = event.data;
          if (data is Map<String, dynamic>) {
            final incoming = Order.fromJson(data);
            if (incoming.id == orderId) {
              _lastEventAt = DateTime.now();
              realtimeConnected = true;
              _applyOrder(incoming);
              notifyListeners();
            }
          }
          break;
        case 'rider_location':
          final data = event.data;
          if (data is Map<String, dynamic>) {
            if ((data['orderId'] as String?) == orderId) {
              final lat = data['latitude'];
              final lng = data['longitude'];
              if (lat is num && lng is num) {
                final point = LocationPoint(
                  latitude: lat.toDouble(),
                  longitude: lng.toDouble(),
                  accuracy: _asDouble(data['accuracy']),
                  heading: _asDouble(data['heading']),
                  speed: _asDouble(data['speed']),
                  timestamp: DateTime.tryParse(data['timestamp']?.toString() ?? ''),
                );
                _lastEventAt = DateTime.now();
                realtimeConnected = true;
                tracking = tracking?.copyWith(
                  riderPoint: point,
                  lastLocationUpdateAt: DateTime.now(),
                );
                notifyListeners();
              }
            }
          }
          break;
        default:
          break;
      }
    }, onError: (Object e) {
      Logger.warning('DeliveryTracker stream error: $e');
    });
  }

  void _applyOrder(Order order) {
    final current = tracking;
    tracking = DeliveryTracking(
      order: order,
      riderPoint: current?.riderPoint,
      stage: DeliveryStage.fromOrderStatus(order.status),
      lastLocationUpdateAt: current?.lastLocationUpdateAt,
    );
  }

  double? _asDouble(Object? v) {
    if (v is num) return v.toDouble();
    return null;
  }

  void stop() {
    _sub?.cancel();
    _sub = null;
    _stalenessTimer?.cancel();
    _stalenessTimer = null;
  }

  @override
  void dispose() {
    stop();
    super.dispose();
  }
}
