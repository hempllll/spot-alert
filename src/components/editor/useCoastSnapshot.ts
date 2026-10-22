import { useEffect, useRef, useState } from 'react'
import { usePrefersDark } from '../../hooks/usePrefersDark'
import { renderCoastSnapshot } from './coastSnapshot'

export interface CoastState {
  /** Object URL of the latest picture; kept while a newer one renders. */
  url: string | null
  status: 'none' | 'loading' | 'ready' | 'error'
}

const NONE: CoastState = { url: null, status: 'none' }
/** Let the pin settle before rendering a new picture. */
const DEBOUNCE_MS = 300

function revoke(url: string | null): void {
  // Optional call: jsdom (tests) has no object URLs.
  if (url) URL.revokeObjectURL?.(url)
}

/**
 * The coast picture for the compass dials: re-rendered when the pin moves or
 * the device switches between light and dark mode. 'none' until a pin exists.
 */
export function useCoastSnapshot(lat: number | null, lon: number | null): CoastState {
  const dark = usePrefersDark()
  const [state, setState] = useState<CoastState>(NONE)
  const current = useRef<string | null>(null)

  useEffect(() => {
    if (lat === null || lon === null) return
    let cancelled = false
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, status: 'loading' }))
      renderCoastSnapshot({ lat, lon, dark }).then(
        (url) => {
          if (cancelled) return revoke(url)
          revoke(current.current)
          current.current = url
          setState({ url, status: 'ready' })
        },
        () => {
          if (cancelled) return
          revoke(current.current)
          current.current = null
          setState({ url: null, status: 'error' })
        },
      )
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [lat, lon, dark])

  // Free the last picture when the editor closes.
  useEffect(() => () => revoke(current.current), [])

  return lat === null || lon === null ? NONE : state
}
