import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { moveArcHandle, type ArcHandle, type Arcs } from '../../editor/arcs'
import { arcPath, bearingFromPoint, formatBearing, pointAt, snapBearing } from '../../editor/compass'
import { DIAL_STEP } from '../../editor/constants'
import { normalizeDeg } from '../../scoring/circular'

interface CompassDialProps {
  /** Factor name, used in the accessible names. */
  label: string
  arcs: Arcs
  onChange: (arcs: Arcs) => void
  /** Picture of the area around the spot (north up), drawn inside the dial. */
  backdrop?: string | null
}

// The dial is drawn around (100, 100); the viewBox adds a margin on every
// side for the N/E/S/W labels outside the ring.
const C = 100
const VIEW_MIN = -22
const VIEW_SIZE = 244
const RING = { usable: 84, ideal: 62 } as const
/** The backdrop picture fills the 200×200 square and is clipped to this circle. */
const BACKDROP_R = 92

/** Usable handles ride the outer ring, ideal handles the inner ring. */
const HANDLES: { handle: ArcHandle; name: string; ring: keyof typeof RING; edge: 'min' | 'max' }[] = [
  { handle: 'usableMin', name: 'usable start', ring: 'usable', edge: 'min' },
  { handle: 'usableMax', name: 'usable end', ring: 'usable', edge: 'max' },
  { handle: 'idealMin', name: 'ideal start', ring: 'ideal', edge: 'min' },
  { handle: 'idealMax', name: 'ideal end', ring: 'ideal', edge: 'max' },
]

const TICKS = Array.from({ length: 16 }, (_, i) => i * DIAL_STEP)

/** A compass with draggable usable (outer) and ideal (inner) arcs. */
export function CompassDial({ label, arcs, onChange, backdrop }: CompassDialProps) {
  const svg = useRef<SVGSVGElement>(null)
  // useId() contains characters that are awkward in url(#…) references.
  const clipId = `coast-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const move = (handle: ArcHandle, deg: number) =>
    onChange(moveArcHandle(arcs, handle, snapBearing(deg)))

  function bearingAt(e: PointerEvent): number {
    const rect = svg.current!.getBoundingClientRect()
    const x = VIEW_MIN + ((e.clientX - rect.left) / rect.width) * VIEW_SIZE
    const y = VIEW_MIN + ((e.clientY - rect.top) / rect.height) * VIEW_SIZE
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

  const usablePath = arcPath(C, C, RING.usable, arcs.usable.min, arcs.usable.max)
  const idealPath = arcPath(C, C, RING.ideal, arcs.ideal.min, arcs.ideal.max)

  return (
    <svg
      ref={svg}
      className={`compass${backdrop ? ' has-backdrop' : ''}`}
      viewBox={`${VIEW_MIN} ${VIEW_MIN} ${VIEW_SIZE} ${VIEW_SIZE}`}
      role="group"
      aria-label={label}
    >
      {backdrop && (
        <>
          <clipPath id={clipId}>
            <circle cx={C} cy={C} r={BACKDROP_R} />
          </clipPath>
          <image
            href={backdrop}
            x={0}
            y={0}
            width={200}
            height={200}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle cx={C} cy={C} r={BACKDROP_R} className="backdrop-edge" />
        </>
      )}
      <circle cx={C} cy={C} r={RING.usable} className="ring" />
      <circle cx={C} cy={C} r={RING.ideal} className="ring" />
      {TICKS.map((deg) => {
        const a = pointAt(C, C, 93, deg)
        const b = pointAt(C, C, deg % 90 === 0 ? 99 : 97, deg)
        return <line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tick" />
      })}
      {['N', 'E', 'S', 'W'].map((text, i) => {
        const p = pointAt(C, C, 111, i * 90)
        return (
          <text key={text} x={p.x} y={p.y} className="compass-label" textAnchor="middle" dominantBaseline="central">
            {text}
          </text>
        )
      })}
      {/* Dark outlines under the arcs keep them readable over any map. */}
      <path d={usablePath} className="arc-outline" />
      <path d={idealPath} className="arc-outline" />
      <path d={usablePath} className="arc usable" />
      <path d={idealPath} className="arc ideal" />
      {backdrop && <circle cx={C} cy={C} r={4.5} className="spot-pin" />}
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
