/**
 * Helpers for the coast picture behind the compass dial: Web-Mercator zoom
 * maths and the style tweaks that make water stand out. Pure, no MapLibre.
 */

const EARTH_CIRCUMFERENCE_M = 40_075_016.686
/** MapLibre tiles are 512 px: at zoom z the whole world is 512 · 2^z px wide. */
const TILE_SIZE = 512

/** The map zoom at which `widthPx` pixels cover `spanMeters` at latitude `lat`. */
export function zoomForSpan(lat: number, widthPx: number, spanMeters: number): number {
  const metersPerPixelAtZoom0 =
    (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / TILE_SIZE
  return Math.log2((metersPerPixelAtZoom0 * widthPx) / spanMeters)
}

/**
 * Water colours for the picture. The calm map styles paint water almost the
 * same as land (light: grey on off-white; dark: near-black on black), which
 * hides the coastline the picture is there to show.
 */
export const COAST_WATER = { light: '#9ec5e8', dark: '#1d4f7a' } as const

/** The bits of a map style layer these tweaks look at. */
export interface StyleLayerInfo {
  id: string
  type: string
  'source-layer'?: string
}

export type StyleChange =
  | { id: string; hide: true }
  | { id: string; paint: 'fill-color' | 'line-color'; value: string }

/**
 * What to change in a loaded style so the picture is just land and water:
 * hide every label, and paint water areas and waterways blue. Water is found
 * by its data layer rather than by layer name, so renamed layers still work.
 */
export function coastStyleChanges(layers: StyleLayerInfo[], dark: boolean): StyleChange[] {
  const water = dark ? COAST_WATER.dark : COAST_WATER.light
  const changes: StyleChange[] = []
  for (const layer of layers) {
    if (layer.type === 'symbol') changes.push({ id: layer.id, hide: true })
    else if (layer.type === 'fill' && layer['source-layer'] === 'water')
      changes.push({ id: layer.id, paint: 'fill-color', value: water })
    else if (layer.type === 'line' && layer['source-layer'] === 'waterway')
      changes.push({ id: layer.id, paint: 'line-color', value: water })
  }
  return changes
}
