import { useEffect, useState } from 'react'
import { coordKey } from '../forecast'
import type { Coords } from '../location'
import type { Forecast } from '../scoring'

export type ForecastState =
  | { status: 'loading' }
  | { status: 'ok'; forecast: Forecast }
  | { status: 'error'; message: string }

export type ForecastLoader = (lat: number, lon: number) => Promise<Forecast>

/**
 * Fetch one forecast per ~0.1° cell for the given points, keyed by `coordKey`.
 * A cell with no entry yet is still loading. `retry()` clears failed cells and
 * refetches (failed cells hit the network again, loaded ones the cache).
 */
export function useForecasts(points: Coords[], load: ForecastLoader) {
  const [states, setStates] = useState<ReadonlyMap<string, ForecastState>>(
    () => new Map(),
  )
  const [attempt, setAttempt] = useState(0)

  // One real coordinate per cell, flattened to a string so the effect below
  // only re-runs when the set of cells actually changes (`points` is a new
  // array on every render).
  const cells = new Map<string, Coords>()
  for (const p of points) {
    const key = coordKey(p.lat, p.lon)
    if (!cells.has(key)) cells.set(key, p)
  }
  const cellsKey = [...cells]
    .map(([key, p]) => `${key}@${p.lat},${p.lon}`)
    .sort()
    .join('|')

  useEffect(() => {
    let cancelled = false
    const wanted = cellsKey ? cellsKey.split('|').map(parseCell) : []
    const settle = (key: string, state: ForecastState) => {
      if (!cancelled) setStates((prev) => new Map(prev).set(key, state))
    }
    for (const { key, lat, lon } of wanted) {
      load(lat, lon).then(
        (forecast) => settle(key, { status: 'ok', forecast }),
        (err: unknown) =>
          settle(key, {
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          }),
      )
    }
    return () => {
      cancelled = true
    }
  }, [cellsKey, attempt, load])

  const retry = () => {
    setStates((prev) => new Map([...prev].filter(([, s]) => s.status !== 'error')))
    setAttempt((a) => a + 1)
  }

  return { states, retry }
}

function parseCell(cell: string): { key: string; lat: number; lon: number } {
  const [key, coords] = cell.split('@')
  const [lat, lon] = coords.split(',').map(Number)
  return { key, lat, lon }
}
