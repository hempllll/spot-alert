/**
 * JSON export/import of spots.
 *
 * Export wraps the spots with a format tag and version so files stay
 * recognisable and upgradeable. Import validates untrusted file contents by
 * hand (no schema library) and throws a clear error on the first problem, so a
 * bad file can never corrupt the store.
 */
import type { ConditionSet, Spot } from '../scoring'

const FORMAT = 'spot-alert/spots'
const VERSION = 1

interface SpotsFile {
  format: typeof FORMAT
  version: number
  spots: Spot[]
}

/** Serialise spots to a pretty-printed JSON string for download. */
export function exportSpots(spots: Spot[]): string {
  const file: SpotsFile = { format: FORMAT, version: VERSION, spots }
  return JSON.stringify(file, null, 2)
}

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message)
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function validateRange(value: unknown, where: string): void {
  if (
    !isObject(value) ||
    typeof value.min !== 'number' ||
    typeof value.max !== 'number'
  ) {
    fail(`${where} must have numeric "min" and "max"`)
  }
}

const FACTOR_KEYS = [
  'windSpeed',
  'windDirection',
  'waveHeight',
  'waveDirection',
  'wavePeriod',
  'gusts',
] as const

function validateConditionSet(value: unknown, where: string): void {
  if (!isObject(value)) fail(`${where} must be an object`)
  const cs = value as Record<string, unknown>
  for (const key of FACTOR_KEYS) {
    const factor = cs[key]
    if (factor === undefined) continue
    if (!isObject(factor)) fail(`${where}.${key} must be an object`)
    validateRange(factor.usable, `${where}.${key}.usable`)
    validateRange(factor.ideal, `${where}.${key}.ideal`)
    if (
      factor.importance !== undefined &&
      !['low', 'normal', 'high'].includes(factor.importance as string)
    ) {
      fail(`${where}.${key}.importance must be low, normal or high`)
    }
  }
  if (
    cs.waveSource !== undefined &&
    !['total', 'wind', 'swell'].includes(cs.waveSource as string)
  ) {
    fail(`${where}.waveSource must be total, wind or swell`)
  }
}

function validateSpot(value: unknown, where: string): Spot {
  if (!isObject(value)) fail(`${where} must be an object`)
  const s = value as Record<string, unknown>
  if (s.id !== undefined && (typeof s.id !== 'string' || s.id === '')) {
    fail(`${where}.id must be a non-empty string when present`)
  }
  if (typeof s.name !== 'string' || s.name.trim() === '') {
    fail(`${where}.name must be a non-empty string`)
  }
  if (typeof s.lat !== 'number' || s.lat < -90 || s.lat > 90) {
    fail(`${where}.lat must be a number between -90 and 90`)
  }
  if (typeof s.lon !== 'number' || s.lon < -180 || s.lon > 180) {
    fail(`${where}.lon must be a number between -180 and 180`)
  }
  if (!Array.isArray(s.conditionSets) || s.conditionSets.length === 0) {
    fail(`${where}.conditionSets must be a non-empty array`)
  }
  s.conditionSets.forEach((cs, i) =>
    validateConditionSet(cs, `${where}.conditionSets[${i}]`),
  )
  return value as unknown as Spot
}

/**
 * Parse and validate a spots JSON file (either a `{ format, version, spots }`
 * wrapper or a bare array of spots). Throws with a descriptive message on any
 * problem, including two spots sharing an id. The returned spots keep whatever
 * ids they had; missing ones are filled in when stored.
 */
export function importSpots(text: string): Spot[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    fail('File is not valid JSON')
  }

  const rawSpots = Array.isArray(parsed)
    ? parsed
    : isObject(parsed) && Array.isArray(parsed.spots)
      ? parsed.spots
      : fail('Expected a spots array or a { spots: [...] } object')

  const spots = rawSpots.map((spot, i) => validateSpot(spot, `spots[${i}]`))

  const firstIndexById = new Map<string, number>()
  spots.forEach((spot, i) => {
    if (spot.id === undefined) return
    const first = firstIndexById.get(spot.id)
    if (first !== undefined) fail(`spots[${i}].id duplicates spots[${first}]`)
    firstIndexById.set(spot.id, i)
  })

  return spots
}

export type { ConditionSet, Spot }
