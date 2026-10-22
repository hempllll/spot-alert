import { describe, expect, it } from 'vitest'
import { normalizeForecast } from '../normalize'
import type { OpenMeteoForecastResponse, OpenMeteoMarineResponse } from '../types'

const forecast: OpenMeteoForecastResponse = {
  latitude: 54.4,
  longitude: 10.2,
  timezone: 'Europe/Berlin',
  hourly: {
    time: ['2026-10-24T00:00', '2026-10-24T01:00', '2026-10-25T00:00'],
    wind_speed_10m: [20, 10, 25],
    wind_gusts_10m: [28, 14, 33],
    wind_direction_10m: [300, 290, 310],
  },
  daily: {
    time: ['2026-10-24', '2026-10-25'],
    sunrise: ['2026-10-24T07:30', '2026-10-25T07:32'],
    sunset: ['2026-10-24T18:15', '2026-10-25T18:13'],
  },
}

const marine: OpenMeteoMarineResponse = {
  latitude: 54.4,
  longitude: 10.2,
  hourly: {
    time: ['2026-10-24T00:00', '2026-10-24T01:00', '2026-10-25T00:00'],
    wave_height: [0.5, null, 0.6],
    wave_direction: [300, null, 310],
    wave_period: [4, null, 5],
    wind_wave_height: [0.4, null, 0.5],
    wind_wave_direction: [301, null, 311],
    wind_wave_period: [3, null, 4],
    swell_wave_height: [0.2, null, 0.1],
    swell_wave_direction: [250, null, 260],
    swell_wave_period: [8, null, 9],
  },
}

describe('normalizeForecast', () => {
  it('groups hours by date and maps daily sunrise/sunset', () => {
    const result = normalizeForecast(forecast, marine)
    expect(result.days).toHaveLength(2)
    expect(result.days[0].date).toBe('2026-10-24')
    expect(result.days[0].sunrise).toBe('2026-10-24T07:30')
    expect(result.days[0].hours).toHaveLength(2)
    expect(result.days[1].hours).toHaveLength(1)
  })

  it('maps wind, gusts and merges wave sources by timestamp', () => {
    const hour = normalizeForecast(forecast, marine).days[0].hours[0]
    expect(hour.windSpeed).toBe(20)
    expect(hour.windDirection).toBe(300)
    expect(hour.gusts).toBe(28)
    expect(hour.waves?.total?.height).toBe(0.5)
    expect(hour.waves?.swell?.height).toBe(0.2)
  })

  it('passes null wave data through for the engine to flag', () => {
    const hour = normalizeForecast(forecast, marine).days[0].hours[1]
    expect(hour.waves?.total?.height).toBeNull()
  })

  it('omits waves entirely when the marine response is null', () => {
    const hour = normalizeForecast(forecast, null).days[0].hours[0]
    expect(hour.waves).toBeUndefined()
  })

  it('skips hours with missing essential wind data', () => {
    const withGap: OpenMeteoForecastResponse = {
      ...forecast,
      hourly: {
        ...forecast.hourly,
        wind_speed_10m: [20, null, 25],
      },
    }
    const result = normalizeForecast(withGap, marine)
    expect(result.days[0].hours).toHaveLength(1) // the null-wind hour dropped
  })

  it('marks forecast days 5-8 as coarse', () => {
    const sixDays: OpenMeteoForecastResponse = {
      ...forecast,
      hourly: { time: [], wind_speed_10m: [], wind_direction_10m: [] },
      daily: {
        time: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'],
        sunrise: Array(6).fill('x'),
        sunset: Array(6).fill('x'),
      },
    }
    const days = normalizeForecast(sixDays, null).days
    expect(days[3].coarse).toBe(false)
    expect(days[4].coarse).toBe(true)
    expect(days[5].coarse).toBe(true)
  })
})
