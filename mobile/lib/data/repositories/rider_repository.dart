import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/rider.dart';

class RiderRepository {
  RiderRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  /// Auth'd callers receive the full rider records (used for dispatch).
  Future<List<Rider>> riders() async {
    final data = await _client.get(ApiPaths.riders) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Rider.fromJson)
        .toList();
  }

  Future<Rider> updateStatus(String riderId, String status) async {
    final data = await _client
        .patch(ApiPaths.riderStatus(riderId), body: {'status': status})
        as Map<String, dynamic>;
    return Rider.fromJson(data);
  }

  Future<Rider> updateRider(String riderId, Map<String, dynamic> payload) async {
    final data = await _client
        .patch(ApiPaths.rider(riderId), body: payload) as Map<String, dynamic>;
    return Rider.fromJson(data);
  }

  /// Pushes a live location ping. The backend expects `latitude`/`longitude`
  /// (see `POST /api/riders/:id/location`) and only accepts the owning rider
  /// or an admin.
  Future<void> pushLocation(
    String riderId,
    double latitude,
    double longitude, {
    double? accuracy,
  }) async {
    await _client.post(
      ApiPaths.riderLocation(riderId),
      body: {
        'latitude': latitude,
        'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      },
    );
  }
}
