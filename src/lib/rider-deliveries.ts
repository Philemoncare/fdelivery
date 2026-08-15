// Shared delivery presentation helpers for the rider portal.
//
// A single `orders` row is the underlying record for every booking, but to the
// rider a job is a DELIVERY (e.g. "Delivery #DLV-490502 ▸ related Order #OM-490502").
// These helpers keep that presentation consistent across Available Deliveries,
// My Deliveries, the dashboard, and navigation while the backend stays the
// single source of truth for state, refs and earnings.

export type DeliveryKind = 'FOOD_ORDER' | 'PACKAGE' | 'PASS';

export const DELIVERY_KINDS = ['FOOD_ORDER', 'PACKAGE', 'PASS'] as const;

export function isPackageLike(type: unknown): boolean {
  return String(type || 'FOOD_ORDER').toUpperCase() === 'PACKAGE' ||
    String(type || 'FOOD_ORDER').toUpperCase() === 'PASS';
}

export function deliveryKindOf(order: any): DeliveryKind {
  const t = String(order?.deliveryType || 'FOOD_ORDER').toUpperCase();
  return (DELIVERY_KINDS as readonly string[]).includes(t) ? (t as DeliveryKind) : 'FOOD_ORDER';
}

export function deliveryKindLabel(type: unknown): string {
  const k = String(type || 'FOOD_ORDER').toUpperCase();
  if (k === 'PACKAGE') return 'Package';
  if (k === 'PASS') return 'Passenger';
  return 'Food Order';
}

// Short uppercase badge text shown on cards: FOOD / PASS / PACKAGE
export function deliveryKindBadge(type: unknown): string {
  const k = deliveryKindOf({ deliveryType: type });
  if (k === 'PACKAGE') return 'PACKAGE';
  if (k === 'PASS') return 'PASS';
  return 'FOOD';
}

// Verbose title: "Food Order" / "Pass Delivery" / "Package Delivery"
export function deliveryKindTitle(type: unknown): string {
  const k = deliveryKindOf({ deliveryType: type });
  if (k === 'PACKAGE') return 'Package Delivery';
  if (k === 'PASS') return 'Pass Delivery';
  return 'Food Order';
}

// Sender/origin side — the person or vendor that handed off the item.
export function senderLabel(order: any): { name: string; phone: string | null; address: string | null } {
  const isPackage = isPackageLike(order?.deliveryType);
  if (isPackage) {
    return { name: order?.customerName || 'Sender', phone: order?.customerPhone || null, address: order?.pickupAddress || null };
  }
  return { name: order?.vendorName || 'Restaurant', phone: null, address: order?.vendorAddress || order?.pickupAddress || null };
}

// Delivery reference — server provides `deliveryRef` (DLV-…), fall back to a
// stable derivation from the order number so no UI relies on a missing field.
export function deliveryRef(order: any): string {
  const ref = order?.deliveryRef;
  if (ref) return ref;
  const numeric = String(order?.orderNumber || '').replace(/\D/g, '');
  if (numeric) return `DLV-${numeric.slice(0, 6)}`;
  const fromId = String(order?.id || '').replace(/\D/g, '');
  return `DLV-${fromId.slice(0, 6)}`;
}

// Pickup origin: restaurant (food) or explicit pickup point (package/pass).
export function pickupLabel(order: any): { name: string; address: string | null } {
  const isPackage = isPackageLike(order?.deliveryType);
  if (isPackage) {
    return { name: order?.vendorName || order?.pickupAddress || 'Pickup', address: order?.pickupAddress || null };
  }
  return { name: order?.vendorName || 'Restaurant', address: order?.vendorAddress || order?.pickupAddress || null };
}

// Drop-off destination: customer doorstep (food) or receiver (package/pass).
export function dropoffLabel(order: any): { name: string; address: string | null } {
  const isPackage = isPackageLike(order?.deliveryType);
  if (isPackage) {
    return { name: order?.receiverName || 'Recipient', address: order?.dropoffAddress || order?.customerAddress || null };
  }
  return { name: order?.customerName || 'Customer', address: order?.customerAddress || null };
}

// Recipient-facing contact for messaging/calling the drop-off side.
export function dropoffContact(order: any): { name: string; phone: string | null } {
  const isPackage = isPackageLike(order?.deliveryType);
  if (isPackage) {
    return { name: order?.receiverName || 'Recipient', phone: order?.receiverPhone || order?.customerPhone || null };
  }
  return { name: order?.customerName || 'Customer', phone: order?.customerPhone || null };
}

export const ACTIVE_DELIVERY_STATUSES = ['ready_for_pickup', 'rider_assigned', 'picked_up', 'in_transit', 'arriving'];
export const COMPLETED_DELIVERY_STATUSES = ['delivered', 'completed'];
export const TERMINAL_DELIVERY_STATUSES = ['cancelled', 'failed', 'refunded'];

export function isActiveDelivery(order: any): boolean {
  return ACTIVE_DELIVERY_STATUSES.includes(String(order?.status));
}

export function isCompletedDelivery(order: any): boolean {
  return COMPLETED_DELIVERY_STATUSES.includes(String(order?.status));
}