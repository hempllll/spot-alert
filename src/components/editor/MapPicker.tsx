/**
 * MapLibre map for placing a spot: tap the map or drag the pin. Tiles come from
 * OpenFreeMap (free, OSM-based, no key). This file pulls in MapLibre, so it is
 * only loaded with the editor.
 */
import { MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre finds its worker via a URL Vite can't see; importing it with `?url`
// makes Vite ship the file and hand us its final address.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef } from 'react'
import type { Coords } from '../../location'

setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

interface MapPickerProps {
  lat: number | null
  lon: number | null
  /** Where to look before a pin is placed. */
  center: Coords
  onChange: (coords: Coords) => void
}

export function MapPicker({ lat, lon, center, onChange }: MapPickerProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)
  // Latest values for the one-time setup and event handlers below.
  const onChangeRef = useRef(onChange)
  const initial = useRef(lat !== null && lon !== null ? { lat, lon, zoom: 12 } : { ...center, zoom: 9 })

  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Create the map once.
  useEffect(() => {
    if (!container.current) return
    const start = initial.current
    const m = new MapLibreMap({
      container: container.current,
      style: STYLE_URL,
      center: [start.lon, start.lat],
      zoom: start.zoom,
      attributionControl: { compact: true },
    })
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    m.on('click', (e) => onChangeRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }))
    map.current = m
    return () => {
      m.remove()
      map.current = null
      marker.current = null
    }
  }, [])

  // Keep the pin in sync with the draft (tap, search result or GPS).
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (lat === null || lon === null) {
      marker.current?.remove()
      marker.current = null
      return
    }
    if (!marker.current) {
      const pin = new Marker({ draggable: true }).setLngLat([lon, lat]).addTo(m)
      pin.on('dragend', () => {
        const p = pin.getLngLat()
        onChangeRef.current({ lat: p.lat, lon: p.lng })
      })
      marker.current = pin
    } else {
      marker.current.setLngLat([lon, lat])
    }
    if (!m.getBounds().contains([lon, lat])) {
      m.flyTo({ center: [lon, lat], zoom: Math.max(m.getZoom(), 11) })
    }
  }, [lat, lon])

  return <div ref={container} className="map" role="region" aria-label="Map: tap to place the spot" />
}
