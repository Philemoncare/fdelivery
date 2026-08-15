import 'json_helpers.dart';

class NotificationItem {
  const NotificationItem({
    this.id = '',
    this.userId = '',
    this.title = '',
    this.message = '',
    this.time,
    this.createdAt,
    this.read = false,
    this.readAt,
    this.type = 'system',
    this.category = 'system',
    this.priority = 'NORMAL',
    this.referenceId,
    this.referenceType = '',
    this.relatedOrderId,
    this.relatedDeliveryId,
    this.relatedConversationId,
    this.relatedRestaurantId,
    this.relatedUserId,
    this.action,
  });

  final String id;
  final String userId;
  final String title;
  final String message;
  final String? time;
  final String? createdAt;
  final bool read;
  final String? readAt;
  final String type;
  final String category;
  final String priority;
  final String? referenceId;
  final String referenceType;
  final String? relatedOrderId;
  final String? relatedDeliveryId;
  final String? relatedConversationId;
  final String? relatedRestaurantId;
  final String? relatedUserId;
  final String? action;

  factory NotificationItem.fromJson(Map<String, dynamic> json) =>
      NotificationItem(
        id: json.ss('id'),
        userId: json.ss('userId'),
        title: json.ss('title'),
        message: json.ss('message'),
        time: json.s('time'),
        createdAt: json.s('createdAt'),
        read: json.b('read'),
        readAt: json.s('readAt'),
        type: json.ss('type'),
        category: json.ss('category', 'system'),
        priority: json.ss('priority', 'NORMAL'),
        referenceId: json.s('referenceId'),
        referenceType: json.ss('referenceType'),
        relatedOrderId: json.s('relatedOrderId'),
        relatedDeliveryId: json.s('relatedDeliveryId'),
        relatedConversationId: json.s('relatedConversationId'),
        relatedRestaurantId: json.s('relatedRestaurantId'),
        relatedUserId: json.s('relatedUserId'),
        action: json.s('action'),
      );
}

class Review {
  const Review({
    this.id = '',
    this.userId = '',
    this.userName = '',
    this.vendorId = '',
    this.productId,
    this.rating = 0,
    this.comment = '',
    this.createdAt,
  });

  final String id;
  final String userId;
  final String userName;
  final String vendorId;
  final String? productId;
  final double rating;
  final String comment;
  final String? createdAt;

  factory Review.fromJson(Map<String, dynamic> json) => Review(
        id: json.ss('id'),
        userId: json.ss('userId'),
        userName: json.ss('userName'),
        vendorId: json.ss('vendorId'),
        productId: json.s('productId'),
        rating: json.dd('rating'),
        comment: json.ss('comment', json.ss('content')),
        createdAt: json.s('createdAt'),
      );
}
