import 'dart:io' show Platform;

/// Which backend environment this build targets.
///
///  - `development` (default): talks to the local Express backend on port
///    3999 (Android emulators reach the host via `10.0.2.2`).
///  - `production`: REQUIRES an explicit
///    `--dart-define=OMNIMARKET_API_BASE_URL=https://.../api` at build time.
///    It refuses to fall back to localhost, so a release build can never
///    silently point at a dev machine.
enum AppEnvironment { development, production }

/// Central runtime configuration.
///
/// The API base URL points at the REAL OmniMarket Express backend - never a
/// mock. Override at run time with:
///   flutter run --dart-define=OMNIMARKET_API_BASE_URL=http://<host>:3999/api
/// or build for production with:
///   flutter build apk --dart-define=OMNIMARKET_API_BASE_URL=https://api.example.com/api
class EnvConfig {
  EnvConfig._();

  static const String _fromDefine =
      String.fromEnvironment('OMNIMARKET_API_BASE_URL');

  static const String _envDefine = String.fromEnvironment(
    'OMNIMARKET_ENV',
    defaultValue: 'development',
  );

  static const String appName = 'OmniMarket';
  static const String appVersion = '1.0.0';

  static AppEnvironment get environment =>
      _envDefine == 'production' ? AppEnvironment.production : AppEnvironment.development;

  static bool get isDevelopment => environment == AppEnvironment.development;
  static bool get isProduction => !isDevelopment;

  static String get apiBaseUrl {
    if (_fromDefine.isNotEmpty) return _fromDefine;
    if (environment == AppEnvironment.production) {
      throw StateError(
        'Production builds MUST provide OMNIMARKET_API_BASE_URL. '
        'Refusing to fall back to a localhost endpoint.',
      );
    }
    // Android emulators cannot reach the host via 127.0.0.1.
    if (Platform.isAndroid) return 'http://10.0.2.2:3999/api';
    return 'http://127.0.0.1:3999/api';
  }

  /// The absolute URL of the realtime (SSE) endpoint.
  static String get realtimeUrl =>
      '${apiBaseUrl.replaceFirst(RegExp(r'/api$'), '')}/api/realtime';

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const int maxRetries = 2;

  /// Log network calls (method, path, status, duration). Payloads are logged
  /// only in development builds and are sanitized by [ApiClient] - release
  /// builds never log request/response bodies.
  static bool get logNetwork => isDevelopment;
}
