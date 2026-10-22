/**
 * Open-Meteo request building and fetching.
 *
 * Both APIs are called with `timezone=auto`, so timestamps come back as naive
 * local ISO strings (e.g. "2026-10-24T13:00") — exactly what the scoring engine
 * compares against sunrise/sunset. Wind is requested in knots to match the
 * engine's units. No API key is needed for non-commercial use.
 */
import type {
  OpenMeteoForecastResponse,
  OpenMeteoMarineResponse,
} from './types'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'
const FORECAST_DAYS = 8

/** A `fetch`-compatible function, injectable so tests don't hit the network. */
export type FetchLike = typeof fetch

function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

export function buildForecastUrl(lat: number, lon: number): string {
  return buildUrl(FORECAST_URL, {
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
    daily: 'sunrise,sunset',
    wind_speed_unit: 'kn',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  })
}

export function buildMarineUrl(lat: number, lon: number): string {
  return buildUrl(MARINE_URL, {
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      'wave_height',
      'wave_direction',
      'wave_period',
      'wind_wave_height',
      'wind_wave_direction',
      'wind_wave_period',
      'swell_wave_height',
      'swell_wave_direction',
      'swell_wave_period',
    ].join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  })
}

async function fetchJson<T>(url: string, fetchImpl: FetchLike): Promise<T> {
  const response = await fetchImpl(url)
  if (!response.ok) {
    let reason = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as { reason?: string }
      if (body.reason) reason = body.reason
    } catch {
      // response had no JSON body; keep the status-based reason
    }
    throw new Error(`Open-Meteo request failed: ${reason}`)
  }
  return (await response.json()) as T
}

/** Fetch wind/daylight data. Throws on failure — wind is essential. */
export function fetchForecast(
  lat: number,
  lon: number,
  fetchImpl: FetchLike = fetch,
): Promise<OpenMeteoForecastResponse> {
  return fetchJson<OpenMeteoForecastResponse>(
    buildForecastUrl(lat, lon),
    fetchImpl,
  )
}

/**
 * Fetch wave data. Returns null instead of throwing when the marine model has
 * no coverage for this cell, so scoring can fall back to wind alone.
 */
export async function fetchMarine(
  lat: number,
  lon: number,
  fetchImpl: FetchLike = fetch,
): Promise<OpenMeteoMarineResponse | null> {
  try {
    return await fetchJson<OpenMeteoMarineResponse>(
      buildMarineUrl(lat, lon),
      fetchImpl,
    )
  } catch {
    return null
  }
}
