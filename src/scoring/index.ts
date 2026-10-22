/**
 * Public API of the scoring engine.
 *
 * Pure TypeScript: given a spot and a forecast, produce per-day scores. No UI,
 * storage or network. Keep this module's inputs/outputs plain JSON so they can
 * be stored, shared with the iOS widget, and mirrored by a Swift port.
 */
import { scoreDay } from './day'
import type { Forecast, Spot, SpotScore } from './types'

export * from './types'
export { scoreHour } from './hour'
export { scoreDay } from './day'
export { factorScore } from './factor'

/**
 * Score a spot over a forecast. Days come back sorted by core score (best
 * first); ties keep earlier dates first.
 */
export function scoreSpot(spot: Spot, forecast: Forecast): SpotScore {
  const days = forecast.days.map((day) => scoreDay(day, spot.conditionSets))
  days.sort((a, b) => b.coreScore - a.coreScore || a.date.localeCompare(b.date))
  return {
    ...(spot.id != null ? { spotId: spot.id } : {}),
    spotName: spot.name,
    days,
  }
}
