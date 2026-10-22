/** Spot persistence: a storage-agnostic repository plus JSON export/import. */
export {
  type SpotRepository,
  type StoredSpot,
  InMemorySpotRepository,
  withId,
  dedupeById,
} from './spotRepository'
export { LocalStorageSpotRepository } from './localStorageRepository'
export { exportSpots, importSpots } from './spotsIO'
export {
  planImport,
  applyImport,
  type ImportPlan,
  type NameConflict,
  type ConflictResolution,
} from './importPlan'
