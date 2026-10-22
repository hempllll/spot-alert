/**
 * Merge-by-id import, in two pure steps so the UI can show a summary and ask
 * about clashes in between:
 *
 *   const existing = await repo.list()
 *   const plan = planImport(existing, importSpots(text))
 *   // ...show plan, let the user resolve plan.conflicts...
 *   await repo.replaceAll(applyImport(existing, plan, resolutions))
 *
 * Rules:
 *   - incoming id matches a stored spot  -> update it (or "unchanged" if equal)
 *   - new id, name matches a stored spot -> name conflict, the user decides
 *   - otherwise                          -> add
 *   - stored spots missing from the file are always kept
 */
import type { Spot } from '../scoring'
import { withId, type StoredSpot } from './spotRepository'

/** What to do with an incoming spot whose name clashes with a stored one. */
export type ConflictResolution = 'keepBoth' | 'replace' | 'skip'

export interface NameConflict {
  /** Position of the incoming spot in the imported list (key for resolutions). */
  incomingIndex: number
  incoming: Spot
  /** The stored spot with the same name. */
  existing: StoredSpot
}

export interface ImportPlan {
  /** New spots with no name clash. */
  added: Spot[]
  /** Stored spots the file changes, matched by id (incoming content). */
  updated: StoredSpot[]
  /** Stored spots the file contains identically. */
  unchanged: StoredSpot[]
  conflicts: NameConflict[]
}

/** Names compare ignoring case and surrounding whitespace. */
const nameKey = (name: string): string => name.trim().toLocaleLowerCase()

export function planImport(existing: StoredSpot[], incoming: Spot[]): ImportPlan {
  const byId = new Map(existing.map((s) => [s.id, s]))
  const byName = new Map<string, StoredSpot>()
  for (const s of existing) {
    if (!byName.has(nameKey(s.name))) byName.set(nameKey(s.name), s)
  }

  const plan: ImportPlan = { added: [], updated: [], unchanged: [], conflicts: [] }
  incoming.forEach((spot, incomingIndex) => {
    const match = spot.id !== undefined ? byId.get(spot.id) : undefined
    if (match) {
      const next: StoredSpot = { ...spot, id: match.id }
      if (JSON.stringify(next) === JSON.stringify(match)) plan.unchanged.push(match)
      else plan.updated.push(next)
      return
    }
    const clash = byName.get(nameKey(spot.name))
    if (clash) plan.conflicts.push({ incomingIndex, incoming: spot, existing: clash })
    else plan.added.push(spot)
  })
  return plan
}

/**
 * Build the merged collection. Conflicts without a resolution default to
 * 'skip', so nothing is duplicated or overwritten unless the user chose it.
 */
export function applyImport(
  existing: StoredSpot[],
  plan: ImportPlan,
  resolutions: Record<number, ConflictResolution> = {},
): StoredSpot[] {
  const result = new Map(existing.map((s) => [s.id, s]))
  for (const s of plan.updated) result.set(s.id, s)
  for (const s of plan.added) {
    const stored = withId(s)
    result.set(stored.id, stored)
  }
  for (const c of plan.conflicts) {
    const resolution = resolutions[c.incomingIndex] ?? 'skip'
    if (resolution === 'keepBoth') {
      const stored = withId(c.incoming)
      result.set(stored.id, stored)
    } else if (resolution === 'replace') {
      result.set(c.existing.id, { ...c.incoming, id: c.existing.id })
    }
  }
  return [...result.values()]
}
