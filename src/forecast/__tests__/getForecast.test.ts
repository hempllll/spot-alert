import { describe, expect, it, vi } from 'vitest'
import { ForecastCache, getForecast } from '..'
import type { FetchLike } from '../openMeteo'

const forecastBody = {
  latitude: 54.4,
  longitude: 10.2,
  timezone: 'Europe/Berlin',
  hourly: {
    time: ['2026-10-24T12:00'],
    wind_speed_10m: [20],
    wind_gusts_10m: [28],
    wind_direction_10m: [300],
  },
  daily: {
    time: ['2026-10-24'],
    sunrise: ['2026-10-24T07:30'],
    sunset: ['2026-10-24T18:15'],
  },
}
const marineBody = {
  latitude: 54.4,
  longitude: 10.2,
  hourly: { time: ['2026-10-24T12:00'], wave_height: [0.5] },
}

/** Fake fetch that answers the forecast and marine endpoints from memory. */
function makeFetch() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input)
    const body = url.includes('marine') ? marineBody : forecastBody
    return new Response(JSON.stringify(body), { status: 200 })
  }) as unknown as FetchLike
}

describe('getForecast', () => {
  it('fetches both APIs in parallel and normalizes', async () => {
    const fetchImpl = makeFetch()
    const result = await getForecast(54.4, 10.2, { fetchImpl })
    expect(result.days[0].hours[0].windSpeed).toBe(20)
    expect(result.days[0].hours[0].waves?.total?.height).toBe(0.5)
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })

  it('serves a cache hit without fetching again', async () => {
    const fetchImpl = makeFetch()
    const cache = new ForecastCache()
    await getForecast(54.4, 10.2, { fetchImpl, cache })
    await getForecast(54.41, 10.19, { fetchImpl, cache }) // same cell
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })
})
