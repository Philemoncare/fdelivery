import 'json_helpers.dart';

/// A menu item (backend `db.products`).
class Product {
  const Product({
    required this.id,
    this.vendorId = '',
    this.vendorName = '',
    this.vendorLogo = '',
    this.title = '',
    this.slug = '',
    this.description = '',
    this.shortDescription = '',
    this.sku = '',
    this.price = 0,
    this.originalPrice,
    this.discountPercent = 0,
    this.costPrice,
    this.rating = 0,
    this.reviewsCount = 0,
    this.category = '',
    this.images = const [],
    this.tags = const [],
    this.stock = 0,
    this.lowStockThreshold = 0,
    this.prepTime = '',
    this.calories = 0,
    this.isPopular = false,
    this.isTrending = false,
    this.isFeatured = false,
    this.isFlashSale = false,
    this.isAvailable = true,
    this.status = '',
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String vendorId;
  final String vendorName;
  final String vendorLogo;
  final String title;
  final String slug;
  final String description;
  final String shortDescription;
  final String sku;
  final num price;
  final num? originalPrice;
  final num discountPercent;
  final num? costPrice;
  final double rating;
  final int reviewsCount;
  final String category;
  final List<String> images;
  final List<String> tags;
  final int stock;
  final int lowStockThreshold;
  final String prepTime;
  final num calories;
  final bool isPopular;
  final bool isTrending;
  final bool isFeatured;
  final bool isFlashSale;
  final bool isAvailable;
  final String status;
  final String? createdAt;
  final String? updatedAt;

  String get primaryImage =>
      images.isNotEmpty ? images.first : '';

  bool get onSale => (originalPrice ?? price) > price;

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json.ss('id'),
      vendorId: json.ss('vendorId'),
      vendorName: json.ss('vendorName'),
      vendorLogo: json.ss('vendorLogo'),
      title: json.ss('title'),
      slug: json.ss('slug'),
      description: json.ss('description'),
      shortDescription: json.ss('shortDescription'),
      sku: json.ss('sku'),
      price: json.dd('price'),
      originalPrice: json.d('originalPrice'),
      discountPercent: json.dd('discountPercent'),
      costPrice: json.d('costPrice'),
      rating: json.dd('rating'),
      reviewsCount: json.ii('reviewsCount'),
      category: json.ss('category'),
      images: json.ll('images').map((e) => e.toString()).toList(),
      tags: json.ll('tags').map((e) => e.toString()).toList(),
      stock: json.ii('stock'),
      lowStockThreshold: json.ii('lowStockThreshold'),
      prepTime: json.ss('prepTime'),
      calories: json.dd('calories'),
      isPopular: json.b('isPopular'),
      isTrending: json.b('isTrending'),
      isFeatured: json.b('isFeatured'),
      isFlashSale: json.b('isFlashSale'),
      isAvailable: json.b('isAvailable'),
      status: json.ss('status'),
      createdAt: json.s('createdAt'),
      updatedAt: json.s('updatedAt'),
    );
  }
}

class Category {
  const Category({
    required this.id,
    this.name = '',
    this.icon = '',
    this.image = '',
    this.count = 0,
    this.createdAt,
  });

  final String id;
  final String name;
  final String icon;
  final String image;
  final int count;
  final String? createdAt;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json.ss('id'),
        name: json.ss('name'),
        icon: json.ss('icon'),
        image: json.ss('image'),
        count: json.ii('count'),
        createdAt: json.s('createdAt'),
      );
}
