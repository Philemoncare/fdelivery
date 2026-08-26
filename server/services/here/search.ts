import { searchPlaces } from './hereClient';

export interface SearchInput {
  query: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  type: string;
}

/**
 * Search for places/businesses using HERE Search API.
 * Supports restaurants, stores, businesses, addresses, landmarks, etc.
 * Can be filtered by user's current location for relevance.
 */
export async function searchPlacesHandler(input: SearchInput): Promise<SearchResult[]> {
  const results = await searchPlaces(input.query, input.latitude, input.longitude, input.limit || 10);

  return results.map(result => ({
    id: result.id || `here-${result.position?.lat}-${result.position?.lng}`,
    label: result.title || result.subtitle || result.address || '',
    address: result.address || result.locations?.[0]?.address || '',
    city: result.address?.city || result.location?.city || result.address?.municipality || '',
    country: result.address?.country || result.location?.country || '',
    latitude: result.position?.lat || result.latitude || 0,
    longitude: result.position?.lng || result.longitude || 0,
    type: result.type || 'place',
  }));
}

/**
 * Search for restaurants specifically.
 */
export async function searchRestaurants(latitude: number, longitude: number, query?: string): Promise<SearchResult[]> {
  const results = await searchPlaces(query || 'restaurant', latitude, longitude);
  return results;
}

/**
 * Search for stores/shops specifically.
 */
export async function searchStores(latitude: number, longitude: number, query?: string): Promise<SearchResult[]> {
  const results = await searchPlaces(query || 'store', latitude, longitude);
  return results;
}

/**
 * Search for pharmacies.
 */
export async function searchPharmacies(latitude: number, longitude: number): Promise<SearchResult[]> {
  const results = await searchPlaces('pharmacy', latitude, longitude);
  return results;
}

/**
 * Search for ATMs.
 */
export async function searchAtms(latitude: number, longitude: number): Promise<SearchResult[]> {
  const results = await searchPlaces('ATM', latitude, longitude);
  return results;
}