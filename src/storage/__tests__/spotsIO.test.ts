import { describe, expect, it } from 'vitest'
import { exportSpots, importSpots } from '../spotsIO'
import type { Spot } from '../../scoring'

const spot: Spot = {
  name: 'Schilksee',
  lat: 54.43,
  lon: 10.17,
  conditionSets: [
    {
      windSpeed: { usable: { min: 12, max: 35 }, ideal: { min: 18, max: 28 }, importance: 'high' },
      windDirection: { usable: { min: 200, max: 360 }, ideal: { min: 250, max: 320 } },
      waveSource: 'total',
    },
  ],
}

describe('export/import round trip', () => {
  it('re-imports exactly what was exported', () => {
    const text = exportSpots([spot])
    expect(text).toContain('"format": "spot-alert/spots"')
    expect(importSpots(text)).toEqual([spot])
  })

  it('accepts a bare array of spots', () => {
    expect(importSpots(JSON.stringify([spot]))).toEqual([spot])
  })
})

describe('import validation', () => {
  const bad = (json: unknown): (() => unknown) => () =>
    importSpots(JSON.stringify(json))

  it('rejects non-JSON', () => {
    expect(() => importSpots('not json{')).toThrow('not valid JSON')
  })

  it('rejects the wrong top-level shape', () => {
    expect(bad({ nope: true })).toThrow('spots array')
  })

  it('rejects a missing name', () => {
    expect(bad([{ ...spot, name: '' }])).toThrow('name')
  })

  it('rejects an out-of-range latitude', () => {
    expect(bad([{ ...spot, lat: 999 }])).toThrow('lat')
  })

  it('rejects empty conditionSets', () => {
    expect(bad([{ ...spot, conditionSets: [] }])).toThrow('conditionSets')
  })

  it('rejects a malformed factor range', () => {
    expect(
      bad([{ ...spot, conditionSets: [{ windSpeed: { usable: { min: 1 }, ideal: { min: 1, max: 2 } } }] }]),
    ).toThrow('usable')
  })

  it('reports which spot failed', () => {
    expect(bad([spot, { ...spot, lat: 'x' }])).toThrow('spots[1]')
  })
})
