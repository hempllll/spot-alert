/**
 * Storage-agnostic spot repository.
 *
 * The interface is async so the backing store can later move from localStorage
 * to IndexedDB without changing any caller. Every stored spot has an `id`;
 * `save` assigns one when missing.
 */
import type { Spot } from '../scoring'

/** A spot guaranteed to have an id (what the repository stores and returns). */
export type StoredSpot = Spot & { id: string }

export interface SpotRepository {
  list(): Promise<StoredSpot[]>
  get(id: string): Promise<StoredSpot | undefined>
  /** Insert or update (by id). Returns the stored spot, id included. */
  save(spot: Spot): Promise<StoredSpot>
  remove(id: string): Promise<void>
  /**
   * Replace the whole collection ("restore from backup"). Spots sharing an id
   * collapse to one, last wins. For a non-destructive import, merge first with
   * `planImport`/`applyImport` and pass the result here.
   */
  replaceAll(spots: Spot[]): Promise<StoredSpot[]>
}

/** Ensure a spot has an id, cloning so callers' objects aren't mutated. */
export function withId(spot: Spot): StoredSpot {
  return { ...spot, id: spot.id ?? crypto.randomUUID() }
}

/** Collapse spots sharing an id: last one wins, first position kept. */
export function dedupeById(spots: StoredSpot[]): StoredSpot[] {
  return [...new Map(spots.map((s) => [s.id, s])).values()]
}

/** In-memory repository, for tests and ephemeral use. */
export class InMemorySpotRepository implements SpotRepository {
  private spots = new Map<string, StoredSpot>()

  async list(): Promise<StoredSpot[]> {
    return [...this.spots.values()]
  }

  async get(id: string): Promise<StoredSpot | undefined> {
    return this.spots.get(id)
  }

  async save(spot: Spot): Promise<StoredSpot> {
    const stored = withId(spot)
    this.spots.set(stored.id, stored)
    return stored
  }

  async remove(id: string): Promise<void> {
    this.spots.delete(id)
  }

  async replaceAll(spots: Spot[]): Promise<StoredSpot[]> {
    this.spots.clear()
    const stored = dedupeById(spots.map(withId))
    for (const s of stored) this.spots.set(s.id, s)
    return stored
  }
}
