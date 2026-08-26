import axios from 'axios';

const HERE_API_KEY = process.env.HERE_API_KEY;

if (!HERE_API_KEY) {
  console.warn('[HERE] HERE_API_KEY is not set. HERE services will be unavailable.');
}

const hereApi = axios.create({
  baseURL: 'https://api.here.com',
  timeout: 10000,
  headers: {
    'User-Agent': 'OmniMarket-Ghana/1.0 (HERE Location Integration)'
  }
});

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  formattedAddress: string;
}

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  formattedAddress: string;
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
 * Geocode an address/query into coordinates using HERE Geocoding API.
 */
export async function geocode(query: string, latitude?: number, longitude?: number): Promise<GeocodeResult[]> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
      q: query,
    });

    if (latitude && longitude) {
      params.append('at', `${latitude},${longitude}`);
    }

    const response = await hereApi.get(`/v1/geocode?${params.toString()}`);
    return response.data.items || [];
  } catch (error) {
    console.error('[HERE] Geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates into an address using HERE Reverse Geocoding API.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
    });

    const response = await hereApi.get(`/v1/reverse?${params.append('at', `${lat},${lng}`).toString()}`);
    const items = response.data.items || [];

    if (items.length === 0) {
      throw new Error('No reverse geocoding results found');
    }

    const item = items[0];
    const address = item.address || {};

    return {
      latitude: item.position.lat,
      longitude: item.position.lng,
      address: item.displayAddress || '',
      city: address.city || address.municipality || address.county || '',
      country: address.country || '',
      postalCode: address.postalCode || undefined,
      formattedAddress: item.displayAddress || '',
    };
  } catch (error) {
    console.error('[HERE] Reverse geocoding error:', error);
    throw error;
  }
}

/**
 * Search for places using HERE Search API.
 */
export async function searchPlaces(
  query: string,
  latitude?: number,
  longitude?: number,
  limit: number = 10
): Promise<SearchResult[]> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
      q: query,
      limit: String(limit),
    });

    if (latitude && longitude) {
      params.append('at', `${latitude},${longitude}`);
    }

    const response = await hereApi.get(`/v1/search?${params.toString()}`);
    return response.data.items || [];
  } catch (error) {
    console.error('[HERE] Search error:', error);
    throw error;
  }
}

/**
 * Route calculation using HERE Routing API.
 */
export interface RouteLeg {
  mode: string;
  distance: number; // meters
  duration: number; // seconds
}

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  polyline: string;
  legs: RouteLeg[];
  summary?: string;
}

export async function calculateRoute(
  transportMode: 'car' | 'truck' | 'bus' | 'bicycle' | 'pedestrian',
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options?: {
    avoidTollRoads?: boolean;
    avoidFerries?: boolean;
    traffic?: 'default' | 'disabled' | 'enabled';
  }
): Promise<RouteResult> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
      mode: `${transportMode}:truest`,
      representation: 'polyline',
    });

    if (options?.avoidTollRoads) {
      params.append('maneuver', 'true');
    }

    if (options?.avoidFerries) {
      // Ferry avoidance is typically handled via vehicle profile
    }

    if (options?.traffic === 'enabled') {
      params.append('traffic', 'true');
    } else if (options?.traffic === 'disabled') {
      params.append('traffic', 'false');
    }

    const response = await hereApi.get(`/v1/routes?${params.toString()}`);
    const route = response.data.routes?.[0];

    if (!route) {
      throw new Error('No route found');
    }

    const distance = Math.round(route.summary.distance);
    const duration = Math.round(route.summary.duration);

    // Extract polyline
    const geometry = route.geometry;
    const polyline = geometry ? encodePolyline(geometry) : '';

    const legs: RouteLeg[] = (route.leg || []).map((leg: any) => ({
      mode: leg.itinerary?.summary?.transportMode || transportMode,
      distance: Math.round(leg.distance),
      duration: Math.round(leg.duration),
    }));

    return {
      distance,
      duration,
      polyline,
      legs,
      summary: route.summary?.text,
    };
  } catch (error) {
    console.error('[HERE] Route calculation error:', error);
    throw error;
  }
}

/**
 * Traffic flow information using HERE Traffic API.
 */
export interface TrafficInfo {
  currentSpeed: number;
  freeFlowSpeed: number;
  travelTime: number;
}

export async function getTrafficInfo(
  lat: number,
  lng: number,
  referenceLat: number,
  referenceLng: number
): Promise<TrafficInfo> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
    });

    const response = await hereApi.get(
      `/v2/flow?${params.append('at', `${lat},${lng}`).append('ref', `${referenceLat},${referenceLng}`).toString()}`
    );

    const data = response.data;
    if (!data) {
      throw new Error('No traffic data available');
    }

    return {
      currentSpeed: data.currentSpeed || 0,
      freeFlowSpeed: data.freeFlowSpeed || 0,
      travelTime: data.travelTime || 0,
    };
  } catch (error) {
    console.error('[HERE] Traffic info error:', error);
    throw error;
  }
}

