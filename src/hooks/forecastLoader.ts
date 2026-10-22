/**
 * The app's real forecast loader: one shared cache for the session, and
 * concurrent requests for the same cell share a single network call.
 */
import { ForecastCache, coordKey, getForecast } from '../forecast'
import type { Forecast } from '../scoring'
import type { ForecastLoader } from './useForecasts'

const cache = new ForecastCache()
const inFlight = new Map<string, Promise<Forecast>>()

export const defaultForecastLoader: ForecastLoader = (lat, lon) => {
  const key = coordKey(lat, lon)
  let request = inFlight.get(key)
  if (!request) {
    request = getForecast(lat, lon, { cache }).finally(() => inFlight.delete(key))
    inFlight.set(key, request)
  }
  return request
}
