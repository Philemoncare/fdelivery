import 'json_helpers.dart';
import 'rider.dart';

class OrderItem {
  const OrderItem({
    this.id = '',
    this.orderId = '',
    this.productId = '',
    this.productName = '',
    this.productImage = '',
    this.productCategory = '',
    this.title = '',
    this.quantity = 1,
    this.price = 0,
  });

  final String id;
  final String orderId;
  final String productId;
  final String productName;
  final String productImage;
  final String productCategory;
  final String title;
  final int quantity;
  final num price;

  String get name => productName.isNotEmpty ? productName : title;

  num get lineTotal => price * quantity;

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        id: json.ss('id'),
        orderId: json.ss('orderId'),
        productId: json.ss('productId'),
        productName: json.ss('productName'),
        productImage: json.ss('productImage'),
        productCategory: json.ss('productCategory'),
        title: json.ss('title'),
        quantity: json.ii('quantity', 1),
        price: json.dd('price'),
      );

  Map<String, dynamic> toOrderPayload() => {
        'productId': productId,
        'productName': name,
        'title': name,
        'price': price,
        'quantity': quantity,
        'productImage': productImage,
        'productCategory': productCategory,
      };
}

class Order {
  const Order({
    required this.id,
    this.orderNumber = '',
    this.invoiceNumber = '',
    this.customerId = '',
    this.customerName = '',
    this.customerEmail = '',
    this.customerPhone = '',
    this.customerAddress = '',
    this.vendorId = '',
    this.vendorName = '',
    this.riderId,
    this.dispatchRider,
    this.items = const [],
    this.subtotal = 0,
    this.deliveryFee = 0,
    this.tax = 0,
    this.discount = 0,
    this.couponCode,
    this.totalAmount = 0,
    this.platformCommission = 0,
    this.vendorPayout = 0,
    this.status = 'pending',
    this.paymentStatus = 'pending',
    this.paymentMethod = '',
    this.deliveryMethod = 'delivery',
    this.specialInstructions = '',
    this.createdAt,
    this.updatedAt,
    this.estimatedDeliveryTime = '',
    this.deliveredAt,
    this.pickedUpAt,
    this.vendorLat,
    this.vendorLng,
    this.customerLat,
    this.customerLng,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.receiverConfirmed = false,
    this.deliveryRef = '',
    this.deliveryType = 'FOOD_ORDER',
    this.pickupAddress = '',
    this.dropoffAddress = '',
    this.receiverName = '',
    this.receiverPhone = '',
    this.packageSize = '',
    this.packageType = '',
    this.packageNote = '',
    this.pickupArea,
    this.pickupCity,
    this.pickupRegion,
    this.pickupLandmark,
    this.pickupInstructions,
    this.dropoffArea,
    this.dropoffCity,
    this.dropoffRegion,
    this.dropoffLandmark,
    this.dropoffInstructions,
    this.baseFee = 0,
    this.sizeFee = 0,
    this.riderFee = 0,
    this.distanceFee = 0,
    this.weightFee = 0,
    this.distanceKm,
    this.platformFee = 0,
    this.statusTimestamps = const {},
  });

  final String id;
  final String orderNumber;
  final String invoiceNumber;
  final String customerId;
  final String customerName;
  final String customerEmail;
  final String customerPhone;
  final String customerAddress;
  final String vendorId;
  final String vendorName;
  final String? riderId;
  final Rider? dispatchRider;
  final List<OrderItem> items;
  final num subtotal;
  final num deliveryFee;
  final num tax;
  final num discount;
  final String? couponCode;
  final num totalAmount;
  final num platformCommission;
  final num vendorPayout;
  final String status;
  final String paymentStatus;
  final String paymentMethod;
  final String deliveryMethod;
  final String specialInstructions;
  final String? createdAt;
  final String? updatedAt;
  final String estimatedDeliveryTime;
  final String? deliveredAt;
  final String? pickedUpAt;

