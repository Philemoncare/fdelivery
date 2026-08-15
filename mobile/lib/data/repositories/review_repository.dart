import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/notification_review.dart';

class ReviewRepository {
  ReviewRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<List<Review>> reviews({String? vendorId}) async {
    final data = await _client.get(ApiPaths.reviews, query: {
      if (vendorId != null) 'vendorId': vendorId,
    }) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Review.fromJson)
        .toList();
  }

  Future<Review> create({
    required String vendorId,
    required double rating,
    String comment = '',
    String? productId,
    String? orderId,
  }) async {
    final data = await _client
        .post(ApiPaths.reviews, body: {
          'vendorId': vendorId,
          'rating': rating,
          'comment': comment,
          if (productId != null) 'productId': productId,
          if (orderId != null) 'orderId': orderId,
        })
        as Map<String, dynamic>;
    return Review.fromJson(data);
  }
}
