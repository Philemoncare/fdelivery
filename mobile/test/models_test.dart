import 'package:flutter_test/flutter_test.dart';
import 'package:omnimarket_mobile/data/models/auth_models.dart';
import 'package:omnimarket_mobile/data/models/order.dart';
import 'package:omnimarket_mobile/data/models/product.dart';
import 'package:omnimarket_mobile/data/models/role.dart';
import 'package:omnimarket_mobile/data/models/user_profile.dart';
import 'package:omnimarket_mobile/data/models/vendor.dart';

/// Model parsing must tolerate the exact JSON shapes the backend emits
/// (numbers as int, booleans as "true"/1, missing optional keys).
void main() {
  group('UserProfile', () {
    test('parses a full safeUser payload', () {
      final u = UserProfile.fromJson({
        'id': 'abc',
        'email': 'a@b.com',
        'phone': '+233241234567',
        'firstName': 'Ama',
        'lastName': 'Mensah',
        'displayName': 'Ama',
        'avatarUrl': 'https://x/y.png',
        'role': 'vendor',
        'isVerified': true,
        'isEmailVerified': false,
        'isApproved': true,
        'vendorId': 'v-1',
        'createdAt': '2026-01-01T00:00:00.000Z',
      });
      expect(u.id, 'abc');
      expect(u.role, AppRole.vendor);
      expect(u.isApproved, isTrue);
      expect(u.isEmailVerified, isFalse);
      expect(u.vendorId, 'v-1');
      expect(u.fullName, 'Ama Mensah');
    });

    test('parses role from JWT-style strings', () {
      expect(AppRole.fromApi('super-administrator'), AppRole.superAdministrator);
      expect(AppRole.fromApi('vendor-staff'), AppRole.vendorStaff);
      expect(AppRole.fromApi('store-manager'), AppRole.storeManager);
      expect(AppRole.fromApi('administrator'), AppRole.administrator);
      expect(AppRole.fromApi('bogus'), AppRole.unknown);
    });
  });

  group('AuthResult', () {
    test('parses verify-otp response', () {
      final r = AuthResult.fromJson({
        'success': true,
        'user': {'id': 'u1', 'email': 'a@b.com', 'role': 'customer'},
        'tokens': {
          'accessToken': 'at',
          'refreshToken': 'rt',
          'expiresIn': 3600,
          'tokenType': 'Bearer',
        },
      });
      expect(r.completed, isTrue);
      expect(r.tokens!.expiresIn, 3600);
      expect(r.user!.role, AppRole.customer);
    });
  });

  group('Vendor', () {
    test('parses aggregate vendor payload', () {
      final v = Vendor.fromJson({
        'id': 'v-1',
        'name': 'MDL Foods',
        'status': 'active',
        'rating': 4.8,
        'deliveryFee': 3,
        'minOrder': 15,
        'tags': ['Jollof', 'Waakye'],
        'businessHours': [
          {'day': 'Monday', 'isOpen': true, 'open': '07:30', 'close': '22:00'},
        ],
      });
      expect(v.isActive, isTrue);
      expect(v.rating, 4.8);
      expect(v.tags, hasLength(2));
      expect(v.businessHours.single.isOpen, isTrue);
    });
  });

  group('Product', () {
    test('parses a dish with originalPrice/stock as ints', () {
      final p = Product.fromJson({
        'id': 'p-1',
        'vendorId': 'v-1',
        'title': 'Jollof',
        'price': 42,
        'originalPrice': 50,
        'stock': 40,
        'images': ['https://x.jpg'],
        'isFlashSale': 'true',
        'rating': 4.5,
      });
      expect(p.price, 42);
      expect(p.onSale, isTrue);
      expect(p.isFlashSale, isTrue);
      expect(p.primaryImage, 'https://x.jpg');
    });
  });

  group('Order', () {
    test('parses an order with items and booleans as ints', () {
      final o = Order.fromJson({
        'id': 'o1',
        'orderNumber': 'OM-123456',
        'customerId': 'c1',
        'customerName': 'Ama',
        'vendorId': 'v1',
        'items': [
          {
            'productId': 'p1',
            'productName': 'Jollof',
            'quantity': 2,
            'price': 40,
          },
        ],
        'subtotal': 80,
        'deliveryFee': 3,
        'tax': 4,
        'discount': 0,
        'totalAmount': 87,
        'status': 'pending',
        'paymentStatus': 'paid',
      });
      expect(o.itemCount, 2);
      expect(o.items.single.lineTotal, 80);
      expect(o.isActiveStatus, isTrue);
      expect(o.totalAmount, 87);
    });

    test('treats completed status as inactive', () {
      final o = Order.fromJson({'id': 'o2', 'status': 'delivered'});
      expect(o.isActiveStatus, isFalse);
    });
  });
}
