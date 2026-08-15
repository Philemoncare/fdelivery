import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../utils/logger.dart';

/// Wraps `flutter_secure_storage` for the OmniMarket session.
///
/// Tokens and the cached user profile are the ONLY things persisted here.
/// Plain `SharedPreferences` must never hold credentials.
class SecureStorageService {
  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _kAccessToken = 'omni_access_token';
  static const _kRefreshToken = 'omni_refresh_token';
  static const _kUserJson = 'omni_user_json';
  static const _kLastIdentifier = 'omni_last_identifier';

  Future<String?> readAccessToken() => _storage.read(key: _kAccessToken);

  Future<String?> readRefreshToken() => _storage.read(key: _kRefreshToken);

  Future<String?> readCachedUserJson() => _storage.read(key: _kUserJson);

  Future<String?> readLastIdentifier() => _storage.read(key: _kLastIdentifier);

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _kAccessToken, value: accessToken);
    await _storage.write(key: _kRefreshToken, value: refreshToken);
    Logger.info('Tokens saved (access + refresh).');
  }

  Future<void> saveCachedUserJson(String json) =>
      _storage.write(key: _kUserJson, value: json);

  Future<void> saveLastIdentifier(String identifier) =>
      _storage.write(key: _kLastIdentifier, value: identifier);

  Future<void> clearSession() async {
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshToken);
    await _storage.delete(key: _kUserJson);
    Logger.info('Session cleared from secure storage.');
  }
}
