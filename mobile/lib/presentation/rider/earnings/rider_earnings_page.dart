import 'package:flutter/material.dart';

import '../../../application/service_locator.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/order.dart';
import '../../../data/models/rider.dart';
import '../../../data/models/user_profile.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_indicator.dart';

const _completedStatuses = ['delivered', 'completed'];

/// Earnings (EARNINGS): real money derived from THIS rider's delivery records
/// and the backend `totalEarnings`/`totalDeliveries` counters on the rider
/// record. Never hardcoded, never a fake "available balance" figure.
class RiderEarningsPage extends StatefulWidget {
  const RiderEarningsPage({super.key});

  @override
  State<RiderEarningsPage> createState() => _RiderEarningsPageState();
}

class _RiderEarningsPageState extends State<RiderEarningsPage> {
  Rider? _rider;
  List<Order>? _orders;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    final loc = ServiceLocator.instance;
    final user = loc.app.currentUser;
    if (user == null) return;
    try {
      final riders = await loc.riderRepository.riders();
      final orders = await loc.orderRepository.myOrders(user);
      final rider = riders.isEmpty
          ? null
          : riders.firstWhere(
              (r) => r.id == user.riderId || r.userId == user.id,
              orElse: () => Rider(
                id: user.riderId ?? '',
                userId: user.id,
                name: user.fullName,
              ),
            );
      if (!mounted) return;
      setState(() {
        _rider = rider;
        _orders = orders;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_rider == null || _orders == null) {
      return const LoadingIndicator(message: 'Loading earnings...');
    }
    final rider = _rider!;
    final completed = _orders!.where((o) => _completedStatuses.contains(o.status)).toList();
    final today = DateTime.now();
    final todayCompleted = completed
        .where((o) {
          final c = o.createdAt == null ? null : DateTime.tryParse(o.createdAt!);
          if (c == null) return false;
          return c.year == today.year && c.month == today.month && c.day == today.day;
        })
        .toList();
    final todayEarnings = todayCompleted.fold<num>(0, (a, o) => a + o.deliveryFee);
    final totalEarnings = rider.totalEarnings;

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        _StatCard(
          label: "Today's Earnings",
          value: Formatters.ghs(todayEarnings),
          icon: Icons.today,
          color: const Color(0xFF16A34A),
        ),
        _StatCard(
          label: 'Total Earnings',
          value: Formatters.ghs(totalEarnings),
          icon: Icons.account_balance_wallet,
          color: const Color(0xFFF59E0B),
        ),
        _StatCard(
          label: 'Deliveries Completed',
          value: '${rider.totalDeliveries}',
          icon: Icons.delivery_dining,
          color: const Color(0xFF3B82F6),
        ),
        if (rider.rating > 0)
          _StatCard(
            label: 'Rating',
            value: rider.rating.toStringAsFixed(1),
            icon: Icons.star,
            color: const Color(0xFFF43F5E),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text('Completed deliveries', style: Theme.of(context).textTheme.titleMedium),
        ),
        if (completed.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('No completed deliveries yet.')),
          )
        else
          ...completed.map((o) => Card(
                child: ListTile(
                  leading: const Icon(Icons.check_circle, color: Color(0xFF16A34A)),
                  title: Text('${o.deliveryKindBadge} · ${o.deliveryReference} - ${o.dropoffName}'),
                  subtitle: Text('${o.deliveryKindTitle} · ${o.status.replaceAll('_', ' ')} - ${Formatters.date(o.createdAt)}'),
                  trailing: Text(Formatters.ghs(o.deliveryFee),
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                ),
              )),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.bodySmall),
                Text(value,
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold, color: color)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}