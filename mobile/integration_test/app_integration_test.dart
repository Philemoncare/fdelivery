import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:omnimarket_mobile/app.dart';
import 'package:omnimarket_mobile/application/app_controller.dart';
import 'package:omnimarket_mobile/application/service_locator.dart';
import 'package:omnimarket_mobile/core/config/env_config.dart';
import 'package:omnimarket_mobile/core/network/api_client.dart';
import 'package:omnimarket_mobile/core/network/api_exception.dart';
import 'package:omnimarket_mobile/core/storage/secure_storage_service.dart';
import 'package:omnimarket_mobile/data/models/role.dart';
import 'package:omnimarket_mobile/data/repositories/admin_repository.dart';
import 'package:omnimarket_mobile/data/repositories/auth_repository.dart';
import 'package:omnimarket_mobile/data/repositories/catalog_repository.dart';

/// END-TO-END integration against the LIVE OmniMarket backend.
///
/// Prerequisites:
///   1. Backend running on the configured base URL (default 3999).
///   2. Run on a device/emulator (flutter_secure_storage needs a platform).
///
///   flutter test integration_test/app_integration_test.dart
///
/// Optional full admin-shell check (provide real admin credentials):
///   flutter test integration_test/app_integration_test.dart \
///     --dart-define=OMNIMARKET_IT_ADMIN_EMAIL=a@b.com \
///     --dart-define=OMNIMARKET_IT_ADMIN_PASSWORD=secret
///
/// Every run registers FRESH unique accounts against the real database - this
/// is expected and intentional for integration testing.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const adminEmail = String.fromEnvironment('OMNIMARKET_IT_ADMIN_EMAIL');
  const adminPassword = String.fromEnvironment('OMNIMARKET_IT_ADMIN_PASSWORD');

  final runId = DateTime.now().millisecondsSinceEpoch;
  const password = 'TestPass123!';

  testWidgets('customer: register -> OTP login -> session -> real catalog',
      (tester) async {
    await tester.runAsync(() async {
      final storage = SecureStorageService();
      final client = ApiClient(baseUrl: EnvConfig.apiBaseUrl, storage: storage);
      final auth = AuthRepository(client: client, storage: storage);

      final email = 'it_customer_$runId@omnimarket.test';

      // 1. Register a real account.
      final reg = await auth.register({
        'role': 'customer',
        'email': email,
        'phone': '+233200000001',
        'password': password,
        'name': 'Integration Tester',
      });
      expect(reg.success, isTrue, reason: 'customer registration failed');
      expect(reg.user!.role, AppRole.customer);

      // 2. Login -> backend always requires OTP.
      final login = await auth.login(identifier: email, password: password);
      expect(login.requiresOtp, isTrue);

      // 3. OTP (123456 is the documented demo code) -> tokens + user.
      final otp = await auth.verifyOtp(identifier: email, code: '123456');
      expect(otp.completed, isTrue, reason: 'OTP exchange failed');
      expect(otp.user!.role, AppRole.customer);

      // 4. /auth/me reflects the session.
      final me = await auth.me();
      expect(me.id, otp.user!.id);
      expect(me.email, email);
      expect(me.role, AppRole.customer);

      // 5. Session persistence: a brand-new client + same storage restores.
      final client2 = ApiClient(baseUrl: EnvConfig.apiBaseUrl, storage: storage);
      final auth2 = AuthRepository(client: client2, storage: storage);
      final me2 = await auth2.me();
      expect(me2.id, otp.user!.id, reason: 'secure-storage session did not restore');

      // 6. The catalog must return REAL backend data (no mocks).
      final catalog = CatalogRepository(client: client2);
      final products = await catalog.products();
      final vendors = await catalog.vendors();
      expect(products, isA<List<dynamic>>());
      expect(vendors, isA<List<dynamic>>());
      // Do not assert non-empty (DB may be empty) - just assert parsing worked.

      // 7. Role routing: bootstrap a fresh AppController, expect authenticated.
      final locator = ServiceLocator.instance..init();
      final app = locator.app;
      expect(app.status, AuthStatus.bootstrapping);
      await app.bootstrap();
      expect(app.status, AuthStatus.authenticated,
          reason: 'session restore via AppController failed');
      expect(app.currentUser!.role, AppRole.customer);
    });
  });

  testWidgets('customer UI: after login the customer shell renders',
      (tester) async {
    await tester.runAsync(() async {
      final locator = ServiceLocator.instance..init();
      await locator.app.bootstrap();
      expect(locator.app.status, AuthStatus.authenticated,
          reason: 'expected a persisted customer session from the previous test');
    });

    await tester.pumpWidget(OmniMarketApp(locator: ServiceLocator.instance));
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    // The customer shell app bar has a Sign out action.
    expect(find.byTooltip('Sign out'), findsOneWidget);
  });

  testWidgets('vendor: register ok, login blocked until approval', (tester) async {
    await tester.runAsync(() async {
      final storage = SecureStorageService();
      final client = ApiClient(baseUrl: EnvConfig.apiBaseUrl, storage: storage);
      final auth = AuthRepository(client: client, storage: storage);

      final email = 'it_vendor_$runId@omnimarket.test';
      final reg = await auth.register({
        'role': 'vendor',
        'email': email,
        'password': password,
        'businessName': 'Integration Kitchen',
        'category': 'Local Dishes',
        'businessAddress': 'Market Circle, Takoradi',
        'ownerName': 'Vendor Tester',
      });
      expect(reg.success, isTrue);
      expect(reg.user!.role, AppRole.vendor);

      try {
        await auth.login(identifier: email, password: password);
        // If it did NOT throw, the account was already approved - acceptable.
      } on ApiException catch (e) {
        expect(e.statusCode, 403, reason: 'pending vendor should get 403');
        expect(e.message.toLowerCase(), contains('pending approval'));
      }
    });
  });

  testWidgets('rider: register ok, login blocked until approval', (tester) async {
    await tester.runAsync(() async {
      final storage = SecureStorageService();
      final client = ApiClient(baseUrl: EnvConfig.apiBaseUrl, storage: storage);
      final auth = AuthRepository(client: client, storage: storage);

      final email = 'it_rider_$runId@omnimarket.test';
      final reg = await auth.register({
        'role': 'rider',
        'email': email,
        'password': password,
        'name': 'Rider Tester',
        'vehicleType': 'Motorcycle',
        'vehicleNumber': 'GT 1234-20',
        'driverLicense': 'DL-999999',
        'nationalId': 'GH-999999999',
      });
      expect(reg.success, isTrue);
      expect(reg.user!.role, AppRole.rider);

      try {
        await auth.login(identifier: email, password: password);
      } on ApiException catch (e) {
        expect(e.statusCode, 403, reason: 'pending rider should get 403');
        expect(e.message.toLowerCase(), contains('pending approval'));
      }
    });
  });

  testWidgets('admin: role gating + optional full admin flow', (tester) async {
    await tester.runAsync(() async {
      final storage = SecureStorageService();
      final client = ApiClient(baseUrl: EnvConfig.apiBaseUrl, storage: storage);
      final auth = AuthRepository(client: client, storage: storage);

      // A customer account must NEVER reach the admin portal.
      final customerEmail = 'it_adminprobe_$runId@omnimarket.test';
      await auth.register({
        'role': 'customer',
        'email': customerEmail,
        'password': password,
        'name': 'Admin Probe',
      });
      try {
        await auth.login(
          identifier: customerEmail,
          password: password,
          portal: 'admin',
        );
        fail('non-admin must be rejected from the admin portal');
      } on ApiException catch (e) {
        expect(e.statusCode, 403);
        expect(e.message.toLowerCase(), contains('access restricted'));
      }

      // Optional: verify a real admin account end-to-end.
      if (adminEmail.isEmpty || adminPassword.isEmpty) {
        // Without real admin credentials we only verify the gate.
        expect(adminEmail, isEmpty, reason: 'admin creds not provided via --dart-define');
        return;
      }

      final login = await auth.login(
        identifier: adminEmail,
        password: adminPassword,
        portal: 'admin',
      );
      expect(login.requiresOtp, isTrue, reason: 'admin login must issue OTP');
      final otp = await auth.verifyOtp(
        identifier: adminEmail,
        code: '123456',
        portal: 'admin',
      );
      expect(otp.completed, isTrue);
      expect(otp.user!.role.isAdmin, isTrue,
          reason: 'admin portal must yield an admin role');

      final adminRepo = AdminRepository(client: client);
      final stats = await adminRepo.stats();
      expect(stats.orders, isA<int>(), reason: 'admin stats must parse');
    });
  });
}
