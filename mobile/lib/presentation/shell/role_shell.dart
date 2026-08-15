import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../data/models/role.dart';
import '../admin/admin_dashboard_page.dart';
import '../customer/customer_home_page.dart';
import '../rider/rider_home_shell.dart';
import '../super_admin/super_admin_dashboard_page.dart';
import '../vendor/vendor_dashboard_page.dart';

/// Routes to the correct dashboard based on the REAL role the backend
/// returned in `GET /api/auth/me`. Unknown/unexpected roles are treated as an
/// error, never silently upgraded.
class RoleShell extends StatelessWidget {
  const RoleShell({super.key});

  @override
  Widget build(BuildContext context) {
    final user = ServiceLocator.instance.app.currentUser;
    if (user == null) {
      return const Scaffold(body: Center(child: Text('No signed-in user.')));
    }

    return switch (user.role) {
      AppRole.customer => const CustomerHomePage(),
      AppRole.vendor => const VendorDashboardPage(),
      AppRole.rider => const RiderHomeShell(),
      AppRole.administrator => const AdminDashboardPage(),
      AppRole.superAdministrator => const SuperAdminDashboardPage(),
      AppRole.vendorStaff || AppRole.storeManager =>
        const VendorDashboardPage(),
      AppRole.unknown => const _UnknownRoleView(),
    };
  }
}

class _UnknownRoleView extends StatelessWidget {
  const _UnknownRoleView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('OmniMarket')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 12),
              const Text('The server returned an unknown account type.'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ServiceLocator.instance.app.logout(),
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
