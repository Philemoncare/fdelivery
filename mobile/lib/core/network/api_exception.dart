/// Typed exception thrown by [ApiClient] for every failure mode.
///
/// `code` is a stable machine-readable key so the UI can branch without
/// string matching. `message` is the human-readable reason (preferring the
/// backend's own `message`/`error` field when present).
class ApiException implements Exception {
  const ApiException({
    this.statusCode,
    required this.message,
    required this.code,
  });

  final int? statusCode;
  final String message;
  final String code;

  bool get isUnauthorized => code == 'unauthorized' || code == 'auth_expired';

  bool get isNetwork => code == 'network';

  bool get isConnectionFailure => code == 'network' || code == 'timeout';

  factory ApiException.network() =>
      const ApiException(message: 'Unable to reach the OmniMarket server. Check your connection.', code: 'network');

  factory ApiException.timeout() =>
      const ApiException(message: 'The server took too long to respond. Please try again.', code: 'timeout');

  factory ApiException.unauthorized() =>
      const ApiException(statusCode: 401, message: 'Your session has expired. Please sign in again.', code: 'unauthorized');

  factory ApiException.forbidden() =>
      const ApiException(statusCode: 403, message: 'You do not have permission to perform this action.', code: 'forbidden');

  factory ApiException.notFound([String message = 'The requested resource was not found.']) =>
      ApiException(statusCode: 404, message: message, code: 'not_found');

  factory ApiException.validation([String message = 'Please check the information you entered.']) =>
      ApiException(statusCode: 422, message: message, code: 'validation');

  factory ApiException.server([String message = 'Something went wrong on the server.']) =>
      ApiException(statusCode: 500, message: message, code: 'server');

  factory ApiException.unknown([Object? cause]) => ApiException(
        message: cause == null
            ? 'An unexpected error occurred.'
            : 'An unexpected error occurred: $cause',
        code: 'unknown',
      );

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}
