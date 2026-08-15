import 'json_helpers.dart';

class Wallet {
  const Wallet({required this.userId, this.balance = 0, this.currency = 'GHS'});

  final String userId;
  final num balance;
  final String currency;

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
        userId: json.ss('userId'),
        balance: json.dd('balance'),
        currency: json.ss('currency', 'GHS'),
      );
}

class WalletTransaction {
  const WalletTransaction({
    this.id = '',
    this.userId = '',
    this.type = '',
    this.category = '',
    this.amount = 0,
    this.description = '',
    this.status = '',
    this.referenceId,
    this.referenceType = '',
    this.createdAt,
  });

  final String id;
  final String userId;
  final String type; // credit | debit
  final String category; // order_payment | vendor_payout | rider_earning | topup | withdrawal ...
  final num amount;
  final String description;
  final String status;
  final String? referenceId;
  final String referenceType;
  final String? createdAt;

  factory WalletTransaction.fromJson(Map<String, dynamic> json) =>
      WalletTransaction(
        id: json.ss('id'),
        userId: json.ss('userId'),
        type: json.ss('type'),
        category: json.ss('category'),
        amount: json.dd('amount'),
        description: json.ss('description'),
        status: json.ss('status'),
        referenceId: json.s('referenceId'),
        referenceType: json.ss('referenceType'),
        createdAt: json.s('createdAt'),
      );
}
