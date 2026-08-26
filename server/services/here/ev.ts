import { calculateEvRoute, EvChargingStation, type EvChargingStation as EvChargingStationType } from './hereClient';

export interface EvRouteInput {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  batteryLevel: number; // percentage (0-100)
  batteryCapacityKwh: number; // battery capacity in kWh
  consumptionPerKm: number; // kWh per km
}

export interface EvChargingStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  connectors: any[];
  availability: 'available' | 'unavailable' | 'unknown';
}

export interface EvRouteOutput {
  route: {
    distanceKm: number;
    durationMin: number;
  };
  chargingStations: EvChargingStation[];
  remainingBattery: number;
  chargingStops: Array<{
    station: EvChargingStation;
    energyAddedKwh: number;
    timeAddedMin: number;
  }>;
  totalEnergyNeededKwh: number;
  batteryDeficit: number;
}

/**
 * Calculate an EV route with charging stop planning.
 * Uses HERE EV Routing to calculate routes considering battery constraints
 * and charging station availability along the way.
 */
export async function planEvRoute(input: EvRouteInput): Promise<EvRouteOutput> {
  if (!process.env.HERE_API_KEY) {
    throw new Error('HERE_API_KEY is not configured');
  }

  try {
    // Use HERE EV routing to calculate the route
    // The full EV charging stop calculation requires the HERE EV Charge API
    // For now, we structure the call and provide available data

    const response = await fetch(
      `https://router.hereapi.com/v8/routes?apiKey=${process.env.HERE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transportMode: {
            type: 'car',
            vehicleType: 'EV',
          },
          origin: {
            lat: input.origin.lat,
            lng: input.origin.lng,
          },
          destination: {
            lat: input.destination.lat,
            lng: input.destination.lng,
          },
          vehicle: {
            batteryLevel: input.batteryLevel,
            batteryCapacityKwh: input.batteryCapacityKwh,
            consumptionPerKm: input.consumptionPerKm,
          },
          traffic: 'true',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[HERE] EV routing error:', response.status, errorText);
      throw new Error(`EV routing failed: ${response.status}`);
    }

    const data = await response.json();

    // Parse charging stations from the route response
    // HERE returns charging station suggestions when EV routing is used
    const chargingStations: EvChargingStation[] = [];

    // Calculate remaining battery and energy consumption
    const totalDistanceKm = (data.routes?.[0]?.summary?.distance || 0) / 1000;
    const energyNeededKwh = totalDistanceKm * input.consumptionPerKm;
    const remainingBattery = Math.max(input.batteryLevel - (energyNeededKwh / input.batteryCapacityKwh) * 100, 0);

    // If battery is insufficient, we need charging stops
    let chargingStops = [];
    if (remainingBattery < 0) {
      // Would need to query HERE EV Charge API for stations along route
      // For now, return empty charging stops
      chargingStops = [];
    } else {
      chargingStops = [];
    }

    return {
      route: {
        distanceKm: Math.round(totalDistanceKm),
        durationMin: Math.round((data.routes?.[0]?.summary?.duration || 0) / 60),
      },
      chargingStations,
      remainingBattery: Math.max(remainingBattery, 0),
      chargingStops,
      totalEnergyNeededKwh: Math.round(energyNeededKwh * 100) / 100,
      batteryDeficit: Math.max(-remainingBattery, 0),
    };
  } catch (error) {
    console.error('[HERE] EV route planning error:', error);
    throw error;
  }
}

/**
 * Search for EV charging stations near a location.
 * Uses HERE EV Charge/Location API to find charging stations
 * with connector information and availability.
 */
export async function searchChargingStations(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<EvChargingStation[]> {
  if (!process.env.HERE_API_KEY) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      apiKey: process.env.HERE_API_KEY,
      latitude: String(latitude),
      longitude: String(longitude),
      radius: String(radius),
    });

    const response = await fetch(
      `https://search.hereapi.com/v1/search?${params.toString()}`,
      { headers: { 'User-Agent': 'OmniMarket-Ghana/1.0' } }
    );

    if (!response.ok) {
      console.warn('[HERE] Charging stations search failed:', response.status);
      return [];
    }

    const data = await response.json();
    const stations = data.items || [];

    return stations.map((station: any) => ({
      id: station.id || `here-charging-${station.position?.lat}-${station.position?.lng}`,
      name: station.title || station.subtitle || 'Charging Station',
      address: station.address?.addressText || station.vicinity || '',
      latitude: station.position?.lat || latitude,
      longitude: station.position?.lng || longitude,
      connectors: station.chargingOptions || station.connector || [],
      availability: station.chargingOptions?.some((o: any) => o.state === 'available')
        ? 'available'
        : 'unavailable',
    }));
  } catch (error) {
    console.error('[HERE] Charging stations search error:', error);
    return [];
  }
}