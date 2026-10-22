/**
 * Kiel-area demo spots, used by the "Demo spots" button and the rank script.
 * Fixed ids make loading them twice a no-op (merge by id).
 */
import type { Spot } from './scoring'

/** A windsurf-friendly W–NW setup, shared by every demo spot. */
const wnwBlow: Spot['conditionSets'] = [
  {
    name: 'W–NW blow',
    windSpeed: { usable: { min: 12, max: 35 }, ideal: { min: 18, max: 28 }, importance: 'high' },
    windDirection: { usable: { min: 200, max: 360 }, ideal: { min: 250, max: 320 } },
    waveHeight: { usable: { min: 0, max: 1.5 }, ideal: { min: 0.2, max: 0.8 }, importance: 'low' },
    waveSource: 'total',
  },
]

export const demoSpots: Spot[] = [
  { id: 'demo-schilksee', name: 'Kiel-Schilksee', lat: 54.43, lon: 10.17, conditionSets: wnwBlow },
  { id: 'demo-laboe', name: 'Laboe', lat: 54.41, lon: 10.22, conditionSets: wnwBlow },
  { id: 'demo-falckenstein', name: 'Falckenstein', lat: 54.39, lon: 10.19, conditionSets: wnwBlow },
  { id: 'demo-eckernfoerde', name: 'Eckernförde', lat: 54.47, lon: 9.84, conditionSets: wnwBlow },
]
