/// Safe accessors for decoded JSON maps. The backend is JS, so numbers may
/// arrive as int or double and booleans as bool, 1/0, or "true"/"false".
extension JsonMapX on Map<String, dynamic> {
  String? s(String key) => this[key] as String?;

  String ss(String key, [String fallback = '']) {
    final v = this[key];
    if (v == null) return fallback;
    return v.toString();
  }

  double? d(String key) {
    final v = this[key];
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  double dd(String key, [double fallback = 0]) => d(key) ?? fallback;

  int? i(String key) {
    final v = this[key];
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v);
    return null;
  }

  int ii(String key, [int fallback = 0]) => i(key) ?? fallback;

  bool b(String key) {
    final v = this[key];
    if (v is bool) return v;
    if (v is num) return v != 0;
    if (v is String) return v == 'true' || v == '1';
    return false;
  }

  List<dynamic>? l(String key) => this[key] as List<dynamic>?;

  List<dynamic> ll(String key) => this[key] as List<dynamic>? ?? const [];

  Map<String, dynamic>? m(String key) {
    final v = this[key];
    return v is Map<String, dynamic> ? v : null;
  }

  T? o<T>(String key, T Function(Map<String, dynamic>) fromJson) {
    final v = m(key);
    return v == null ? null : fromJson(v);
  }

  List<T> ol<T>(String key, T Function(Map<String, dynamic>) fromJson) {
    final v = l(key);
    if (v == null) return const [];
    return v.whereType<Map<String, dynamic>>().map(fromJson).toList();
  }
}
