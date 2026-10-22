/**
 * Public API of the forecast module: fetch wind + wave data from Open-Meteo and
 * return it in the scoring engine's `Forecast` shape, with a coordinate cache.
 */
import type { Forecast } from '../scoring'
import { ForecastCache } from './cache'
import { fetchForecast, fetchMarine, type FetchLike } from './openMeteo'
import { normalizeForecast } from './normalize'

export { ForecastCache, coordKey } from './cache'
export {
  buildForecastUrl,
  buildMarineUrl,
  fetchForecast,
  fetchMarine,
} from './openMeteo'
export { normalizeForecast, COARSE_FROM_DAY_INDEX } from './normalize'
export type * from './types'

export interface GetForecastOptions {
  /** Injectable fetch (for tests / custom clients). Defaults to global fetch. */
  fetchImpl?: FetchLike
  /** Cache to read/write. Omit to bypass caching. */
  cache?: ForecastCache
}

/**
 * Get an 8-day forecast for a coordinate, ready to pass to `scoreSpot`.
 * Wind and wave data are fetched in parallel; missing wave data degrades to
 * wind-only scoring.
 */
export async function getForecast(
  lat: number,
  lon: number,
  options: GetForecastOptions = {},
): Promise<Forecast> {
  const { fetchImpl = fetch, cache } = options

  const hit = cache?.get(lat, lon)
  if (hit) return hit

  const [forecast, marine] = await Promise.all([
    fetchForecast(lat, lon, fetchImpl),
    fetchMarine(lat, lon, fetchImpl),
  ])
  const normalized = normalizeForecast(forecast, marine)

  cache?.set(lat, lon, normalized)
  return normalized
}
