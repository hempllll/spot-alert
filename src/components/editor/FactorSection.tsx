import { formatArc } from '../../editor/compass'
import { FACTOR_LABELS, SLIDER_SCALES } from '../../editor/constants'
import { defaultFactor, isDirectionKind } from '../../editor/draft'
import { presetIdeal, type Preset } from '../../editor/range'
import type { DirectionFactor, Importance, LinearFactor } from '../../scoring'
import type { FactorKind, LinearFactorKind } from '../../scoring/factor'
import { CompassDial } from './CompassDial'
import { RangeSlider } from './RangeSlider'
import type { CoastState } from './useCoastSnapshot'

type Factor = LinearFactor | DirectionFactor

interface FactorSectionProps {
  kind: FactorKind
  factor: Factor | undefined
  /** `undefined` switches the factor off. */
  onChange: (factor: Factor | undefined) => void
  /** Coast picture for direction dials (ignored by other factors). */
  coast?: CoastState
}

const PRESETS: [Preset, string][] = [
  ['more', 'More is better'],
  ['less', 'Less is better'],
  ['middle', 'Middle'],
  ['any', 'Any'],
]
const IMPORTANCE: Importance[] = ['low', 'normal', 'high']

/** One factor: on/off, importance, and its slider or compass dial. */
export function FactorSection({ kind, factor, onChange, coast }: FactorSectionProps) {
  const label = FACTOR_LABELS[kind]
  const direction = isDirectionKind(kind)
  const unit = direction ? '' : ` (${SLIDER_SCALES[kind as LinearFactorKind].unit})`

  return (
    <section className={`factor${factor ? '' : ' off'}`}>
      <div className="factor-head">
        <label className="factor-toggle">
          <input
            type="checkbox"
            checked={Boolean(factor)}
            onChange={(e) => onChange(e.target.checked ? defaultFactor(kind) : undefined)}
          />{' '}
          {label}
          {unit}
        </label>
        {factor && (
          <div className="segmented" role="group" aria-label={`${label} importance`}>
            {IMPORTANCE.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={(factor.importance ?? 'normal') === level}
                onClick={() => onChange({ ...factor, importance: level })}
              >
                {level}
              </button>
            ))}
          </div>
        )}
      </div>
      {factor &&
        (direction ? (
          <DirectionBody
            label={label}
            subject={kind === 'waveDirection' ? 'the waves come' : 'the wind comes'}
            factor={factor as DirectionFactor}
            coast={coast}
            onChange={onChange}
          />
        ) : (
          <LinearBody
            label={label}
            kind={kind as LinearFactorKind}
            factor={factor as LinearFactor}
            onChange={onChange}
          />
        ))}
    </section>
  )
}

function LinearBody({
  label,
  kind,
  factor,
  onChange,
}: {
  label: string
  kind: LinearFactorKind
  factor: LinearFactor
  onChange: (factor: LinearFactor) => void
}) {
  const scale = SLIDER_SCALES[kind]
  const range = (r: LinearFactor['usable']) => `${r.min}–${r.max}`
  return (
    <>
      <RangeSlider
        label={label}
        scale={scale}
        bands={{ usable: factor.usable, ideal: factor.ideal }}
        onChange={(bands) => onChange({ ...factor, ...bands })}
      />
      <p className="factor-summary">
        usable {range(factor.usable)} {scale.unit} · ideal {range(factor.ideal)} {scale.unit}
      </p>
      <div className="presets" role="group" aria-label={`${label} presets`}>
        {PRESETS.map(([preset, text]) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange({ ...factor, ideal: presetIdeal(factor.usable, preset, scale.step) })}
          >
            {text}
          </button>
        ))}
      </div>
    </>
  )
}

function DirectionBody({
  label,
  subject,
  factor,
  coast,
  onChange,
}: {
  label: string
  /** "the wind comes" / "the waves come", for the hint. */
  subject: string
  factor: DirectionFactor
  coast?: CoastState
  onChange: (factor: DirectionFactor) => void
}) {
  const status =
    !coast || coast.status === 'none'
      ? 'Place the spot on the map to see the coast here.'
      : coast.status === 'error'
        ? 'Couldn’t load the coast picture.'
        : coast.status === 'loading' && !coast.url
          ? 'Loading the coast…'
          : null

  return (
    <div className="direction-body">
      <CompassDial
        label={label}
        arcs={{ usable: factor.usable, ideal: factor.ideal }}
        onChange={(arcs) => onChange({ ...factor, ...arcs })}
        backdrop={coast?.url ?? null}
      />
      <p className="factor-summary">
        <span className="swatch usable" /> usable {formatArc(factor.usable)}
        <br />
        <span className="swatch ideal" /> ideal {formatArc(factor.ideal)}
      </p>
      <p className="dial-note">
        Arcs show where {subject} from.
        {coast?.url && ' The dot in the middle is the spot.'}
        {status && (
          <>
            <br />
            {status}
          </>
        )}
        {coast?.url && (
          <>
            <br />
            <span className="map-credit">Map © OpenFreeMap © OpenStreetMap contributors</span>
          </>
        )}
      </p>
    </div>
  )
}
