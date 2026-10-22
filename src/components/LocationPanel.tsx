import { useState, type FormEvent } from 'react'
import type { Coords, Place } from '../location'
import { placeLabel } from '../ui/format'
import type { Settings } from '../ui/settings'

interface LocationPanelProps {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
  searchPlaces: (query: string) => Promise<Place[]>
  getPosition: () => Promise<Coords>
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

/** Choose where you are (GPS or city search) and how far you'll drive. */
export function LocationPanel({
  settings,
  onChange,
  onClose,
  searchPlaces,
  getPosition,
}: LocationPanelProps) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const locateWithGps = () =>
    run(async () => {
      const coords = await getPosition()
      onChange({ ...settings, origin: { ...coords, label: 'Current location', source: 'gps' } })
      onClose()
    })

  const search = (event: FormEvent) => {
    event.preventDefault()
    return run(async () => setPlaces(await searchPlaces(query)))
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

      <button type="button" onClick={locateWithGps} disabled={busy}>
        Use my location (GPS)
      </button>

      <form className="search" onSubmit={search}>
        <input
          type="search"
          placeholder="Search city…"
          aria-label="Search city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={busy || !query.trim()}>
          Search
        </button>
      </form>

      {places &&
        (places.length === 0 ? (
          <p className="muted">No places found.</p>
        ) : (
          <ul className="places">
            {places.map((place) => (
              <li key={`${place.lat},${place.lon}`}>
                <button type="button" className="link" onClick={() => choose(place)}>
                  {placeLabel(place)}
                </button>
              </li>
            ))}
          </ul>
        ))}

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

      {error && <p className="error">{error}</p>}
    </section>
  )
}
