/**
 * One-time MapLibre setup shared by the map picker and the coast snapshots.
 * Importing this module pulls in MapLibre, so only the lazy editor imports it.
 */
import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre finds its worker via a URL Vite can't see; importing it with `?url`
// makes Vite ship the file and hand us its final address.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)

/** OpenFreeMap styles: free, OSM-based, no API key. */
export const STYLE_URLS = {
  /** Colourful, with roads and labels: the main location map. */
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  /** Calm light map: grey land, blue water, few labels. */
  positron: 'https://tiles.openfreemap.org/styles/positron',
  /** Calm dark map for dark mode. */
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const
