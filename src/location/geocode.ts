/**
 * City/place search via Open-Meteo's free geocoding API, for choosing a manual
 * location by name. No API key needed for non-commercial use.
 */
import type { Place } from './types'

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'

type FetchLike = typeof fetch

interface GeocodeResult {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}
interface GeocodeResponse {
  results?: GeocodeResult[]
}

export function buildGeocodeUrl(query: string, count = 5): string {
  const url = new URL(GEOCODE_URL)
  url.searchParams.set('name', query)
  url.searchParams.set('count', String(count))
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  return url.toString()
}

/** Search for places by name. Returns [] for a blank query or no matches. */
export async function searchPlaces(
  query: string,
  fetchImpl: FetchLike = fetch,
): Promise<Place[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const response = await fetchImpl(buildGeocodeUrl(trimmed))
  if (!response.ok) {
    throw new Error(`Geocoding request failed: HTTP ${response.status}`)
  }
  const body = (await response.json()) as GeocodeResponse
  return (body.results ?? []).map((r) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    ...(r.country ? { country: r.country } : {}),
    ...(r.admin1 ? { region: r.admin1 } : {}),
  }))
}
