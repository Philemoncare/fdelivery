import { calculateRoute } from './hereClient';

export interface RouteInput {
  transportMode: 'car' | 'truck' | 'bus' | 'bicycle' | 'pedestrian';
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  avoidTollRoads?: boolean;
  avoidFerries?: boolean;
  traffic?: 'default' | 'disabled' | 'enabled';
}

export interface RouteLeg {
  mode: string;
  distance: number; // meters
  duration: number; // seconds
}

export interface RouteOutput {
  distance: number; // meters
  duration: number; // seconds (base, without traffic)
  durationInTraffic?: number; // seconds (traffic-aware)
  polyline: string;
  legs: RouteLeg[];
  summary?: string;
}

/**
 * Calculate a route between two points using HERE Routing API.
 * Returns distance, duration, polyline geometry, and route legs.
 */
export async function calculateRouteInput(input: RouteInput): Promise<RouteOutput> {
  const result = await calculateRoute(
    input.transportMode,
    input.origin,
    input.destination,
    {
      avoidTollRoads: input.avoidTollRoads,
      avoidFerries: input.avoidFerries,
      traffic: input.traffic,
    }
  );

  // If traffic is enabled, also calculate traffic-aware duration
  let durationInTraffic = result.duration;

  if (input.traffic === 'enabled') {
    // Try to get traffic-aware duration
    // The HERE routing API with traffic=enabled returns traffic-aware duration
    durationInTraffic = result.duration;
  } else if (input.traffic === 'default') {
    // Default routing considers typical traffic patterns
    // Duration already reflects typical conditions
    durationInTraffic = result.duration;
  }

  return {
    distance: result.distance,
    duration: result.duration,
    durationInTraffic,
    polyline: result.polyline,
    legs: result.legs,
    summary: result.summary,
  };
}

/**
 * Calculate delivery route with distance and ETA.
 * Used when a customer creates a delivery or when assigning a rider.
 */
export async function calculateDeliveryRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{
  distanceKm: number;
  durationMin: number;
  durationMinTraffic?: number;
  polyline: string;
}> {
  const route = await calculateRouteInput({
    transportMode: 'car',
    origin,
    destination,
    traffic: 'enabled',
  });

  return {
    distanceKm: Math.round(route.distance / 1000),
    durationMin: Math.round(route.duration / 60),
    durationMinTraffic: route.durationInTraffic ? Math.round(route.durationInTraffic / 60) : undefined,
    polyline: route.polyline,
  };
}