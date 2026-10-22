import { describe, expect, it } from 'vitest'
import {
  arcPath,
  bearingFromPoint,
  compassName,
  formatArc,
  formatBearing,
  pointAt,
  snapBearing,
} from '../compass'

describe('compass naming', () => {
  it('names the nearest of 16 points', () => {
    expect(compassName(0)).toBe('N')
    expect(compassName(292.5)).toBe('WNW')
    expect(compassName(359)).toBe('N')
    expect(compassName(11.3)).toBe('NNE')
  })

  it('snaps to 22.5° steps, wrapping at north', () => {
    expect(snapBearing(10)).toBe(0)
    expect(snapBearing(12)).toBe(22.5)
    expect(snapBearing(350)).toBe(0)
  })

  it('formats bearings and arcs', () => {
    expect(formatBearing(292.5)).toBe('WNW (292.5°)')
    expect(formatArc({ min: 200, max: 360 })).toBe('SSW–N (200°–360°)')
    expect(formatArc({ min: 337.5, max: 22.5 })).toBe('NNW–NNE (337.5°–22.5°)')
  })
})

describe('dial geometry', () => {
  it('measures bearings clockwise from up', () => {
    expect(bearingFromPoint(100, 100, 100, 0)).toBe(0)
    expect(bearingFromPoint(100, 100, 200, 100)).toBe(90)
    expect(bearingFromPoint(100, 100, 100, 200)).toBe(180)
    expect(bearingFromPoint(100, 100, 0, 100)).toBe(270)
  })

  it('places points on the circle', () => {
    const p = pointAt(100, 100, 10, 90)
    expect(p.x).toBeCloseTo(110)
    expect(p.y).toBeCloseTo(100)
  })

  it('uses the large-arc flag only for arcs wider than 180°', () => {
    expect(arcPath(100, 100, 50, 0, 90)).toContain(' 0 0 1 ')
    expect(arcPath(100, 100, 50, 180, 0)).toContain(' 0 0 1 ') // exactly 180
    expect(arcPath(100, 100, 50, 0, 270)).toContain(' 0 1 1 ')
  })

  it('draws a zero-width arc as a dot', () => {
    expect(arcPath(100, 100, 50, 90, 90)).toBe('M 150 100 L 150 100')
  })
})
