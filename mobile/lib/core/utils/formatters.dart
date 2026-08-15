import 'package:intl/intl.dart';

/// Formatting helpers for GHS amounts and ISO timestamps returned by the API.
class Formatters {
  Formatters._();

  static final NumberFormat _ghs = NumberFormat.currency(
    locale: 'en',
    symbol: 'GHS ',
    decimalDigits: 2,
  );

  static String ghs(num amount) => _ghs.format(amount);

  static String date(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return DateFormat('d MMM yyyy, HH:mm').format(parsed.toLocal());
  }

  static String shortDate(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return DateFormat('d MMM yyyy').format(parsed.toLocal());
  }
}
