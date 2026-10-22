/**
 * Direction-arc editing on the compass dial. Arcs run clockwise from `min` to
 * `max` and may wrap past north, exactly as the scoring engine reads them.
 * The ideal arc always stays inside the usable arc.
 */
import type { DirectionRange } from '../scoring'
import { arcWidth, clockwiseFromMin, normalizeDeg } from '../scoring/circular'
import { DIAL_STEP } from './constants'

export type ArcHandle = 'usableMin' | 'usableMax' | 'idealMin' | 'idealMax'

export interface Arcs {
  usable: DirectionRange
  ideal: DirectionRange
}

/** "Any direction" is the factor switched off, so usable stays below a full circle. */
const MIN_WIDTH = DIAL_STEP
const MAX_WIDTH = 360 - DIAL_STEP

/**
 * Where a bearing sits along the usable arc, 0..width. Bearings outside the
 * arc are pulled to the nearer edge.
 */
function positionIn(usable: DirectionRange, deg: number): number {
  const width = arcWidth(usable)
  const p = clockwiseFromMin(usable, deg)
  if (p <= width) return p
  return p - width < 360 - p ? width : 0
}

const fromPosition = (usable: DirectionRange, p: number): number => normalizeDeg(usable.min + p)

/** Pull the ideal arc inside the usable arc. */
export function fitIdealArc(usable: DirectionRange, ideal: DirectionRange): DirectionRange {
  const a = positionIn(usable, ideal.min)
  const b = positionIn(usable, ideal.max)
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  return { min: fromPosition(usable, lo), max: fromPosition(usable, hi) }
}

/** Move one handle to bearing `deg`. */
export function moveArcHandle(arcs: Arcs, handle: ArcHandle, deg: number): Arcs {
  const { usable, ideal } = arcs

  if (handle === 'usableMin' || handle === 'usableMax') {
    let next: DirectionRange =
      handle === 'usableMin' ? { min: deg, max: usable.max } : { min: usable.min, max: deg }
    const before = arcWidth(usable)
    const width = arcWidth(next)
    // Moving one edge changes the width a little; a jump of more than half a
    // circle means the handle went through the other one.
    const crossed = Math.abs(width - before) > 180
    if (crossed || width < MIN_WIDTH || width > MAX_WIDTH) {
      // Stop at the narrowest or widest arc, depending on where it came from.
      const target = before < 180 ? MIN_WIDTH : MAX_WIDTH
      next =
        handle === 'usableMin'
          ? { min: normalizeDeg(next.max - target), max: next.max }
          : { min: next.min, max: normalizeDeg(next.min + target) }
    }
    return { usable: next, ideal: fitIdealArc(next, ideal) }
  }

  const current = fitIdealArc(usable, ideal)
  const a = positionIn(usable, current.min)
  const b = positionIn(usable, current.max)
  const p = positionIn(usable, deg)
  const [lo, hi] = handle === 'idealMin' ? [Math.min(p, b), b] : [a, Math.max(p, a)]
  return { usable, ideal: { min: fromPosition(usable, lo), max: fromPosition(usable, hi) } }
}
