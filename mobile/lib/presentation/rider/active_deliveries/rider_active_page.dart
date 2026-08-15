import 'package:flutter/material.dart';

import '../../../application/service_locator.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/order.dart';
import '../../../data/models/rider.dart';
import '../../../data/models/user_profile.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_indicator.dart';
import '../active_delivery/active_delivery_page.dart';

const _activeStatuses = [
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'in_transit',
  'arriving',
];
const _completedStatuses = ['delivered', 'completed'];

/// My Deliveries (ACTIVE): what is assigned to THIS rider, split into the real
/// Active and Completed buckets. The same list the desktop My Deliveries page
/// renders - just tab navigation instead of a sidebar.
class RiderActivePage extends StatefulWidget {
  const RiderActivePage({super.key});

  @override
  State<RiderActivePage> createState() => _RiderActivePageState();
}

class _RiderActivePageState extends State<RiderActivePage> {
  List<Order>? _orders;
  String? _error;
  Rider? _rider;
  bool _showCompleted = false;

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
      appBar: AppBar(title: const Text('My Deliveries')),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_orders == null) return const LoadingIndicator(message: 'Loading your deliveries...');
    final orders = _orders!;

    final active = orders.where((o) => _activeStatuses.contains(o.status)).toList();
    final completed = orders.where((o) => _completedStatuses.contains(o.status)).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: SegmentedButton<bool>(
            segments: const [
              ButtonSegment<bool>(value: false, label: Text('Active'), icon: Icon(Icons.delivery_dining_outlined)),
              ButtonSegment<bool>(value: true, label: Text('Completed'), icon: Icon(Icons.check_circle_outline)),
            ],
            selected: {_showCompleted},
            onSelectionChanged: (s) => setState(() => _showCompleted = s.first),
          ),
        ),
        if (!_showCompleted)
          Expanded(
            child: active.isEmpty
                ? const EmptyView(
                    message: 'No active deliveries. Accept a job from the Jobs tab to get going.',
                    icon: Icons.delivery_dining,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: active.length,
                    itemBuilder: (context, i) => _DeliveryTile(order: active[i], rider: _rider),
                  ),
          )
        else
          Expanded(
            child: completed.isEmpty
                ? const EmptyView(
                    message: 'No completed deliveries yet. They will appear here after delivery.',
                    icon: Icons.check_circle_outline,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: completed.length,
                    itemBuilder: (context, i) => _DeliveryTile(order: completed[i], rider: _rider),
                  ),
          ),
      ],
    );
  }
}

class _DeliveryTile extends StatelessWidget {
  const _DeliveryTile({required this.order, required this.rider});

  final Order order;
  final Rider? rider;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPackage = order.isPackageLike;
    return Card(
      child: ListTile(
        leading: Icon(
          isPackage ? Icons.inventory_2_outlined : Icons.restaurant,
          color: const Color(0xFF16A34A),
        ),
        title: Text(
          order.dropoffName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: order.deliveryType == 'PACKAGE'
                        ? const Color(0xFF2563EB).withValues(alpha: 0.12)
                        : order.deliveryType == 'PASS'
                            ? const Color(0xFF6D28D9).withValues(alpha: 0.12)
                            : const Color(0xFFB45309).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    order.deliveryKindBadge,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1,
                      color: order.deliveryType == 'PACKAGE'
                          ? const Color(0xFF2563EB)
                          : order.deliveryType == 'PASS'
                              ? const Color(0xFF6D28D9)
                              : const Color(0xFFB45309),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(child: Text('${order.deliveryReference} · ${order.deliveryKindTitle}', style: theme.textTheme.bodySmall)),
              ],
            ),
            Text(
              '${order.pickupName} to ${order.dropoffAddressLabel}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall,
            ),
            Text(
              '${order.status.replaceAll('_', ' ')} - ${Formatters.ghs(order.deliveryFee)}',
              style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF16A34A)),
            ),
          ],
        ),
        isThreeLine: true,
        onTap: () {
          final r = rider ?? Rider(id: '', userId: '', name: order.dropoffName);
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => RiderActiveDeliveryPage(order: order, rider: r),
            ),
          );
        },
      ),
    );
  }
}