import { describe, expect, it } from 'vitest'
import { InMemorySpotRepository } from '../spotRepository'
import { LocalStorageSpotRepository } from '../localStorageRepository'
import type { SpotRepository } from '../spotRepository'
import type { Spot } from '../../scoring'

const sampleSpot: Spot = {
  name: 'Schilksee',
  lat: 54.43,
  lon: 10.17,
  conditionSets: [
    { windSpeed: { usable: { min: 12, max: 35 }, ideal: { min: 18, max: 28 } } },
  ],
}

/** A minimal in-memory Storage for the localStorage repository. */
function fakeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  } as Storage
}

// Run the same contract against both implementations.
const implementations: [string, () => SpotRepository][] = [
  ['InMemorySpotRepository', () => new InMemorySpotRepository()],
  ['LocalStorageSpotRepository', () => new LocalStorageSpotRepository(fakeStorage())],
]

describe.each(implementations)('%s', (_name, make) => {
  it('assigns an id on save and lists the spot', async () => {
    const repo = make()
    const saved = await repo.save(sampleSpot)
    expect(saved.id).toBeTypeOf('string')
    expect(await repo.list()).toHaveLength(1)
    expect(await repo.get(saved.id)).toMatchObject({ name: 'Schilksee' })
  })

  it('updates in place when saving with an existing id', async () => {
    const repo = make()
    const saved = await repo.save(sampleSpot)
    await repo.save({ ...saved, name: 'Schilksee North' })
    const all = await repo.list()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Schilksee North')
  })

  it('removes a spot', async () => {
    const repo = make()
    const saved = await repo.save(sampleSpot)
    await repo.remove(saved.id)
    expect(await repo.list()).toHaveLength(0)
  })

  it('replaces the whole collection', async () => {
    const repo = make()
    await repo.save(sampleSpot)
    const replaced = await repo.replaceAll([
      { ...sampleSpot, name: 'A' },
      { ...sampleSpot, name: 'B' },
    ])
    expect(replaced).toHaveLength(2)
    expect((await repo.list()).map((s) => s.name).sort()).toEqual(['A', 'B'])
    expect(replaced.every((s) => typeof s.id === 'string')).toBe(true)
  })
})

describe('LocalStorageSpotRepository persistence', () => {
  it('reads back what a previous instance wrote', async () => {
    const storage = fakeStorage()
    const first = new LocalStorageSpotRepository(storage)
    await first.save(sampleSpot)
    const second = new LocalStorageSpotRepository(storage)
    expect(await second.list()).toHaveLength(1)
  })

  it('recovers from corrupt stored data', async () => {
    const storage = fakeStorage()
    storage.setItem('spot-alert.spots', 'not json{')
    const repo = new LocalStorageSpotRepository(storage)
    expect(await repo.list()).toEqual([])
  })
})
