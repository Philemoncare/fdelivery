import { MarketplaceShell } from '@/src/components/layouts/marketplace-layout';

/**
 * Consumer application layout for authenticated customers.
 *
 * Customers use the same premium food-delivery experience as the public
 * marketplace (header, discovery, floating cart, bottom navigation) — never
 * an admin-style sidebar or dashboard shell.
 */
export function CustomerLayout() {
  return <MarketplaceShell />;
}