import 'json_helpers.dart';

class Coupon {
  const Coupon({
    this.id = '',
    this.code = '',
    this.type = '',
    this.value = 0,
    this.minSpend = 0,
    this.maxDiscount,
    this.startsAt,
    this.expiryDate,
    this.usageLimit,
    this.totalUsed = 0,
    this.isActive = false,
    this.createdAt,
  });

  final String id;
  final String code;
  final String type; // percentage | fixed_amount | free_delivery
  final num value;
  final num minSpend;
  final num? maxDiscount;
  final String? startsAt;
  final String? expiryDate;
  final int? usageLimit;
  final int totalUsed;
  final bool isActive;
  final String? createdAt;

  factory Coupon.fromJson(Map<String, dynamic> json) => Coupon(
        id: json.ss('id'),
        code: json.ss('code'),
        type: json.ss('type'),
        value: json.dd('value'),
        minSpend: json.dd('minSpend'),
        maxDiscount: json.d('maxDiscount'),
        startsAt: json.s('startsAt'),
        expiryDate: json.s('expiryDate'),
        usageLimit: json.i('usageLimit'),
        totalUsed: json.ii('totalUsed'),
        isActive: json.b('isActive'),
        createdAt: json.s('createdAt'),
      );
}

/// Result of `GET /api/coupons/validate?code=&amount=`.
class CouponValidation {
  const CouponValidation({
    this.valid = false,
    this.discount = 0,
    this.message = '',
    this.coupon,
  });

  final bool valid;
  final num discount;
  final String message;
  final Coupon? coupon;

  factory CouponValidation.fromJson(Map<String, dynamic> json) =>
      CouponValidation(
        valid: json.b('valid'),
        discount: json.dd('discount'),
        message: json.ss('message'),
        coupon: json.o('coupon', Coupon.fromJson),
      );
}

class Conversation {
  const Conversation({
    this.id = '',
    this.type = '',
    this.participantIds = const [],
    this.orderId,
    this.subject = '',
    this.lastMessage = '',
    this.lastMessageAt,
    this.unreadCount = 0,
    this.createdAt,
  });

  final String id;
  final String type;
  final List<String> participantIds;
  final String? orderId;
  final String subject;
  final String lastMessage;
  final String? lastMessageAt;
  final int unreadCount;
  final String? createdAt;

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json.ss('id'),
        type: json.ss('type'),
        participantIds:
            json.ll('participantIds').map((e) => e.toString()).toList(),
        orderId: json.s('orderId'),
        subject: json.ss('subject'),
        lastMessage: json.ss('lastMessage'),
        lastMessageAt: json.s('lastMessageAt'),
        unreadCount: json.ii('unreadCount'),
        createdAt: json.s('createdAt'),
      );
}

class MessageItem {
  const MessageItem({
    this.id = '',
    this.conversationId = '',
    this.senderId = '',
    this.content = '',
    this.read = false,
    this.createdAt,
  });

  final String id;
  final String conversationId;
  final String senderId;
  final String content;
  final bool read;
  final String? createdAt;

  factory MessageItem.fromJson(Map<String, dynamic> json) => MessageItem(
        id: json.ss('id'),
        conversationId: json.ss('conversationId'),
        senderId: json.ss('senderId'),
        content: json.ss('content'),
        read: json.b('read'),
        createdAt: json.s('createdAt'),
      );
}
