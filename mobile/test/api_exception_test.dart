import 'package:flutter_test/flutter_test.dart';
import 'package:omnimarket_mobile/core/network/api_exception.dart';

void main() {
  group('ApiException', () {
    test('typed constructors carry stable codes', () {
      expect(ApiException.unauthorized().code, 'unauthorized');
      expect(ApiException.unauthorized().statusCode, 401);
      expect(ApiException.forbidden().code, 'forbidden');
      expect(ApiException.network().isNetwork, isTrue);
      expect(ApiException.timeout().code, 'timeout');
    });

    test('unauthorized flag', () {
      expect(ApiException.unauthorized().isUnauthorized, isTrue);
      expect(ApiException.server().isUnauthorized, isFalse);
    });

    test('toString is informative', () {
      expect(ApiException.unauthorized().toString(), contains('401'));
    });
  });
}