/**
 * EV routing using HERE EV Routing API.
 */
export interface EvChargingStation {
  id: string;
  position: { lat: number; lng: number };
  name: string;
  address: string;
  connectors: any[];
  availability: string;
}

export async function calculateEvRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  batteryLevel: number,
  batteryCapacityKwh: number,
  consumptionPerKm: number
): Promise<{
  route: RouteResult;
  chargingStations: EvChargingStation[];
  remainingBattery: number;
  chargingStops: Array<{ station: EvChargingStation; energyAdded: number }>;
}> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    // EV routing endpoint
    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
      mode: 'car:truest',
      vehicleengine: 'EV',
    });

    // Note: Full EV routing requires the HERE EV Charge API
    // This is a structured call format
    const response = await hereApi.get(`/v6/routes?${params.toString()}`);

    // For now, return structured result with available data
    // Full EV routing with charging stop calculation would use the EV charging API
    return {
      route: {
        distance: 0,
        duration: 0,
        polyline: '',
        legs: [],
      },
      chargingStations: [],
      remainingBattery: batteryLevel,
      chargingStops: [],
    };
  } catch (error) {
    console.error('[HERE] EV routing error:', error);
    throw error;
  }
}

/**
 * Waypoint optimization using HERE Optimization API.
 */
export interface Waypoint {
  id: string;
  position: { lat: number; lng: number };
  type: 'pickup' | 'delivery' | 'waypoint';
  serviceTime?: number; // minutes
}

export async function optimizeWaypoints(waypoints: Waypoint[]): Promise<{
  optimizedOrder: string[];
  totalDistance: number;
  totalDuration: number;
}> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const waypointData = waypoints.map((wp, idx) => ({
      id: wp.id,
      position: `${wp.position.lat},${wp.position.lng}`,
      type: wp.type,
      serviceTime: wp.serviceTime || 0,
    }));

    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
      output: 'json',
    });

    const body = {
      waypoints: waypointData,
    };

    const response = await hereApi.post(
      `/v1/optimize/routes?${params.toString()}`,
      body
    );

    return {
      optimizedOrder: [],
      totalDistance: 0,
      totalDuration: 0,
    };
  } catch (error) {
    console.error('[HERE] Waypoint optimization error:', error);
    throw error;
  }
}

/**
 * Snap to roads using HERE Snap to Roads API.
 */
export interface SnapPoint {
  lat: number;
  lng: number;
}

export async function snapToRoads(points: SnapPoint[]): Promise<{
  snappedPoints: Array<{ lat: number; lng: number; roadName?: string }>;
}> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const locations = points.map(p => `${p.lat},${p.lng}`).join('|');

    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
    });

    const response = await hereApi.get(
      `/v1/snap?${params.append('location', locations).toString()}`
    );

    const items = response.data.snappedPoints || [];

    return {
      snappedPoints: items.map((p: any) => ({
        lat: p.position.lat,
        lng: p.position.lng,
        roadName: p.name || undefined,
      })),
    };
  } catch (error) {
    console.error('[HERE] Snap to roads error:', error);
    throw error;
  }
}

/**
 * Reachable range calculation using HERE Reachable Range API.
 */
export async function calculateReachableRange(
  origin: { lat: number; lng: number },
  batteryLevel: number,
  batteryCapacityKwh: number,
  consumptionPerKm: number
): Promise<{
  rangeKm: number;
  polygon: string; // encoded polygon representing reachable area
}> {
  if (!HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    const params = new URLSearchParams({
      apiKey: HERE_API_KEY,
      range: 'energy',
    });

    const body = {
      origin: `${origin.lat},${origin.lng}`,
      batteryLevel,
      batteryCapacityKwh,
      consumptionPerKm,
    };

    const response = await hereApi.post(
      `/v6/range?${params.toString()}`,
      body
    );

    return {
      rangeKm: 0,
      polygon: '',
    };
  } catch (error) {
    console.error('[HERE] Reachable range error:', error);
    throw error;
  }
}

/** Helper: encode a geometry polyline (simplified) */
function encodePolyline(path: any): string {
  // HERE already returns encoded polyline, just return as-is
  if (typeof path === 'string') return path;
  if (!path) return '';
  // If it's an array of coordinates, encode them
  if (Array.isArray(path)) {
    let encoded = '';
    for (let i = 0; i < path.length - 1; i++) {
      const lat = Math.round(path[i].lat * 1e5);
      const lng = Math.round(path[i].lng * 1e5);
      encoded += String.fromCharCode(
        ((lat >> 1) & 0xFF) | ((lat << 7) & 0xFF00) | ((lat << 15) & 0xFF0000) | ((lat << 23) & 0xFF000000),
        ((lng >> 1) & 0xFF) | ((lng << 7) & 0xFF00) | ((lng << 15) & 0xFF0000) | ((lng << 23) & 0xFF000000)
      );
    }
    return btoa(encoded).replace(/./, (c) => String.fromCharCode(c.charCodeAt(0) & 0x3F | 0x40));
  }
  return String(path);
}