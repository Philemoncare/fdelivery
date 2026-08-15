import 'dart:convert';

import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage_service.dart';
import '../models/auth_models.dart';
import '../models/user_profile.dart';

/// All auth endpoints exposed by the backend (`/api/auth/*`).
class AuthRepository {
  AuthRepository({required ApiClient client, required SecureStorageService storage})
      : _client = client,
        _storage = storage;

  final ApiClient _client;
  final SecureStorageService _storage;

  /// Step 1 of sign-in. Backend ALWAYS returns `requiresOtp: true`.
  Future<AuthResult> login({
    required String identifier,
    required String password,
    String portal = 'app',
  }) async {
    final data = await _client.post(
      ApiPaths.login,
      body: {'identifier': identifier, 'password': password, 'portal': portal},
      authenticated: false,
    ) as Map<String, dynamic>;
    return AuthResult.fromJson(data);
  }

  /// Step 2 of sign-in. Exchanges the OTP for a full session
  /// (`user` + `tokens`).
  Future<AuthResult> verifyOtp({
    required String identifier,
    required String code,
    String portal = 'app',
  }) async {
    final data = await _client.post(
      ApiPaths.verifyOtp,
      body: {'identifier': identifier, 'code': code, 'portal': portal},
      authenticated: false,
    ) as Map<String, dynamic>;
    final result = AuthResult.fromJson(data);
    if (result.tokens != null) {
      await _storage.saveTokens(
        accessToken: result.tokens!.accessToken,
        refreshToken: result.tokens!.refreshToken,
      );
    }
    return result;
  }

  Future<void> resendOtp({required String identifier, String channel = 'email'}) async {
    await _client.post(
      ApiPaths.sendOtp,
      body: {'identifier': identifier, 'channel': channel},
      authenticated: false,
    );
  }

  /// `POST /api/auth/register`. Does NOT return tokens - the new account must
  /// complete the OTP login flow.
  Future<AuthResult> register(Map<String, dynamic> payload) async {
    final data = await _client.post(
      ApiPaths.register,
      body: payload,
      authenticated: false,
    ) as Map<String, dynamic>;
    return AuthResult.fromJson(data);
  }

  /// `GET /api/auth/me` - current profile from the backend (not the cache).
  Future<UserProfile> me() async {
    final data = await _client.get(ApiPaths.me) as Map<String, dynamic>;
    final user = UserProfile.fromJson(data);
    await _storage.saveCachedUserJson(jsonEncode(user.toJson()));
    return user;
  }

  Future<void> sendVerification() async {
    await _client.post(ApiPaths.sendVerification);
  }

  Future<AuthResult> verifyEmail(String code) async {
    final data = await _client.post(
      ApiPaths.verifyEmail,
      body: {'code': code},
    ) as Map<String, dynamic>;
    return AuthResult.fromJson(data);
  }

  Future<void> requestPasswordReset(String email) async {
    await _client.post(
      ApiPaths.requestPasswordReset,
      body: {'email': email},
      authenticated: false,
    );
  }

  Future<void> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    await _client.post(
      ApiPaths.resetPassword,
      body: {'email': email, 'code': code, 'newPassword': newPassword},
      authenticated: false,
    );
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _client.post(
      ApiPaths.changePassword,
      body: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }

  // ---- admin auth ---------------------------------------------------------

  Future<void> adminResetPassword({required String userId, required String newPassword}) async {
    await _client.post(ApiPaths.adminResetPassword, body: {'userId': userId, 'newPassword': newPassword});
  }

  Future<String> adminGenerateTempPassword(String userId) async {
    final data = await _client.post(
      ApiPaths.adminGenerateTempPassword,
      body: {'userId': userId},
    ) as Map<String, dynamic>;
    return (data['tempPassword'] as String?) ?? '';
  }

  Future<void> adminForceReset(String userId) async {
    await _client.post(ApiPaths.adminForceReset, body: {'userId': userId});
  }

  // ---- sessions -------------------------------------------------------------

  Future<List<dynamic>> sessions(String userId) async =>
      await _client.get(ApiPaths.sessionsOf(userId)) as List<dynamic>;

  Future<void> revokeSession(String userId, String sessionId) async {
    await _client.delete(ApiPaths.sessionOf(userId, sessionId));
  }

  Future<void> revokeAllSessions(String userId) async {
    await _client.delete(ApiPaths.sessionsOf(userId));
  }
}
