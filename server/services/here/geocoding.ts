import { geocode, reverseGeocode } from './hereClient';

export interface GeocodeInput {
  query: string;
  latitude?: number;
  longitude?: number;
}

export interface GeocodeOutput {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  formattedAddress: string;
}

export interface ReverseGeocodeInput {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeOutput {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  formattedAddress: string;
}

/**
 * Geocode an address/query into coordinates.
 * HERE Geocoding API converts a human-readable address or place name
 * into latitude/longitude coordinates.
 */
export async function geocodeAddress(input: GeocodeInput): Promise<GeocodeOutput[]> {
  const results = await geocode(input.query, input.latitude, input.longitude);

  return results.map(result => ({
    latitude: result.position?.lat || result.latitude || 0,
    longitude: result.position?.lng || result.longitude || 0,
    address: result.address || result.label || input.query,
    city: result.address?.city || result.address?.municipality || result.address?.county || '',
    country: result.address?.country || '',
    postalCode: result.address?.postalCode || undefined,
    formattedAddress: result.displayAddress || result.label || input.query,
  }));
}

/**
 * Reverse geocode coordinates into a human-readable address.
 * HERE Reverse Geocoding API converts latitude/longitude coordinates
 * into a readable address or place description.
 */
export async function reverseGeocodeCoords(input: ReverseGeocodeInput): Promise<ReverseGeocodeOutput> {
  const result = await reverseGeocode(input.latitude, input.longitude);

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    address: result.formattedAddress || result.address || '',
    city: result.city || '',
    country: result.country || '',
    postalCode: result.postalCode || undefined,
    formattedAddress: result.formattedAddress || '',
  };
}