import 'json_helpers.dart';
import 'role.dart';

/// Exact shape of the backend's `safeUser(user)` (see `server.ts`).
class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    required this.role,
    this.phone = '',
    this.firstName = '',
    this.lastName = '',
    this.displayName = '',
    this.avatarUrl = '',
    this.isVerified = false,
    this.isEmailVerified = false,
    this.isPhoneVerified = false,
    this.isApproved = false,
    this.isActive = false,
    this.isSuspended = false,
    this.mustChangePassword = false,
    this.twoFactorEnabled = false,
    this.vendorId,
    this.riderId,
    this.createdAt,
    this.lastLoginAt,
  });

  final String id;
  final String email;
  final String phone;
  final String firstName;
  final String lastName;
  final String displayName;
  final String avatarUrl;
  final AppRole role;
  final bool isVerified;
  final bool isEmailVerified;
  final bool isPhoneVerified;
  final bool isApproved;
  final bool isActive;
  final bool isSuspended;
  final bool mustChangePassword;
  final bool twoFactorEnabled;
  final String? vendorId;
  final String? riderId;
  final String? createdAt;
  final String? lastLoginAt;

  String get fullName {
    final n = '$firstName $lastName'.trim();
    if (n.isNotEmpty) return n;
    if (displayName.isNotEmpty) return displayName;
    return email;
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json.ss('id'),
      email: json.ss('email'),
      phone: json.ss('phone'),
      firstName: json.ss('firstName'),
      lastName: json.ss('lastName'),
      displayName: json.ss('displayName'),
      avatarUrl: json.ss('avatarUrl'),
      role: AppRole.fromApi(json.s('role')),
      isVerified: json.b('isVerified'),
      isEmailVerified: json.b('isEmailVerified'),
      isPhoneVerified: json.b('isPhoneVerified'),
      isApproved: json.b('isApproved'),
      isActive: json.b('isActive'),
      isSuspended: json.b('isSuspended'),
      mustChangePassword: json.b('mustChangePassword'),
      twoFactorEnabled: json.b('twoFactorEnabled'),
      vendorId: json.s('vendorId'),
      riderId: json.s('riderId'),
      createdAt: json.s('createdAt'),
      lastLoginAt: json.s('lastLoginAt'),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'phone': phone,
        'firstName': firstName,
        'lastName': lastName,
        'displayName': displayName,
        'avatarUrl': avatarUrl,
        'role': role.apiValue,
        'isVerified': isVerified,
        'isEmailVerified': isEmailVerified,
        'isPhoneVerified': isPhoneVerified,
        'isApproved': isApproved,
        'isActive': isActive,
        'isSuspended': isSuspended,
        'mustChangePassword': mustChangePassword,
        'twoFactorEnabled': twoFactorEnabled,
        'vendorId': vendorId,
        'riderId': riderId,
        'createdAt': createdAt,
        'lastLoginAt': lastLoginAt,
      };
}
