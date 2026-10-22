/**
 * Runs every JSON case in ./cases through scoreSpot and checks the expected
 * day outcomes. The JSON is the engine's portable spec: a future Swift port can
 * reuse these exact inputs and expectations.
 */
import { describe, expect, it } from 'vitest'
import { scoreSpot } from '..'
import type { Forecast, Spot } from '../types'

interface ExpectedDay {
  date: string
  coreScore?: number
  weakestFactor?: string
  noWaveData?: boolean
  secondWindow?: boolean
  window?: { start?: string; end?: string }
}
interface Case {
  name?: string
  spot: Spot
  forecast: Forecast
  expect: { days: ExpectedDay[] }
}

// Vite inlines every matching JSON file at build time, so this works in the
// test environment without filesystem access.
const cases = import.meta.glob('./cases/*.json', { eager: true }) as Record<
  string,
  { default: Case }
>

describe('JSON scoring cases', () => {
  for (const [file, mod] of Object.entries(cases)) {
    const data = mod.default
    it(data.name ?? file, () => {
      const result = scoreSpot(data.spot, data.forecast)
      const byDate = new Map(result.days.map((d) => [d.date, d]))
      for (const exp of data.expect.days) {
        const day = byDate.get(exp.date)
        expect(day, `missing day ${exp.date}`).toBeDefined()
        if (!day) continue
        if (exp.coreScore !== undefined) expect(day.coreScore).toBe(exp.coreScore)
        if (exp.weakestFactor !== undefined)
          expect(day.weakestFactor).toBe(exp.weakestFactor)
        if (exp.noWaveData !== undefined)
          expect(day.noWaveData ?? false).toBe(exp.noWaveData)
        if (exp.secondWindow !== undefined)
          expect(day.secondWindow !== undefined).toBe(exp.secondWindow)
        if (exp.window?.start) expect(day.window.start).toBe(exp.window.start)
        if (exp.window?.end) expect(day.window.end).toBe(exp.window.end)
      }
    })
  }

  it('found at least one case file', () => {
    expect(Object.keys(cases).length).toBeGreaterThan(0)
  })
})
