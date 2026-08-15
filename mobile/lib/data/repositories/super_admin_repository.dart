import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';

/// Super-admin endpoints (`requireSuperAdmin`): audit trail, platform
/// settings, payment gateways, backups, system health.
class SuperAdminRepository {
  SuperAdminRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<List<dynamic>> audit() async =>
      await _client.get(ApiPaths.audit) as List<dynamic>;

  Future<Map<String, dynamic>> platformSettings() async =>
      await _client.get(ApiPaths.platformSettings) as Map<String, dynamic>;

  Future<Map<String, dynamic>> updatePlatformSettings(Map<String, dynamic> payload) async {
    return await _client
        .put(ApiPaths.platformSettings, body: payload) as Map<String, dynamic>;
  }

  Future<List<dynamic>> paymentGateways() async =>
      await _client.get(ApiPaths.paymentGateways) as List<dynamic>;

  Future<Map<String, dynamic>> updateGateway(String id, Map<String, dynamic> payload) async {
    return await _client
        .patch(ApiPaths.paymentGateway(id), body: payload) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> systemHealth() async =>
      await _client.get(ApiPaths.systemHealth) as Map<String, dynamic>;

  Future<Map<String, dynamic>> backup() async =>
      await _client.get(ApiPaths.systemBackup) as Map<String, dynamic>;

  Future<Map<String, dynamic>> createBackup() async =>
      await _client.post(ApiPaths.systemBackup) as Map<String, dynamic>;
}
