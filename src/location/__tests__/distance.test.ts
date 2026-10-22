import { describe, expect, it } from 'vitest'
import { distanceKm, withinDistance } from '../distance'
import type { Coords } from '../types'

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ lat: 54, lon: 10 }, { lat: 54, lon: 10 })).toBe(0)
  })

  it('is ~111 km for one degree of latitude', () => {
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111.19, 1)
  })

  it('is symmetric', () => {
    const a = { lat: 54.32, lon: 10.14 }
    const b = { lat: 53.55, lon: 9.99 }
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10)
  })
})

describe('withinDistance', () => {
  const origin: Coords = { lat: 54.32, lon: 10.14 } // Kiel
  const spots = [
    { name: 'Schilksee', lat: 54.43, lon: 10.17 }, // ~12 km
    { name: 'Eckernförde', lat: 54.47, lon: 9.84 }, // ~26 km
    { name: 'Hamburg', lat: 53.55, lon: 9.99 }, // ~86 km
  ]
  const getCoords = (s: { lat: number; lon: number }) => s

  it('keeps only spots within the radius, nearest first', () => {
    const result = withinDistance(spots, origin, 30, getCoords)
    expect(result.map((r) => r.item.name)).toEqual(['Schilksee', 'Eckernförde'])
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm)
  })

  it('includes everything with a large radius', () => {
    expect(withinDistance(spots, origin, 500, getCoords)).toHaveLength(3)
  })
})
