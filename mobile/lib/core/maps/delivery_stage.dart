/// Lifecycle stages a delivery map shows, derived from the backend's REAL
/// order status values. No stage is ever invented - each maps to a status the
/// OmniMarket server actually stores and broadcasts via `order_update`.
enum DeliveryStage {
  orderConfirmed('ORDER_CONFIRMED', 'Order placed - waiting for the restaurant'),
  preparing('PREPARING', 'Restaurant is preparing your food'),
  readyForPickup('READY_FOR_PICKUP', 'Food is ready - awaiting a rider'),
  riderAssigned('RIDER_ASSIGNED', 'A rider is on the way to the restaurant'),
  pickedUp('PICKED_UP', 'Rider picked up your food'),
  inTransit('IN_TRANSIT', 'Rider is on the way to you'),
  arriving('ARRIVING', 'Rider is almost there'),
  delivered('DELIVERED', 'Delivery completed - live tracking stopped'),
  unknown('UNKNOWN', 'Delivery status unavailable');

  const DeliveryStage(this.apiLabel, this.description);

  final String apiLabel;
  final String description;

  bool get isLive => this == pickedUp || this == inTransit || this == arriving;

  static DeliveryStage fromOrderStatus(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'confirmed':
        return DeliveryStage.orderConfirmed;
      case 'preparing':
        return DeliveryStage.preparing;
      case 'ready_for_pickup':
        return DeliveryStage.readyForPickup;
      case 'rider_assigned':
        return DeliveryStage.riderAssigned;
      case 'picked_up':
        return DeliveryStage.pickedUp;
      case 'in_transit':
        return DeliveryStage.inTransit;
      case 'arriving':
        return DeliveryStage.arriving;
      case 'delivered':
      case 'completed':
        return DeliveryStage.delivered;
      default:
        return DeliveryStage.unknown;
    }
  }

  static bool isTerminal(String status) {
    final s = status.toLowerCase();
    return s == 'delivered' || s == 'completed' || s == 'cancelled' || s == 'failed';
  }
}
