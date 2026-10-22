import { describe, expect, it } from 'vitest'
import { scoreSpot } from '..'
import type { Forecast, Spot } from '../types'

const spot: Spot = {
  name: 'Test spot',
  lat: 54,
  lon: 10,
  conditionSets: [
    { windSpeed: { usable: { min: 10, max: 30 }, ideal: { min: 15, max: 25 } } },
  ],
}

const dayWith = (date: string, windSpeed: number): Forecast['days'][number] => ({
  date,
  sunrise: `${date}T06:00`,
  sunset: `${date}T20:00`,
  hours: [10, 11, 12].map((hh) => ({
    time: `${date}T${hh}:00`,
    windSpeed,
    windDirection: 0,
  })),
})

describe('scoreSpot', () => {
  it('sorts days by core score, best first', () => {
    const forecast: Forecast = {
      days: [dayWith('2026-10-22', 12.5), dayWith('2026-10-23', 20)],
    }
    const r = scoreSpot(spot, forecast)
    expect(r.spotName).toBe('Test spot')
    expect(r.days.map((d) => d.date)).toEqual(['2026-10-23', '2026-10-22'])
    expect(r.days[0].coreScore).toBe(100)
    expect(r.days[1].coreScore).toBe(75)
  })
})
