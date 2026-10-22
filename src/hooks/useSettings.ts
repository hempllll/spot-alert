import { useCallback, useState } from 'react'
import { loadSettings, saveSettings, type Settings } from '../ui/settings'

/** Settings state that is read from and written back to `storage`. */
export function useSettings(storage: Storage) {
  const [settings, setState] = useState(() => loadSettings(storage))

  const setSettings = useCallback(
    (next: Settings) => {
      saveSettings(storage, next)
      setState(next)
    },
    [storage],
  )

  return [settings, setSettings] as const
}
