/**
 * Turn the raw Open-Meteo responses into the engine's `Forecast` shape.
 *
 * The two APIs share the same hourly grid (same timezone, same forecast_days),
 * so we merge marine data onto wind hours by matching timestamps.
 */
import type {
  Forecast,
  ForecastDay,
  ForecastHour,
  WaveData,
} from '../scoring'
import type {
  OpenMeteoForecastResponse,
  OpenMeteoMarineResponse,
} from './types'

/** Forecast days ~5-8 have coarse time precision (0-indexed >= 4). */
export const COARSE_FROM_DAY_INDEX = 4

/** Read index `i` from an optional array, returning null when absent. */
function at(arr: (number | null)[] | undefined, i: number): number | null {
  return arr?.[i] ?? null
}

/** Build the three wave sources for one marine hourly index. */
function waveSourcesAt(
  marine: NonNullable<OpenMeteoMarineResponse['hourly']>,
  i: number,
): ForecastHour['waves'] {
  const total: WaveData = {
    height: at(marine.wave_height, i),
    direction: at(marine.wave_direction, i),
    period: at(marine.wave_period, i),
  }
  const wind: WaveData = {
    height: at(marine.wind_wave_height, i),
    direction: at(marine.wind_wave_direction, i),
    period: at(marine.wind_wave_period, i),
  }
  const swell: WaveData = {
    height: at(marine.swell_wave_height, i),
    direction: at(marine.swell_wave_direction, i),
    period: at(marine.swell_wave_period, i),
  }
  return { total, wind, swell }
}

export function normalizeForecast(
  forecast: OpenMeteoForecastResponse,
  marine: OpenMeteoMarineResponse | null,
): Forecast {
  const fh = forecast.hourly

  // Map marine hours by timestamp for quick lookup.
  const wavesByTime = new Map<string, ForecastHour['waves']>()
  if (marine?.hourly) {
    const mh = marine.hourly
    for (let i = 0; i < mh.time.length; i++) {
      wavesByTime.set(mh.time[i], waveSourcesAt(mh, i))
    }
  }

  // Build hours, grouped by calendar date (first 10 chars of the timestamp).
  const hoursByDate = new Map<string, ForecastHour[]>()
  for (let i = 0; i < fh.time.length; i++) {
    const time = fh.time[i]
    const windSpeed = at(fh.wind_speed_10m, i)
    const windDirection = at(fh.wind_direction_10m, i)
    // Skip hours missing essential wind data.
    if (windSpeed == null || windDirection == null) continue

    const gusts = at(fh.wind_gusts_10m, i)
    const hour: ForecastHour = {
      time,
      windSpeed,
      windDirection,
      ...(gusts != null ? { gusts } : {}),
      ...(wavesByTime.has(time) ? { waves: wavesByTime.get(time) } : {}),
    }
    const date = time.slice(0, 10)
    const list = hoursByDate.get(date)
    if (list) list.push(hour)
    else hoursByDate.set(date, [hour])
  }

  const days: ForecastDay[] = forecast.daily.time.map((date, index) => ({
    date,
    sunrise: forecast.daily.sunrise[index],
    sunset: forecast.daily.sunset[index],
    hours: hoursByDate.get(date) ?? [],
    coarse: index >= COARSE_FROM_DAY_INDEX,
  }))

  return { days }
}
