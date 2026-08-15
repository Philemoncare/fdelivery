import 'package:flutter/material.dart';

import '../../application/service_locator.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/product.dart';
import '../../data/models/user_profile.dart';
import '../../data/models/vendor.dart';
import '../delivery_tracking/delivery_tracking_page.dart';
import '../shared/widgets/empty_view.dart';
import '../shared/widgets/error_view.dart';
import '../shared/widgets/loading_indicator.dart';

class CustomerHomePage extends StatefulWidget {
  const CustomerHomePage({super.key});

  @override
  State<CustomerHomePage> createState() => _CustomerHomePageState();
}

class _CustomerHomePageState extends State<CustomerHomePage> {
  List<Vendor>? _vendors;
  List<Product>? _products;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final repo = ServiceLocator.instance.catalogRepository;
      final vendors = await repo.vendors();
      final products = await repo.products();
      if (!mounted) return;
      setState(() {
        _vendors = vendors;
        _products = products;
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
        title: Text(_greeting(user)),
        actions: [
          IconButton(
            tooltip: 'Track delivery',
            icon: const Icon(Icons.delivery_dining_outlined),
            onPressed: _openTracking,
          ),
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () => app.logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  /// Opens live tracking for the customer's most recent active delivery.
  /// Real backend ownership rules apply - an empty result shows a message.
  Future<void> _openTracking() async {
    final user = ServiceLocator.instance.app.currentUser;
    if (user == null) return;
    try {
      final orders = await ServiceLocator.instance.orderRepository.myOrders(user);
      final active = orders.where((o) => o.isActiveStatus).toList()
        ..sort((a, b) => (b.createdAt ?? '').compareTo(a.createdAt ?? ''));
      if (active.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You have no active delivery to track.')),
        );
        return;
      }
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DeliveryTrackingPage(orderId: active.first.id),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to load your delivery: $e')),
      );
    }
  }

  String _greeting(UserProfile? user) {
    final first = user?.firstName;
    if (first != null && first.isNotEmpty) return 'Hi, $first';
    return 'Hi, there';
  }

  Widget _buildBody() {
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }
    if (_vendors == null || _products == null) {
      return const LoadingIndicator(message: 'Loading the real catalog…');
    }
    if (_vendors!.isEmpty && _products!.isEmpty) {
      return const EmptyView(message: 'No restaurants or meals available yet.', icon: Icons.storefront);
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        if (_vendors!.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('Restaurants', style: Theme.of(context).textTheme.titleMedium),
          ),
          ..._vendors!.map(_vendorCard),
        ],
        if (_products!.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
            child: Text('Meals', style: Theme.of(context).textTheme.titleMedium),
          ),
          ..._products!.map(_productCard),
        ],
      ],
    );
  }

  Widget _vendorCard(Vendor v) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(child: Text(v.name.isNotEmpty ? v.name[0].toUpperCase() : 'R')),
        title: Text(v.name),
        subtitle: Text(
          '${v.city.isNotEmpty ? '${v.city} • ' : ''}'
          '${v.deliveryTime.isNotEmpty ? v.deliveryTime : '${v.averageDeliveryMinutes} min'}'
          '${v.deliveryFee > 0 ? ' • ${Formatters.ghs(v.deliveryFee)} delivery' : ''}',
        ),
        trailing: v.rating > 0
            ? Text('${v.rating.toStringAsFixed(1)} ★')
            : null,
      ),
    );
  }

  Widget _productCard(Product p) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: p.primaryImage.isNotEmpty
              ? NetworkImage(p.primaryImage)
              : null,
          child: p.primaryImage.isEmpty ? Text(p.title.isNotEmpty ? p.title[0].toUpperCase() : 'M') : null,
        ),
        title: Text(p.title),
        subtitle: Text('${p.vendorName.isNotEmpty ? '${p.vendorName} • ' : ''}${p.category}'),
        trailing: Text(Formatters.ghs(p.price)),
      ),
    );
  }
}
