import 'package:flutter/material.dart';

import '../../../application/service_locator.dart';
import '../../../data/models/rider.dart';
import '../../../core/utils/formatters.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_indicator.dart';

/// Profile (PROFILE): the rider's real backend record plus sign out.
class RiderProfilePage extends StatefulWidget {
  const RiderProfilePage({super.key});

  @override
  State<RiderProfilePage> createState() => _RiderProfilePageState();
}

class _RiderProfilePageState extends State<RiderProfilePage> {
  Rider? _rider;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    final user = ServiceLocator.instance.app.currentUser;
    if (user == null) return;
    try {
      final riders = await ServiceLocator.instance.riderRepository.riders();
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
      setState(() => _rider = rider);
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
        title: const Text('Profile'),
        actions: [
          IconButton(tooltip: 'Sign out', icon: const Icon(Icons.logout), onPressed: app.logout),
        ],
      ),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_rider == null) return const LoadingIndicator(message: 'Loading profile...');
    final p = _rider!;
    final user = ServiceLocator.instance.app.currentUser;

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        Card(
          child: ListTile(
            leading: CircleAvatar(
              child: Text(p.name.isNotEmpty ? p.name[0].toUpperCase() : 'R'),
            ),
            title: Text(p.name),
            subtitle: Text(user?.email ?? ''),
          ),
        ),
        _InfoTile(label: 'Vehicle', value: p.vehicleType.isNotEmpty ? p.vehicleType : 'Not set'),
        _InfoTile(label: 'Vehicle number', value: p.vehicleNumber.isNotEmpty ? p.vehicleNumber : 'Not set'),
        _InfoTile(label: 'Status', value: p.isActive ? 'Online' : 'Offline'),
        _InfoTile(label: 'Delivery fee', value: Formatters.ghs(p.deliveryFee)),
        _InfoTile(label: 'Rider ID', value: p.id),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text('Verification', style: Theme.of(context).textTheme.titleMedium),
        ),
        _InfoTile(
          label: 'Verification',
          value: p.verificationStatus.isNotEmpty ? p.verificationStatus : (p.isVerified ? 'Verified' : 'Not verified'),
        ),
        _InfoTile(label: 'Phone', value: p.phone.isNotEmpty ? p.phone : 'Not shared'),
        Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.tonalIcon(
            onPressed: app.logout,
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
        ),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(label),
      ),
    );
  }
}