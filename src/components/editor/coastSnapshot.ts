/**
 * Renders a north-up picture of the area around a spot, for the background of
 * the compass dials. A hidden map draws it once and is thrown away, so every
 * dial shares one image instead of each running its own live map (lighter on
 * a phone's memory). OpenFreeMap tiles allow this (they send CORS headers).
 */
import { MapLibreMap } from 'maplibre-gl'
import { coastStyleChanges, zoomForSpan, type StyleLayerInfo } from '../../editor/coast'
import { COAST_SPAN_METERS } from '../../editor/constants'
import { STYLE_URLS } from './maplibre'

const SIZE_PX = 512
/** 2× pixels so the picture stays sharp on a phone screen. */
const PIXEL_RATIO = 2
const TIMEOUT_MS = 20_000

export interface CoastRequest {
  lat: number
  lon: number
  dark: boolean
}

/** Resolves to an object URL of a JPEG; revoke it with URL.revokeObjectURL when done. */
export async function renderCoastSnapshot({ lat, lon, dark }: CoastRequest): Promise<string> {
  const container = document.createElement('div')
  container.style.cssText =
    `position:fixed;top:0;left:-${SIZE_PX * 2}px;width:${SIZE_PX}px;height:${SIZE_PX}px;pointer-events:none`
  document.body.append(container)

  const map = new MapLibreMap({
    container,
    style: dark ? STYLE_URLS.dark : STYLE_URLS.positron,
    center: [lon, lat],
    zoom: zoomForSpan(lat, SIZE_PX, COAST_SPAN_METERS),
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    pixelRatio: PIXEL_RATIO,
    // Keep the drawn frame readable after rendering, so we can copy it.
    canvasContextAttributes: { preserveDrawingBuffer: true },
  })

  // Once the style is in: no labels, clearly blue water.
  map.once('load', () => {
    const layers = (map.getStyle().layers ?? []) as StyleLayerInfo[]
    for (const change of coastStyleChanges(layers, dark)) {
      if ('hide' in change) map.setLayoutProperty(change.id, 'visibility', 'none')
      else map.setPaintProperty(change.id, change.paint, change.value)
    }
  })

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('The coast map took too long')), TIMEOUT_MS)
      // "idle": the style and every visible tile are loaded and drawn.
      map.once('idle', () => {
        clearTimeout(timer)
        resolve()
      })
      // A failing style is fatal; a single failing tile (after the style
      // loaded) is not, so those are left to the timeout.
      map.on('error', (e) => {
        if (map.isStyleLoaded()) return
        clearTimeout(timer)
        reject(e.error ?? new Error('The coast map failed to load'))
      })
    })
    const blob = await new Promise<Blob | null>((resolve) =>
      map.getCanvas().toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob) throw new Error('Could not capture the coast map')
    return URL.createObjectURL(blob)
  } finally {
    map.remove()
    container.remove()
  }
}
