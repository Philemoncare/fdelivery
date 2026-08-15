import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/dashboards.dart';
import '../models/user_profile.dart';

/// Admin & super-admin endpoints (`requireAdmin` / `requireSuperAdmin`).
class AdminRepository {
  AdminRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<AdminStats> stats() async {
    final data = await _client.get(ApiPaths.adminStats) as Map<String, dynamic>;
    return AdminStats.fromJson(data);
  }

  Future<Map<String, dynamic>> reports(Map<String, String>? query) async {
    return await _client.get(ApiPaths.adminReports, query: query)
        as Map<String, dynamic>;
  }

  Future<List<UserProfile>> users({String? role}) async {
    final data = await _client.get(ApiPaths.users, query: {
      if (role != null && role.isNotEmpty) 'role': role,
    }) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(UserProfile.fromJson)
        .toList();
  }

  Future<UserProfile> user(String id) async {
    final data = await _client.get(ApiPaths.user(id)) as Map<String, dynamic>;
    return UserProfile.fromJson(data);
  }

  Future<UserProfile> updateUser(String id, Map<String, dynamic> payload) async {
    final data = await _client
        .patch(ApiPaths.user(id), body: payload) as Map<String, dynamic>;
    return UserProfile.fromJson(data);
  }

  Future<void> createUser(Map<String, dynamic> payload) async {
    await _client.post(ApiPaths.users, body: payload);
  }

  Future<void> deleteUser(String id) async {
    await _client.delete(ApiPaths.user(id));
  }

  Future<List<dynamic>> customers() async =>
      await _client.get(ApiPaths.customers) as List<dynamic>;

  Future<List<dynamic>> transactions() async =>
      await _client.get(ApiPaths.transactions) as List<dynamic>;

  Future<List<dynamic>> emailLog() async =>
      await _client.get(ApiPaths.emailLog) as List<dynamic>;

  Future<List<dynamic>> payments() async =>
      await _client.get(ApiPaths.payments) as List<dynamic>;

  Future<List<dynamic>> payouts() async =>
      await _client.get(ApiPaths.payouts) as List<dynamic>;

  Future<List<dynamic>> riderEarnings() async =>
      await _client.get(ApiPaths.riderEarnings) as List<dynamic>;

  Future<List<dynamic>> announcements() async =>
      await _client.get(ApiPaths.announcements) as List<dynamic>;

  Future<Map<String, dynamic>> createAnnouncement(Map<String, dynamic> payload) async {
    return await _client
        .post(ApiPaths.announcements, body: payload) as Map<String, dynamic>;
  }
}
