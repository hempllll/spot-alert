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

/**
 * Open-Meteo stamps the whole series with one fixed UTC offset (the one in
 * effect now), so after a daylight-saving switch inside the 8 days every time
 * is an hour off. This rebuilds a naive timestamp in the location's real local
 * time. Without offset/time-zone info, timestamps pass through unchanged.
 *
 * On the night clocks go back, two night hours share a local time; only
 * daylight hours are scored, so that collision is harmless.
 */
function localizer(
  timeZone: string | undefined,
  offsetSeconds: number | undefined,
): (naive: string) => string {
  if (!timeZone || offsetSeconds === undefined) return (t) => t
  let format: Intl.DateTimeFormat
  try {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
  } catch {
    return (t) => t // unknown time zone name
  }
  return (naive) => {
    const instant = Date.parse(`${naive}Z`) - offsetSeconds * 1000
    if (Number.isNaN(instant)) return naive
    const p = Object.fromEntries(format.formatToParts(instant).map((x) => [x.type, x.value]))
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
  }
}

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
  const local = localizer(forecast.timezone, forecast.utc_offset_seconds)
  const localMarine = localizer(
    marine?.timezone ?? forecast.timezone,
    marine?.utc_offset_seconds ?? forecast.utc_offset_seconds,
  )

  // Map marine hours by (local) timestamp for quick lookup.
  const wavesByTime = new Map<string, ForecastHour['waves']>()
  if (marine?.hourly) {
    const mh = marine.hourly
    for (let i = 0; i < mh.time.length; i++) {
      wavesByTime.set(localMarine(mh.time[i]), waveSourcesAt(mh, i))
    }
  }

  // Build hours, grouped by calendar date (first 10 chars of the timestamp).
  const hoursByDate = new Map<string, ForecastHour[]>()
  for (let i = 0; i < fh.time.length; i++) {
    const time = local(fh.time[i])
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
    sunrise: local(forecast.daily.sunrise[index]),
    sunset: local(forecast.daily.sunset[index]),
    hours: hoursByDate.get(date) ?? [],
    coarse: index >= COARSE_FROM_DAY_INDEX,
  }))

  return { days }
}
