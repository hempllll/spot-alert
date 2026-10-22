/**
 * localStorage-backed spot repository. Spots are small, so the whole collection
 * is read/written as one JSON array per operation.
 *
 * localStorage works in an installed iOS PWA (separate from Safari's storage —
 * hence the JSON export/import in spotsIO.ts as a backup path).
 */
import type { Spot } from '../scoring'
import {
  withId,
  type SpotRepository,
  type StoredSpot,
} from './spotRepository'

const DEFAULT_KEY = 'spot-alert.spots'

export class LocalStorageSpotRepository implements SpotRepository {
  private storage: Storage
  private key: string

  constructor(storage: Storage = globalThis.localStorage, key = DEFAULT_KEY) {
    this.storage = storage
    this.key = key
  }

  private readAll(): StoredSpot[] {
    const raw = this.storage.getItem(this.key)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as StoredSpot[]) : []
    } catch {
      return [] // corrupt data — start clean rather than crash
    }
  }

  private writeAll(spots: StoredSpot[]): void {
    this.storage.setItem(this.key, JSON.stringify(spots))
  }

  async list(): Promise<StoredSpot[]> {
    return this.readAll()
  }

  async get(id: string): Promise<StoredSpot | undefined> {
    return this.readAll().find((s) => s.id === id)
  }

  async save(spot: Spot): Promise<StoredSpot> {
    const stored = withId(spot)
    const spots = this.readAll()
    const index = spots.findIndex((s) => s.id === stored.id)
    if (index >= 0) spots[index] = stored
    else spots.push(stored)
    this.writeAll(spots)
    return stored
  }

  async remove(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((s) => s.id !== id))
  }

  async replaceAll(spots: Spot[]): Promise<StoredSpot[]> {
    const stored = spots.map(withId)
    this.writeAll(stored)
    return stored
  }
}
