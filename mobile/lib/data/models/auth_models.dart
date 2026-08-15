import 'json_helpers.dart';
import 'user_profile.dart';

/// `{ accessToken, refreshToken, expiresIn, tokenType }` from the backend.
class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn = 3600,
    this.tokenType = 'Bearer',
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final String tokenType;

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json.ss('accessToken'),
      refreshToken: json.ss('refreshToken'),
      expiresIn: json.ii('expiresIn', 3600),
      tokenType: json.ss('tokenType', 'Bearer'),
    );
  }
}

/// Union returned by `/api/auth/login`, `/api/auth/verify-otp`,
/// `/api/auth/verify-email` and `/api/auth/register`.
class AuthResult {
  const AuthResult({
    this.success = false,
    this.requiresOtp = false,
    this.message = '',
    this.user,
    this.tokens,
  });

  final bool success;
  final bool requiresOtp;
  final String message;
  final UserProfile? user;
  final AuthTokens? tokens;

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      success: json.b('success'),
      requiresOtp: json.b('requiresOtp'),
      message: json.ss('message'),
      user: json.o('user', UserProfile.fromJson),
      tokens: json.o('tokens', AuthTokens.fromJson),
    );
  }

  bool get completed => user != null && tokens != null;
}
