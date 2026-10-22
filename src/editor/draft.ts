/**
 * The editor's working copy of a spot ("draft") and its conversion to and from
 * the stored `Spot` shape. Pure functions, no React.
 */
import type { ConditionSet, DirectionFactor, LinearFactor, Spot } from '../scoring'
import type { FactorKind, LinearFactorKind } from '../scoring/factor'
import { DEFAULT_DIRECTION, DEFAULT_LINEAR, FACTOR_ORDER } from './constants'

/** Like a Spot, but the location may not be placed yet. */
export interface Draft {
  id?: string
  name: string
  lat: number | null
  lon: number | null
  conditionSets: ConditionSet[]
}

export const isDirectionKind = (kind: FactorKind): boolean =>
  kind === 'windDirection' || kind === 'waveDirection'

/** A fresh copy of a factor's starting values. */
export function defaultFactor(kind: FactorKind): LinearFactor | DirectionFactor {
  return structuredClone(
    isDirectionKind(kind) ? DEFAULT_DIRECTION : DEFAULT_LINEAR[kind as LinearFactorKind],
  )
}

/** A new set starts with only wind speed switched on. */
export function newConditionSet(index: number): ConditionSet {
  return { name: `Conditions ${index + 1}`, windSpeed: defaultFactor('windSpeed') as LinearFactor }
}

export function newDraft(): Draft {
  return { name: '', lat: null, lon: null, conditionSets: [newConditionSet(0)] }
}

export function spotToDraft(spot: Spot): Draft {
  return {
    ...(spot.id ? { id: spot.id } : {}),
    name: spot.name,
    lat: spot.lat,
    lon: spot.lon,
    conditionSets: structuredClone(spot.conditionSets),
  }
}

/** Switch a factor on (with values) or off (`undefined` removes it). */
export function setFactor(
  set: ConditionSet,
  kind: FactorKind,
  factor: LinearFactor | DirectionFactor | undefined,
): ConditionSet {
  const next: Record<string, unknown> = { ...set }
  if (factor) next[kind] = factor
  else delete next[kind]
  return next as ConditionSet
}

export const usesWaves = (set: ConditionSet): boolean =>
  Boolean(set.waveHeight || set.waveDirection || set.wavePeriod)

/** Everything that blocks saving, as messages for the user. Empty = valid. */
export function validateDraft(draft: Draft): string[] {
  const errors: string[] = []
  if (!draft.name.trim()) errors.push('Give the spot a name.')
  if (draft.lat === null || draft.lon === null) errors.push('Place the spot on the map.')
  draft.conditionSets.forEach((set, i) => {
    if (!FACTOR_ORDER.some((kind) => set[kind])) {
      errors.push(`“${set.name || `Set ${i + 1}`}” needs at least one factor switched on.`)
    }
  })
  return errors
}

/** ~1 m precision is plenty for a spot; map clicks give far more digits. */
const roundCoord = (v: number): number => Math.round(v * 1e5) / 1e5

/** Convert a valid draft (see `validateDraft`) into a Spot. */
export function draftToSpot(draft: Draft): Spot {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    lat: roundCoord(draft.lat ?? 0),
    lon: roundCoord(draft.lon ?? 0),
    conditionSets: draft.conditionSets,
  }
}
