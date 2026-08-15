import { Vendor } from '../types';

export type VendorOperationalStatus = 'OPEN' | 'CLOSED' | 'OPENING_SOON' | 'TEMPORARILY_PAUSED' | 'BUSY';

/**
 * Decide whether a restaurant is currently accepting orders.
 *
 * Availability is decided by explicit signals only:
 *  - Account status gates everything: only `active` vendors take orders.
 *  - `isKitchenOpen === false` or `isOpen === false` (explicit pause/close)
 *    marks the vendor as not accepting orders.
 *  - Missing/undefined `isOpen` / `isKitchenOpen` on an active vendor is NOT a
 *    reason to close it — legacy records and partial payloads simply default
 *    to open.
 *  - Optional `businessHours`, when present, are respected.
 */
export function getVendorOperationalStatus(vendor: Vendor): VendorOperationalStatus {
  // Account-level gating is authoritative.
  if (!vendor || vendor.status !== 'active') return 'CLOSED';

  // Explicit pause/close flags — only an actual `false` closes the kitchen.
  if (vendor.isKitchenOpen === false) return 'TEMPORARILY_PAUSED';
  if (vendor.isOpen === false) return 'CLOSED';

  // If there are specific business hours, check them
  if (vendor.businessHours && vendor.businessHours.length) {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[now.getDay()];
    const todayHours = vendor.businessHours.find(h => h.day === todayName);

    if (!todayHours || !todayHours.isOpen) return 'CLOSED';

    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);

    const openTime = new Date(now);
    openTime.setHours(openH, openM, 0);

    const closeTime = new Date(now);
    closeTime.setHours(closeH, closeM, 0);

    if (now < openTime) {
      const diffMs = openTime.getTime() - now.getTime();
      const diffMins = diffMs / (1000 * 60);
      if (diffMins <= 60) return 'OPENING_SOON';
      return 'CLOSED';
    }

    if (now > closeTime) return 'CLOSED';
  }

  return 'OPEN';
}
