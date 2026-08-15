import '../storage/secure_storage_service.dart';

/// Token injection + session-presence checks.
///
/// The refresh-and-retry orchestration lives in [ApiClient]; this interceptor
/// owns the parts that attach credentials to outgoing requests and decides
/// whether a refresh is even possible.
class AuthInterceptor {
  AuthInterceptor({required SecureStorageService storage})
      : _storage = storage;

  final SecureStorageService _storage;

  /// Adds `Authorization: Bearer <accessToken>` when a token is stored.
  Future<Map<String, String>> applyHeaders(Map<String, String> headers) async {
    final token = await _storage.readAccessToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// True when a refresh token exists, meaning a 401 might be recoverable.
  Future<bool> canAttemptRefresh() async =>
      (await _storage.readRefreshToken()) != null;
}
