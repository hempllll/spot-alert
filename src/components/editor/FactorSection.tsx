import { formatArc } from '../../editor/compass'
import { FACTOR_LABELS, SLIDER_SCALES } from '../../editor/constants'
import { defaultFactor, isDirectionKind } from '../../editor/draft'
import { presetIdeal, type Preset } from '../../editor/range'
import type { DirectionFactor, Importance, LinearFactor } from '../../scoring'
import type { FactorKind, LinearFactorKind } from '../../scoring/factor'
import { CompassDial } from './CompassDial'
import { RangeSlider } from './RangeSlider'

type Factor = LinearFactor | DirectionFactor

interface FactorSectionProps {
  kind: FactorKind
  factor: Factor | undefined
  /** `undefined` switches the factor off. */
  onChange: (factor: Factor | undefined) => void
}

const PRESETS: [Preset, string][] = [
  ['more', 'More is better'],
  ['less', 'Less is better'],
  ['middle', 'Middle'],
  ['any', 'Any'],
]
const IMPORTANCE: Importance[] = ['low', 'normal', 'high']

/** One factor: on/off, importance, and its slider or compass dial. */
export function FactorSection({ kind, factor, onChange }: FactorSectionProps) {
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
          <DirectionBody label={label} factor={factor as DirectionFactor} onChange={onChange} />
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
  factor,
  onChange,
}: {
  label: string
  factor: DirectionFactor
  onChange: (factor: DirectionFactor) => void
}) {
  return (
    <div className="direction-body">
      <CompassDial
        label={label}
        arcs={{ usable: factor.usable, ideal: factor.ideal }}
        onChange={(arcs) => onChange({ ...factor, ...arcs })}
      />
      <p className="factor-summary">
        <span className="swatch usable" /> usable {formatArc(factor.usable)}
        <br />
        <span className="swatch ideal" /> ideal {formatArc(factor.ideal)}
      </p>
    </div>
  )
}
