import 'env_config.dart';

/// App-wide tunables that may differ per environment.
///
/// Kept in one place so switching dev/prod never touches business logic.
/// No secrets ever live here - sensitive values must come from secure
/// storage or `--dart-define` at build time.
class ApiConfig {
  ApiConfig._();

  /// Timeout for a single HTTP call to the backend.
  static Duration get requestTimeout => EnvConfig.receiveTimeout;

  /// Max number of location pings buffered before a single flush
  /// (RiderLocationService uses this to avoid spamming the backend).
  static const int locationBatchSize = 10;

  /// Interval between active-delivery location pings.
  static const Duration locationPingInterval = Duration(seconds: 15);
}
