/**
 * Linear range editing: presets and handle moves that always leave the ideal
 * band inside the usable band. Pure functions, no React.
 */
import type { Range } from '../scoring'
import { PRESET_IDEAL_FRACTION, type SliderScale } from './constants'

export type Preset = 'more' | 'less' | 'middle' | 'any'
export type RangeHandle = 'usableMin' | 'usableMax' | 'idealMin' | 'idealMax'

export interface Bands {
  usable: Range
  ideal: Range
}

const decimals = (step: number): number => (String(step).split('.')[1] ?? '').length
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Round to the slider step without floating-point noise (0.1 + 0.2 ≠ 0.3). */
export function roundToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(decimals(step)))
}

/** The ideal band a preset implies for this usable range. */
export function presetIdeal(usable: Range, preset: Preset, step: number): Range {
  if (preset === 'any') return { ...usable }
  const band = (usable.max - usable.min) * PRESET_IDEAL_FRACTION
  const mid = (usable.min + usable.max) / 2
  const raw =
    preset === 'more'
      ? { min: usable.max - band, max: usable.max }
      : preset === 'less'
        ? { min: usable.min, max: usable.min + band }
        : { min: mid - band / 2, max: mid + band / 2 }
  return {
    min: clamp(roundToStep(raw.min, step), usable.min, usable.max),
    max: clamp(roundToStep(raw.max, step), usable.min, usable.max),
  }
}

/** Clamp the ideal band into the usable band. */
export function fitIdeal(usable: Range, ideal: Range): Range {
  const min = clamp(ideal.min, usable.min, usable.max)
  const max = clamp(ideal.max, usable.min, usable.max)
  return min <= max ? { min, max } : { min: max, max: min }
}

/**
 * Move one handle to `value` (snapped to the scale). Usable keeps at least one
 * step of width; ideal always stays inside usable (and may be a single value).
 */
export function moveRangeHandle(
  bands: Bands,
  handle: RangeHandle,
  value: number,
  scale: SliderScale,
): Bands {
  const v = clamp(roundToStep(value, scale.step), scale.min, scale.max)
  const { usable, ideal } = bands
  switch (handle) {
    case 'usableMin': {
      const next = { min: Math.min(v, roundToStep(usable.max - scale.step, scale.step)), max: usable.max }
      return { usable: next, ideal: fitIdeal(next, ideal) }
    }
    case 'usableMax': {
      const next = { min: usable.min, max: Math.max(v, roundToStep(usable.min + scale.step, scale.step)) }
      return { usable: next, ideal: fitIdeal(next, ideal) }
    }
    case 'idealMin':
      return { usable, ideal: { min: clamp(v, usable.min, ideal.max), max: ideal.max } }
    case 'idealMax':
      return { usable, ideal: { min: ideal.min, max: clamp(v, ideal.min, usable.max) } }
  }
}
