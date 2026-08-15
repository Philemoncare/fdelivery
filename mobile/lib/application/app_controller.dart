import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/network/api_exception.dart';
import '../core/realtime/realtime_service.dart';
import '../core/utils/logger.dart';
import '../data/models/auth_models.dart';
import '../data/models/user_profile.dart';
import 'service_locator.dart';

enum AuthStatus { bootstrapping, unauthenticated, authenticated }

/// Single source of truth for auth + session state.
///
/// Flows: bootstrap (session restore) -> login -> OTP -> authenticated.
/// Any API 401 that can no longer be refreshed funnels into
/// [handleSessionExpired], clearing the secure-storage session.
class AppController extends ChangeNotifier {
  AppController(this._locator);

  final ServiceLocator _locator;

  AuthStatus status = AuthStatus.bootstrapping;
  UserProfile? user;
  String? lastError;
  bool sessionRestoreFailed = false;

  // Pending OTP login state (identifier + portal from the login step).
  String? pendingIdentifier;
  String pendingPortal = 'app';
  bool awaitingOtp = false;

  bool _loading = false;
  StreamSubscription<RealtimeEvent>? _rtSub;
  Stream<RealtimeEvent>? _realtimeEvents;
  RealtimeEvent? _lastRealtimeEvent;

  bool get isLoading => _loading;

  UserProfile? get currentUser => user;

  /// Latest realtime event (SSE) - pages listen to refresh their data.
  Stream<RealtimeEvent>? get realtimeEvents => _realtimeEvents;
  RealtimeEvent? get lastRealtimeEvent => _lastRealtimeEvent;

  // ---- lifecycle -------------------------------------------------------------

  Future<void> bootstrap() async {
    status = AuthStatus.bootstrapping;
    notifyListeners();

    final token = await _locator.storage.readAccessToken();
    if (token == null || token.isEmpty) {
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    try {
      user = await _locator.authRepository.me();
      status = AuthStatus.authenticated;
      lastError = null;
      sessionRestoreFailed = false;
      _startRealtime();
    } on ApiException catch (e) {
      Logger.warning('Bootstrap failed: ${e.code} - ${e.message}');
      if (e.isUnauthorized) {
        await _locator.storage.clearSession();
        user = null;
        sessionRestoreFailed = false;
        status = AuthStatus.unauthenticated;
      } else {
        // Server unreachable at startup: show an honest retry screen.
        lastError = e.message;
        sessionRestoreFailed = true;
        status = AuthStatus.unauthenticated;
      }
    }
    notifyListeners();
  }

  Future<void> retryBootstrap() => bootstrap();

  /// User chose "sign in anyway" from the failed-restore screen.
  void acknowledgeBootFailure() {
    sessionRestoreFailed = false;
    lastError = null;
    notifyListeners();
  }

  // ---- auth flow ----------------------------------------------------------------

  /// Step 1: email-or-phone + password. The backend replies `requiresOtp: true`.
  Future<AuthResult> login({
    required String identifier,
    required String password,
    bool adminPortal = false,
  }) async {
    _setLoading(true);
    try {
      final portal = adminPortal ? 'admin' : 'app';
      final result = await _locator.authRepository.login(
        identifier: identifier,
        password: password,
        portal: portal,
      );
      if (result.requiresOtp) {
        pendingIdentifier = identifier.trim();
        pendingPortal = portal;
        awaitingOtp = true;
      }
      return result;
    } on ApiException {
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  /// Step 2: verify the emailed OTP (`123456` is the documented demo code).
  Future<AuthResult> submitOtp(String code) async {
    final identifier = pendingIdentifier;
    if (identifier == null) {
      throw ApiException.validation('Missing login identifier. Please sign in again.');
    }
    _setLoading(true);
    try {
      final result = await _locator.authRepository.verifyOtp(
        identifier: identifier,
        code: code,
        portal: pendingPortal,
      );
      if (result.completed) {
        user = result.user;
        awaitingOtp = false;
        pendingIdentifier = null;
        status = AuthStatus.authenticated;
        lastError = null;
        sessionRestoreFailed = false;
        _startRealtime();
        notifyListeners();
      }
      return result;
    } on ApiException {
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> resendOtp() async {
    final identifier = pendingIdentifier;
    if (identifier == null) return;
    await _locator.authRepository.resendOtp(identifier: identifier);
  }

  Future<AuthResult> register(Map<String, dynamic> payload) async {
    _setLoading(true);
    try {
      final result = await _locator.authRepository.register(payload);
      // New accounts have no tokens; prefill the OTP/login flow.
      final email = payload['email']?.toString() ?? '';
      pendingIdentifier = email.isNotEmpty ? email : pendingIdentifier;
      return result;
    } on ApiException {
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> sendVerification() async {
    await _locator.authRepository.sendVerification();
  }

  Future<AuthResult> verifyEmail(String code) async {
    final result = await _locator.authRepository.verifyEmail(code);
    if (result.user != null) {
      user = result.user;
      notifyListeners();
    }
    return result;
  }

  // ---- session teardown ---------------------------------------------------------

  Future<void> logout() async {
    _cancelRealtime();
    user = null;
    awaitingOtp = false;
    pendingIdentifier = null;
    sessionRestoreFailed = false;
    status = AuthStatus.unauthenticated;
    await _locator.storage.clearSession();
    notifyListeners();
  }

  /// Called by the ApiClient when a token refresh is impossible.
  void handleSessionExpired() {
    _cancelRealtime();
    user = null;
    awaitingOtp = false;
    pendingIdentifier = null;
    sessionRestoreFailed = false;
    status = AuthStatus.unauthenticated;
    lastError = null;
    notifyListeners();
  }

  // ---- realtime -----------------------------------------------------------------

  void _startRealtime() {
    _cancelRealtime();
    final events = _locator.realtime.connect().asBroadcastStream();
    _realtimeEvents = events;
    _rtSub = events.listen(
      (e) {
        _lastRealtimeEvent = e;
        notifyListeners();
        Logger.info('Realtime event: ${e.event}');
      },
      onError: (Object e) => Logger.warning('Realtime error: $e'),
    );
  }

  void _cancelRealtime() {
    _rtSub?.cancel();
    _rtSub = null;
    _realtimeEvents = null;
  }

  void _setLoading(bool value) {
    _loading = value;
    notifyListeners();
  }

  @override
  void dispose() {
    _cancelRealtime();
    super.dispose();
  }
}
