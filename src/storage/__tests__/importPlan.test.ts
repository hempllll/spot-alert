import { describe, expect, it } from 'vitest'
import { applyImport, planImport } from '../importPlan'
import { exportSpots, importSpots } from '../spotsIO'
import type { StoredSpot } from '../spotRepository'
import type { Spot } from '../../scoring'

const conditionSets: Spot['conditionSets'] = [
  { windSpeed: { usable: { min: 12, max: 35 }, ideal: { min: 18, max: 28 } } },
]
const stored = (id: string, name: string, lat = 54.4): StoredSpot => ({
  id,
  name,
  lat,
  lon: 10.2,
  conditionSets,
})

const existing = [stored('a', 'Schilksee'), stored('b', 'Laboe')]

describe('planImport', () => {
  it('adds spots with new ids and no name clash', () => {
    const plan = planImport(existing, [stored('c', 'Falckenstein')])
    expect(plan.added.map((s) => s.name)).toEqual(['Falckenstein'])
    expect(plan.conflicts).toEqual([])
  })

  it('treats a matching id as an update, even if renamed', () => {
    const plan = planImport(existing, [stored('a', 'Schilksee North', 54.45)])
    expect(plan.updated).toEqual([stored('a', 'Schilksee North', 54.45)])
  })

  it('marks an identical spot as unchanged', () => {
    const plan = planImport(existing, [stored('a', 'Schilksee')])
    expect(plan.unchanged.map((s) => s.id)).toEqual(['a'])
    expect(plan.updated).toEqual([])
  })

  it('flags a name clash with a different id, ignoring case and spaces', () => {
    const plan = planImport(existing, [stored('z', '  schilksee ')])
    expect(plan.added).toEqual([])
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.conflicts[0]).toMatchObject({ incomingIndex: 0, existing: { id: 'a' } })
  })

  it('flags a name clash for an incoming spot without an id', () => {
    const { id: _ignored, ...noId } = stored('?', 'Laboe')
    const plan = planImport(existing, [noId])
    expect(plan.conflicts[0].existing.id).toBe('b')
  })
})

describe('applyImport', () => {
  it('keeps stored spots that are not in the file', () => {
    const plan = planImport(existing, [stored('c', 'Falckenstein')])
    const merged = applyImport(existing, plan)
    expect(merged.map((s) => s.name)).toEqual(['Schilksee', 'Laboe', 'Falckenstein'])
  })

  it('applies updates in place', () => {
    const plan = planImport(existing, [stored('a', 'Schilksee North')])
    const merged = applyImport(existing, plan)
    expect(merged).toHaveLength(2)
    expect(merged[0].name).toBe('Schilksee North')
  })

  it('skips unresolved conflicts by default', () => {
    const plan = planImport(existing, [stored('z', 'Schilksee', 55)])
    expect(applyImport(existing, plan)).toEqual(existing)
  })

  it('keepBoth adds the clashing spot alongside the stored one', () => {
    const plan = planImport(existing, [stored('z', 'Schilksee', 55)])
    const merged = applyImport(existing, plan, { 0: 'keepBoth' })
    expect(merged.filter((s) => s.name === 'Schilksee').map((s) => s.id)).toEqual(['a', 'z'])
  })

  it('replace overwrites the stored spot but keeps its id', () => {
    const plan = planImport(existing, [stored('z', 'Schilksee', 55)])
    const merged = applyImport(existing, plan, { 0: 'replace' })
    expect(merged).toHaveLength(2)
    expect(merged[0]).toEqual(stored('a', 'Schilksee', 55))
  })

  it('re-importing your own export changes nothing and duplicates nothing', () => {
    const plan = planImport(existing, importSpots(exportSpots(existing)))
    expect(plan.unchanged).toHaveLength(2)
    expect(plan.added).toEqual([])
    expect(plan.conflicts).toEqual([])
    expect(applyImport(existing, plan)).toEqual(existing)
  })
})
