// ============================================================
// OmniMarket — Registration roles
// Single source of truth for the public registration entry
// points (Join page, header register menu, homepage CTAs).
//
// Admin / Super Admin are intentionally NOT registered here:
// admin accounts are provisioned through the secure console at
// /admin/login and are never publicly self-serviceable.
// ============================================================

import type { ReactNode } from 'react';
import {
  UserRound, Bike, Store, Truck, BriefcaseBusiness,
  UtensilsCrossed, ShoppingBag,
} from 'lucide-react';

export type JoinRole = 'customer' | 'rider' | 'vendor' | 'fleet' | 'business';

export interface JoinRoleDef {
  id: JoinRole;
  icon: ReactNode;
  title: string;
  /** Short one-liner shown on cards */
  blurb: string;
  cta: string;
  route: string;
}

export const JOIN_ROLES: JoinRoleDef[] = [
  {
    id: 'customer',
    icon: <UserRound />,
    title: 'Create a Customer Account',
    blurb: 'Order food, shop goods, and track deliveries across Takoradi.',
    cta: 'Create Customer Account',
    route: '/register/customer',
  },
  {
    id: 'rider',
    icon: <Bike />,
    title: 'Become a Rider',
    blurb: 'Deliver food and goods across Takoradi and earn from completed deliveries.',
    cta: 'Become a Rider',
    route: '/register/rider',
  },
  {
    id: 'vendor',
    icon: <Store />,
    title: 'Become a Vendor',
    blurb: 'Sell food, products, and services to local customers.',
    cta: 'Become a Vendor',
    route: '/register/vendor',
  },
  {
    id: 'fleet',
    icon: <Truck />,
    title: 'Become a Fleet Partner',
    blurb: 'Manage delivery riders and vehicles through OmniMarket.',
    cta: 'Register Fleet',
    route: '/register/fleet',
  },
  {
    id: 'business',
    icon: <BriefcaseBusiness />,
    title: 'Business Account',
    blurb: 'Manage corporate deliveries, orders, users and business services.',
    cta: 'Create Business Account',
    route: '/register/business',
  },
];

export function getJoinRole(id: string | null | undefined): JoinRoleDef | undefined {
  return JOIN_ROLES.find(r => r.id === id);
}

/** Vendor business types offered during vendor onboarding. */
export const VENDOR_BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: <UtensilsCrossed />, note: 'Sell prepared meals and food.' },
  { value: 'store', label: 'Store', icon: <ShoppingBag />, note: 'Sell groceries, goods and other products.' },
] as const;

export type VendorBusinessType = (typeof VENDOR_BUSINESS_TYPES)[number]['value'];

/**
 * Vehicle options for rider onboarding. Whether documentation is required is
 * derived from the vehicle class — motorised vehicles need a licence plus
 * vehicle papers before approval.
 */
export const RIDER_VEHICLE_OPTIONS = [
  { value: 'Motorcycle', requiresLicence: true },
  { value: 'Bicycle', requiresLicence: false },
  { value: 'Car', requiresLicence: true },
  { value: 'Electric Bike', requiresLicence: false },
].map(o => ({ ...o, note: o.requiresLicence ? 'Valid licence and vehicle documentation may be required before approval.' : undefined }));

export type RiderVehicleType = (typeof RIDER_VEHICLE_OPTIONS)[number]['value'];

/** Payout methods supported by the platform's Ghana payment rails. */
export const PAYOUT_METHODS = [
  { value: 'momo', label: 'Mobile Money', providers: ['MTN MoMo', 'Telecel Cash', 'AT Money'] },
  { value: 'bank', label: 'Bank Account', providers: [] },
] as const;

export type PayoutMethod = (typeof PAYOUT_METHODS)[number]['value'];
