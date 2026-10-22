import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { moveArcHandle, type ArcHandle, type Arcs } from '../../editor/arcs'
import { arcPath, bearingFromPoint, formatBearing, pointAt, snapBearing } from '../../editor/compass'
import { DIAL_STEP } from '../../editor/constants'
import { normalizeDeg } from '../../scoring/circular'

interface CompassDialProps {
  /** Factor name, used in the accessible names. */
  label: string
  arcs: Arcs
  onChange: (arcs: Arcs) => void
}

// SVG viewBox is 200×200 around (100, 100).
const C = 100
const RING = { usable: 84, ideal: 62 } as const

/** Usable handles ride the outer ring, ideal handles the inner ring. */
const HANDLES: { handle: ArcHandle; name: string; ring: keyof typeof RING; edge: 'min' | 'max' }[] = [
  { handle: 'usableMin', name: 'usable start', ring: 'usable', edge: 'min' },
  { handle: 'usableMax', name: 'usable end', ring: 'usable', edge: 'max' },
  { handle: 'idealMin', name: 'ideal start', ring: 'ideal', edge: 'min' },
  { handle: 'idealMax', name: 'ideal end', ring: 'ideal', edge: 'max' },
]

const TICKS = Array.from({ length: 16 }, (_, i) => i * DIAL_STEP)

/** A compass with draggable usable (outer) and ideal (inner) arcs. */
export function CompassDial({ label, arcs, onChange }: CompassDialProps) {
  const svg = useRef<SVGSVGElement>(null)
  const move = (handle: ArcHandle, deg: number) =>
    onChange(moveArcHandle(arcs, handle, snapBearing(deg)))

  function bearingAt(e: PointerEvent): number {
    const rect = svg.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 200
    const y = ((e.clientY - rect.top) / rect.height) * 200
    return bearingFromPoint(C, C, x, y)
  }

  function onKeyDown(handle: ArcHandle, current: number, e: KeyboardEvent) {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? DIAL_STEP
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? -DIAL_STEP
          : null
    if (delta === null) return
    e.preventDefault()
    move(handle, current + delta)
  }

  return (
    <svg ref={svg} className="compass" viewBox="0 0 200 200" role="group" aria-label={label}>
      <circle cx={C} cy={C} r={RING.usable} className="ring" />
      <circle cx={C} cy={C} r={RING.ideal} className="ring" />
      {TICKS.map((deg) => {
        const a = pointAt(C, C, 93, deg)
        const b = pointAt(C, C, deg % 90 === 0 ? 99 : 97, deg)
        return <line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tick" />
      })}
      {['N', 'E', 'S', 'W'].map((text, i) => {
        const p = pointAt(C, C, 38, i * 90)
        return (
          <text key={text} x={p.x} y={p.y} className="compass-label" textAnchor="middle" dominantBaseline="central">
            {text}
          </text>
        )
      })}
      <path d={arcPath(C, C, RING.usable, arcs.usable.min, arcs.usable.max)} className="arc usable" />
      <path d={arcPath(C, C, RING.ideal, arcs.ideal.min, arcs.ideal.max)} className="arc ideal" />
      {HANDLES.map(({ handle, name, ring, edge }) => {
        const deg = arcs[ring][edge]
        const p = pointAt(C, C, RING[ring], deg)
        return (
          <circle
            key={handle}
            cx={p.x}
            cy={p.y}
            r={10}
            role="slider"
            tabIndex={0}
            aria-label={`${label} ${name}`}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={normalizeDeg(deg)}
            aria-valuetext={formatBearing(deg)}
            className={`dial-handle ${ring}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              e.preventDefault()
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) move(handle, bearingAt(e))
            }}
            onKeyDown={(e) => onKeyDown(handle, deg, e)}
          />
        )
      })}
    </svg>
  )
}
