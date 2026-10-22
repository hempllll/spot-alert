/** Spot persistence: a storage-agnostic repository plus JSON export/import. */
export {
  type SpotRepository,
  type StoredSpot,
  InMemorySpotRepository,
  withId,
} from './spotRepository'
export { LocalStorageSpotRepository } from './localStorageRepository'
export { exportSpots, importSpots } from './spotsIO'
