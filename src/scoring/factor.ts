/**
 * Per-factor score in [0, 1], following the decided metric:
 *   - inside the ideal range            -> 1.0
 *   - ideal edge .. usable edge          -> linear ramp 1.0 down to EDGE_FLOOR
 *   - just outside usable (soft margin)  -> EDGE_FLOOR down to 0
 *   - beyond the margin                  -> 0
 * Directions use circular distance so the arc wraps at 360°.
 */
import { CLAMP_MIN, EDGE_FLOOR, SOFT_FALL_MARGIN } from './constants'
import {
  arcContains,
  arcWidth,
  clockwiseFromMin,
  distanceOutsideArc,
} from './circular'
import type { DirectionFactor, LinearFactor } from './types'

/** Factor keys the engine knows about, split by how they are measured. */
export type LinearFactorKind = 'windSpeed' | 'gusts' | 'waveHeight' | 'wavePeriod'
export type DirectionFactorKind = 'windDirection' | 'waveDirection'
export type FactorKind = LinearFactorKind | DirectionFactorKind

/** Score a position within a usable range, given the ideal sub-range. */
function rampInsideUsable(
  p: number,
  uLo: number,
  uHi: number,
  iLo: number,
  iHi: number,
): number {
  if (p >= iLo && p <= iHi) return 1
  if (p < iLo) {
    if (iLo <= uLo) return 1 // no ramp room on this side
    return EDGE_FLOOR + (1 - EDGE_FLOOR) * ((p - uLo) / (iLo - uLo))
  }
  if (iHi >= uHi) return 1 // no ramp room on this side
  return EDGE_FLOOR + (1 - EDGE_FLOOR) * ((uHi - p) / (uHi - iHi))
}

/** Score for being `dist` degrees/units outside the usable range. */
function softFall(dist: number, margin: number): number {
  if (margin <= 0 || dist >= margin) return 0
  return EDGE_FLOOR * (1 - dist / margin)
}

function linearFactorScore(
  value: number,
  factor: LinearFactor,
  margin: number,
): number {
  const { usable, ideal } = factor
  if (value >= usable.min && value <= usable.max) {
    return rampInsideUsable(value, usable.min, usable.max, ideal.min, ideal.max)
  }
  const dist = value < usable.min ? usable.min - value : value - usable.max
  return softFall(dist, margin)
}

function directionFactorScore(
  deg: number,
  factor: DirectionFactor,
  margin: number,
): number {
  const { usable, ideal } = factor
  if (arcContains(usable, deg)) {
    const p = clockwiseFromMin(usable, deg)
    const uWidth = arcWidth(usable)
    const iLo = clockwiseFromMin(usable, ideal.min)
    const iHi = clockwiseFromMin(usable, ideal.max)
    return rampInsideUsable(p, 0, uWidth, Math.min(iLo, iHi), Math.max(iLo, iHi))
  }
  return softFall(distanceOutsideArc(usable, deg), margin)
}

function isDirectionKind(kind: FactorKind): kind is DirectionFactorKind {
  return kind === 'windDirection' || kind === 'waveDirection'
}

/**
 * Score a single factor value in [0, 1]. The score is clamped to at least
 * CLAMP_MIN so the geometric mean in `hour.ts` never takes log(0).
 */
export function factorScore(
  kind: FactorKind,
  factor: LinearFactor | DirectionFactor,
  value: number,
): number {
  const margin = factor.margin ?? SOFT_FALL_MARGIN[kind]
  const raw = isDirectionKind(kind)
    ? directionFactorScore(value, factor as DirectionFactor, margin)
    : linearFactorScore(value, factor as LinearFactor, margin)
  return Math.max(CLAMP_MIN, raw)
}
