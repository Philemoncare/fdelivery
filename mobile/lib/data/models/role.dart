/// Roles as stored by the backend (`safeUser.role` / JWT `role` claim).
enum AppRole {
  customer('customer'),
  vendor('vendor'),
  vendorStaff('vendor-staff'),
  storeManager('store-manager'),
  rider('rider'),
  administrator('administrator'),
  superAdministrator('super-administrator'),
  unknown('unknown');

  const AppRole(this.apiValue);

  final String apiValue;

  static AppRole fromApi(String? value) {
    if (value == null) return AppRole.unknown;
    return AppRole.values.firstWhere(
      (r) => r.apiValue == value,
      orElse: () => AppRole.unknown,
    );
  }

  bool get isAdmin => this == AppRole.administrator || this == AppRole.superAdministrator;

  bool get isStaffOrAdmin => isAdmin || this == AppRole.vendorStaff || this == AppRole.storeManager;

  /// Human label used in the UI.
  String get label => switch (this) {
        AppRole.customer => 'Customer',
        AppRole.vendor => 'Restaurant',
        AppRole.vendorStaff => 'Restaurant Staff',
        AppRole.storeManager => 'Store Manager',
        AppRole.rider => 'Rider',
        AppRole.administrator => 'Administrator',
        AppRole.superAdministrator => 'Super Administrator',
        AppRole.unknown => 'Unknown',
      };
}
