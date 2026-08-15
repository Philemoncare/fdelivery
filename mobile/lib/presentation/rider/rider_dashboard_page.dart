import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/order.dart';
import '../../data/models/rider.dart';
import '../active_delivery/active_delivery_page.dart';
import 'messages/rider_messages_page.dart';
import '../shared/widgets/empty_view.dart';
import '../shared/widgets/error_view.dart';
import '../shared/widgets/loading_indicator.dart';
class RiderDashboardPage extends StatefulWidget {
  const RiderDashboardPage({super.key});

  @override
  State<RiderDashboardPage> createState() => _RiderDashboardPageState();
}

class _RiderDashboardPageState extends State<RiderDashboardPage> {
  Rider? _profile;
  List<Order>? _activeOrders;
  String? _error;
  bool _toggling = false;

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
      final loc = ServiceLocator.instance;
      final riders = await loc.riderRepository.riders();
      final orders = await loc.orderRepository.myOrders(user);
      final profile = riders.firstWhere(
        (r) => r.id == user.riderId || r.userId == user.id,
        orElse: () => Rider(id: user.riderId ?? '', userId: user.id, name: user.fullName),
      );
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _activeOrders = orders.where((o) => o.isActiveStatus).toList();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _toggleAvailability() async {
    final profile = _profile;
    if (profile == null || _toggling) return;
    setState(() => _toggling = true);
    try {
      final next = profile.isActive ? 'OFFLINE' : 'ONLINE';
      final updated = await ServiceLocator.instance.riderRepository
          .updateStatus(profile.id, next);
      if (!mounted) return;
      setState(() => _profile = updated);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = ServiceLocator.instance.app;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rider Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Messages',
            icon: const Icon(Icons.chat_bubble_outline),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const RiderMessagesPage()),
            ),
          ),
          IconButton(tooltip: 'Sign out', icon: const Icon(Icons.logout), onPressed: () => app.logout()),
        ],
      ),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_profile == null || _activeOrders == null) {
      return const LoadingIndicator(message: 'Loading rider profile…');
    }
    final p = _profile!;
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Card(
          child: ListTile(
            leading: CircleAvatar(child: Text(p.name.isNotEmpty ? p.name[0].toUpperCase() : 'R')),
            title: Text(p.name),
            subtitle: Text(
              '${p.vehicleType.isNotEmpty ? '${p.vehicleType} • ' : ''}'
              '${p.vehicleNumber.isNotEmpty ? p.vehicleNumber : 'no vehicle registered'}',
            ),
            trailing: FilledButton.tonal(
              onPressed: _toggling ? null : _toggleAvailability,
              child: Text(p.isActive ? 'Go offline' : 'Go online'),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text('Active deliveries', style: Theme.of(context).textTheme.titleMedium),
        ),
        if (_activeOrders!.isEmpty)
          const EmptyView(message: 'No active deliveries. Order updates arrive over SSE in real time.', icon: Icons.delivery_dining)
        else
          ..._activeOrders!.map(_orderTile),
      ],
    );
  }

  Widget _orderTile(Order o) {
    return Card(
      child: ListTile(
        leading: Icon(
          o.isPackageLike ? Icons.inventory_2_outlined : Icons.restaurant,
          color: const Color(0xFF16A34A),
        ),
        title: Text(o.dropoffName),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${o.deliveryReference} - ${o.status.replaceAll('_', ' ')}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              '${o.pickupName} to ${o.dropoffAddressLabel}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        isThreeLine: true,
        trailing: Text(Formatters.ghs(o.deliveryFee)),
        onTap: () {
          final profile = _profile;
          if (profile == null) return;
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => RiderActiveDeliveryPage(order: o, rider: profile),
            ),
          );
        },
      ),
    );
  }
}
