import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/config/api_config.dart';
import '../core/location/location_permission_service.dart';
import '../core/location/location_service.dart';
import '../core/location/location_state.dart';
import '../core/network/api_exception.dart';
import '../core/utils/logger.dart';
import '../data/models/rider.dart';
import '../data/repositories/rider_repository.dart';

/// Rider live-location pipeline:
///   Device GPS -> [LocationService] -> throttle (distance + time) ->
///   [RiderRepository.pushLocation] -> backend -> SSE to authorized customer.
///
/// Rules enforced here (see Prompt 3):
///  - Location is ONLY sent while the rider has an active delivery
///    (`kRiderOnDeliveryStatuses`). The backend independently refuses to
///    broadcast outside that window.
///  - Updates are throttled by distance moved and time elapsed - never every
///    GPS tick.
///  - On network loss the app shows "Connection interrupted / Trying to
///    reconnect..." and buffers safe, non-sensitive points to flush on
///    reconnect.
class RiderLocationController extends ChangeNotifier {
  RiderLocationController({
    required RiderRepository repository,
    LocationService? locationService,
  })  : _repository = repository,
        _location = locationService ?? LocationService();

  final RiderRepository _repository;
  final LocationService _location;

  StreamSubscription<LocationPoint>? _sub;
  LocationPoint? _lastSent;
  Timer? _flushTimer;
  final List<LocationPoint> _pending = [];
  DateTime? _lastPushAt;

  String? _riderId;
  bool _publishing = false;

  /// The most recent device fix, always available to the rider's own map.
  LocationPoint? currentPoint;

  RiderAvailabilityState availability = RiderAvailabilityState.unknown;

  /// Whether we are inside an active delivery (the only time we publish).
  bool hasActiveDelivery = false;

  /// Honest network state for the UI.
  bool networkUp = true;
  int pendingBuffered = 0;

  bool get listening => _sub != null;
  bool get isPublishing => _publishing && hasActiveDelivery;

  /// Live status line for the rider dashboard.
  String get statusMessage {
    if (!hasActiveDelivery) return 'Location updates only during an active delivery';
    if (!networkUp) {
      return pendingBuffered > 0
          ? 'Connection interrupted. Trying to reconnect... ($pendingBuffered queued)'
          : 'Connection interrupted. Trying to reconnect...';
    }
    if (listening) return 'Live - sharing location';
    return 'Location service idle';
  }

  /// Starts the GPS stream. [onDeliveryActive] must be true before anything is
  /// sent to the backend.
  Future<void> start({
    required String riderId,
    required Rider rider,
    bool deliveryActive = false,
  }) async {
    _riderId = riderId;
    availability =
        RiderState.fromBackend(rider: rider, hasActiveDelivery: deliveryActive).availability;
    hasActiveDelivery = deliveryActive;
    await stop();

    final permission = await LocationPermissionService.check();
    if (permission != LocationPermissionStatus.granted) {
      final requested = await LocationPermissionService.request();
      if (requested != LocationPermissionStatus.granted) {
        Logger.warning('Rider location permission not granted: $requested');
        notifyListeners();
        return;
      }
    }

    _sub = _location.positionStream().listen(
          _onFix,
          onError: (Object e) {
            Logger.warning('Position stream error: $e');
            networkUp = false;
            notifyListeners();
          },
          onDone: () {
            _sub = null;
            notifyListeners();
          },
        );
    notifyListeners();
  }

  /// Set delivery state (rider accepts an order / completes it). Publishing
  /// switches on/off automatically and the buffer is flushed appropriately.
  Future<void> setDeliveryActive({required bool active}) async {
    hasActiveDelivery = active;
    _publishing = active;
    availability = active
        ? RiderAvailabilityState.onDelivery
        : RiderAvailabilityState.available;
    if (!active) {
      _pending.clear();
      pendingBuffered = 0;
      _lastSent = null;
      _lastPushAt = null;
      _flushTimer?.cancel();
      _flushTimer = null;
      // No active delivery: stop GPS to save battery.
      await stop();
    } else {
      await _flush();
    }
    notifyListeners();
  }

  void _onFix(LocationPoint point) {
    currentPoint = point;
    availability = hasActiveDelivery
        ? RiderAvailabilityState.onDelivery
        : RiderAvailabilityState.available;
    if (!hasActiveDelivery) {
      notifyListeners();
      return;
    }

    final shouldSend = _shouldSend(point);
    if (shouldSend) {
      _publishing = true;
      _pending.add(point);
      pendingBuffered = _pending.length;
      _flush();
    }
    notifyListeners();
  }

  bool _shouldSend(LocationPoint point) {
    final last = _lastSent;
    if (last == null) return true;
    if (_lastPushAt != null &&
        DateTime.now().difference(_lastPushAt!) < ApiConfig.locationPingInterval) {
      return false;
    }
    final moved = LocationService.distanceKmBetween(last, point);
    return moved == null || moved >= 0.02; // 20m threshold
  }

  Future<void> _flush() async {
    if (!_publishing || !hasActiveDelivery) return;
    if (_flushTimer != null) return;
    _flushTimer = Timer(const Duration(seconds: 1), () async {
      _flushTimer = null;
      final batch = List<LocationPoint>.from(_pending);
      _pending.clear();
      final riderId = _riderId;
      if (riderId == null || batch.isEmpty) {
        _publishing = false;
        notifyListeners();
        return;
      }
      try {
        // Send each point (safe, non-sensitive). The backend 204s.
        for (final point in batch) {
          await _repository.pushLocation(
            riderId,
            point.latitude,
            point.longitude,
            accuracy: point.accuracy,
          );
          _lastSent = point;
        }
        _lastPushAt = DateTime.now();
        if (!networkUp) {
          networkUp = true;
        }
      } on ApiException catch (e) {
        if (e.isConnectionFailure) {
          networkUp = false;
          _pending.insertAll(0, batch);
        } else {
          Logger.warning('Location push failed (${e.code}): ${e.message}');
        }
      } catch (e) {
        Logger.warning('Location push failed: $e');
      }
      pendingBuffered = _pending.length;
      _publishing = false;
      notifyListeners();

      // If there are still buffered points (offline), retry shortly.
      if (_pending.isNotEmpty && hasActiveDelivery) {
        _flushTimer = Timer(const Duration(seconds: 5), _flush);
      }
    });
  }

  /// Stops GPS + cancels everything. Call when the rider signs out or no
  /// active delivery exists (battery management).
  Future<void> stop() async {
    _sub?.cancel();
    _sub = null;
    _flushTimer?.cancel();
    _flushTimer = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _sub?.cancel();
    _flushTimer?.cancel();
    super.dispose();
  }
}
