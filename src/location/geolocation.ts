/**
 * Thin promise wrapper around the browser Geolocation API for optional GPS.
 * The device may deny permission or have no fix, so callers should handle
 * rejection and fall back to a manual location.
 */
import type { Coords } from './types'

/** The subset of `navigator.geolocation` we use (injectable for tests). */
export interface GeolocationLike {
  getCurrentPosition(
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    error: (err: { message: string }) => void,
    options?: PositionOptions,
  ): void
}

/** Resolve the device's current coordinates, or reject with a reason. */
export function getCurrentPosition(
  geo: GeolocationLike | undefined = globalThis.navigator?.geolocation,
  options?: PositionOptions,
): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!geo) {
      reject(new Error('Geolocation is not available on this device'))
      return
    }
    geo.getCurrentPosition(
      (position) =>
        resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      (err) => reject(new Error(err.message || 'Could not get your location')),
      options,
    )
  })
}
