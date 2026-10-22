/**
 * Shapes of the raw Open-Meteo JSON responses we request.
 *
 * Only the fields we ask for are typed. Hourly values can be null when a model
 * has no data for a cell (common for waves in shallow Baltic bays), so numeric
 * arrays are typed as `(number | null)[]`.
 */

/** Response from the Forecast API (https://api.open-meteo.com/v1/forecast). */
export interface OpenMeteoForecastResponse {
  latitude: number
  longitude: number
  timezone: string
  hourly: {
    time: string[]
    wind_speed_10m: (number | null)[]
    wind_gusts_10m?: (number | null)[]
    wind_direction_10m: (number | null)[]
  }
  daily: {
    time: string[]
    sunrise: string[]
    sunset: string[]
  }
}

/** Response from the Marine API (https://marine-api.open-meteo.com/v1/marine). */
export interface OpenMeteoMarineResponse {
  latitude: number
  longitude: number
  hourly?: {
    time: string[]
    wave_height?: (number | null)[]
    wave_direction?: (number | null)[]
    wave_period?: (number | null)[]
    wind_wave_height?: (number | null)[]
    wind_wave_direction?: (number | null)[]
    wind_wave_period?: (number | null)[]
    swell_wave_height?: (number | null)[]
    swell_wave_direction?: (number | null)[]
    swell_wave_period?: (number | null)[]
  }
}

/** Open-Meteo returns this shape on error (with a non-2xx status). */
export interface OpenMeteoError {
  error: true
  reason: string
}
