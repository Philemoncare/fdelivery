import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/dashboards.dart';
import '../shared/widgets/empty_view.dart';
import '../shared/widgets/error_view.dart';
import '../shared/widgets/loading_indicator.dart';
import '../shared/widgets/stat_card.dart';

class SuperAdminDashboardPage extends StatefulWidget {
  const SuperAdminDashboardPage({super.key});

  @override
  State<SuperAdminDashboardPage> createState() => _SuperAdminDashboardPageState();
}

class _SuperAdminDashboardPageState extends State<SuperAdminDashboardPage> {
  AdminStats? _stats;
  Map<String, dynamic>? _settings;
  List<dynamic>? _audit;
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
      final settings = await loc.superAdminRepository.platformSettings();
      final audit = await loc.superAdminRepository.audit();
      if (!mounted) return;
      setState(() {
        _stats = stats;
        _settings = settings;
        _audit = audit;
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
        title: const Text('Super Admin'),
        actions: [
          IconButton(tooltip: 'Sign out', icon: const Icon(Icons.logout), onPressed: () => app.logout()),
        ],
      ),
      body: RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_stats == null || _settings == null || _audit == null) {
      return const LoadingIndicator(message: 'Loading platform overview…');
    }
    final s = _stats!;
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Row(
          children: [
            Expanded(child: StatCard(label: 'Orders', value: '${s.orders}', icon: Icons.receipt_long)),
            Expanded(child: StatCard(label: 'Revenue', value: Formatters.ghs(s.revenue), icon: Icons.attach_money)),
          ],
        ),
        Row(
          children: [
            Expanded(child: StatCard(label: 'Commission', value: Formatters.ghs(s.platformCommission), icon: Icons.percent)),
            Expanded(child: StatCard(label: 'Rider earnings', value: Formatters.ghs(s.riderEarnings), icon: Icons.delivery_dining)),
          ],
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Platform settings'),
            subtitle: Text(_settings!.isEmpty ? 'No settings returned' : _settings!.keys.join(', ')),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text('Audit trail (${_audit!.length})', style: Theme.of(context).textTheme.titleMedium),
        ),
        if (_audit!.isEmpty)
          const EmptyView(message: 'No audit entries yet.', icon: Icons.history)
        else
          ..._audit!.take(20).map((entry) {
            final e = entry as Map<String, dynamic>;
            return Card(
              child: ListTile(
                dense: true,
                title: Text(e['action']?.toString() ?? 'audit entry'),
                subtitle: Text(
                  '${e['actorEmail']?.toString() ?? 'unknown'} • ${Formatters.shortDate(e['timestamp']?.toString())}',
                ),
                trailing: Text(e['result']?.toString() ?? ''),
              ),
            );
          }),
      ],
    );
  }
}
