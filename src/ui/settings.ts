/**
 * User settings (location + max distance), persisted in localStorage so they
 * survive app restarts. Loading is defensive: bad or missing data falls back to
 * defaults instead of breaking the app.
 */
import type { Coords } from '../location'

export interface Origin extends Coords {
  /** What the location bar shows, e.g. "Current location" or "Kiel, ...". */
  label: string
  source: 'gps' | 'search'
}

export interface Settings {
  origin: Origin | null
  maxKm: number
}

export const DEFAULT_MAX_KM = 100
export const SETTINGS_KEY = 'spot-alert.settings'

export const defaultSettings: Settings = { origin: null, maxKm: DEFAULT_MAX_KM }

export function loadSettings(storage: Storage): Settings {
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw)
    const maxKm =
      typeof parsed?.maxKm === 'number' && parsed.maxKm > 0
        ? parsed.maxKm
        : DEFAULT_MAX_KM
    const o = parsed?.origin
    const origin: Origin | null =
      o && typeof o.lat === 'number' && typeof o.lon === 'number'
        ? {
            lat: o.lat,
            lon: o.lon,
            label: typeof o.label === 'string' ? o.label : 'Saved location',
            source: o.source === 'gps' ? 'gps' : 'search',
          }
        : null
    return { origin, maxKm }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(storage: Storage, settings: Settings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
