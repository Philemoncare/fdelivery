import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/dashboards.dart';
import '../../data/models/order.dart';
import '../restaurant_location/restaurant_location_page.dart';
import '../shared/widgets/empty_view.dart';
import '../shared/widgets/error_view.dart';
import '../shared/widgets/loading_indicator.dart';
import '../shared/widgets/stat_card.dart';

class VendorDashboardPage extends StatefulWidget {
  const VendorDashboardPage({super.key});

  @override
  State<VendorDashboardPage> createState() => _VendorDashboardPageState();
}

class _VendorDashboardPageState extends State<VendorDashboardPage> {
  VendorDashboard? _dashboard;
  List<Order>? _orders;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    final app = ServiceLocator.instance.app;
    final user = app.currentUser;
    if (user == null) return;

    try {
      final vendorId = user.vendorId;
      if (vendorId == null) {
        throw StateError('Vendor account has no vendorId.');
      }
      final loc = ServiceLocator.instance;
      final dashboard = await loc.catalogRepository.vendorDashboard(vendorId);
      final orders = await loc.orderRepository.myOrders(user, status: 'pending');
      if (!mounted) return;
      setState(() {
        _dashboard = dashboard;
        _orders = orders;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = ServiceLocator.instance.app;
    final user = app.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant Dashboard'),
        actions: [
          if (user?.vendorId != null)
            IconButton(
              tooltip: 'Restaurant location',
              icon: const Icon(Icons.location_on_outlined),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => VendorRestaurantLocationPage(vendorId: user!.vendorId!),
                  ),
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
    if (_dashboard == null || _orders == null) {
      return const LoadingIndicator(message: 'Loading restaurant stats…');
    }
    final d = _dashboard!;
    return ListView(
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: StatCard(label: 'Orders', value: '${d.totalOrders}', icon: Icons.receipt_long)),
            Expanded(child: StatCard(label: 'Pending', value: '${d.todayActive}', icon: Icons.pending_actions)),
          ],
        ),
        Row(
          children: [
            Expanded(child: StatCard(label: 'Revenue', value: Formatters.ghs(d.revenueTotal), icon: Icons.attach_money)),
            Expanded(child: StatCard(label: 'Wallet', value: Formatters.ghs(d.walletBalance), icon: Icons.account_balance_wallet)),
          ],
        ),
        Row(
          children: [
            Expanded(child: StatCard(label: 'Rating', value: d.reviewsRating.toStringAsFixed(1), icon: Icons.star)),
            Expanded(child: StatCard(label: 'Low stock', value: '${d.lowStock}', icon: Icons.warning_amber)),
          ],
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text('Pending orders', style: Theme.of(context).textTheme.titleMedium),
        ),
        if (_orders!.isEmpty)
          const EmptyView(message: 'No pending orders right now.', icon: Icons.check_circle_outline)
        else
          ..._orders!.map(_orderTile),
      ],
    );
  }

  Widget _orderTile(Order o) {
    return Card(
      child: ListTile(
        title: Text(o.orderNumber),
        subtitle: Text(
          '${o.customerName.isNotEmpty ? '${o.customerName} • ' : ''}${o.itemCount} items • ${Formatters.ghs(o.totalAmount)}',
        ),
        trailing: Text(o.status, style: Theme.of(context).textTheme.labelMedium),
      ),
    );
  }
}
