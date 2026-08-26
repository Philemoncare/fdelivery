/**
 * HERE Maps integration utilities.
 * Provides map tile, marker, and map feature utilities
 * for the OmniMarket authenticated application.
 * 
 * Note: HERE Maps tiles and JavaScript API are loaded client-side
 * with the API key restricted to specific domains for security.
 * This module provides server-side utilities for generating
 * map URLs and map-related data.
 */

export interface MapTileOptions {
  zoom: number;
  latitude: number;
  longitude: number;
  mapId?: string;
}

/**
 * Generate a HERE Map tile URL for client-side map display.
 * The HERE API key should be injected server-side via a secure endpoint,
 * never committed to frontend code.
 */
export function getMapTileUrl(options: MapTileOptions): string {
  const { zoom, latitude, longitude, mapId } = options;
  const apiKey = process.env.HERE_API_KEY || '';

  if (!apiKey) {
    // Fallback to OpenStreetMap if HERE key not configured
    return `https://{s}.tile.openstreetmap.org/${zoom}/${longitude}/${latitude}.png`;
  }

  // HERE normal map tile URL
  // Domain restriction enforced by HERE for the API key
  return `https://${mapId || 'base'} hereapi.com/maptile/1.0/${mapId || 'maptile'}/normal.day/${zoom}/${longitude}/${latitude}/256/png?apiKey=${apiKey}`;
}

/**
 * Generate a map marker URL for a given location.
 */
export function getMapMarkerUrl(latitude: number, longitude: number, iconId: string = 'm1', color: string = 'bd5d34'): string {
  const apiKey = process.env.HERE_API_KEY || '';

  if (!apiKey) {
    // Fallback: use standard marker pattern
    return `/marker?lat=${latitude}&lng=${longitude}&icon=${iconId}&color=${color}`;
  }

  return `https://${apiKey}/mapmarker/marker/${iconId}/${color}/${longitude}/${latitude}`;
}

/**
 * Generate a map polygon URL for route geometry or area.
 */
export function getMapPolygonUrl(path: Array<{ lat: number; lng: number }>, apiKey?: string): string {
  const encodedPath = path
    .map(p => `${p.lng},${p.lat}`)
    .join(';');

  const key = apiKey || process.env.HERE_API_KEY || '';

  if (!key) {
    // Fallback: return GeoJSON for OpenLeaflet
    return JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [path.map(p => [p.lng, p.lat])] } });
  }

  return `https://maptiles.hereapi.com/v1/?path=${encodeURIComponent(encodedPath)}&apiKey=${key}`;
}

/**
 * Generate a map view bounds URL for fitting multiple points.
 */
export function getMapBoundsUrl(bounds: { north: number; south: number; east: number; west: number }): string {
  const apiKey = process.env.HERE_API_KEY || '';

  if (!apiKey) {
    return `&bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
  }

  return `&apiKey=${apiKey}&bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
}

/**
 * Get center point between two coordinates.
 */
export function getCenterPoint(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): { lat: number; lng: number } {
  return {
    lat: (lat1 + lat2) / 2,
    lng: (lng1 + lng2) / 2,
  };
}

/**
 * Calculate zoom level needed to fit given coordinates.
 */
export function calculateZoomForPoints(points: Array<{ lat: number; lng: number }>): number {
  if (points.length === 0) return 10;
  if (points.length === 1) return 15;

  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const span = Math.max(latSpan, lngSpan);

  // Approximate zoom level based on span
  if (span < 0.01) return 16; // very close
  if (span < 0.02) return 15;
  if (span < 0.05) return 14;
  if (span < 0.1) return 13;
  if (span < 0.2) return 12;
  if (span < 0.5) return 11;
  if (span < 1.0) return 10;
  return 9;
}