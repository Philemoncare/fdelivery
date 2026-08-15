import 'package:flutter/material.dart';

import '../active_deliveries/rider_active_page.dart';
import '../earnings/rider_earnings_page.dart';
import '../jobs/rider_jobs_page.dart';
import '../profile/rider_profile_page.dart';
import '../rider_dashboard_page.dart';

/// Rider shell with the canonical bottom navigation:
/// HOME / JOBS / ACTIVE / EARNINGS / PROFILE.
///
///  * HOME    = the rider dashboard: online toggle, current delivery(s)
///  * JOBS    = Available Deliveries (backend job pool)
///  * ACTIVE  = My Deliveries: Active + Completed tabs
///  * EARNINGS= real money stats from delivery records
///  * PROFILE = rider profile + sign out
///
/// All five tabs read the same backend the desktop portal uses; there is no
/// orders-only rider flow, no fake counters, and no "Scanning…" placeholders.
class RiderHomeShell extends StatefulWidget {
  const RiderHomeShell({super.key});

  @override
  State<RiderHomeShell> createState() => _RiderHomeShellState();
}

class _RiderHomeShellState extends State<RiderHomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [
          RiderDashboardPage(),
          RiderJobsPage(),
          RiderActivePage(),
          RiderEarningsPage(),
          RiderProfilePage(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping),
            label: 'Jobs',
          ),
          NavigationDestination(
            icon: Icon(Icons.delivery_dining_outlined),
            selectedIcon: Icon(Icons.delivery_dining),
            label: 'Active',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: 'Earnings',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}