import { describe, expect, it, vi } from 'vitest'
import {
  buildForecastUrl,
  buildMarineUrl,
  fetchForecast,
  fetchMarine,
  type FetchLike,
} from '../openMeteo'

describe('URL building', () => {
  it('requests wind in knots, daylight, 8 days', () => {
    const url = new URL(buildForecastUrl(54.4, 10.2))
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(url.searchParams.get('latitude')).toBe('54.4')
    expect(url.searchParams.get('wind_speed_unit')).toBe('kn')
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('forecast_days')).toBe('8')
    expect(url.searchParams.get('hourly')).toContain('wind_speed_10m')
    expect(url.searchParams.get('daily')).toContain('sunrise')
  })

  it('requests all three wave sources from the marine API', () => {
    const url = new URL(buildMarineUrl(54.4, 10.2))
    expect(url.origin + url.pathname).toBe(
      'https://marine-api.open-meteo.com/v1/marine',
    )
    const hourly = url.searchParams.get('hourly') ?? ''
    expect(hourly).toContain('wave_height')
    expect(hourly).toContain('wind_wave_height')
    expect(hourly).toContain('swell_wave_height')
  })
})

const okJson = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('fetching', () => {
  it('parses a successful forecast response', async () => {
    const fetchImpl = vi.fn(async () =>
      okJson({ latitude: 54.4, longitude: 10.2 }),
    ) as unknown as FetchLike
    const res = await fetchForecast(54.4, 10.2, fetchImpl)
    expect(res.latitude).toBe(54.4)
  })

  it('returns null (not throw) when the marine API errors', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: true, reason: 'no data' }), {
        status: 400,
      }),
    ) as unknown as FetchLike
    expect(await fetchMarine(54.4, 10.2, fetchImpl)).toBeNull()
  })

  it('throws with the API reason when the forecast API errors', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: true, reason: 'bad latitude' }), {
        status: 400,
      }),
    ) as unknown as FetchLike
    await expect(fetchForecast(999, 999, fetchImpl)).rejects.toThrow(
      'bad latitude',
    )
  })
})
