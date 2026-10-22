/** Location helpers: distance filtering, city search, and optional GPS. */
export type { Coords, Place } from './types'
export { distanceKm, withinDistance, type WithDistance } from './distance'
export { searchPlaces, buildGeocodeUrl } from './geocode'
export { getCurrentPosition, type GeolocationLike } from './geolocation'
