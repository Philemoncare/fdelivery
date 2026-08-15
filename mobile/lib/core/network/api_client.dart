import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/env_config.dart';
import '../constants/api_paths.dart';
import '../storage/secure_storage_service.dart';
import '../utils/logger.dart';
import 'api_exception.dart';
import 'auth_interceptor.dart';

/// Central HTTP client for the REAL OmniMarket backend.
///
/// Responsibilities:
///  - attach `Authorization: Bearer <accessToken>` when a token exists
///  - transparently refresh the access token (single-flight) on a 401 and
///    retry the failed request exactly once
///  - map every failure to a typed [ApiException]
///  - notify the app the moment the session can no longer be refreshed
class ApiClient {
  ApiClient({
    required String baseUrl,
    required SecureStorageService storage,
    AuthInterceptor? authInterceptor,
    this.onSessionExpired,
    http.Client? httpClient,
  })  : _baseUrl = baseUrl,
        _storage = storage,
        _authInterceptor = authInterceptor ?? AuthInterceptor(storage: storage),
        _http = httpClient ?? http.Client();

  final String _baseUrl;
  final SecureStorageService _storage;
  final AuthInterceptor _authInterceptor;
  final http.Client _http;
  final void Function()? onSessionExpired;

  String get baseUrl => _baseUrl;

  bool _refreshing = false;
  Future<void>? _refreshFuture;

  static const _jsonHeaders = <String, String>{
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  Future<dynamic> get(
    String path, {
    Map<String, String>? query,
    bool authenticated = true,
  }) {
    return _send('GET', path, query: query, authenticated: authenticated);
  }

  Future<dynamic> post(
    String path, {
    Object? body,
    bool authenticated = true,
  }) {
    return _send('POST', path, body: body, authenticated: authenticated);
  }

  Future<dynamic> put(
    String path, {
    Object? body,
    bool authenticated = true,
  }) {
    return _send('PUT', path, body: body, authenticated: authenticated);
  }

  Future<dynamic> patch(
    String path, {
    Object? body,
    bool authenticated = true,
  }) {
    return _send('PATCH', path, body: body, authenticated: authenticated);
  }

  Future<dynamic> delete(
    String path, {
    bool authenticated = true,
  }) {
    return _send('DELETE', path, authenticated: authenticated);
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
    bool authenticated = true,
    bool _isRetry = false,
  }) async {
    final stopwatch = Stopwatch()..start();
    if (EnvConfig.logNetwork) {
      Logger.info('→ $method $path'
          '${query != null && query.isNotEmpty ? ' ?${query.keys.join(',')}' : ''}');
    }
    try {
      final uri = _uri(path, query);
      var headers = Map<String, String>.from(_jsonHeaders);

      if (authenticated) {
        headers = await _authInterceptor.applyHeaders(headers);
      }

      http.Response response;
      switch (method) {
        case 'GET':
          response = await _http
              .get(uri, headers: headers)
              .timeout(EnvConfig.receiveTimeout);
        case 'POST':
          response = await _http
              .post(uri, headers: headers, body: _encodeBody(body))
              .timeout(EnvConfig.receiveTimeout);
        case 'PUT':
          response = await _http
              .put(uri, headers: headers, body: _encodeBody(body))
              .timeout(EnvConfig.receiveTimeout);
        case 'PATCH':
          response = await _http
              .patch(uri, headers: headers, body: _encodeBody(body))
              .timeout(EnvConfig.receiveTimeout);
        case 'DELETE':
          response = await _http
              .delete(uri, headers: headers)
              .timeout(EnvConfig.receiveTimeout);
        default:
          throw ApiException.unknown('Unsupported method $method');
      }

      final elapsed = stopwatch.elapsedMilliseconds;
      if (EnvConfig.logNetwork) {
        Logger.info('← $method $path ${response.statusCode} in ${elapsed}ms');
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return _decode(response);
      }

      // 401: try a single refresh + retry (never loop).
      if (response.statusCode == 401 &&
          authenticated &&
          !_isRetry &&
          await _authInterceptor.canAttemptRefresh()) {
        await _refreshToken();
        return _send(method, path,
            query: query,
            body: body,
            authenticated: authenticated,
            _isRetry: true);
      }

      throw _mapError(response);
    } on TimeoutException {
      throw ApiException.timeout();
    } on SocketException {
      throw ApiException.network();
    } on http.ClientException {
      throw ApiException.network();
    }
  }

