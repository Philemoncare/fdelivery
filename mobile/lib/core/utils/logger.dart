import 'package:flutter/foundation.dart';

/// Minimal structured logger. Real logs, real errors - nothing is mocked.
class Logger {
  Logger._();

  static void info(String message) =>
      debugPrint('[OmniMarket] $message', wrapWidth: 4096);

  static void warning(String message) =>
      debugPrint('[OmniMarket][WARN] $message', wrapWidth: 4096);

  static void error(String message, [Object? error, StackTrace? stack]) {
    debugPrint('[OmniMarket][ERROR] $message', wrapWidth: 4096);
    if (error != null) debugPrint('  -> $error', wrapWidth: 4096);
    if (stack != null) debugPrint('  -> $stack', wrapWidth: 4096);
  }
}
