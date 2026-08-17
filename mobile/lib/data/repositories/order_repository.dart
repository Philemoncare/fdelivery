import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/order.dart';
import '../models/user_profile.dart';

/// Orders: list (role scoped), detail, tracking, create, status, dispatch.
///
/// The backend enforces ownership: a customer/vendor/rider can only ever see
/// their own records, so the client only has to send the correct `role`/`id`
/// scope and handle 403s honestly.
class OrderRepository {
  OrderRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  /// `GET /api/orders?role=&id=` - scope with the CURRENT user's role.
  Future<List<Order>> myOrders(UserProfile user, {String? status}) async {
    final data = await _client.get(ApiPaths.orders, query: {
      'role': user.role.apiValue,
      'id': user.vendorId ?? user.riderId ?? user.id,
    }) as List<dynamic>;
    final orders = data
        .whereType<Map<String, dynamic>>()
        .map(Order.fromJson)
        .toList();
    if (status == null || status.isEmpty) return orders;
    return orders.where((o) => o.status == status).toList();
  }

  Future<Order> order(String id) async {
    final data = await _client.get(ApiPaths.order(id)) as Map<String, dynamic>;
    return Order.fromJson(data);
  }

  Future<Order> tracking(String reference) async {
    final data =
        await _client.get(ApiPaths.orderTracking(reference)) as Map<String, dynamic>;
    return Order.fromJson(data);
  }

  /// `POST /api/orders` - items are built from [OrderItem.toOrderPayload].
  /// `vendorLat`/`vendorLng` are only sent when the caller actually has the
  /// restaurant's coordinates (owner/admin view of the vendor record) - never
  /// invented.
  Future<Order> createOrder({
    required String customerId,
    required String vendorId,
    required List<OrderItem> items,
    required String paymentMethod,
    String deliveryMethod = 'delivery',
    String? address,
    String? deliveryAddressId,
    String? paymentMethodId,
    String? specialInstructions,
    String? couponCode,
    num? customerLat,
    num? customerLng,
    num? vendorLat,
    num? vendorLng,
  }) async {
    final payload = {
      'items': items.map((i) => i.toOrderPayload()).toList(),
      'customerId': customerId,
      'vendorId': vendorId,
      'paymentMethod': paymentMethod,
      'deliveryMethod': deliveryMethod,
      if (address != null && address.isNotEmpty) 'address': address,
      if (deliveryAddressId != null && deliveryAddressId.isNotEmpty)
        'deliveryAddressId': deliveryAddressId,
      if (paymentMethodId != null && paymentMethodId.isNotEmpty)
        'paymentMethodId': paymentMethodId,
      if (specialInstructions != null && specialInstructions.isNotEmpty)
        'specialInstructions': specialInstructions,
      if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      if (customerLat != null) 'customerLat': customerLat,
      if (customerLng != null) 'customerLng': customerLng,
      if (vendorLat != null) 'vendorLat': vendorLat,
      if (vendorLng != null) 'vendorLng': vendorLng,
    };
    final data =
        await _client.post(ApiPaths.orders, body: payload) as Map<String, dynamic>;
    return Order.fromJson(data);
  }

  /// `PATCH /api/orders/:id/status` - owner/admin only.
  Future<Order> updateStatus(String id, String status) async {
    final data = await _client
        .patch(ApiPaths.orderStatus(id), body: {'status': status})
        as Map<String, dynamic>;
    return Order.fromJson(data);
  }

  Future<Order> assignRider(String id, String riderId) async {
    final data = await _client
        .post(ApiPaths.orderAssignRider(id), body: {'riderId': riderId})
        as Map<String, dynamic>;
    return Order.fromJson(data);
  }

  /// `GET /api/orders/available` - the live job pool for the signed-in rider.
  /// The backend only returns jobs to eligible riders (approved, online,
  /// available, below the active cap), so this list is always authoritative.
  Future<List<Order>> availableDeliveries() async {
    final data =
        await _client.get(ApiPaths.ordersAvailable) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Order.fromJson)
        .toList();
  }

  /// `POST /api/orders/:id/complete` - the single idempotent completion path.
  /// The backend decides the legal transition from the real order state and
  /// settles payout/earnings exactly once, so the client never races with it.
  Future<Order> completeDelivery(String id) async {
    final data =
        await _client.post(ApiPaths.orderComplete(id)) as Map<String, dynamic>;
    return Order.fromJson(data);
  }

  /// `POST /api/orders/package/quote` - public server-authoritative estimate.
  /// Coords/size/weight/service + optional preferred rider self map to the same
  /// fee engine used at creation, so the quoted total can never diverge.
  Future<Map<String, dynamic>> quotePackage(Map<String, dynamic> input) async {
    return await _client.post(
      ApiPaths.packageQuote,
      body: input,
    ) as Map<String, dynamic>;
  }

  /// `POST /api/orders/package` - create a PACKAGE / PASS booking. Structured
  /// location components and special instructions are passed through verbatim;
  /// the receiver phone is normalized to +233 on the backend.
  Future<Order> createPackageDelivery(Map<String, dynamic> input) async {
    final data = await _client.post(
      ApiPaths.packageOrders,
      body: input,
    ) as Map<String, dynamic>;
    return Order.fromJson(data);
  }

  /// `POST /api/orders/:id/receiver-confirm` - receiver confirmation for
  /// PACKAGE / PASS, via the short code the sender relays to the recipient.
  Future<Order> receiverConfirm(String id, {String? code}) async {
    final data = await _client.post(
      ApiPaths.orderReceiverConfirm(id),
      body: code == null || code.isEmpty ? {} : {'code': code},
    ) as Map<String, dynamic>;
    return Order.fromJson(data['order'] ?? data);
  }
}
