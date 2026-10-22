import { describe, expect, it } from 'vitest'
import type { DayScore } from '../../scoring'
import { formatDay, formatKm, formatWindow, placeLabel, scoreBand, whyText } from '../format'

const window = (start: string, end: string) => ({
  startIndex: 0,
  endIndex: 0,
  start: `2026-10-25T${start}`,
  end: `2026-10-25T${end}`,
})

describe('format', () => {
  it('formats a date as weekday + day of month', () => {
    expect(formatDay('2026-10-22')).toBe('Thu 22')
    expect(formatDay('2026-10-25')).toBe('Sun 25')
  })

  it('shows a precise window until the end of its last hour', () => {
    expect(formatWindow(window('11:00', '17:00'))).toBe('11–18')
  })

  it('shows a coarse window as the engine rounded it', () => {
    expect(formatWindow(window('09:00', '15:00'), true)).toBe('09–15')
  })

  it('rounds distances to whole km', () => {
    expect(formatKm(12.4)).toBe('12 km')
  })

  it('maps scores to colour bands at the boundaries', () => {
    expect([100, 80, 79, 60, 59, 40, 39, 1, 0].map(scoreBand)).toEqual([
      'great', 'great', 'good', 'good', 'ok', 'ok', 'poor', 'poor', 'none',
    ])
  })

  it('explains days that are not great', () => {
    const base = { date: 'd', core: window('10:00', '10:00'), window: window('10:00', '10:00'), hours: [] }
    expect(whyText({ ...base, coreScore: 63, weakestFactor: 'windDirection' } as DayScore)).toBe(
      'why: wind direction',
    )
    expect(whyText({ ...base, coreScore: 93, weakestFactor: 'windSpeed' } as DayScore)).toBeNull()
    expect(whyText({ ...base, coreScore: 0 } as DayScore)).toBeNull()
  })

  it('labels a place with region and country when known', () => {
    expect(placeLabel({ name: 'Kiel', lat: 0, lon: 0, region: 'Schleswig-Holstein', country: 'Germany' })).toBe(
      'Kiel, Schleswig-Holstein, Germany',
    )
    expect(placeLabel({ name: 'Laboe', lat: 0, lon: 0 })).toBe('Laboe')
  })
})
