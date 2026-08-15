import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';

class SupportRepository {
  SupportRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<List<dynamic>> tickets() async =>
      await _client.get(ApiPaths.supportTickets) as List<dynamic>;

  Future<Map<String, dynamic>> createTicket({
    required String subject,
    required String message,
  }) async {
    return await _client
        .post(ApiPaths.supportTickets, body: {'subject': subject, 'message': message})
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> reply(String id, String message) async {
    return await _client
        .post(ApiPaths.supportTicketReply(id), body: {'message': message})
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> update(String id, Map<String, dynamic> payload) async {
    return await _client
        .patch(ApiPaths.supportTicket(id), body: payload) as Map<String, dynamic>;
  }
}
