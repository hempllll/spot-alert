/**
 * Plain-JSON data shapes for the scoring engine.
 *
 * Everything here is deliberately serialisable (no classes, no functions) so a
 * spot or forecast can be stored as JSON and a future Swift port can mirror the
 * same structures. The engine never touches UI, storage or the network.
 *
 * Units (per CLAUDE.md): wind/gusts in knots, directions in degrees, wave
 * height in metres, wave period in seconds, distances are not used here.
 */

/** How much a factor matters, mapped to a weight in `constants.ts`. */
export type Importance = 'low' | 'normal' | 'high'

/** Which wave field set a condition set reads. */
export type WaveSource = 'total' | 'wind' | 'swell'

/** A plain numeric range for linear factors (wind speed, wave height, ...). */
export interface Range {
  min: number
  max: number
}

/**
 * A direction arc in degrees, swept clockwise from `min` to `max`. It may wrap
 * past 360 — e.g. `{ min: 350, max: 20 }` is a 30°-wide arc centred on north.
 */
export interface DirectionRange {
  min: number
  max: number
}

/** A linear factor: its usable and ideal ranges plus how much it matters. */
export interface LinearFactor {
  usable: Range
  /** Must lie inside `usable`. Set ideal = usable for "don't care". */
  ideal: Range
  importance?: Importance
  /** Override the default soft-fall margin from `constants.ts`. */
  margin?: number
}

/** A direction factor, same idea but with arcs. */
export interface DirectionFactor {
  usable: DirectionRange
  ideal: DirectionRange
  importance?: Importance
  margin?: number
}

/**
 * One way a spot can be good (e.g. "NW wind with swell"). A spot's score for an
 * hour is the best score across its condition sets. Any factor left unset is
 * skipped entirely.
 */
export interface ConditionSet {
  name?: string
  windSpeed?: LinearFactor
  windDirection?: DirectionFactor
  waveHeight?: LinearFactor
  waveDirection?: DirectionFactor
  wavePeriod?: LinearFactor
  gusts?: LinearFactor
  /** Which wave field set to read; defaults to 'total'. */
  waveSource?: WaveSource
}

export interface Spot {
  id?: string
  name: string
  lat: number
  lon: number
  conditionSets: ConditionSet[]
}

/** Wave numbers for one source; any field may be null when data is missing. */
export interface WaveData {
  height?: number | null
  direction?: number | null
  period?: number | null
}

/** One forecast hour. Wave data is grouped by source so a set can pick one. */
export interface ForecastHour {
  /** ISO timestamp, e.g. "2026-10-22T13:00". */
  time: string
  windSpeed: number
  windDirection: number
  gusts?: number
  waves?: Partial<Record<WaveSource, WaveData>>
}

export interface ForecastDay {
  /** Local calendar date "YYYY-MM-DD". */
  date: string
  /** ISO timestamps for daylight filtering. */
  sunrise: string
  sunset: string
  hours: ForecastHour[]
  /** True for low-precision days (~5-8); window edges get rounded. */
  coarse?: boolean
}

export interface Forecast {
  days: ForecastDay[]
}

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

/** Score for a single factor within an hour (0-1). */
export interface FactorScore {
  factor: string
  score: number
  /** True if this factor is a safety gate that failed. */
  gateFailed?: boolean
}

/** Score for one hour at a spot, using the best condition set. */
export interface HourScore {
  time: string
  /** 0-1; 0 when gated. */
  score: number
  gated: boolean
  /** Index of the winning condition set in `spot.conditionSets`. */
  conditionSetIndex: number
  factors: FactorScore[]
  /** Lowest-scoring factor of the winning set — the "why". */
  weakestFactor?: string
  /** True when the chosen wave source had no usable data this hour. */
  missingWaveData?: boolean
}

/** A contiguous run of hours within a day, by index into the day's hours. */
export interface Window {
  startIndex: number
  endIndex: number
  start: string
  end: string
}

export interface DayScore {
  date: string
  /** Headline core score on a 0-100 scale. */
  coreScore: number
  /** The best 3-hour (or fewer, on short days) core window. */
  core: Window
  /** Core window grown by neighbouring good hours. */
  window: Window
  /** All daylight hours, in order — for the hourly colour bar. */
  hours: HourScore[]
  /** Weakest factor across the core window. */
  weakestFactor?: string
  /** A second, separate good window if one exists. */
  secondWindow?: Window
  /** True when no hour had usable wave data. */
  noWaveData?: boolean
  /** Echoed from the forecast day. */
  coarse?: boolean
}

export interface SpotScore {
  spotId?: string
  spotName: string
  /** Day scores, sorted by core score descending (ties: earlier date first). */
  days: DayScore[]
}
