export interface Point {
  lat: number;
  lng: number;
}

/**
 * Ray-casting algorithm to test if a point is inside a polygon.
 * GeoJSON polygon coordinates are typically [lng, lat] pairs.
 */
export function isPointInPolygon(point: Point, polygonCoords: [number, number][]): boolean {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0];
    const yi = polygonCoords[i][1];
    const xj = polygonCoords[j][0];
    const yj = polygonCoords[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates haversine distance in kilometers between two lat/lng coordinates.
 */
export function haversineDistanceKm(p1: Point, p2: Point): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates estimated rickshaw fare in BDT (Bangladeshi Taka).
 * Base fare: 25 BDT + 15 BDT / km
 */
export function calculateEstimatedFare(distanceKm: number): number {
  const baseFare = 25;
  const perKmRate = 15;
  const calculated = baseFare + distanceKm * perKmRate;
  return Math.max(baseFare, Math.round(calculated));
}
