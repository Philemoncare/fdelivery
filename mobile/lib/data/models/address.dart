import 'json_helpers.dart';

/// Customer address (backend `GET /api/customers/:id/addresses`).
class Address {
  const Address({
    required this.id,
    this.userId = '',
    this.label = '',
    this.addressLine = '',
    this.city = '',
    this.region = '',
    this.phone = '',
    this.isDefault = false,
    this.latitude,
    this.longitude,
    this.createdAt,
  });

  final String id;
  final String userId;
  final String label;
  final String addressLine;
  final String city;
  final String region;
  final String phone;
  final bool isDefault;
  final double? latitude;
  final double? longitude;
  final String? createdAt;

  String get display => addressLine.isEmpty
      ? '$city ${region}'.trim()
      : '$addressLine, $city'.trim().replaceAll(RegExp(r',+$'), '');

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: json.ss('id', json.ss('addressId')),
        userId: json.ss('userId'),
        label: json.ss('label'),
        addressLine: json.ss('addressLine', json.ss('address')),
        city: json.ss('city'),
        region: json.ss('region'),
        phone: json.ss('phone'),
        isDefault: json.b('isDefault'),
        latitude: json.d('latitude'),
        longitude: json.d('longitude'),
        createdAt: json.s('createdAt'),
      );

  Map<String, dynamic> toJson() => {
        'label': label,
        'addressLine': addressLine,
        'city': city,
        'region': region,
        'phone': phone,
        'isDefault': isDefault,
        'latitude': latitude,
        'longitude': longitude,
      };
}
