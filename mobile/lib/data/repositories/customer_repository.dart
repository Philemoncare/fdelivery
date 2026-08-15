import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/address.dart';

class CustomerRepository {
  CustomerRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<Map<String, dynamic>> profile(String customerId) async =>
      await _client.get(ApiPaths.customer(customerId)) as Map<String, dynamic>;

  Future<Map<String, dynamic>> updateProfile(String customerId, Map<String, dynamic> payload) async {
    return await _client
        .patch(ApiPaths.customer(customerId), body: payload)
        as Map<String, dynamic>;
  }

  Future<List<Address>> addresses(String customerId) async {
    final data =
        await _client.get(ApiPaths.customerAddresses(customerId)) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Address.fromJson)
        .toList();
  }

  Future<Address> createAddress(String customerId, Address address) async {
    final data = await _client
        .post(ApiPaths.customerAddresses(customerId), body: address.toJson())
        as Map<String, dynamic>;
    return Address.fromJson(data);
  }

  Future<Address> updateAddress(String customerId, String addrId, Address address) async {
    final data = await _client
        .patch(ApiPaths.customerAddress(customerId, addrId), body: address.toJson())
        as Map<String, dynamic>;
    return Address.fromJson(data);
  }

  Future<void> deleteAddress(String customerId, String addrId) async {
    await _client.delete(ApiPaths.customerAddress(customerId, addrId));
  }
}