  /// Coordinates stored on the order at creation (`vendorLat`/`vendorLng`,
  /// `customerLat`/`customerLng`). May be absent - the UI must then show
  /// "location unavailable" instead of inventing a point.
  ///
  /// Package/pass orders carry their own pickup/dropoff pairs and typically
  /// leave vendor/customer coords unset.
  final double? vendorLat;
  final double? vendorLng;
  final double? customerLat;
  final double? customerLng;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final bool receiverConfirmed;

  /// Structured location components stored on package/pass bookings. Exact same
  /// fields the web booking form captures; may be absent on older orders.
  final String? pickupArea;
  final String? pickupCity;
  final String? pickupRegion;
  final String? pickupLandmark;
  final String? pickupInstructions;
  final String? dropoffArea;
  final String? dropoffCity;
  final String? dropoffRegion;
  final String? dropoffLandmark;
  final String? dropoffInstructions;

  /// Server-computed fee breakdown (mirrors `priceBreakdown` on the backend).
  final double baseFee;
  final double sizeFee;
  final double riderFee;
  final double distanceFee;
  final double weightFee;
  final double? distanceKm;
  final double platformFee;

  /// Delivery identity + type. Every booking (food, package, passenger) is one
  /// `orders` row; riders reference it as "Delivery #DLV-…" with a related order.
  final String deliveryRef;
  final String deliveryType;
  final String pickupAddress;
  final String dropoffAddress;
  final String receiverName;
  final String receiverPhone;
  final String packageSize;
  final String packageType;
  final String packageNote;
  final Map<String, String> statusTimestamps;

  bool get isPackageLike =>
      deliveryType == 'PACKAGE' || deliveryType == 'PASS';

  /// Short uppercase badge: FOOD / PASS / PACKAGE
  String get deliveryKindBadge {
    if (deliveryType == 'PACKAGE') return 'PACKAGE';
    if (deliveryType == 'PASS') return 'PASS';
    return 'FOOD';
  }

  /// Human title: "Food Order" / "Pass Delivery" / "Package Delivery"
  String get deliveryKindTitle {
    if (deliveryType == 'PACKAGE') return 'Package Delivery';
    if (deliveryType == 'PASS') return 'Pass Delivery';
    return 'Food Order';
  }

  String get deliveryReference {
    if (deliveryRef.isNotEmpty) return deliveryRef;
    final numeric = orderNumber.replaceAll(RegExp(r'\D'), '');
    if (numeric.isNotEmpty) return 'DLV-${numeric.substring(0, numeric.length > 6 ? 6 : numeric.length)}';
    final idNumeric = id.replaceAll(RegExp(r'\D'), '');
    return 'DLV-${idNumeric.substring(0, idNumeric.length > 6 ? 6 : idNumeric.length)}';
  }

  /// Pickup origin: restaurant name (food) or explicit pickup point (pack/pass).
  String get pickupName =>
      isPackageLike ? (pickupAddress.isNotEmpty ? pickupAddress : 'Pickup') : vendorName;

  /// Sender/origin side: sender's name (pack/pass) or restaurant (food).
  String get senderName =>
      isPackageLike ? (customerName.isNotEmpty ? customerName : 'Sender') : vendorName;

  /// Drop-off label: customer (food) or receiver name (pack/pass).
  String get dropoffName =>
      isPackageLike ? (receiverName.isNotEmpty ? receiverName : 'Recipient') : customerName;

  String get dropoffAddressLabel =>
      isPackageLike ? dropoffAddress : customerAddress;

  /// Pickup point coordinates: package/pass pickup pair, else vendor pair.
  ({double lat, double lng})? get pickupPoint {
    final lat = isPackageLike ? pickupLat : vendorLat;
    final lng = isPackageLike ? pickupLng : vendorLng;
    if (lat == null || lng == null) return null;
    return (lat: lat, lng: lng);
  }

  /// Drop-off coordinates: package/pass dropoff pair, else customer pair.
  ({double lat, double lng})? get dropoffPoint {
    final lat = isPackageLike ? dropoffLat : customerLat;
    final lng = isPackageLike ? dropoffLng : customerLng;
    if (lat == null || lng == null) return null;
    return (lat: lat, lng: lng);
  }

  num get itemCount => items.fold<int>(0, (sum, i) => sum + i.quantity);

  bool get isActiveStatus =>
      !const ['completed', 'delivered', 'cancelled', 'refunded', 'failed'].contains(status);

