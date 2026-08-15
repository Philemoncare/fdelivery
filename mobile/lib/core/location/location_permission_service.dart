import 'package:geolocator/geolocator.dart';

/// Result of a permission check/request. Mirrors the OS states so UI can react
/// honestly without ever silently retrying.
enum LocationPermissionStatus {
  /// App can read the device location.
  granted,

  /// The user (or OS) denied permission. We may request once more.
  denied,

  /// Permission is permanently denied - only the OS settings page can help.
  deniedForever,

  /// Location services (GPS toggle) are turned off at the OS level.
  servicesDisabled,

  /// The OS could not determine the state (rare, e.g. fresh install).
  unableToDetermine,
}

/// Wraps the geolocator permission APIs. Single flow used by every feature so
/// permissions are never requested repeatedly or in a loop.
class LocationPermissionService {
  LocationPermissionService._();

  static Future<LocationPermissionStatus> check() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return LocationPermissionStatus.servicesDisabled;

    final permission = await Geolocator.checkPermission();
    switch (permission) {
      case LocationPermission.always:
      case LocationPermission.whileInUse:
        return LocationPermissionStatus.granted;
      case LocationPermission.denied:
        return LocationPermissionStatus.denied;
      case LocationPermission.deniedForever:
        return LocationPermissionStatus.deniedForever;
      case LocationPermission.unableToDetermine:
        return LocationPermissionStatus.unableToDetermine;
    }
  }

  /// Requests permission. Callers decide WHEN to request (customer: only when
  /// a location feature is used; rider: required for delivery). Never loops.
  static Future<LocationPermissionStatus> request() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return LocationPermissionStatus.servicesDisabled;

    final permission = await Geolocator.requestPermission();
    switch (permission) {
      case LocationPermission.always:
      case LocationPermission.whileInUse:
        return LocationPermissionStatus.granted;
      case LocationPermission.denied:
        return LocationPermissionStatus.denied;
      case LocationPermission.deniedForever:
        return LocationPermissionStatus.deniedForever;
      case LocationPermission.unableToDetermine:
        return LocationPermissionStatus.unableToDetermine;
    }
  }

  /// Opens the OS app-settings page (used for deniedForever / services off).
  static Future<bool> openSettings() => Geolocator.openAppSettings();

  /// Clear, role-aware rationale used in the pre-request explanation dialogs.
  static String rationaleFor({required bool isRider}) => isRider
      ? 'OmniMarket uses your device location only during an active delivery '
          'so the customer can see your real-time progress. Nothing is sent '
          'unless you are carrying an order.'
      : 'OmniMarket uses your device location so we can pick a delivery '
          'address, measure real distances and show your restaurant nearby. '
          'You can choose an address without granting location.';
}
