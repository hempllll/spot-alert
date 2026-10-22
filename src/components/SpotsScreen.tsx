import { distanceKm, type Coords } from '../location'
import type { StoredSpot } from '../storage'
import { formatKm } from '../ui/format'

interface SpotsScreenProps {
  spots: StoredSpot[] | null
  /** With a location, spots are listed nearest first with their distance. */
  origin: Coords | null
  onBack: () => void
  onAdd: () => void
  onEdit: (spotId: string) => void
  onDemo: () => void
}

/** Every saved spot (in range or not), to add, edit or delete. */
export function SpotsScreen({ spots, origin, onBack, onAdd, onEdit, onDemo }: SpotsScreenProps) {
  const rows = (spots ?? [])
    .map((spot) => ({ spot, km: origin ? distanceKm(origin, spot) : null }))
    .sort((a, b) =>
      a.km !== null && b.km !== null ? a.km - b.km : a.spot.name.localeCompare(b.spot.name),
    )

  return (
    <section aria-labelledby="spots-title">
      <header className="view-header">
        <button type="button" className="back" onClick={onBack}>
          ‹ Back
        </button>
        <h2 id="spots-title">Spots</h2>
        <button type="button" className="primary" onClick={onAdd}>
          + Add
        </button>
      </header>

      {spots === null ? (
        <p className="notice">Loading spots…</p>
      ) : rows.length === 0 ? (
        <div className="empty">
          <p className="notice">No spots yet. Add your own, or start from the Kiel demo spots.</p>
          <button type="button" onClick={onDemo}>
            Load demo spots
          </button>
        </div>
      ) : (
        <ol className="list">
          {rows.map(({ spot, km }) => {
            const sets = spot.conditionSets.length
            return (
              <li key={spot.id}>
                <button type="button" className="row spot-list-row" onClick={() => onEdit(spot.id)}>
                  <span className="row-main">
                    <span className="row-title">{spot.name}</span>
                    <span className="row-sub">
                      {sets} condition set{sets === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="row-sub">{km === null ? '' : formatKm(km)}</span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
