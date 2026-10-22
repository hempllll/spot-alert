/** Great-circle distance and distance filtering (units: kilometres). */
import type { Coords } from './types'

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number): number => (deg * Math.PI) / 180

/**
 * Haversine distance in km between two coordinates — the straight-line distance
 * over the Earth's surface, good enough for a "spots near me" filter.
 */
export function distanceKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** An item paired with its distance from an origin. */
export interface WithDistance<T> {
  item: T
  distanceKm: number
}

/**
 * Keep the items within `maxKm` of `origin`, nearest first. Items must expose a
 * coordinate via `getCoords` (so this works for spots, places, anything).
 */
export function withinDistance<T>(
  items: T[],
  origin: Coords,
  maxKm: number,
  getCoords: (item: T) => Coords,
): WithDistance<T>[] {
  return items
    .map((item) => ({ item, distanceKm: distanceKm(origin, getCoords(item)) }))
    .filter((x) => x.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
