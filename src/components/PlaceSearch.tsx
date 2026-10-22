import { useState, type FormEvent } from 'react'
import type { Place } from '../location'
import { errorText, placeLabel } from '../ui/format'

interface PlaceSearchProps {
  /** Accessible name of the search box, e.g. "Search city". */
  label?: string
  searchPlaces: (query: string) => Promise<Place[]>
  onPick: (place: Place) => void
}

/** A search box with a result list; used by the location panel and the editor. */
export function PlaceSearch({ label = 'Search city', searchPlaces, onPick }: PlaceSearchProps) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setPlaces(await searchPlaces(query))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="search" onSubmit={search}>
        <input
          type="search"
          placeholder={`${label}…`}
          aria-label={label}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={busy || !query.trim()}>
          Search
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {places &&
        (places.length === 0 ? (
          <p className="muted">No places found.</p>
        ) : (
          <ul className="places">
            {places.map((place) => (
              <li key={`${place.lat},${place.lon}`}>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    onPick(place)
                    setPlaces(null)
                  }}
                >
                  {placeLabel(place)}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </>
  )
}
