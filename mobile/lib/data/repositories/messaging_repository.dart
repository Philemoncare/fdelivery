import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/coupon_messaging.dart';

class MessagingRepository {
  MessagingRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<List<Conversation>> conversations({String? userId}) async {
    final data = await _client.get(
      ApiPaths.conversations,
      query: userId == null || userId.isEmpty ? null : {'userId': userId},
    ) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Conversation.fromJson)
        .toList();
  }

  Future<List<MessageItem>> messages(String conversationId) async {
    final data =
        await _client.get(ApiPaths.conversation(conversationId)) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(MessageItem.fromJson)
        .toList();
  }

  Future<MessageItem> sendMessage({
    required String conversationId,
    required String content,
  }) async {
    final data = await _client
        .post(ApiPaths.messages,
            body: {'conversationId': conversationId, 'content': content})
        as Map<String, dynamic>;
    return MessageItem.fromJson(data);
  }

  Future<MessageItem> sendSupportMessage({
    required String subject,
    required String content,
  }) async {
    final data = await _client
        .post(ApiPaths.supportMessage,
            body: {'subject': subject, 'content': content})
        as Map<String, dynamic>;
    return MessageItem.fromJson(data);
  }
}
