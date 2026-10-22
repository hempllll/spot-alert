/**
 * Circular (compass-direction) maths. Directions are degrees in [0, 360); arcs
 * are swept clockwise from `min` to `max` and may wrap past 360.
 */
import type { DirectionRange } from './types'

/** Wrap any angle into [0, 360). */
export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Clockwise degrees from an arc's `min` edge to a direction, in [0, 360). */
export function clockwiseFromMin(arc: DirectionRange, deg: number): number {
  return normalizeDeg(deg - arc.min)
}

/** Angular width of an arc in [0, 360). A zero-width arc is a single bearing. */
export function arcWidth(arc: DirectionRange): number {
  return normalizeDeg(arc.max - arc.min)
}

/** Smallest unsigned angle between two directions, in [0, 180]. */
export function angularDistance(a: number, b: number): number {
  const d = normalizeDeg(a - b)
  return Math.min(d, 360 - d)
}

/** Is a direction inside the (clockwise min->max) arc? Edges count as inside. */
export function arcContains(arc: DirectionRange, deg: number): boolean {
  // Tiny epsilon so a bearing exactly on the far edge is treated as inside
  // despite floating-point wrap.
  return clockwiseFromMin(arc, deg) <= arcWidth(arc) + 1e-9
}

/**
 * Angular distance from a direction to the nearest edge of an arc, in degrees.
 * Returns 0 when the direction is inside the arc.
 */
export function distanceOutsideArc(arc: DirectionRange, deg: number): number {
  if (arcContains(arc, deg)) return 0
  return Math.min(angularDistance(deg, arc.min), angularDistance(deg, arc.max))
}
