import '../../core/constants/api_paths.dart';
import '../../core/network/api_client.dart';
import '../models/wallet.dart';

class WalletRepository {
  WalletRepository({required ApiClient client}) : _client = client;

  final ApiClient _client;

  Future<Wallet> balance(String userId) async {
    final data = await _client
        .get(ApiPaths.walletBalance(userId)) as Map<String, dynamic>;
    return Wallet.fromJson(data);
  }

  Future<List<WalletTransaction>> transactions(String userId) async {
    final data =
        await _client.get(ApiPaths.walletTransactions(userId)) as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map(WalletTransaction.fromJson)
        .toList();
  }

  /// `POST /api/wallets/:userId/topup` returns the created TRANSACTION,
  /// not the wallet. Call [balance] afterwards to read the new balance.
  /// [method] MUST be a payment gateway id/name known to the backend
  /// (`GET /api/payment-gateways`); no client-side defaults are assumed.
  Future<WalletTransaction> topup(
    String userId,
    num amount, {
    required String method,
  }) async {
    final data = await _client
        .post(
          ApiPaths.walletTopup(userId),
          body: {'amount': amount, 'method': method},
        )
        as Map<String, dynamic>;
    return WalletTransaction.fromJson(data);
  }

  /// [method] MUST be a payment gateway id/name known to the backend
  /// (`GET /api/payment-gateways`); no client-side defaults are assumed.
  Future<WalletTransaction> requestWithdrawal(
    String userId,
    num amount, {
    required String method,
    Map<String, dynamic>? bankInfo,
  }) async {
    final data = await _client
        .post(
          ApiPaths.walletWithdrawals(userId),
          body: {
            'amount': amount,
            'method': method,
            if (bankInfo != null) 'bankInfo': bankInfo,
          },
        )
        as Map<String, dynamic>;
    return WalletTransaction.fromJson(data);
  }
}
