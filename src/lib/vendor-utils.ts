import { Vendor } from '../types';

export type VendorOperationalStatus = 'OPEN' | 'CLOSED' | 'OPENING_SOON' | 'TEMPORARILY_PAUSED' | 'BUSY';

export function getVendorOperationalStatus(vendor: Vendor): VendorOperationalStatus {
  if (!vendor.isOpen) return 'CLOSED';
  if (vendor.isKitchenOpen === false) return 'TEMPORARILY_PAUSED';

  // If there are specific business hours, check them
  if (vendor.businessHours) {
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

  // Fallback to manual kitchen status if explicitly set
  // This could be extended for 'BUSY' if we have a field for it
  return 'OPEN';
}
