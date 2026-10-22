/** Compass naming and dial geometry (SVG coordinates: x right, y down). */
import type { DirectionRange } from '../scoring'
import { normalizeDeg } from '../scoring/circular'
import { DIAL_STEP } from './constants'

const POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

/** Nearest of the 16 compass points, e.g. 292.5 -> "WNW". */
export function compassName(deg: number): string {
  return POINTS[Math.round(normalizeDeg(deg) / 22.5) % 16]
}

/** Snap a bearing to the dial grid, in [0, 360). */
export function snapBearing(deg: number): number {
  return normalizeDeg(Math.round(deg / DIAL_STEP) * DIAL_STEP)
}

const degText = (d: number): string => (Number.isInteger(d) ? String(d) : d.toFixed(1))

/** "WNW (292.5°)" */
export function formatBearing(deg: number): string {
  const d = normalizeDeg(deg)
  return `${compassName(d)} (${degText(d)}°)`
}

/** "SSW–N (200°–360°)": an arc's end at north reads as 360, not 0. */
export function formatArc(arc: DirectionRange): string {
  const min = normalizeDeg(arc.min)
  const max = normalizeDeg(arc.max) || 360
  return `${compassName(min)}–${compassName(max)} (${degText(min)}°–${degText(max)}°)`
}

/** Compass bearing of point (x, y) seen from (cx, cy): 0° = up, clockwise. */
export function bearingFromPoint(cx: number, cy: number, x: number, y: number): number {
  return normalizeDeg((Math.atan2(x - cx, cy - y) * 180) / Math.PI)
}

/** The point at `bearing` on a circle around (cx, cy). */
export function pointAt(cx: number, cy: number, r: number, bearing: number): { x: number; y: number } {
  const rad = (bearing * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

const n = (v: number): string => String(Math.round(v * 100) / 100)

/**
 * SVG path for the clockwise arc from `from` to `to`. A zero-width arc becomes
 * a zero-length line, which a round line cap draws as a dot.
 */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const width = normalizeDeg(to - from)
  const a = pointAt(cx, cy, r, from)
  const b = pointAt(cx, cy, r, to)
  if (width === 0) return `M ${n(a.x)} ${n(a.y)} L ${n(a.x)} ${n(a.y)}`
  const large = width > 180 ? 1 : 0
  return `M ${n(a.x)} ${n(a.y)} A ${r} ${r} 0 ${large} 1 ${n(b.x)} ${n(b.y)}`
}
