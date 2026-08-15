import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/dashboards.dart';
import '../models/product.dart';
import '../models/vendor.dart';

/// Catalog: restaurants, menu items, categories, search.
class CatalogRepository {
  CatalogRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<List<Vendor>> vendors() async {
    final data = await _client.get(ApiPaths.vendors) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Vendor.fromJson)
        .toList();
  }

  Future<Vendor> vendor(String id) async {
    final data = await _client.get(ApiPaths.vendor(id)) as Map<String, dynamic>;
    return Vendor.fromJson(data);
  }

  /// `GET /api/vendors/:id/dashboard` - vendor owner or admin only.
  Future<VendorDashboard> vendorDashboard(String id) async {
    final data =
        await _client.get(ApiPaths.vendorDashboard(id)) as Map<String, dynamic>;
    return VendorDashboard.fromJson(data);
  }

  Future<List<Product>> products() async {
    final data = await _client.get(ApiPaths.products) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }

  Future<List<Product>> trendingProducts() async {
    final data =
        await _client.get(ApiPaths.trendingProducts) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }

  Future<List<Product>> vendorProducts(String vendorId) async {
    final data =
        await _client.get(ApiPaths.vendorProducts(vendorId)) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }

  Future<List<Category>> categories() async {
    final data = await _client.get(ApiPaths.categories) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(Category.fromJson)
        .toList();
  }

  /// `GET /api/search?q=&cat=`
  Future<({List<Product> products, List<Vendor> vendors})> search({
    required String query,
    String? category,
  }) async {
    final data = await _client.get(ApiPaths.search, query: {
      'q': query,
      if (category != null && category.isNotEmpty) 'cat': category,
    }) as Map<String, dynamic>;
    final products = (data['products'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
    final vendors = (data['vendors'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Vendor.fromJson)
        .toList();
    return (products: products, vendors: vendors);
  }

  // ---- menu item management (vendor owner / admin) ---------------------------

  Future<Vendor> updateVendor(String id, Map<String, dynamic> payload) async {
    final data = await _client
        .patch(ApiPaths.vendor(id), body: payload) as Map<String, dynamic>;
    return Vendor.fromJson(data);
  }

  Future<Product> createProduct(Map<String, dynamic> payload) async {
    final data =
        await _client.post(ApiPaths.products, body: payload) as Map<String, dynamic>;
    return Product.fromJson(data);
  }

  Future<Product> updateProduct(String id, Map<String, dynamic> payload) async {
    final data = await _client
        .patch(ApiPaths.product(id), body: payload) as Map<String, dynamic>;
    return Product.fromJson(data);
  }

  Future<void> deleteProduct(String id) async {
    await _client.delete(ApiPaths.product(id));
  }

  // ---- category management (admin) ---------------------------------------------

  Future<Category> createCategory(Map<String, dynamic> payload) async {
    final data = await _client
        .post(ApiPaths.categories, body: payload) as Map<String, dynamic>;
    return Category.fromJson(data);
  }

  Future<Category> updateCategory(String id, Map<String, dynamic> payload) async {
    final data = await _client
        .patch(ApiPaths.category(id), body: payload) as Map<String, dynamic>;
    return Category.fromJson(data);
  }

  Future<void> deleteCategory(String id) async {
    await _client.delete(ApiPaths.category(id));
  }
}
