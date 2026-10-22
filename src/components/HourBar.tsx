import type { DayScore } from '../scoring'
import { formatWindow, scoreBand } from '../ui/format'

const hourLabel = (iso: string): string => iso.slice(11, 13)

/**
 * One segment per daylight hour, coloured by that hour's score. Unsafe (gated)
 * hours are hatched, and the session window is outlined.
 */
export function HourBar({ day }: { day: DayScore }) {
  const { hours, window } = day
  if (hours.length === 0) return <span className="hour-bar muted">no daylight data</span>

  const n = hours.length
  const lastEnd = String(Number(hourLabel(hours[n - 1].time)) + 1).padStart(2, '0')
  const showWindow = day.coreScore > 0
  const label =
    `Hourly scores ${hourLabel(hours[0].time)}:00 to ${lastEnd}:00` +
    (showWindow ? `, best ${formatWindow(window, day.coarse)}` : '')

  return (
    <span className="hour-bar" role="img" aria-label={label}>
      <span className="hour-label">{hourLabel(hours[0].time)}</span>
      <span className="hour-segments">
        {hours.map((h) => (
          <span
            key={h.time}
            className={`hour ${h.gated ? 'gated' : `band-${scoreBand(Math.round(h.score * 100))}`}`}
          />
        ))}
        {showWindow && (
          <span
            className="hour-window"
            style={{
              left: `${(window.startIndex / n) * 100}%`,
              width: `${((window.endIndex - window.startIndex + 1) / n) * 100}%`,
            }}
          />
        )}
      </span>
      <span className="hour-label">{lastEnd}</span>
    </span>
  )
}
