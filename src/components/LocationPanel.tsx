import { useState } from 'react'
import type { Coords, Place } from '../location'
import { errorText, placeLabel } from '../ui/format'
import type { Settings } from '../ui/settings'
import { PlaceSearch } from './PlaceSearch'

interface LocationPanelProps {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
  searchPlaces: (query: string) => Promise<Place[]>
  getPosition: () => Promise<Coords>
}

/** Choose where you are (GPS or city search) and how far you'll drive. */
export function LocationPanel({
  settings,
  onChange,
  onClose,
  searchPlaces,
  getPosition,
}: LocationPanelProps) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function locateWithGps() {
    setLocating(true)
    setError(null)
    try {
      const coords = await getPosition()
      onChange({ ...settings, origin: { ...coords, label: 'Current location', source: 'gps' } })
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setLocating(false)
    }
  }

  const choose = (place: Place) => {
    onChange({
      ...settings,
      origin: { lat: place.lat, lon: place.lon, label: placeLabel(place), source: 'search' },
    })
    onClose()
  }

  return (
    <section className="panel" aria-labelledby="location-title">
      <div className="panel-header">
        <h2 id="location-title">Location</h2>
        <button type="button" className="icon" onClick={onClose} aria-label="Close location">
          ✕
        </button>
      </div>

      <button type="button" onClick={locateWithGps} disabled={locating}>
        Use my location (GPS)
      </button>
      {error && <p className="error">{error}</p>}

      <PlaceSearch searchPlaces={searchPlaces} onPick={choose} />

      <label className="distance">
        <span>
          Max distance <strong>{settings.maxKm} km</strong>
        </span>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={Math.min(settings.maxKm, 300)}
          onChange={(e) => onChange({ ...settings, maxKm: Number(e.target.value) })}
        />
      </label>
    </section>
  )
}
