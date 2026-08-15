import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/dashboards.dart';
import '../../data/models/user_profile.dart';
import '../delivery_monitoring/delivery_monitoring_page.dart';
import '../shared/widgets/empty_view.dart';
import '../shared/widgets/error_view.dart';
import '../shared/widgets/loading_indicator.dart';
import '../shared/widgets/stat_card.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  AdminStats? _stats;
  List<UserProfile>? _users;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final loc = ServiceLocator.instance;
      final stats = await loc.adminRepository.stats();
      final users = await loc.adminRepository.users();
      if (!mounted) return;
      setState(() {
        _stats = stats;
        _users = users;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = ServiceLocator.instance.app;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Delivery monitoring',
            icon: const Icon(Icons.delivery_dining),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const AdminDeliveryMonitoringPage()),
              );
            },
          ),
          IconButton(tooltip: 'Sign out', icon: const Icon(Icons.logout), onPressed: () => app.logout()),
        ],
      ),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_stats == null || _users == null) {
      return const LoadingIndicator(message: 'Loading admin stats…');
    }
    final s = _stats!;
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Row(
          children: [
            Expanded(child: StatCard(label: 'Customers', value: '${s.customers}', icon: Icons.people)),
            Expanded(child: StatCard(label: 'Restaurants', value: '${s.vendors}', icon: Icons.storefront)),
          ],
        ),
        Row(
          children: [
            Expanded(child: StatCard(label: 'Pending restaurants', value: '${s.pendingVendors}', icon: Icons.hourglass_top)),
            Expanded(child: StatCard(label: 'Riders', value: '${s.riders}', icon: Icons.delivery_dining)),
          ],
        ),
        Row(
          children: [
            Expanded(child: StatCard(label: 'Orders', value: '${s.orders}', icon: Icons.receipt_long)),
            Expanded(child: StatCard(label: 'Revenue', value: Formatters.ghs(s.revenue), icon: Icons.attach_money)),
          ],
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text('Users (${_users!.length})', style: Theme.of(context).textTheme.titleMedium),
        ),
        if (_users!.isEmpty)
          const EmptyView(message: 'No users found.', icon: Icons.person_search)
        else
          ..._users!.map(_userTile),
      ],
    );
  }

  Widget _userTile(UserProfile u) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          child: Text(u.fullName.isNotEmpty ? u.fullName[0].toUpperCase() : 'U'),
        ),
        title: Text(u.fullName),
        subtitle: Text(u.email),
        trailing: Text(u.role.label, style: Theme.of(context).textTheme.labelMedium),
      ),
    );
  }
}
