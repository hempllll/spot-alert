import { describe, expect, it } from 'vitest'
import { factorScore } from '../factor'
import type { DirectionFactor, LinearFactor } from '../types'

const wind: LinearFactor = {
  usable: { min: 17, max: 30 },
  ideal: { min: 24, max: 28 },
}

describe('factorScore (linear)', () => {
  it('scores 1.0 inside the ideal range', () => {
    expect(factorScore('windSpeed', wind, 26)).toBe(1)
    expect(factorScore('windSpeed', wind, 24)).toBe(1)
    expect(factorScore('windSpeed', wind, 28)).toBe(1)
  })

  it('scores the floor at the usable edges', () => {
    expect(factorScore('windSpeed', wind, 17)).toBeCloseTo(0.5, 10)
    expect(factorScore('windSpeed', wind, 30)).toBeCloseTo(0.5, 10)
  })

  it('ramps linearly between usable edge and ideal', () => {
    // midway from 17 (floor 0.5) to 24 (1.0)
    expect(factorScore('windSpeed', wind, 20.5)).toBeCloseTo(0.75, 10)
    // design example: 25 kn (ideal -> 1.0) beats 19 kn (~0.64)
    expect(factorScore('windSpeed', wind, 25)).toBe(1)
    expect(factorScore('windSpeed', wind, 19)).toBeGreaterThan(0.6)
    expect(factorScore('windSpeed', wind, 19)).toBeLessThan(0.7)
  })

  it('soft-falls to the clamp floor just outside usable', () => {
    // 15 kn = 2 below usable min, margin 3 -> 0.5 * (1 - 2/3) = 0.1667
    expect(factorScore('windSpeed', wind, 15)).toBeCloseTo(0.5 * (1 / 3), 6)
    // 14 kn = at the margin edge -> 0, clamped to 0.05
    expect(factorScore('windSpeed', wind, 14)).toBe(0.05)
    expect(factorScore('windSpeed', wind, 10)).toBe(0.05)
  })
})

const dir: DirectionFactor = {
  usable: { min: 270, max: 360 },
  ideal: { min: 300, max: 330 },
}

describe('factorScore (direction)', () => {
  it('scores 1.0 inside the ideal arc', () => {
    expect(factorScore('windDirection', dir, 315)).toBe(1)
  })

  it('scores the floor at the usable arc edges', () => {
    expect(factorScore('windDirection', dir, 270)).toBeCloseTo(0.5, 10)
    expect(factorScore('windDirection', dir, 360)).toBeCloseTo(0.5, 10)
  })

  it('ramps inside the usable arc', () => {
    // 285° is halfway from edge 270 (floor) to ideal edge 300
    expect(factorScore('windDirection', dir, 285)).toBeCloseTo(0.75, 10)
  })

  it('soft-falls outside the usable arc', () => {
    // 260° = 10° before the min edge, margin 20 -> 0.5 * (1 - 10/20) = 0.25
    expect(factorScore('windDirection', dir, 260)).toBeCloseTo(0.25, 10)
    // 250° = 20° out = margin edge -> 0, clamped to 0.05
    expect(factorScore('windDirection', dir, 250)).toBe(0.05)
  })
})