  Uri _uri(String path, Map<String, String>? query) {
    final base = _baseUrl.endsWith('/') ? _baseUrl.substring(0, _baseUrl.length - 1) : _baseUrl;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$base$cleanPath');
    if (query == null || query.isEmpty) return uri;
    return uri.replace(queryParameters: query);
  }

  String? _encodeBody(Object? body) {
    if (body == null) return null;
    if (body is String) return body;
    return jsonEncode(body);
  }

  dynamic _decode(http.Response response) {
    if (response.body.isEmpty) return null;
    final decoded = jsonDecode(response.body);
    return decoded;
  }

  /// Single-flight refresh: concurrent 401s wait on one refresh call.
  Future<void> _refreshToken() {
    if (_refreshing) return _refreshFuture ?? Future<void>.value();
    final future = _doRefresh();
    _refreshFuture = future;
    _refreshing = true;
    future.whenComplete(() {
      _refreshing = false;
      _refreshFuture = null;
    });
    return future;
  }

  Future<void> _doRefresh() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      _expireSession();
      throw ApiException.unauthorized();
    }

    try {
      final response = await _http
          .post(
            _uri(ApiPaths.refresh, null),
            headers: _jsonHeaders,
            body: jsonEncode({'refreshToken': refreshToken}),
          )
          .timeout(EnvConfig.receiveTimeout);

      if (response.statusCode != 200) {
        Logger.warning('Token refresh failed with ${response.statusCode}.');
        _expireSession();
        throw ApiException.unauthorized();
      }

      final data = _decode(response) as Map<String, dynamic>;
      final access = data['accessToken'] as String?;
      final refresh = data['refreshToken'] as String?;
      if (access == null || access.isEmpty) {
        _expireSession();
        throw ApiException.unauthorized();
      }
      await _storage.saveTokens(
        accessToken: access,
        refreshToken: refresh ?? refreshToken,
      );
      Logger.info('Access token refreshed successfully.');
    } on TimeoutException {
      throw ApiException.timeout();
    } on SocketException {
      throw ApiException.network();
    } on http.ClientException {
      throw ApiException.network();
    }
  }

  void _expireSession() {
    _storage.clearSession();
    onSessionExpired?.call();
  }

  ApiException _mapError(http.Response response) {
    String message = 'Request failed (${response.statusCode}).';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final serverMessage = decoded['message'] ?? decoded['error'];
        if (serverMessage is String && serverMessage.isNotEmpty) {
          message = serverMessage;
        }
      }
    } catch (_) {
      // Non-JSON error body - keep the generic message.
    }

    switch (response.statusCode) {
      case 400:
        return ApiException(statusCode: 400, message: message, code: 'bad_request');
      case 401:
        return ApiException(statusCode: 401, message: message, code: 'unauthorized');
      case 403:
        return ApiException(statusCode: 403, message: message, code: 'forbidden');
      case 404:
        return ApiException(statusCode: 404, message: message, code: 'not_found');
      case 409:
        return ApiException(statusCode: 409, message: message, code: 'conflict');
      case 422:
        return ApiException(statusCode: 422, message: message, code: 'validation');
      case 429:
        return ApiException(statusCode: 429, message: message, code: 'rate_limited');
      default:
        if (response.statusCode >= 500) {
          return ApiException(statusCode: response.statusCode, message: message, code: 'server');
        }
        return ApiException(statusCode: response.statusCode, message: message, code: 'unknown');
    }
  }
}
