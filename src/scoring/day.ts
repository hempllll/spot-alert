/**
 * Per-day scoring: keep daylight hours, find the best core window, grow it with
 * neighbouring good hours, and produce the headline the UI sorts on.
 */
import {
  COARSE_ROUND_HOURS,
  CORE_WINDOW_HOURS,
  EXTENSION_ABSOLUTE_FLOOR,
  EXTENSION_RELATIVE,
  VOLATILITY_PENALTY_WEIGHT,
} from './constants'
import { scoreHour } from './hour'
import type {
  ConditionSet,
  DayScore,
  ForecastDay,
  HourScore,
  Window,
} from './types'

const toMs = (iso: string): number => Date.parse(iso)

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

/** Hour-of-day parsed straight from a naive-local ISO string (TZ-agnostic). */
function hourOf(iso: string): number {
  const match = /T(\d{2}):/.exec(iso)
  return match ? Number(match[1]) : 0
}

/** Round an ISO timestamp's hour to a COARSE_ROUND_HOURS boundary for display. */
function roundHourString(iso: string, mode: 'floor' | 'ceil'): string {
  const h = hourOf(iso)
  const step = COARSE_ROUND_HOURS
  const rounded =
    mode === 'floor'
      ? h - (h % step)
      : Math.min(23, h + ((step - (h % step)) % step))
  return iso.replace(/T\d{2}:\d{2}/, `T${String(rounded).padStart(2, '0')}:00`)
}

function makeWindow(
  hours: HourScore[],
  startIndex: number,
  endIndex: number,
  coarse: boolean,
): Window {
  const start = coarse
    ? roundHourString(hours[startIndex].time, 'floor')
    : hours[startIndex].time
  const end = coarse
    ? roundHourString(hours[endIndex].time, 'ceil')
    : hours[endIndex].time
  return { startIndex, endIndex, start, end }
}

/** Scores of the hours in [s, e]. */
function windowScores(hours: HourScore[], s: number, e: number): number[] {
  return hours.slice(s, e + 1).map((h) => h.score)
}

/** mean - k*stddev of the window's hourly scores (the headline core score). */
function adjustedScore(hours: HourScore[], s: number, e: number): number {
  const scores = windowScores(hours, s, e)
  return mean(scores) - VOLATILITY_PENALTY_WEIGHT * stdDev(scores)
}

/** Grow [s, e] outward while neighbours clear the extension thresholds. */
function extend(
  hours: HourScore[],
  s: number,
  e: number,
  coreMean: number,
): [number, number] {
  const qualifies = (h: HourScore): boolean =>
    !h.gated &&
    h.score >= EXTENSION_RELATIVE * coreMean &&
    h.score >= EXTENSION_ABSOLUTE_FLOOR
  let start = s
  let end = e
  let changed = true
  while (changed) {
    changed = false
    if (start - 1 >= 0 && qualifies(hours[start - 1])) {
      start--
      changed = true
    }
    if (end + 1 < hours.length && qualifies(hours[end + 1])) {
      end++
      changed = true
    }
  }
  return [start, end]
}

/** Pick the best core window, breaking ties by extension length then midday. */
function bestCore(hours: HourScore[]): { s: number; e: number } {
  const n = hours.length
  const w = Math.min(CORE_WINDOW_HOURS, n)
  const candidates = []
  for (let s = 0; s + w - 1 < n; s++) {
    candidates.push({ s, e: s + w - 1, adjusted: adjustedScore(hours, s, s + w - 1) })
  }
  const best = Math.max(...candidates.map((c) => c.adjusted))
  const tied = candidates.filter((c) => Math.abs(c.adjusted - best) < 1e-9)
  if (tied.length === 1) return { s: tied[0].s, e: tied[0].e }

  // Tie-break 1: longest extension. Tie-break 2: core centre nearest midday.
  let winner = tied[0]
  let winnerExtLen = -1
  let winnerMiddayDist = Infinity
  for (const c of tied) {
    const [es, ee] = extend(hours, c.s, c.e, mean(windowScores(hours, c.s, c.e)))
    const extLen = ee - es
    const centre = hours[Math.floor((c.s + c.e) / 2)].time
    const middayDist = Math.abs(hourOf(centre) - 12)
    if (
      extLen > winnerExtLen ||
      (extLen === winnerExtLen && middayDist < winnerMiddayDist)
    ) {
      winner = c
      winnerExtLen = extLen
      winnerMiddayDist = middayDist
    }
  }
  return { s: winner.s, e: winner.e }
}

/** Best core window that does not overlap [exclS, exclE], if usable. */
function findSecondWindow(
  hours: HourScore[],
  exclS: number,
  exclE: number,
  coarse: boolean,
): Window | undefined {
  const n = hours.length
  const w = Math.min(CORE_WINDOW_HOURS, n)
  let best: { s: number; e: number; mean: number } | undefined
  for (let s = 0; s + w - 1 < n; s++) {
    const e = s + w - 1
    if (s <= exclE && e >= exclS) continue // overlaps the main window
    const m = mean(windowScores(hours, s, e))
    if (!best || m > best.mean) best = { s, e, mean: m }
  }
  if (!best || best.mean < EXTENSION_ABSOLUTE_FLOOR) return undefined
  return makeWindow(hours, best.s, best.e, coarse)
}

/** Score one forecast day for a spot's condition sets. */
export function scoreDay(
  day: ForecastDay,
  conditionSets: ConditionSet[],
): DayScore {
  const coarse = day.coarse ?? false
  const sunrise = toMs(day.sunrise)
  const sunset = toMs(day.sunset)
  const daylight = day.hours.filter((h) => {
    const t = toMs(h.time)
    return t >= sunrise && t <= sunset
  })
  const hours = daylight.map((h) => scoreHour(conditionSets, h))

  // No daylight hours (e.g. extreme winter day): nothing to score.
  if (hours.length === 0) {
    const empty: Window = { startIndex: 0, endIndex: 0, start: '', end: '' }
    return { date: day.date, coreScore: 0, core: empty, window: empty, hours, coarse }
  }

  const { s, e } = bestCore(hours)
  const core = makeWindow(hours, s, e, coarse)
  const coreMean = mean(windowScores(hours, s, e))
  const [ws, we] = extend(hours, s, e, coreMean)
  const window = makeWindow(hours, ws, we, coarse)

  const coreScore = Math.round(
    Math.max(0, Math.min(1, adjustedScore(hours, s, e))) * 100,
  )

  // Weakest factor = the "why", taken from the weakest hour in the core window.
  const coreHours = hours.slice(s, e + 1)
  const weakestHour = coreHours.reduce((lo, h) => (h.score < lo.score ? h : lo))
  const weakestFactor = weakestHour.weakestFactor

  const secondWindow = findSecondWindow(hours, ws, we, coarse)
  const noWaveData = hours.every((h) => h.missingWaveData === true)

  return {
    date: day.date,
    coreScore,
    core,
    window,
    hours,
    ...(weakestFactor ? { weakestFactor } : {}),
    ...(secondWindow ? { secondWindow } : {}),
    ...(noWaveData ? { noWaveData: true } : {}),
    coarse,
  }
}
