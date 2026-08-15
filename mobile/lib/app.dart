import 'package:flutter/material.dart';

import 'application/app_controller.dart';
import 'application/service_locator.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/logger.dart';
import 'presentation/auth/forgot_password_page.dart';
import 'presentation/auth/login_page.dart';
import 'presentation/auth/otp_page.dart';
import 'presentation/auth/register_page.dart';
import 'presentation/auth/reset_password_page.dart';
import 'presentation/shell/role_shell.dart';
import 'presentation/splash/splash_page.dart';

class OmniMarketApp extends StatelessWidget {
  const OmniMarketApp({super.key, required this.locator});

  final ServiceLocator locator;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OmniMarket',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      initialRoute: '/',
      routes: {
        '/': (_) => const RootGate(),
        '/otp': (_) => const OtpPage(),
        '/register': (_) => const RegisterPage(),
        '/forgot-password': (_) => const ForgotPasswordPage(),
        '/reset-password': (_) => const ResetPasswordPage(),
      },
    );
  }
}

/// Switches between splash, login, retry and the role-based shell based on the
/// real session state.
class RootGate extends StatelessWidget {
  const RootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final app = ServiceLocator.instance.app;
    return ListenableBuilder(
      listenable: app,
      builder: (context, _) {
        Logger.info('RootGate: status=${app.status} user=${app.user?.email ?? 'none'}');
        return switch (app.status) {
          AuthStatus.bootstrapping => const SplashPage(),
          AuthStatus.authenticated => const RoleShell(),
          AuthStatus.unauthenticated =>
            app.sessionRestoreFailed ? const _BootRetryGate() : const LoginPage(),
        };
      },
    );
  }
}

class _BootRetryGate extends StatelessWidget {
  const _BootRetryGate();

  @override
  Widget build(BuildContext context) {
    final app = ServiceLocator.instance.app;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(
                  Icons.wifi_off,
                  size: 48,
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(height: 12),
                Text(
                  app.lastError ?? 'Unable to reach the OmniMarket server.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => app.retryBootstrap(),
                  child: const Text('Retry'),
                ),
                TextButton(
                  onPressed: () => app.acknowledgeBootFailure(),
                  child: const Text('Sign in anyway'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
