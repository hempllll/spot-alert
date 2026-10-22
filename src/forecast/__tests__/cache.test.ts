import { describe, expect, it } from 'vitest'
import { ForecastCache, coordKey } from '../cache'
import type { Forecast } from '../../scoring'

const forecast: Forecast = { days: [] }

describe('coordKey', () => {
  it('rounds coordinates to ~0.1°', () => {
    expect(coordKey(54.37, 10.17)).toBe('54.4,10.2')
    expect(coordKey(54.44, 10.16)).toBe('54.4,10.2') // same cell
    expect(coordKey(54.46, 10.16)).toBe('54.5,10.2') // next cell north
  })
})

describe('ForecastCache', () => {
  it('stores and returns within the TTL', () => {
    let t = 1000
    const cache = new ForecastCache(5000, () => t)
    cache.set(54.4, 10.2, forecast)
    t = 4000
    expect(cache.get(54.4, 10.2)).toBe(forecast)
  })

  it('expires entries after the TTL', () => {
    let t = 1000
    const cache = new ForecastCache(5000, () => t)
    cache.set(54.4, 10.2, forecast)
    t = 7000
    expect(cache.get(54.4, 10.2)).toBeUndefined()
  })

  it('treats nearby coordinates as the same cell', () => {
    const cache = new ForecastCache()
    cache.set(54.37, 10.17, forecast)
    expect(cache.get(54.44, 10.16)).toBe(forecast)
  })
})
