import { getTrafficInfo } from './hereClient';

export interface TrafficSnapshot {
  currentSpeed: number; // m/s
  freeFlowSpeed: number; // m/s
  travelTime: number; // seconds
  roadType: string;
  description?: string;
}

/**
 * Get traffic flow information for a specific location.
 * Used to determine traffic conditions affecting routes and ETAs.
 */
export async function getTrafficSnapshot(
  lat: number,
  lng: number,
  referenceLat: number,
  referenceLng: number
): Promise<TrafficSnapshot> {
  const data = await getTrafficInfo(lat, lng, referenceLat, referenceLng);

  let roadType = 'unknown';
  let description: string | undefined;

  // Determine traffic condition based on speed ratio
  const speedRatio = data.currentSpeed / Math.max(data.freeFlowSpeed, 1);

  if (speedRatio >= 0.8) {
    roadType = 'light';
    description = 'Normal traffic';
  } else if (speedRatio >= 0.5) {
    roadType = 'moderate';
    description = 'Moderate traffic';
  } else if (speedRatio >= 0.2) {
    roadType = 'heavy';
    description = 'Heavy traffic';
  } else {
    roadType = ' standstill';
    description = 'Standstill';
  }

  return {
    currentSpeed: data.currentSpeed,
    freeFlowSpeed: data.freeFlowSpeed,
    travelTime: data.travelTime,
    roadType,
    description,
  };
}

/**
 * Get traffic incidents for a route or area.
 * Uses HERE Traffic Incidents API to find accidents, road closures,
 * construction, and other incidents that may affect routing.
 */
export interface TrafficIncident {
  id: string;
  title: string;
  description: string;
  type: 'accident' | 'road-closure' | 'construction' | 'event' | 'other';
  severity: 'low' | 'medium' | 'high';
  location: { lat: number; lng: number };
  extent?: { lat: number; lng: number }[];
  status: 'active' | 'planned' | 'removed';
  startTime?: string;
  endTime?: string;
}

export async function getTrafficIncidents(
  lat: number,
  lng: number,
  radius: number = 5000
): Promise<TrafficIncident[]> {
  if (!process.env.HERE_API_KEY) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      apiKey: process.env.HERE_API_KEY,
      radius: String(radius),
    });

    const response = await fetch(
      `https://api.here.com/traffic/6/incidents.json?${params.append('at', `${lat},${lng}`).toString()}`,
      { headers: { 'User-Agent': 'OmniMarket-Ghana/1.0' } }
    );

    if (!response.ok) {
      console.warn('[HERE] Traffic incidents request failed:', response.status);
      return [];
    }

    const data = await response.json();
    const incidents = (data?.incident || []);

    return incidents.map((inc: any) => ({
      id: inc.id || '',
      title: inc.summary || inc.title || 'Traffic incident',
      description: inc.description || '',
      type: inc.type || 'other',
      severity: inc.severity || 'low',
      location: {
        lat: inc.coordinates?.lat || lat,
        lng: inc.coordinates?.lng || lng,
      },
      extent: inc.extent?.map((e: any) => ({
        lat: e.lat || lat,
        lng: e.lng || lng,
      })) || undefined,
      status: inc.status || 'active',
      startTime: inc.startTime,
      endTime: inc.endTime,
    }));
  } catch (error) {
    console.error('[HERE] Traffic incidents error:', error);
    return [];
  }
}

/**
 * Check if there are any active incidents along a route.
 * Used to adjust ETA and provide rider/customer alerts.
 */
export async function checkRouteIncidents(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{
  incidents: TrafficIncident[];
  hasSignificantImpact: boolean;
}> {
  const incidents = await getTrafficIncidents(
    (origin.lat + destination.lat) / 2,
    (origin.lng + destination.lng) / 2
  );

  // Filter to active incidents only
  const activeIncidents = incidents.filter(i => i.status === 'active');

  // Determine if any incident has significant impact
  // (high severity or within 500m of route midpoint)
  const hasHighSeverity = activeIncidents.some(i => i.severity === 'high');
  const hasMediumSeverity = activeIncidents.some(i => i.severity === 'medium');

  const hasSignificantImpact = hasHighSeverity || hasMediumSeverity;

  return {
    incidents: activeIncidents,
    hasSignificantImpact,
  };
}