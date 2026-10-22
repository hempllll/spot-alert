/**
 * Spot-editor tuning: slider scales, preset width, dial snapping and the
 * starting values of a newly switched-on factor. UI only — the scoring engine
 * never reads these. Adjust alongside the scoring constants in #9.
 */
import type { DirectionFactor, LinearFactor } from '../scoring'
import type { FactorKind, LinearFactorKind } from '../scoring/factor'

/** Presets set the ideal band to this fraction of the usable range. */
export const PRESET_IDEAL_FRACTION = 0.4

/** The compass dial snaps to the 16 compass points. */
export const DIAL_STEP = 22.5

export interface SliderScale {
  min: number
  max: number
  step: number
  unit: string
}

export const SLIDER_SCALES: Record<LinearFactorKind, SliderScale> = {
  windSpeed: { min: 0, max: 50, step: 1, unit: 'kn' },
  gusts: { min: 0, max: 60, step: 1, unit: 'kn' },
  waveHeight: { min: 0, max: 4, step: 0.1, unit: 'm' },
  wavePeriod: { min: 0, max: 20, step: 0.5, unit: 's' },
}

/** Factors in the order the editor lists them. */
export const FACTOR_ORDER: FactorKind[] = [
  'windSpeed',
  'windDirection',
  'gusts',
  'waveHeight',
  'waveDirection',
  'wavePeriod',
]

export const FACTOR_LABELS: Record<FactorKind, string> = {
  windSpeed: 'Wind speed',
  windDirection: 'Wind direction',
  gusts: 'Gusts',
  waveHeight: 'Wave height',
  waveDirection: 'Wave direction',
  wavePeriod: 'Wave period',
}

/** Starting values when a factor is switched on. */
export const DEFAULT_LINEAR: Record<LinearFactorKind, LinearFactor> = {
  windSpeed: { usable: { min: 17, max: 50 }, ideal: { min: 25, max: 35 }, importance: 'normal' },
  gusts: { usable: { min: 17, max: 50 }, ideal: { min: 25, max: 35 }, importance: 'low' },
  waveHeight: { usable: { min: 0, max: 4 }, ideal: { min: 2, max: 3 }, importance: 'normal' },
  wavePeriod: { usable: { min: 3, max: 15 }, ideal: { min: 6, max: 12 }, importance: 'low' },
}

/** S through N (the western half), ideal WSW–NW: on the dial's grid. */
export const DEFAULT_DIRECTION: DirectionFactor = {
  usable: { min: 270, max: 90 },
  ideal: { min: 315, max: 45 },
}
