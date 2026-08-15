import 'package:flutter_test/flutter_test.dart';

import 'package:omnimarket_mobile/core/config/google_maps_config.dart';
import 'package:omnimarket_mobile/core/location/location_state.dart';
import 'package:omnimarket_mobile/core/maps/delivery_stage.dart';
import 'package:omnimarket_mobile/core/maps/map_route_service.dart';
import 'package:omnimarket_mobile/data/models/rider.dart';

void main() {
  group('haversineKm', () {
    test('same point is 0 km', () {
      expect(haversineKm(4.892, -1.758, 4.892, -1.758), closeTo(0, 0.0001));
    });

    test('Takoradi to Accra is roughly 200km', () {
      final km = haversineKm(4.892, -1.758, 5.6037, -0.1870);
      expect(km, closeTo(200, 25));
    });
  });

  group('PolylineDecoder', () {
    test('empty string decodes to nothing', () {
      expect(PolylineDecoder.decode(''), isEmpty);
    });

    test('decodes Google-documented sample', () {
      // Google Maps docs: `u~kvF`~sxA_gs@A` -> [(38.5,-120.2),(40.7,-120.95),(43.252,-126.453)]
      final points = PolylineDecoder.decode('u~kvF`~sxA_gs@A');
      expect(points, hasLength(3));
      expect(points[0].lat, closeTo(38.5, 0.0001));
      expect(points[0].lng, closeTo(-120.2, 0.0001));
      expect(points[1].lat, closeTo(40.7, 0.0001));
      expect(points[1].lng, closeTo(-120.95, 0.0001));
      expect(points[2].lat, closeTo(43.252, 0.0001));
      expect(points[2].lng, closeTo(-126.453, 0.0001));
    });
  });

  group('RouteFormatter', () {
    test('no real data -> ETA unavailable (never invented)', () {
      expect(RouteFormatter.eta(RouteResult.unavailable()), 'ETA unavailable');
      expect(RouteFormatter.distance(RouteResult.unavailable()), 'Distance unavailable');
    });

    test('formats real seconds into minutes', () {
      const route = RouteResult(durationSeconds: 600);
      expect(RouteFormatter.eta(route), '10 min');
    });

    test('formats real meters into km/m', () {
      const route = RouteResult(distanceMeters: 1500);
      expect(RouteFormatter.distance(route), '1.5 km');
      const short = RouteResult(distanceMeters: 450);
      expect(RouteFormatter.distance(short), '450 m');
    });
  });

  group('DeliveryStage', () {
    test('maps backend statuses to stages', () {
      expect(DeliveryStage.fromOrderStatus('pending'), DeliveryStage.orderConfirmed);
      expect(DeliveryStage.fromOrderStatus('ready_for_pickup'), DeliveryStage.readyForPickup);
      expect(DeliveryStage.fromOrderStatus('picked_up'), DeliveryStage.pickedUp);
      expect(DeliveryStage.fromOrderStatus('delivered'), DeliveryStage.delivered);
      expect(DeliveryStage.fromOrderStatus('garbage'), DeliveryStage.unknown);
    });

    test('live window is picked_up/in_transit/arriving', () {
      expect(DeliveryStage.fromOrderStatus('picked_up').isLive, isTrue);
      expect(DeliveryStage.fromOrderStatus('in_transit').isLive, isTrue);
      expect(DeliveryStage.fromOrderStatus('arriving').isLive, isTrue);
      expect(DeliveryStage.fromOrderStatus('preparing').isLive, isFalse);
    });
  });

  group('RiderState', () {
    Rider rider({bool online = false, bool available = false}) => Rider(
          id: 'r1',
          status: online ? 'ONLINE' : 'OFFLINE',
          isOnline: online,
          isAvailable: available,
        );

    test('offline rider is offline and does not publish', () {
      final state = RiderState.fromBackend(rider: rider());
      expect(state.availability, RiderAvailabilityState.offline);
      expect(state.shouldPublishLocation, isFalse);
    });

    test('available rider with active delivery publishes', () {
      final state = RiderState.fromBackend(
        rider: rider(online: true, available: true),
        hasActiveDelivery: true,
      );
      expect(state.availability, RiderAvailabilityState.onDelivery);
      expect(state.shouldPublishLocation, isTrue);
    });

    test('online rider without delivery is just available', () {
      final state = RiderState.fromBackend(
        rider: rider(online: true, available: true),
        hasActiveDelivery: false,
      );
      expect(state.availability, RiderAvailabilityState.available);
      expect(state.shouldPublishLocation, isFalse);
    });
  });
}
