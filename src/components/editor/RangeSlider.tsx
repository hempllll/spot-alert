import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { SliderScale } from '../../editor/constants'
import { moveRangeHandle, type Bands, type RangeHandle } from '../../editor/range'

interface RangeSliderProps {
  /** Factor name, used in each handle's accessible name. */
  label: string
  scale: SliderScale
  bands: Bands
  onChange: (bands: Bands) => void
}

/** Ideal handles sit above the track, usable handles below, so none overlap. */
const HANDLES: { handle: RangeHandle; name: string; band: keyof Bands; edge: 'min' | 'max' }[] = [
  { handle: 'idealMin', name: 'ideal minimum', band: 'ideal', edge: 'min' },
  { handle: 'idealMax', name: 'ideal maximum', band: 'ideal', edge: 'max' },
  { handle: 'usableMin', name: 'usable minimum', band: 'usable', edge: 'min' },
  { handle: 'usableMax', name: 'usable maximum', band: 'usable', edge: 'max' },
]

/** One track showing the usable band (light) and ideal band (dark). */
export function RangeSlider({ label, scale, bands, onChange }: RangeSliderProps) {
  const track = useRef<HTMLDivElement>(null)
  // Position along the track in %, rounded so styles read "56%", not "56.00000000000001%".
  const pct = (v: number) => {
    const p = ((v - scale.min) / (scale.max - scale.min)) * 100
    return Math.round(Math.min(100, Math.max(0, p)) * 100) / 100
  }
  const move = (handle: RangeHandle, value: number) =>
    onChange(moveRangeHandle(bands, handle, value, scale))

  function valueAt(clientX: number): number {
    const rect = track.current!.getBoundingClientRect()
    return scale.min + ((clientX - rect.left) / rect.width) * (scale.max - scale.min)
  }

  function onKeyDown(handle: RangeHandle, current: number, e: KeyboardEvent) {
    const big = scale.step * 5
    const steps: Record<string, number> = {
      ArrowRight: scale.step,
      ArrowUp: scale.step,
      ArrowLeft: -scale.step,
      ArrowDown: -scale.step,
      PageUp: big,
      PageDown: -big,
    }
    let target: number
    if (e.key in steps) target = current + steps[e.key]
    else if (e.key === 'Home') target = scale.min
    else if (e.key === 'End') target = scale.max
    else return
    e.preventDefault()
    move(handle, target)
  }

  const band = (range: Bands['usable'], kind: keyof Bands) => (
    <span
      className={`range-band ${kind}`}
      style={{ left: `${pct(range.min)}%`, width: `${pct(range.max) - pct(range.min)}%` }}
    />
  )

  return (
    <div className="range-slider">
      <div className="range-track" ref={track}>
        {band(bands.usable, 'usable')}
        {band(bands.ideal, 'ideal')}
        {HANDLES.map(({ handle, name, band: which, edge }) => {
          const value = bands[which][edge]
          return (
            <span
              key={handle}
              role="slider"
              tabIndex={0}
              aria-label={`${label} ${name}`}
              aria-valuemin={scale.min}
              aria-valuemax={scale.max}
              aria-valuenow={value}
              aria-valuetext={`${value} ${scale.unit}`}
              className={`range-handle ${which}`}
              style={{ left: `${pct(value)}%` }}
              onPointerDown={(e: PointerEvent<HTMLSpanElement>) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                e.preventDefault()
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) move(handle, valueAt(e.clientX))
              }}
              onKeyDown={(e) => onKeyDown(handle, value, e)}
            />
          )
        })}
      </div>
      <div className="range-scale" aria-hidden="true">
        <span>{scale.min}</span>
        <span>
          {scale.max} {scale.unit}
        </span>
      </div>
    </div>
  )
}
