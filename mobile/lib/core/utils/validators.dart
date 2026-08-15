/// Simple input validators shared across auth forms.
class Validators {
  Validators._();

  static final RegExp _email = RegExp(r'^[\w.+-]+@[\w-]+\.[\w.-]+$');
  static final RegExp _phone = RegExp(r'^\+?[0-9]{7,15}$');

  static String? email(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Email is required.';
    if (!_email.hasMatch(v)) return 'Enter a valid email address.';
    return null;
  }

  /// Backend accepts an email OR a phone as the login identifier.
  static String? identifier(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Email or phone number is required.';
    if (!_email.hasMatch(v) && !_phone.hasMatch(v)) {
      return 'Enter a valid email or phone number.';
    }
    return null;
  }

  static String? phone(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Phone number is required.';
    if (!_phone.hasMatch(v)) return 'Enter a valid phone number.';
    return null;
  }

  static String? password(String? value) {
    final v = value ?? '';
    if (v.isEmpty) return 'Password is required.';
    if (v.length < 6) return 'Password must be at least 6 characters.';
    return null;
  }

  static String? confirmPassword(String? value, String? original) {
    final v = value ?? '';
    if (v.isEmpty) return 'Please confirm your password.';
    if (v != original) return 'Passwords do not match.';
    return null;
  }

  static String? otp(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Verification code is required.';
    if (v.length != 6 || int.tryParse(v) == null) {
      return 'Enter the 6-digit code.';
    }
    return null;
  }

  static String? required(String? value, [String field = 'This field']) {
    if ((value ?? '').trim().isEmpty) return '$field is required.';
    return null;
  }
}
