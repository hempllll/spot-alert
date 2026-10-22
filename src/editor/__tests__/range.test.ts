import { describe, expect, it } from 'vitest'
import { SLIDER_SCALES } from '../constants'
import { moveRangeHandle, presetIdeal, roundToStep, type Bands } from '../range'

const wind = SLIDER_SCALES.windSpeed // 0–50 kn, step 1
const bands: Bands = { usable: { min: 12, max: 35 }, ideal: { min: 18, max: 28 } }

describe('presetIdeal', () => {
  it('fills 40% of the usable range at the right end', () => {
    expect(presetIdeal(bands.usable, 'more', 1)).toEqual({ min: 26, max: 35 })
    expect(presetIdeal(bands.usable, 'less', 1)).toEqual({ min: 12, max: 21 })
    expect(presetIdeal(bands.usable, 'middle', 1)).toEqual({ min: 19, max: 28 })
  })

  it('"any" makes ideal equal to usable', () => {
    expect(presetIdeal(bands.usable, 'any', 1)).toEqual({ min: 12, max: 35 })
  })

  it('rounds to decimal steps cleanly', () => {
    expect(presetIdeal({ min: 0, max: 2 }, 'more', 0.1)).toEqual({ min: 1.2, max: 2 })
  })
})

describe('moveRangeHandle', () => {
  it('shrinking usable drags the ideal band inside', () => {
    expect(moveRangeHandle(bands, 'usableMax', 25, wind)).toEqual({
      usable: { min: 12, max: 25 },
      ideal: { min: 18, max: 25 },
    })
  })

  it('keeps usable at least one step wide', () => {
    expect(moveRangeHandle(bands, 'usableMin', 40, wind).usable).toEqual({ min: 34, max: 35 })
  })

  it('keeps ideal inside usable and in order', () => {
    expect(moveRangeHandle(bands, 'idealMax', 45, wind).ideal).toEqual({ min: 18, max: 35 })
    expect(moveRangeHandle(bands, 'idealMin', 30, wind).ideal).toEqual({ min: 28, max: 28 })
  })

  it('snaps to the step and to the scale ends', () => {
    expect(moveRangeHandle(bands, 'idealMin', 19.6, wind).ideal.min).toBe(20)
    expect(moveRangeHandle(bands, 'usableMin', -8, wind).usable.min).toBe(0)
  })

  it('avoids floating-point noise on decimal scales', () => {
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3)
    const waves: Bands = { usable: { min: 0, max: 2 }, ideal: { min: 0.3, max: 1 } }
    expect(moveRangeHandle(waves, 'idealMax', 0.7000000001, SLIDER_SCALES.waveHeight).ideal.max).toBe(0.7)
  })
})
