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

  return { spots, replaceAll }
}