  factory Order.fromJson(Map<String, dynamic> json) {
    final br = json['priceBreakdown'] as Map<String, dynamic>? ?? const {};
    return Order(
        id: json.ss('id'),
        orderNumber: json.ss('orderNumber'),
        invoiceNumber: json.ss('invoiceNumber'),
        customerId: json.ss('customerId'),
        customerName: json.ss('customerName'),
        customerEmail: json.ss('customerEmail'),
        customerPhone: json.ss('customerPhone'),
        customerAddress: json.ss('customerAddress'),
        vendorId: json.ss('vendorId'),
        vendorName: json.ss('vendorName'),
        riderId: json.s('riderId'),
        dispatchRider: json.o('dispatchRider', Rider.fromJson),
        items: json.ol('items', OrderItem.fromJson),
        subtotal: json.dd('subtotal'),
        deliveryFee: json.dd('deliveryFee'),
        tax: json.dd('tax'),
        discount: json.dd('discount'),
        couponCode: json.s('couponCode'),
        totalAmount: json.dd('totalAmount'),
        platformCommission: json.dd('platformCommission'),
        vendorPayout: json.dd('vendorPayout'),
        status: json.ss('status'),
        paymentStatus: json.ss('paymentStatus'),
        paymentMethod: json.ss('paymentMethod'),
        deliveryMethod: json.ss('deliveryMethod'),
        specialInstructions: json.ss('specialInstructions'),
        createdAt: json.s('createdAt'),
        updatedAt: json.s('updatedAt'),
        estimatedDeliveryTime: json.ss('estimatedDeliveryTime'),
        deliveredAt: json.s('deliveredAt'),
        pickedUpAt: json.s('pickedUpAt'),
        vendorLat: json.d('vendorLat'),
        vendorLng: json.d('vendorLng'),
        customerLat: json.d('customerLat'),
        customerLng: json.d('customerLng'),
        pickupLat: json.d('pickupLat'),
        pickupLng: json.d('pickupLng'),
        dropoffLat: json.d('dropoffLat'),
        dropoffLng: json.d('dropoffLng'),
        receiverConfirmed: json['receiverConfirmed'] == true,
        deliveryRef: json.ss('deliveryRef'),
        deliveryType: json.ss('deliveryType', 'FOOD_ORDER'),
        pickupAddress: json.ss('pickupAddress'),
        dropoffAddress: json.ss('dropoffAddress'),
        receiverName: json.ss('receiverName'),
        receiverPhone: json.ss('receiverPhone'),
        packageSize: json.ss('packageSize'),
        packageType: json.ss('packageType'),
        packageNote: json.ss('packageNote'),
        pickupArea: json.s('pickupArea'),
        pickupCity: json.s('pickupCity'),
        pickupRegion: json.s('pickupRegion'),
        pickupLandmark: json.s('pickupLandmark'),
        pickupInstructions: json.s('pickupInstructions'),
        dropoffArea: json.s('dropoffArea'),
        dropoffCity: json.s('dropoffCity'),
        dropoffRegion: json.s('dropoffRegion'),
        dropoffLandmark: json.s('dropoffLandmark'),
        dropoffInstructions: json.s('dropoffInstructions'),
        baseFee: br['baseFee'] is num ? (br['baseFee'] as num).toDouble() : 0,
        sizeFee: br['sizeFee'] is num ? (br['sizeFee'] as num).toDouble() : 0,
        riderFee: br['riderFee'] is num ? (br['riderFee'] as num).toDouble() : 0,
        distanceFee: br['distanceFee'] is num ? (br['distanceFee'] as num).toDouble() : 0,
        weightFee: br['weightFee'] is num ? (br['weightFee'] as num).toDouble() : 0,
        distanceKm: br['distanceKm'] is num ? (br['distanceKm'] as num).toDouble() : null,
        platformFee: br['platformFee'] is num ? (br['platformFee'] as num).toDouble() : 0,
        statusTimestamps: (json['statusTimestamps'] as Map<String, dynamic>? ?? const {})
            .map((k, v) => MapEntry(k, v.toString())),
      );
  }
}
