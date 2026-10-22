import { describe, expect, it } from 'vitest'
import {
  angularDistance,
  arcContains,
  arcWidth,
  distanceOutsideArc,
  normalizeDeg,
} from '../circular'

describe('circular', () => {
  it('normalizes angles into [0, 360)', () => {
    expect(normalizeDeg(370)).toBe(10)
    expect(normalizeDeg(-10)).toBe(350)
    expect(normalizeDeg(360)).toBe(0)
  })

  it('computes arc width with wrap-around', () => {
    expect(arcWidth({ min: 270, max: 360 })).toBe(90)
    expect(arcWidth({ min: 350, max: 20 })).toBe(30)
  })

  it('measures the smallest angle between directions', () => {
    expect(angularDistance(350, 10)).toBe(20)
    expect(angularDistance(10, 350)).toBe(20)
    expect(angularDistance(0, 180)).toBe(180)
  })

  it('tests arc containment including wrap and edges', () => {
    const arc = { min: 350, max: 20 }
    expect(arcContains(arc, 0)).toBe(true)
    expect(arcContains(arc, 350)).toBe(true)
    expect(arcContains(arc, 20)).toBe(true)
    expect(arcContains(arc, 30)).toBe(false)
    expect(arcContains(arc, 180)).toBe(false)
  })

  it('measures distance outside an arc', () => {
    const arc = { min: 350, max: 20 }
    expect(distanceOutsideArc(arc, 10)).toBe(0) // inside
    expect(distanceOutsideArc(arc, 40)).toBe(20) // 20° past the max edge
    expect(distanceOutsideArc(arc, 330)).toBe(20) // 20° before the min edge
  })
})
