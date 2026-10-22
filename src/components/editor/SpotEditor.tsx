import { useState } from 'react'
import { FACTOR_ORDER } from '../../editor/constants'
import {
  draftToSpot,
  newDraft,
  setFactor,
  spotToDraft,
  usesWaves,
  validateDraft,
  type Draft,
} from '../../editor/draft'
import type { Coords, Place } from '../../location'
import type { ConditionSet, Spot, WaveSource } from '../../scoring'
import { errorText, formatCoords } from '../../ui/format'
import { PlaceSearch } from '../PlaceSearch'
import { FactorSection } from './FactorSection'
import { MapPicker } from './MapPicker'
import { useCoastSnapshot } from './useCoastSnapshot'

const KIEL: Coords = { lat: 54.32, lon: 10.14 }

const WAVE_SOURCES: [WaveSource, string][] = [
  ['total', 'total'],
  ['wind', 'wind waves'],
  ['swell', 'swell'],
]

export interface SpotEditorProps {
  /** The spot to edit, or null for a new one. */
  spot: Spot | null
  /** Where the map starts before a pin is placed (falls back to Kiel). */
  center: Coords | null
  searchPlaces: (query: string) => Promise<Place[]>
  getPosition: () => Promise<Coords>
  onSave: (spot: Spot) => void
  /** Present only when editing an existing spot. */
  onDelete?: () => void
  onCancel: () => void
}

/** Create or edit a spot: name, location, and one or more condition sets. */
export default function SpotEditor({
  spot,
  center,
  searchPlaces,
  getPosition,
  onSave,
  onDelete,
  onCancel,
}: SpotEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => (spot ? spotToDraft(spot) : newDraft()))
  const [active, setActive] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [locationError, setLocationError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // One coast picture, shared by the wind and wave direction dials.
  const coast = useCoastSnapshot(draft.lat, draft.lon)

  const set = draft.conditionSets[active]
  const updateSet = (next: ConditionSet) =>
    setDraft((d) => ({
      ...d,
      conditionSets: d.conditionSets.map((s, i) => (i === active ? next : s)),
    }))
  const placeAt = (coords: Coords) => setDraft((d) => ({ ...d, lat: coords.lat, lon: coords.lon }))

  // A searched place also names a still-unnamed spot.
  const pickPlace = (place: Place) =>
    setDraft((d) => ({ ...d, lat: place.lat, lon: place.lon, name: d.name.trim() ? d.name : place.name }))

  async function locate() {
    setLocationError(null)
    try {
      placeAt(await getPosition())
    } catch (err) {
      setLocationError(errorText(err))
    }
  }

  function addSet() {
    const copy = { ...structuredClone(set), name: `${set.name || `Set ${active + 1}`} (copy)` }
    setDraft((d) => ({ ...d, conditionSets: [...d.conditionSets, copy] }))
    setActive(draft.conditionSets.length)
  }

  function deleteSet() {
    setDraft((d) => ({ ...d, conditionSets: d.conditionSets.filter((_, i) => i !== active) }))
    setActive((a) => Math.max(0, a - 1))
  }

  function save() {
    const problems = validateDraft(draft)
    setErrors(problems)
    if (problems.length === 0) onSave(draftToSpot(draft))
  }

  return (
    <section className="editor" aria-labelledby="editor-title">
      <header className="view-header">
        <button type="button" className="back" onClick={onCancel}>
          ‹ Cancel
        </button>
        <h2 id="editor-title">{spot ? 'Edit spot' : 'New spot'}</h2>
        <button type="button" className="primary" onClick={save}>
          Save
        </button>
      </header>

      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <label className="field">
        <span className="field-label">Name</span>
        <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
      </label>

      <div className="field">
        <span className="field-label">Location</span>
        <MapPicker lat={draft.lat} lon={draft.lon} center={center ?? KIEL} onChange={placeAt} />
        <p className="row-sub">
          {draft.lat === null || draft.lon === null
            ? 'Tap the map to place the spot.'
            : formatCoords(draft.lat, draft.lon)}
        </p>
        <PlaceSearch label="Search place" searchPlaces={searchPlaces} onPick={pickPlace} />
        <button type="button" onClick={locate}>
          Use my location
        </button>
        {locationError && <p className="error">{locationError}</p>}
      </div>

      <div className="field">
        <span className="field-label">Conditions</span>
        <div className="set-tabs" role="tablist" aria-label="Condition sets">
          {draft.conditionSets.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              className="tab"
              onClick={() => setActive(i)}
            >
              {s.name || `Set ${i + 1}`}
            </button>
          ))}
          <button type="button" className="tab add" onClick={addSet}>
            + Add set
          </button>
        </div>

        <label className="field">
          <span className="field-label">Set name</span>
          <input value={set.name ?? ''} onChange={(e) => updateSet({ ...set, name: e.target.value })} />
        </label>

        {FACTOR_ORDER.map((kind) => (
          <FactorSection
            key={kind}
            kind={kind}
            factor={set[kind]}
            coast={coast}
            onChange={(factor) => updateSet(setFactor(set, kind, factor))}
          />
        ))}

        {usesWaves(set) && (
          <div className="segmented" role="group" aria-label="Waves from">
            <span className="field-label">Waves from</span>
            {WAVE_SOURCES.map(([source, text]) => (
              <button
                key={source}
                type="button"
                aria-pressed={(set.waveSource ?? 'total') === source}
                onClick={() => updateSet({ ...set, waveSource: source })}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={deleteSet} disabled={draft.conditionSets.length === 1}>
          Delete this set
        </button>
      </div>

      {onDelete &&
        (confirmingDelete ? (
          <div className="confirm" role="alert">
            <span>Delete “{spot?.name}” for good?</span>
            <button type="button" onClick={() => setConfirmingDelete(false)}>
              Keep
            </button>
            <button type="button" className="danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        ) : (
          <button type="button" className="danger" onClick={() => setConfirmingDelete(true)}>
            Delete spot
          </button>
        ))}
    </section>
  )
}
