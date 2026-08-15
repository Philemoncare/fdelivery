import 'package:flutter_test/flutter_test.dart';
import 'package:omnimarket_mobile/core/utils/validators.dart';

void main() {
  group('Validators', () {
    test('email', () {
      expect(Validators.email('a@b.com'), isNull);
      expect(Validators.email('nope'), isNotNull);
      expect(Validators.email(''), isNotNull);
    });

    test('identifier accepts email or phone', () {
      expect(Validators.identifier('a@b.com'), isNull);
      expect(Validators.identifier('+233241234567'), isNull);
      expect(Validators.identifier('0241234567'), isNull);
      expect(Validators.identifier('hello'), isNotNull);
    });

    test('otp requires exactly 6 digits', () {
      expect(Validators.otp('123456'), isNull);
      expect(Validators.otp('12345'), isNotNull);
      expect(Validators.otp('abcdef'), isNotNull);
      expect(Validators.otp(''), isNotNull);
    });

    test('password length', () {
      expect(Validators.password('123456'), isNull);
      expect(Validators.password('12345'), isNotNull);
    });

    test('confirm password', () {
      expect(Validators.confirmPassword('abc', 'abc'), isNull);
      expect(Validators.confirmPassword('abc', 'abd'), isNotNull);
    });
  });
}
