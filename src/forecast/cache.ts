/**
 * In-memory forecast cache keyed by coordinates rounded to ~0.1° (about 7 km of
 * latitude). Nearby spots and quick refetches reuse one Open-Meteo response.
 *
 * This is just request de-duplication for a session. Offline/persistent caching
 * of forecasts is the PWA service worker's job (issue #7).
 */
import type { Forecast } from '../scoring'

const COORD_PRECISION = 0.1
const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1 hour

/** Stable key for a coordinate, rounded to COORD_PRECISION. */
export function coordKey(lat: number, lon: number): string {
  const round = (v: number): string =>
    (Math.round(v / COORD_PRECISION) * COORD_PRECISION).toFixed(1)
  return `${round(lat)},${round(lon)}`
}

interface Entry {
  forecast: Forecast
  storedAt: number
}

export class ForecastCache {
  private store = new Map<string, Entry>()
  private ttlMs: number
  private now: () => number

  constructor(ttlMs: number = DEFAULT_TTL_MS, now: () => number = Date.now) {
    this.ttlMs = ttlMs
    this.now = now
  }

  get(lat: number, lon: number): Forecast | undefined {
    const entry = this.store.get(coordKey(lat, lon))
    if (!entry) return undefined
    if (this.now() - entry.storedAt > this.ttlMs) {
      this.store.delete(coordKey(lat, lon))
      return undefined
    }
    return entry.forecast
  }

  set(lat: number, lon: number, forecast: Forecast): void {
    this.store.set(coordKey(lat, lon), { forecast, storedAt: this.now() })
  }

  clear(): void {
    this.store.clear()
  }
}
