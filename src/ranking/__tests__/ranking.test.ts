import { describe, expect, it } from 'vitest'
import {
  bestDate,
  bestSpotPerDay,
  nextDates,
  rankForDate,
  type SpotResult,
  type WeekRow,
} from '..'
import type { DayScore } from '../../scoring'

const day = (date: string, coreScore: number): DayScore => ({
  date,
  coreScore,
  core: { startIndex: 0, endIndex: 0, start: '', end: '' },
  window: { startIndex: 0, endIndex: 0, start: '', end: '' },
  hours: [],
})

/** A scored spot with the given core score per date. */
const result = (name: string, distanceKm: number, scores: Record<string, number>): SpotResult => ({
  spot: { id: name, name, lat: 54, lon: 10, conditionSets: [] },
  distanceKm,
  score: {
    spotName: name,
    days: Object.entries(scores).map(([date, s]) => day(date, s)),
  },
})

describe('nextDates', () => {
  it('returns 8 local dates across a month boundary', () => {
    expect(nextDates(new Date(2026, 9, 30, 15, 0))).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
    ])
  })
})

describe('rankForDate', () => {
  it('sorts by score, then nearer first, and skips spots without that date', () => {
    const results = [
      result('Far', 40, { d1: 80 }),
      result('Near', 10, { d1: 80 }),
      result('Best', 30, { d1: 95 }),
      result('Other day', 5, { d2: 99 }),
    ]
    expect(rankForDate(results, 'd1').map((e) => e.spot.name)).toEqual(['Best', 'Near', 'Far'])
  })
})

describe('bestSpotPerDay', () => {
  const results = [
    result('A', 10, { d1: 90, d2: 0, d3: 40 }),
    result('B', 20, { d1: 60, d2: 0, d3: 0 }),
    result('C', 30, { d1: 0, d2: 0, d3: 0 }),
  ]

  it('picks the highest score and counts the other scoring spots', () => {
    const [d1] = bestSpotPerDay(results, ['d1'])
    expect(d1.best?.spot.name).toBe('A')
    expect(d1.moreCount).toBe(1) // B scored; C's 0 doesn't count
  })

  it('shows no spot when every score is 0', () => {
    expect(bestSpotPerDay(results, ['d2'])[0]).toEqual({ date: 'd2', best: null, moreCount: 0 })
  })

  it('treats any score above 0 as a winner', () => {
    const [d3] = bestSpotPerDay(results, ['d3'])
    expect(d3.best?.day.coreScore).toBe(40)
    expect(d3.moreCount).toBe(0)
  })

  it('shows no spot for every day when there are no spots', () => {
    expect(bestSpotPerDay([], ['d1', 'd2']).every((r) => r.best === null)).toBe(true)
  })
})

describe('bestDate', () => {
  const row = (date: string, score: number | null): WeekRow => ({
    date,
    best: score === null ? null : rankForDate([result('X', 1, { [date]: score })], date)[0],
    moreCount: 0,
  })

  it('stars the highest-scoring day, earliest on ties', () => {
    expect(bestDate([row('d1', 70), row('d2', 90), row('d3', 90)])).toBe('d2')
  })

  it('returns null when nothing scored', () => {
    expect(bestDate([row('d1', null), row('d2', null)])).toBeNull()
  })
})
