/**
 * Tunable scoring constants, all in one place.
 *
 * The design doc gives these as approximate ("~") values on purpose — they are
 * knobs to tune against real spots (issue #9). Keep them here so tuning never
 * means hunting through the logic.
 *
 * Internally every score is a fraction in [0, 1]. Headline day scores are
 * exposed on a 0-100 scale (see `day.ts`).
 */

/** Score at the edge of the usable range (ideal = 1.0, ramps down to this). */
export const EDGE_FLOOR = 0.5

/**
 * How far *outside* the usable range a factor keeps a non-zero score before it
 * falls to 0 (the "soft fall"). Units match the factor (knots, metres, seconds,
 * degrees).
 */
export const SOFT_FALL_MARGIN = {
  windSpeed: 3, // knots
  gusts: 3, // knots
  waveHeight: 0.5, // metres
  wavePeriod: 2, // seconds
  windDirection: 20, // degrees
  waveDirection: 20, // degrees
} as const

/** Each factor's score is clamped to at least this before taking its log. */
export const CLAMP_MIN = 0.05

/** Importance level -> weight in the geometric mean. */
export const IMPORTANCE_WEIGHT = {
  low: 0.5,
  normal: 1,
  high: 2,
} as const

/** Score an hour gets when it fails a safety gate. */
export const GATE_SCORE = 0

/** Number of consecutive hours that make up a day's "core" window. */
export const CORE_WINDOW_HOURS = 3

/**
 * Volatility penalty weight: core score = mean - this * stddev(hourly scores in
 * the window). A steady window beats a jumpy one with the same mean.
 */
export const VOLATILITY_PENALTY_WEIGHT = 0.3

/** An hour may extend the core window if its score is at least this fraction... */
export const EXTENSION_RELATIVE = 0.85
/** ...of the core mean, AND at least this absolute score (~55 on 0-100). */
export const EXTENSION_ABSOLUTE_FLOOR = 0.55

/**
 * For coarse days (forecast days ~5-8 with low time precision), round reported
 * window edges to this many hours.
 */
export const COARSE_ROUND_HOURS = 3
