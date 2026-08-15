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

/// Available Deliveries (JOBS): the live backend job pool.
///
/// Only eligible riders (approved, online, available, below the active cap)
/// receive jobs from `GET /api/orders/available`. Accepting goes through the
/// same `assignRider` call the web portal uses; the server decides, so an
/// already-taken job surfaces as an honest error, never a phantom card.
class RiderJobsPage extends StatefulWidget {
  const RiderJobsPage({super.key});

  @override
  State<RiderJobsPage> createState() => _RiderJobsPageState();
}

class _RiderJobsPageState extends State<RiderJobsPage> {
  List<Order>? _jobs;
  String? _error;
  UserProfile? _user;
  Rider? _rider;
  String? _acceptingId;

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
      final jobs = await loc.orderRepository.availableDeliveries();
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
        _user = user;
        _rider = rider;
        _jobs = jobs;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  bool get _online => _rider?.isActive ?? false;

  Future<void> _accept(Order job) async {
    final user = _user;
    if (user == null || _acceptingId != null) return;
    setState(() => _acceptingId = job.id);
    try {
      await ServiceLocator.instance.orderRepository.assignRider(job.id, user.id);
      if (!mounted) return;
      final rider = _rider;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => RiderActiveDeliveryPage(
            order: job,
            rider: rider ?? Rider(id: '', userId: user.id, name: user.fullName),
          ),
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Not available: $e')));
      _load();
    } finally {
      if (mounted) setState(() => _acceptingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Available Deliveries')),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_jobs == null) return const LoadingIndicator(message: 'Loading available jobs...');

    if (!_online) {
      return const EmptyView(
        message: "You're offline. Go online in Home to see available deliveries.",
        icon: Icons.wifi_off,
      );
    }

    if (_jobs!.isEmpty) {
      return const EmptyView(
        message: 'Waiting for deliveries... New jobs appear the moment an order is ready for pickup.',
        icon: Icons.radar,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _jobs!.length,
      itemBuilder: (context, i) => _JobCard(
        job: _jobs![i],
        accepting: _acceptingId == _jobs![i].id,
        onAccept: () => _accept(_jobs![i]),
      ),
    );
  }
}

Widget _kindBadge(BuildContext context, Order order) {
  final color = order.deliveryType == 'PACKAGE'
      ? const Color(0xFF2563EB)
      : order.deliveryType == 'PASS'
          ? const Color(0xFF6D28D9)
          : const Color(0xFFB45309);
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
    child: Text(
      order.deliveryKindBadge,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: color, letterSpacing: 1),
    ),
  );
}

class _JobCard extends StatelessWidget {
  const _JobCard({
    required this.job,
    required this.accepting,
    required this.onAccept,
  });

  final Order job;
  final bool accepting;
  final VoidCallback onAccept;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(job.pickupName, style: theme.textTheme.titleMedium),
                ),
                Text(
                  Formatters.ghs(job.deliveryFee),
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: const Color(0xFF16A34A),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                _kindBadge(context, job),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${job.deliveryKindTitle} · ${job.deliveryReference}',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.arrow_upward, size: 16, color: Color(0xFF16A34A)),
                const SizedBox(width: 6),
                Expanded(child: Text('Pickup · ${job.pickupName}', style: theme.textTheme.bodyMedium)),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.arrow_downward, size: 16, color: Color(0xFFDC2626)),
                const SizedBox(width: 6),
                Expanded(child: Text('Drop-off · ${job.dropoffAddressLabel}', style: theme.textTheme.bodyMedium)),
              ],
            ),
            const SizedBox(height: 6),
            if (!job.isPackageLike && job.itemCount > 0)
              Text(
                '${job.itemCount} item${job.itemCount == 1 ? '' : 's'} - ${job.estimatedDeliveryTime.isNotEmpty ? job.estimatedDeliveryTime : '35-45 mins'}',
                style: theme.textTheme.bodySmall,
              ),
            if (job.isPackageLike)
              Text(
                '${job.packageSize} ${job.packageType}'.trim().isEmpty
                    ? 'Package item'
                    : '${job.packageSize} ${job.packageType}'.trim(),
                style: theme.textTheme.bodySmall,
              ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonal(
                onPressed: accepting ? null : onAccept,
                child: Text(accepting ? 'Accepting...' : 'Accept Delivery'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}