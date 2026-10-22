import { useCallback, useEffect, useState } from 'react'
import type { Spot } from '../scoring'
import type { SpotRepository, StoredSpot } from '../storage'

/**
 * Load spots from a repository and keep React state in sync with it.
 * `spots` is null until the first load finishes.
 */
export function useSpots(repo: SpotRepository) {
  const [spots, setSpots] = useState<StoredSpot[] | null>(null)

  useEffect(() => {
    let cancelled = false
    repo.list().then((list) => {
      if (!cancelled) setSpots(list)
    })
    return () => {
      cancelled = true
    }
  }, [repo])

  const replaceAll = useCallback(
    async (next: Spot[]) => setSpots(await repo.replaceAll(next)),
    [repo],
  )

  /** Insert or update one spot; returns it as stored (with its id). */
  const save = useCallback(
    async (spot: Spot) => {
      const stored = await repo.save(spot)
      setSpots(await repo.list())
      return stored
    },
    [repo],
  )

  const remove = useCallback(
    async (id: string) => {
      await repo.remove(id)
      setSpots(await repo.list())
    },
    [repo],
  )

  return { spots, replaceAll, save, remove }
}
