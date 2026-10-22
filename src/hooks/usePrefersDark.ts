import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-color-scheme: dark)'

const media = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY)
    : null

function subscribe(onChange: () => void): () => void {
  const m = media()
  m?.addEventListener('change', onChange)
  return () => m?.removeEventListener('change', onChange)
}

/** Whether the device is in dark mode, updating live when it switches. */
export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribe, () => media()?.matches ?? false)
}
