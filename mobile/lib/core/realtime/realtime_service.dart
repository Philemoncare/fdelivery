import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../config/env_config.dart';
import '../storage/secure_storage_service.dart';
import '../utils/logger.dart';

/// One event received from the backend's SSE stream.
class RealtimeEvent {
  const RealtimeEvent({required this.event, required this.data});

  final String event;
  final dynamic data;

  @override
  String toString() => 'RealtimeEvent($event)';
}

/// Client for the backend's existing Server-Sent Events endpoint
/// (`GET /api/realtime?token=<accessToken>`), the same channel the web app
/// uses. Events seen on the backend today:
///
///   * `notification`  -> `{ id, userId, title, message, type }`
///   * `order_update`  -> full updated order object
///   * `rider_location`-> `{ orderId, riderId, lat, lng, ... }`
///   * `message`       -> new chat message
///
/// Reconnects automatically with backoff. Never injects fake events.
class RealtimeService {
  RealtimeService({
    required SecureStorageService storage,
    required String baseUrl,
    Duration reconnectDelay = const Duration(seconds: 5),
  })  : _storage = storage,
        _baseUrl = baseUrl,
        _reconnectDelay = reconnectDelay;

  final SecureStorageService _storage;
  final String _baseUrl;
  final Duration _reconnectDelay;

  bool _disposed = false;

  /// Opens the SSE connection and yields parsed events until the session is
  /// gone or [dispose] is called.
  Stream<RealtimeEvent> connect() async* {
    _disposed = false;

    while (!_disposed) {
      final token = await _storage.readAccessToken();
      if (token == null || token.isEmpty) {
        Logger.warning('Realtime: no access token, stream stopped.');
        return;
      }

      final client = HttpClient()
        ..connectionTimeout = EnvConfig.connectTimeout;

      try {
        final url = '${_baseUrl}?token=${Uri.encodeQueryComponent(token)}';
        Logger.info('Realtime: connecting to $url');

        final request = await client.getUrl(Uri.parse(url));
        request.headers.set(HttpHeaders.acceptHeader, 'text/event-stream');
        request.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');

        final response = await request.close();
        if (response.statusCode != HttpStatus.ok) {
          Logger.warning('Realtime: server responded ${response.statusCode}.');
          client.close(force: true);
          if (!_disposed) await Future.delayed(_reconnectDelay);
          continue;
        }

        Logger.info('Realtime: connected.');
        final lines = response.transform(utf8.decoder).transform(const LineSplitter());
        await for (final line in lines) {
          if (_disposed) break;
          if (!line.startsWith('data:')) continue; // ignore comments/heartbeats
          final payload = line.substring(5).trim();
          if (payload.isEmpty) continue;
          try {
            final decoded = jsonDecode(payload);
            if (decoded is Map<String, dynamic>) {
              final event = decoded['event'] as String? ?? 'message';
              yield RealtimeEvent(event: event, data: decoded['data']);
            }
          } catch (e) {
            Logger.warning('Realtime: failed to parse "$payload" -> $e');
          }
        }
        Logger.info('Realtime: stream closed by server.');
      } on SocketException catch (e) {
        Logger.warning('Realtime: socket error $e');
      } on HttpException catch (e) {
        Logger.warning('Realtime: http error $e');
      } catch (e) {
        Logger.warning('Realtime: unexpected error $e');
      } finally {
        client.close(force: true);
      }

      if (!_disposed) await Future.delayed(_reconnectDelay);
    }
  }

  void dispose() => _disposed = true;
}
