import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/notification_review.dart';

class NotificationRepository {
  NotificationRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<List<NotificationItem>> notifications(String userId) async {
    final data =
        await _client.get(ApiPaths.notifications(userId)) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(NotificationItem.fromJson)
        .toList();
  }

  Future<void> markRead(String id) async {
    await _client.post(ApiPaths.notificationRead(id));
  }

  Future<void> markAllRead() async {
    await _client.post(ApiPaths.notificationsReadAll);
  }

  Future<void> clear() async {
    await _client.post(ApiPaths.notificationsClear);
  }

  Future<int> unreadCount() async {
    final data =
        await _client.get(ApiPaths.notificationsUnreadCount) as Map<String, dynamic>;
    return data['count'] as int? ?? 0;
  }
}
