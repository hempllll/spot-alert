/**
 * "Which spot is best on which day" for the main screen.
 *
 * Pure like the scoring engine: inputs are spots that are already scored, so
 * this is plain data in, plain data out, with no React, storage or network.
 */
import type { DayScore, SpotScore } from '../scoring'
import type { StoredSpot } from '../storage'

/** A spot within range, its distance, and its scored forecast. */
export interface SpotResult {
  spot: StoredSpot
  distanceKm: number
  score: SpotScore
}

/** One spot's score on one day. */
export interface SpotDay {
  spot: StoredSpot
  distanceKm: number
  day: DayScore
}

/** One row of the week screen. */
export interface WeekRow {
  date: string
  /** Highest-scoring spot that day, or null when every score is 0. */
  best: SpotDay | null
  /** Other spots that also scored above 0 that day. */
  moreCount: number
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** Local calendar dates "YYYY-MM-DD" for `count` days starting at `from`. */
export function nextDates(from: Date, count = 8): string[] {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }
  return dates
}

/** Every spot's score for one date, best first (ties: nearer, then by name). */
export function rankForDate(results: SpotResult[], date: string): SpotDay[] {
  const entries: SpotDay[] = []
  for (const { spot, distanceKm, score } of results) {
    const day = score.days.find((d) => d.date === date)
    if (day) entries.push({ spot, distanceKm, day })
  }
  return entries.sort(
    (a, b) =>
      b.day.coreScore - a.day.coreScore ||
      a.distanceKm - b.distanceKm ||
      a.spot.name.localeCompare(b.spot.name),
  )
}

/** For each date, the best spot (if any scored above 0) and how many others did. */
export function bestSpotPerDay(results: SpotResult[], dates: string[]): WeekRow[] {
  return dates.map((date) => {
    const scoring = rankForDate(results, date).filter((e) => e.day.coreScore > 0)
    return {
      date,
      best: scoring[0] ?? null,
      moreCount: Math.max(0, scoring.length - 1),
    }
  })
}

/** Date of the week's best row (earliest on ties), or null if nothing scored. */
export function bestDate(rows: WeekRow[]): string | null {
  let top: string | null = null
  let topScore = 0
  for (const row of rows) {
    const score = row.best?.day.coreScore ?? 0
    if (score > topScore) {
      top = row.date
      topScore = score
    }
  }
  return top
}
