import { describe, expect, it } from 'vitest'
import { scoreDay } from '../day'
import type { ConditionSet, ForecastDay, ForecastHour } from '../types'

const set: ConditionSet = {
  windSpeed: { usable: { min: 10, max: 30 }, ideal: { min: 15, max: 25 } },
}

const DATE = '2026-10-22'
/** Build an hour; windDirection is irrelevant (no direction factor). */
const h = (hh: number, windSpeed: number): ForecastHour => ({
  time: `${DATE}T${String(hh).padStart(2, '0')}:00`,
  windSpeed,
  windDirection: 0,
})

const day = (hours: ForecastHour[], over: Partial<ForecastDay> = {}): ForecastDay => ({
  date: DATE,
  sunrise: `${DATE}T06:00`,
  sunset: `${DATE}T20:00`,
  hours,
  ...over,
})

describe('scoreDay', () => {
  it('scores an all-ideal day 100 and extends across all daylight hours', () => {
    const hours = [8, 9, 10, 11, 12, 13, 14, 15].map((hh) => h(hh, 20))
    const r = scoreDay(day(hours), [set])
    expect(r.coreScore).toBe(100)
    expect(r.window.start).toBe(`${DATE}T08:00`)
    expect(r.window.end).toBe(`${DATE}T15:00`)
  })

  it('excludes night-time hours via sunrise/sunset', () => {
    const hours = [h(4, 20), ...[8, 9, 10, 11, 12, 13, 14, 15].map((hh) => h(hh, 20)), h(23, 20)]
    const r = scoreDay(day(hours), [set])
    expect(r.hours).toHaveLength(8)
    expect(r.hours[0].time).toBe(`${DATE}T08:00`)
  })

  it('prefers a steady window over a jumpy one with the same mean', () => {
    // scores: [.75,.75,.75,.5,.75,1.0]; windows 0-2 and 3-5 share mean .75,
    // but 3-5 is volatile, so the steady 0-2 wins.
    const hours = [h(8, 12.5), h(9, 12.5), h(10, 12.5), h(11, 10), h(12, 12.5), h(13, 20)]
    const r = scoreDay(day(hours), [set])
    expect(r.core.startIndex).toBe(0)
    expect(r.coreScore).toBe(75)
    expect(r.window.endIndex).toBe(2) // low neighbour doesn't qualify
  })

  it('breaks window ties toward midday and flags a second window', () => {
    // Two all-ideal blocks split by gated (too-light-wind) hours.
    const hours = [
      h(8, 20), h(9, 20), h(10, 20), // morning block
      h(11, 5), h(12, 5), // gated gap
      h(13, 20), h(14, 20), h(15, 20), // afternoon block, nearer midday
    ]
    const r = scoreDay(day(hours), [set])
    expect(r.hours[3].gated).toBe(true)
    expect(r.core.startIndex).toBe(5) // afternoon block, closer to midday
    expect(r.secondWindow).toBeDefined()
    expect(r.secondWindow?.start).toBe(`${DATE}T08:00`)
  })

  it('handles a short day with fewer than 3 daylight hours', () => {
    const hours = [h(11, 20), h(12, 20), h(13, 20), h(14, 20)]
    const r = scoreDay(day(hours, { sunrise: `${DATE}T11:45`, sunset: `${DATE}T13:15` }), [set])
    expect(r.hours).toHaveLength(2)
    expect(r.core.startIndex).toBe(0)
    expect(r.core.endIndex).toBe(1)
    expect(r.coreScore).toBe(100)
  })

  it('rounds the window to coarse boundaries for low-precision days', () => {
    const hours = [10, 11, 12, 13].map((hh) => h(hh, 20))
    const r = scoreDay(day(hours, { coarse: true }), [set])
    expect(r.window.start).toBe(`${DATE}T09:00`) // 10 floored to /3
    expect(r.window.end).toBe(`${DATE}T15:00`) // 13 ceiled to /3
  })
})
