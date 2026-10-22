/** Display helpers shared by the screens. Pure functions, no React. */
import type { DayScore, Window } from '../scoring'
import type { Place } from '../location'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (n: number): string => String(n).padStart(2, '0')
const hourOf = (iso: string): number => Number(iso.slice(11, 13))

/** "2026-10-25" -> "Sun 25" */
export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d}`
}

/**
 * A session window as hours, e.g. "11–18". The engine's window end is the start
 * of the last good hour, so precise days show end + 1 (11:00 until 18:00).
 * Coarse days are already rounded outward to 3-hour blocks by the engine.
 */
export function formatWindow(window: Window, coarse = false): string {
  const end = coarse ? hourOf(window.end) : hourOf(window.end) + 1
  return `${pad(hourOf(window.start))}–${pad(end)}`
}

export function formatKm(km: number): string {
  return `${Math.round(km)} km`
}

/** A 0-100 score's colour band, shared by badges and hour bars. */
export type ScoreBand = 'great' | 'good' | 'ok' | 'poor' | 'none'

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return 'great'
  if (score >= 60) return 'good'
  if (score >= 40) return 'ok'
  if (score > 0) return 'poor'
  return 'none'
}

const FACTOR_LABELS: Record<string, string> = {
  windSpeed: 'wind',
  gusts: 'gusts',
  windDirection: 'wind direction',
  waveHeight: 'waves',
  waveDirection: 'wave direction',
  wavePeriod: 'wave period',
}

/** Days scoring at least this don't need a "why". */
const WHY_BELOW = 80

/** "why: wind direction" for a day that isn't great, otherwise null. */
export function whyText(day: DayScore): string | null {
  if (day.coreScore >= WHY_BELOW || !day.weakestFactor) return null
  return `why: ${FACTOR_LABELS[day.weakestFactor] ?? day.weakestFactor}`
}

/** "Kiel, Schleswig-Holstein, Germany" */
export function placeLabel(place: Place): string {
  return [place.name, place.region, place.country].filter(Boolean).join(', ')
}
