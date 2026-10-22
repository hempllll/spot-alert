import { describe, expect, it } from 'vitest'
import type { Spot } from '../../scoring'
import { DEFAULT_DIRECTION } from '../constants'
import {
  defaultFactor,
  draftToSpot,
  newDraft,
  setFactor,
  spotToDraft,
  usesWaves,
  validateDraft,
} from '../draft'

const spot: Spot = {
  id: 'abc',
  name: 'Laboe',
  lat: 54.41,
  lon: 10.22,
  conditionSets: [
    { name: 'NE', windSpeed: { usable: { min: 12, max: 30 }, ideal: { min: 16, max: 24 } } },
  ],
}

describe('draft', () => {
  it('a new draft starts with one set and wind speed on, but is not yet valid', () => {
    const draft = newDraft()
    expect(draft.conditionSets).toHaveLength(1)
    expect(draft.conditionSets[0].windSpeed).toBeDefined()
    expect(validateDraft(draft)).toEqual(['Give the spot a name.', 'Place the spot on the map.'])
  })

  it('requires at least one factor per set', () => {
    const draft = { ...newDraft(), name: 'X', lat: 54, lon: 10, conditionSets: [{ name: 'Empty' }] }
    expect(validateDraft(draft)).toEqual(['“Empty” needs at least one factor switched on.'])
  })

  it('round-trips a spot, keeping its id and rounding map coordinates', () => {
    const draft = { ...spotToDraft(spot), lat: 54.4123456789, lon: 10.2198765432 }
    expect(validateDraft(draft)).toEqual([])
    expect(draftToSpot(draft)).toEqual({ ...spot, lat: 54.41235, lon: 10.21988 })
  })

  it('edits a copy, never the stored spot', () => {
    const draft = spotToDraft(spot)
    draft.conditionSets[0].name = 'changed'
    expect(spot.conditionSets[0].name).toBe('NE')
  })

  it('switches factors on and off', () => {
    const set = spot.conditionSets[0]
    const withWaves = setFactor(set, 'waveHeight', defaultFactor('waveHeight'))
    expect(usesWaves(withWaves)).toBe(true)
    const without = setFactor(withWaves, 'waveHeight', undefined)
    expect('waveHeight' in without).toBe(false)
    expect(usesWaves(without)).toBe(false)
  })

  it('hands out independent default copies', () => {
    const a = defaultFactor('windDirection')
    a.usable.min = 123.4 // mutate the copy...
    expect(defaultFactor('windDirection')).toEqual(DEFAULT_DIRECTION) // ...defaults untouched
  })
})
