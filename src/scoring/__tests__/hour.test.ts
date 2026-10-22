import { describe, expect, it } from 'vitest'
import { scoreHour } from '../hour'
import type { ConditionSet, ForecastHour } from '../types'

const wind: ConditionSet = {
  windSpeed: { usable: { min: 17, max: 30 }, ideal: { min: 24, max: 28 } },
  windDirection: {
    usable: { min: 270, max: 360 },
    ideal: { min: 300, max: 330 },
  },
}

const hour = (over: Partial<ForecastHour>): ForecastHour => ({
  time: '2026-10-22T12:00',
  windSpeed: 26,
  windDirection: 315,
  ...over,
})

describe('scoreHour', () => {
  it('scores 1.0 when every factor is ideal', () => {
    const r = scoreHour([wind], hour({}))
    expect(r.score).toBe(1)
    expect(r.gated).toBe(false)
  })

  it('combines factors with a geometric mean', () => {
    // windSpeed 20.5 -> 0.75, windDirection ideal -> 1.0; equal weights
    const r = scoreHour([wind], hour({ windSpeed: 20.5 }))
    expect(r.score).toBeCloseTo(Math.sqrt(0.75), 6)
    expect(r.weakestFactor).toBe('windSpeed')
  })

  it('weights by importance', () => {
    const weighted: ConditionSet = {
      windSpeed: {
        usable: { min: 17, max: 30 },
        ideal: { min: 24, max: 28 },
        importance: 'high',
      },
      windDirection: {
        usable: { min: 270, max: 360 },
        ideal: { min: 300, max: 330 },
      },
    }
    // scores 0.75 (w=2) and 1.0 (w=1) -> 0.75^(2/3)
    const r = scoreHour([weighted], hour({ windSpeed: 20.5 }))
    expect(r.score).toBeCloseTo(0.75 ** (2 / 3), 6)
  })

  it('gates below minimum wind', () => {
    const r = scoreHour([wind], hour({ windSpeed: 10 }))
    expect(r.gated).toBe(true)
    expect(r.score).toBe(0)
  })

  it('gates an offshore / out-of-arc wind direction', () => {
    const r = scoreHour([wind], hour({ windDirection: 90 }))
    expect(r.gated).toBe(true)
    expect(r.score).toBe(0)
  })

  it('flags and skips missing wave data', () => {
    const withWaves: ConditionSet = {
      ...wind,
      waveHeight: { usable: { min: 0, max: 1.5 }, ideal: { min: 0.3, max: 0.8 } },
    }
    const r = scoreHour(
      [withWaves],
      hour({ waves: { total: { height: null } } }),
    )
    expect(r.missingWaveData).toBe(true)
    expect(r.score).toBe(1) // scored on wind alone, which is ideal
    expect(r.factors.some((f) => f.factor === 'waveHeight')).toBe(false)
  })

  it('takes the best condition set', () => {
    const gatedSet: ConditionSet = {
      windDirection: { usable: { min: 0, max: 90 }, ideal: { min: 30, max: 60 } },
    }
    const r = scoreHour([gatedSet, wind], hour({}))
    expect(r.score).toBe(1)
    expect(r.conditionSetIndex).toBe(1)
  })
})
